// Bounded context: Identitas & Akun (generic)
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, requireAuth } = require('../auth');
const { HttpError, validate, PLATE_PATTERN, normalizePlate } = require('../errors');

const router = express.Router();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, vehicles: u.vehicles });

router.post('/register', (req, res) => {
  const body = validate(req.body, {
    name: { required: true, type: 'string', min: 3, max: 60 },
    email: { required: true, type: 'string', pattern: EMAIL, patternMessage: 'format email tidak valid' },
    password: { required: true, type: 'string', min: 8, max: 64 },
    plateNumber: { type: 'string', pattern: PLATE_PATTERN, patternMessage: 'format plat contoh: D 1234 ABC' },
  });
  const state = db.load();
  const email = body.email.toLowerCase().trim();
  if (state.users.some((u) => u.email === email)) {
    throw new HttpError(409, 'EMAIL_TAKEN', 'Email sudah terdaftar.');
  }
  const user = {
    id: db.nextId('user', 'U'),
    name: body.name.trim(),
    email,
    passwordHash: bcrypt.hashSync(body.password, 10),
    role: 'driver', // registrasi publik selalu jadi pengendara
    vehicles: body.plateNumber ? [normalizePlate(body.plateNumber)] : [],
  };
  state.users.push(user);
  db.save();
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const body = validate(req.body, {
    email: { required: true, type: 'string' },
    password: { required: true, type: 'string' },
  });
  const user = db.load().users.find((u) => u.email === body.email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(body.password, user.passwordHash)) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email atau password salah.');
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.load().users.find((u) => u.id === req.user.sub);
  if (!user) throw new HttpError(404, 'NOT_FOUND', 'User tidak ditemukan.');
  res.json(publicUser(user));
});

router.post('/me/vehicles', requireAuth, (req, res) => {
  const body = validate(req.body, {
    plateNumber: { required: true, type: 'string', pattern: PLATE_PATTERN, patternMessage: 'format plat contoh: D 1234 ABC' },
  });
  const user = db.load().users.find((u) => u.id === req.user.sub);
  const plate = normalizePlate(body.plateNumber);
  if (!user.vehicles.includes(plate)) user.vehicles.push(plate);
  db.save();
  res.status(201).json(publicUser(user));
});

module.exports = router;
