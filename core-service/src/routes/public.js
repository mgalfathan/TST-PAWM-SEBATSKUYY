// Open Host Service + Published Language untuk kelompok lain (tanpa login).
// Format ini dijaga stabil (versi v1) supaya integrasi kelompok lain tidak rusak.
const express = require('express');
const db = require('../db');
const { HttpError } = require('../errors');
const { zoneView, expireReservations } = require('../domain');

const router = express.Router();

function toPublished(z) {
  return {
    zoneId: z.id,
    name: z.name,
    lat: z.location.lat,
    lng: z.location.lng,
    totalSlots: z.totalSlots,
    freeSlots: z.freeSlots,
    occupancyRate: z.occupancyRate,
    tariffPerHour: z.tariffPerHour,
    currency: 'IDR',
    updatedAt: new Date().toISOString(),
  };
}

// GET /api/public/availability?near=-6.89,107.61&radiusKm=2
router.get('/availability', (req, res) => {
  expireReservations();
  let zones = db.load().zones.map(zoneView).map(toPublished);
  if (req.query.near) {
    const [lat, lng] = String(req.query.near).split(',').map(Number);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new HttpError(400, 'BAD_QUERY', 'Format near: lat,lng (contoh -6.89,107.61).');
    }
    const radius = Number(req.query.radiusKm || 2);
    zones = zones
      .map((z) => ({ ...z, distanceKm: Number(haversine(lat, lng, z.lat, z.lng).toFixed(2)) }))
      .filter((z) => z.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }
  res.json({ version: 'v1', source: 'ParkirIn', data: zones, count: zones.length });
});

router.get('/availability/:zoneId', (req, res) => {
  expireReservations();
  const zone = db.load().zones.find((z) => z.id === req.params.zoneId);
  if (!zone) throw new HttpError(404, 'ZONE_NOT_FOUND', 'Zona tidak ditemukan.');
  res.json({ version: 'v1', source: 'ParkirIn', data: toPublished(zoneView(zone)) });
});

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

module.exports = router;
