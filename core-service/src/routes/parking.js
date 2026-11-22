// Bounded context: Reservasi & Sesi Parkir (core) + Pembayaran (generic, mock lewat ACL)
const express = require('express');
const config = require('../config');
const db = require('../db');
const { requireAuth } = require('../auth');
const { HttpError, validate, PLATE_PATTERN, normalizePlate } = require('../errors');
const { computeTariff, expireReservations } = require('../domain');

const router = express.Router();
router.use(['/reservations', '/sessions'], requireAuth);

const plateRule = { required: true, type: 'string', pattern: PLATE_PATTERN, patternMessage: 'format plat contoh: D 1234 ABC' };

function ensureOwner(item, req) {
  if (!item) throw new HttpError(404, 'NOT_FOUND', 'Data tidak ditemukan.');
  if (item.userId !== req.user.sub && req.user.role !== 'admin') {
    throw new HttpError(403, 'FORBIDDEN', 'Data ini bukan milik kamu.');
  }
  return item;
}

// ---------- Reservasi ----------
router.post('/reservations', (req, res) => {
  expireReservations();
  const body = validate(req.body, { zoneId: { required: true, type: 'string' }, plateNumber: plateRule });
  const state = db.load();
  const zone = state.zones.find((z) => z.id === body.zoneId);
  if (!zone) throw new HttpError(404, 'ZONE_NOT_FOUND', 'Zona tidak ditemukan.');
  const plate = normalizePlate(body.plateNumber);
  if (state.reservations.some((r) => r.status === 'active' && r.plateNumber === plate)) {
    throw new HttpError(409, 'ALREADY_RESERVED', 'Kendaraan ini sudah punya reservasi aktif.');
  }
  const slot = state.slots.find((s) => s.zoneId === zone.id && s.status === 'free');
  if (!slot) throw new HttpError(409, 'ZONE_FULL', 'Zona penuh, coba zona lain.');

  slot.status = 'reserved';
  slot.updatedAt = new Date().toISOString();
  const now = new Date();
  const reservation = {
    id: db.nextId('reservation', 'R'),
    userId: req.user.sub,
    zoneId: zone.id,
    slotId: slot.id,
    slotCode: slot.code,
    plateNumber: plate,
    tariffPerHour: computeTariff(zone).perHour,
    status: 'active', // active | used | cancelled | expired
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + config.reservationHoldMinutes * 60000).toISOString(),
  };
  state.reservations.push(reservation);
  db.save();
  res.status(201).json({ event: 'ReservasiDibuat', reservation });
});

router.get('/reservations/me', (req, res) => {
  expireReservations();
  const data = db.load().reservations.filter((r) => r.userId === req.user.sub).reverse();
  res.json({ data, count: data.length });
});

router.post('/reservations/:id/cancel', (req, res) => {
  const state = db.load();
  const r = ensureOwner(state.reservations.find((x) => x.id === req.params.id), req);
  if (r.status !== 'active') throw new HttpError(409, 'NOT_ACTIVE', `Reservasi berstatus ${r.status}.`);
  r.status = 'cancelled';
  const slot = state.slots.find((s) => s.id === r.slotId);
  if (slot && slot.status === 'reserved') slot.status = 'free';
  db.save();
  res.json(r);
});

