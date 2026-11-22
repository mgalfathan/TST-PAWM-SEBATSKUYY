// Penyimpanan sederhana berbasis file JSON (tanpa native dependency, aman di STB ARM).
// Data disimpan di volume Docker supaya tidak hilang saat container di-restart.
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('./config');

let state = null;
let saveTimer = null;

function seed() {
  const hash = (pw) => bcrypt.hashSync(pw, 10);
  const zones = [
    { id: 'Z-DAGO', name: 'Jl. Ir. H. Juanda (Dago)', lat: -6.8846, lng: 107.6133, baseTariff: 4000, minTariff: 3000, maxTariff: 8000, slots: 12 },
    { id: 'Z-BRAGA', name: 'Jl. Braga', lat: -6.9175, lng: 107.6097, baseTariff: 5000, minTariff: 3000, maxTariff: 10000, slots: 10 },
    { id: 'Z-ITB', name: 'Jl. Ganesha (ITB)', lat: -6.8932, lng: 107.6106, baseTariff: 3000, minTariff: 2000, maxTariff: 6000, slots: 8 },
    { id: 'Z-CIWALK', name: 'Gedung Parkir Cihampelas Walk', lat: -6.8935, lng: 107.6047, baseTariff: 5000, minTariff: 4000, maxTariff: 12000, slots: 15 },
  ];
  const slots = [];
  for (const z of zones) {
    for (let i = 1; i <= z.slots; i++) {
      // Sebagian slot dibuat terisi supaya data awal terlihat realistis.
      const occupied = (i * 7 + z.slots) % 3 === 0;
      slots.push({
        id: `${z.id}-${String(i).padStart(2, '0')}`,
        zoneId: z.id,
        code: `${z.id.replace('Z-', '')}-${String(i).padStart(2, '0')}`,
        status: occupied ? 'occupied' : 'free', // free | reserved | occupied
        plateNumber: occupied && i % 2 === 0 ? `D ${1000 + i} XX` : null,
        updatedAt: new Date().toISOString(),
      });
    }
    delete z.slots;
  }
  return {
    users: [
      { id: 'U-1', name: 'Pengendara Demo', email: 'driver@parkirin.id', passwordHash: hash('parkirin123'), role: 'driver', vehicles: ['D 1234 ABC'] },
      { id: 'U-2', name: 'Petugas Dishub', email: 'petugas@parkirin.id', passwordHash: hash('parkirin123'), role: 'officer', vehicles: [] },
      { id: 'U-3', name: 'Admin Kota', email: 'admin@parkirin.id', passwordHash: hash('parkirin123'), role: 'admin', vehicles: [] },
    ],
    zones,
    slots,
    reservations: [],
    sessions: [],
    payments: [],
    violations: [],
    counters: { user: 3, reservation: 0, session: 0, payment: 0, violation: 0 },
  };
}

function load() {
  if (state) return state;
  const file = path.resolve(config.dataFile);
  if (fs.existsSync(file)) {
    state = JSON.parse(fs.readFileSync(file, 'utf8'));
  } else {
    state = seed();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(state, null, 2));
  }
  return state;
}

// Tulis ke file dengan sedikit debounce, lewat file sementara supaya tidak korup.
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const file = path.resolve(config.dataFile);
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, file);
  }, 100);
}

function nextId(kind, prefix) {
  const db = load();
  db.counters[kind] = (db.counters[kind] || 0) + 1;
  return `${prefix}-${String(db.counters[kind]).padStart(4, '0')}`;
}

module.exports = { load, save, nextId, seed };
