// Bounded context: Okupansi Slot (core) + Tarif Dinamis (core)
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole, requireSensorOrStaff } = require('../auth');
const { HttpError, validate, PLATE_PATTERN, normalizePlate } = require('../errors');
const { computeTariff, expireReservations, zoneView } = require('../domain');

const router = express.Router();

function findZone(id) {
  const zone = db.load().zones.find((z) => z.id === id);
  if (!zone) throw new HttpError(404, 'ZONE_NOT_FOUND', `Zona ${id} tidak ditemukan.`);
  return zone;
}

// GET /api/zones?available=true
router.get('/zones', requireAuth, (req, res) => {
  expireReservations();
  let zones = db.load().zones.map(zoneView);
  if (req.query.available === 'true') zones = zones.filter((z) => z.freeSlots > 0);
  res.json({ data: zones, count: zones.length });
});

router.get('/zones/:zoneId', requireAuth, (req, res) => {
  expireReservations();
  const zone = findZone(req.params.zoneId);
  const slots = db.load().slots
    .filter((s) => s.zoneId === zone.id)
    .map(({ id, code, status, updatedAt }) => ({ id, code, status, updatedAt }));
  res.json({ ...zoneView(zone), tariff: computeTariff(zone), slots });
});

router.get('/zones/:zoneId/tariff', requireAuth, (req, res) => {
  res.json(computeTariff(findZone(req.params.zoneId)));
});

// Admin kota mengatur batas tarif sesuai regulasi.
router.put('/zones/:zoneId/tariff', requireAuth, requireRole('admin'), (req, res) => {
  const zone = findZone(req.params.zoneId);
  const body = validate(req.body, {
    baseTariff: { type: 'number', min: 0 },
    minTariff: { type: 'number', min: 0 },
    maxTariff: { type: 'number', min: 0 },
  });
  const next = { ...zone, ...body };
  if (next.minTariff > next.maxTariff) {
    throw new HttpError(422, 'VALIDATION_ERROR', 'minTariff tidak boleh lebih besar dari maxTariff.');
  }
  Object.assign(zone, body);
  db.save();
  res.json(computeTariff(zone));
});

// Simulasi sensor IoT / kamera ANPR: ubah status fisik slot.
router.patch('/slots/:slotId/sensor', requireSensorOrStaff, (req, res) => {
  const body = validate(req.body, {
    occupied: { required: true, type: 'boolean' },
    plateNumber: { type: 'string', pattern: PLATE_PATTERN, patternMessage: 'format plat contoh: D 1234 ABC' },
  });
  const slot = db.load().slots.find((s) => s.id === req.params.slotId);
  if (!slot) throw new HttpError(404, 'SLOT_NOT_FOUND', 'Slot tidak ditemukan.');
  slot.status = body.occupied ? 'occupied' : 'free';
  slot.plateNumber = body.occupied && body.plateNumber ? normalizePlate(body.plateNumber) : null;
  slot.updatedAt = new Date().toISOString();
  db.save();
  // Domain event: OkupansiSlotBerubah
  res.json({ event: 'OkupansiSlotBerubah', slot });
});

module.exports = router;
