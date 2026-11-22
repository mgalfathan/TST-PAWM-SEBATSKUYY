// Logika domain inti ParkirIn: okupansi, tarif dinamis, kedaluwarsa reservasi.
const config = require('./config');
const db = require('./db');

function zoneStats(zoneId) {
  const { slots } = db.load();
  const zs = slots.filter((s) => s.zoneId === zoneId);
  const free = zs.filter((s) => s.status === 'free').length;
  const total = zs.length;
  const occupancyRate = total ? Number(((total - free) / total).toFixed(2)) : 0;
  return { totalSlots: total, freeSlots: free, occupancyRate };
}

function isPeakHour(date = new Date()) {
  const hour = (date.getUTCHours() + config.timezoneOffsetHours) % 24;
  return (hour >= 7 && hour < 9) || (hour >= 16 && hour < 19);
}

// Tarif dinamis: tarif dasar x pengali okupansi (+20% jam sibuk), dibatasi regulasi min/max.
function computeTariff(zone, date = new Date()) {
  const { occupancyRate } = zoneStats(zone.id);
  let multiplier = occupancyRate < 0.5 ? 0.8 : occupancyRate <= 0.8 ? 1.0 : 1.5;
  const peak = isPeakHour(date);
  if (peak) multiplier += 0.2;
  const raw = zone.baseTariff * multiplier;
  const rounded = Math.round(raw / 500) * 500;
  const perHour = Math.min(zone.maxTariff, Math.max(zone.minTariff, rounded));
  return {
    zoneId: zone.id,
    baseTariff: zone.baseTariff,
    multiplier: Number(multiplier.toFixed(2)),
    peakHour: peak,
    occupancyRate,
    perHour,
    bounds: { min: zone.minTariff, max: zone.maxTariff },
    currency: 'IDR',
  };
}

// Reservasi yang lewat batas waktu tunggu dibatalkan otomatis dan slotnya dilepas.
function expireReservations() {
  const state = db.load();
  const now = Date.now();
  let changed = false;
  for (const r of state.reservations) {
    if (r.status === 'active' && new Date(r.expiresAt).getTime() < now) {
      r.status = 'expired';
      const slot = state.slots.find((s) => s.id === r.slotId);
      if (slot && slot.status === 'reserved') {
        slot.status = 'free';
        slot.updatedAt = new Date().toISOString();
      }
      changed = true;
    }
  }
  if (changed) db.save();
}

function zoneView(zone) {
  return {
    id: zone.id,
    name: zone.name,
    location: { lat: zone.lat, lng: zone.lng },
    ...zoneStats(zone.id),
    tariffPerHour: computeTariff(zone).perHour,
  };
}

module.exports = { zoneStats, computeTariff, expireReservations, zoneView, isPeakHour };
