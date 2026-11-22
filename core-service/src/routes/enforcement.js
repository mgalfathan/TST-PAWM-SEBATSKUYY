// Bounded context: Penegakan Parkir (supporting)
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../auth');
const { HttpError, validate } = require('../errors');

const router = express.Router();
router.use(requireAuth, requireRole('officer', 'admin'));

// Slot terisi (menurut sensor) tanpa sesi aktif = kandidat pelanggaran.
router.get('/violations', (req, res) => {
  const state = db.load();
  const activePlates = new Set(state.sessions.filter((s) => s.status === 'active').map((s) => s.slotId));
  const candidates = state.slots
    .filter((s) => s.status === 'occupied' && !activePlates.has(s.id))
    .map((s) => {
      const zone = state.zones.find((z) => z.id === s.zoneId);
      return {
        slotId: s.id,
        slotCode: s.code,
        zoneId: s.zoneId,
        zoneName: zone ? zone.name : null,
        plateNumber: s.plateNumber,
        since: s.updatedAt,
        minutes: Math.round((Date.now() - new Date(s.updatedAt)) / 60000),
      };
    })
    .filter((v) => !req.query.zoneId || v.zoneId === req.query.zoneId);
  res.json({ data: candidates, count: candidates.length });
});

// Petugas mencatat tindakan di lapangan. Domain event: PelanggaranTercatat
router.post('/violations', (req, res) => {
  const body = validate(req.body, {
    slotId: { required: true, type: 'string' },
    action: { required: true, type: 'string', oneOf: ['teguran', 'tilang', 'derek'] },
    note: { type: 'string', max: 200 },
  });
  const state = db.load();
  const slot = state.slots.find((s) => s.id === body.slotId);
  if (!slot) throw new HttpError(404, 'SLOT_NOT_FOUND', 'Slot tidak ditemukan.');
  const violation = {
    id: db.nextId('violation', 'V'),
    slotId: slot.id,
    zoneId: slot.zoneId,
    plateNumber: slot.plateNumber,
    action: body.action,
    note: body.note || null,
    officerId: req.user.sub,
    createdAt: new Date().toISOString(),
  };
  state.violations.push(violation);
  db.save();
  res.status(201).json({ event: 'PelanggaranTercatat', violation });
});

router.get('/records', (_req, res) => {
  const data = db.load().violations.slice().reverse();
  res.json({ data, count: data.length });
});

module.exports = router;
