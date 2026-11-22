// Tes end-to-end: node --test test/
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'parkirin-')), 'db.json');
process.env.SENSOR_API_KEY = 'test-sensor';
const app = require('../src/server');

let server;
let base;
before(() => new Promise((r) => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}/api`; r(); }); }));
after(() => server.close());

async function call(method, url, { token, body, headers = {} } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}

let driver;
let officer;

test('health & public availability tanpa login', async () => {
  assert.equal((await call('GET', '/health')).status, 200);
  const pub = await call('GET', '/public/availability?near=-6.893,107.611&radiusKm=1');
  assert.equal(pub.status, 200);
  assert.equal(pub.body.version, 'v1');
  assert.ok(pub.body.data.every((z) => z.distanceKm <= 1));
});

test('auth: login, validasi register, role', async () => {
  const bad = await call('POST', '/auth/login', { body: { email: 'driver@parkirin.id', password: 'salah' } });
  assert.equal(bad.status, 401);
  driver = (await call('POST', '/auth/login', { body: { email: 'driver@parkirin.id', password: 'parkirin123' } })).body.token;
  officer = (await call('POST', '/auth/login', { body: { email: 'petugas@parkirin.id', password: 'parkirin123' } })).body.token;
  assert.ok(driver && officer);
  const reg = await call('POST', '/auth/register', { body: { name: 'A', email: 'bukan-email', password: '123' } });
  assert.equal(reg.status, 422);
  assert.ok(reg.body.error.details.email && reg.body.error.details.password && reg.body.error.details.name);
  assert.equal((await call('GET', '/zones')).status, 401);
  assert.equal((await call('GET', '/enforcement/violations', { token: driver })).status, 403);
});

test('alur reservasi -> check-in -> check-out -> bayar', async () => {
  const zones = await call('GET', '/zones', { token: driver });
  assert.equal(zones.status, 200);
  const zone = zones.body.data.find((z) => z.freeSlots > 0);
  const before = zone.freeSlots;

  const r = await call('POST', '/reservations', { token: driver, body: { zoneId: zone.id, plateNumber: 'd 1234 abc' } });
  assert.equal(r.status, 201);
  assert.equal(r.body.reservation.plateNumber, 'D 1234 ABC');
  const dup = await call('POST', '/reservations', { token: driver, body: { zoneId: zone.id, plateNumber: 'D 1234 ABC' } });
  assert.equal(dup.status, 409);
  const after = await call('GET', `/zones/${zone.id}`, { token: driver });
  assert.equal(after.body.freeSlots, before - 1);

  const s = await call('POST', '/sessions', { token: driver, body: { zoneId: zone.id, plateNumber: 'D 1234 ABC' } });
  assert.equal(s.status, 201);
  assert.equal(s.body.session.slotId, r.body.reservation.slotId);
  assert.equal((await call('POST', `/sessions/${s.body.session.id}/pay`, { token: driver, body: { method: 'qris' } })).status, 409);

  const end = await call('POST', `/sessions/${s.body.session.id}/end`, { token: driver });
  assert.equal(end.status, 200);
  assert.equal(end.body.session.amount, s.body.session.tariffPerHour);
  const pay = await call('POST', `/sessions/${s.body.session.id}/pay`, { token: driver, body: { method: 'qris' } });
  assert.equal(pay.status, 201);
  assert.equal(pay.body.session.status, 'paid');
});

test('sensor + penegakan', async () => {
  assert.equal((await call('PATCH', '/slots/Z-ITB-01/sensor', { body: { occupied: true } })).status, 401);
  const sensor = await call('PATCH', '/slots/Z-ITB-01/sensor', { headers: { 'X-Sensor-Key': 'test-sensor' }, body: { occupied: true, plateNumber: 'B 99 ZZ' } });
  assert.equal(sensor.status, 200);
  const v = await call('GET', '/enforcement/violations', { token: officer });
  assert.ok(v.body.data.some((x) => x.slotId === 'Z-ITB-01'));
  const rec = await call('POST', '/enforcement/violations', { token: officer, body: { slotId: 'Z-ITB-01', action: 'teguran' } });
  assert.equal(rec.status, 201);
});

test('tarif dinamis tetap dalam batas regulasi', async () => {
  const zones = (await call('GET', '/zones', { token: driver })).body.data;
  for (const z of zones) {
    const t = (await call('GET', `/zones/${z.id}/tariff`, { token: driver })).body;
    assert.ok(t.perHour >= t.bounds.min && t.perHour <= t.bounds.max);
  }
});