// ---------- Sesi parkir ----------
// Check-in: dipicu kamera ANPR / scan di gerbang. Pakai slot reservasi kalau ada.
router.post('/sessions', (req, res) => {
  expireReservations();
  const body = validate(req.body, { zoneId: { required: true, type: 'string' }, plateNumber: plateRule });
  const state = db.load();
  const zone = state.zones.find((z) => z.id === body.zoneId);
  if (!zone) throw new HttpError(404, 'ZONE_NOT_FOUND', 'Zona tidak ditemukan.');
  const plate = normalizePlate(body.plateNumber);
  if (state.sessions.some((s) => s.status === 'active' && s.plateNumber === plate)) {
    throw new HttpError(409, 'SESSION_EXISTS', 'Kendaraan ini masih punya sesi aktif.');
  }

  const reservation = state.reservations.find(
    (r) => r.status === 'active' && r.plateNumber === plate && r.zoneId === zone.id,
  );
  let slot;
  let tariffPerHour;
  if (reservation) {
    slot = state.slots.find((s) => s.id === reservation.slotId);
    tariffPerHour = reservation.tariffPerHour; // tarif dikunci saat reservasi
    reservation.status = 'used';
  } else {
    slot = state.slots.find((s) => s.zoneId === zone.id && s.status === 'free');
    if (!slot) throw new HttpError(409, 'ZONE_FULL', 'Zona penuh.');
    tariffPerHour = computeTariff(zone).perHour;
  }
  slot.status = 'occupied';
  slot.plateNumber = plate;
  slot.updatedAt = new Date().toISOString();

  const session = {
    id: db.nextId('session', 'S'),
    userId: req.user.sub,
    zoneId: zone.id,
    slotId: slot.id,
    slotCode: slot.code,
    plateNumber: plate,
    reservationId: reservation ? reservation.id : null,
    tariffPerHour,
    status: 'active', // active | ended | paid
    startedAt: new Date().toISOString(),
    endedAt: null,
    durationMinutes: null,
    amount: null,
  };
  state.sessions.push(session);
  db.save();
  res.status(201).json({ event: 'SesiDimulai', session });
});

router.get('/sessions/me', (req, res) => {
  const data = db.load().sessions.filter((s) => s.userId === req.user.sub).reverse();
  res.json({ data, count: data.length });
});

router.get('/sessions/:id', (req, res) => {
  res.json(ensureOwner(db.load().sessions.find((s) => s.id === req.params.id), req));
});

// Check-out: hitung durasi (dibulatkan ke atas per jam) x tarif terkunci.
router.post('/sessions/:id/end', (req, res) => {
  const state = db.load();
  const s = ensureOwner(state.sessions.find((x) => x.id === req.params.id), req);
  if (s.status !== 'active') throw new HttpError(409, 'NOT_ACTIVE', `Sesi berstatus ${s.status}.`);
  const end = new Date();
  const minutes = Math.max(1, Math.ceil((end - new Date(s.startedAt)) / 60000));
  s.status = 'ended';
  s.endedAt = end.toISOString();
  s.durationMinutes = minutes;
  s.amount = Math.ceil(minutes / 60) * s.tariffPerHour;
  const slot = state.slots.find((x) => x.id === s.slotId);
  if (slot) {
    slot.status = 'free';
    slot.plateNumber = null;
    slot.updatedAt = end.toISOString();
  }
  db.save();
  res.json({ event: 'SesiSelesai', session: s });
});

// Pembayaran: ACL ke payment gateway. Di sini disimulasikan (mock) supaya bisa didemokan.
router.post('/sessions/:id/pay', (req, res) => {
  const body = validate(req.body, { method: { required: true, type: 'string', oneOf: ['qris', 'ewallet'] } });
  const state = db.load();
  const s = ensureOwner(state.sessions.find((x) => x.id === req.params.id), req);
  if (s.status !== 'ended') {
    throw new HttpError(409, 'NOT_PAYABLE', s.status === 'paid' ? 'Sesi sudah dibayar.' : 'Akhiri sesi dulu sebelum membayar.');
  }
  const payment = {
    id: db.nextId('payment', 'P'),
    sessionId: s.id,
    userId: s.userId,
    amount: s.amount,
    method: body.method,
    gatewayRef: `MOCK-${Date.now().toString(36).toUpperCase()}`,
    status: 'success',
    paidAt: new Date().toISOString(),
  };
  state.payments.push(payment);
  s.status = 'paid';
  db.save();
  res.status(201).json({ payment, session: s });
});

module.exports = router;
