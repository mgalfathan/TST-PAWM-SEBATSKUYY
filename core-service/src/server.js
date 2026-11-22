const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const db = require('./db');
const { HttpError } = require('./errors');

const app = express();
app.set('trust proxy', true); // di belakang nginx + cloudflared
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50kb' }));

// Log request singkat
app.use((req, res, next) => {
  const t = Date.now();
  res.on('finish', () => console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - t}ms`));
  next();
});

app.get('/', (_req, res) => {
  res.json({
    service: 'ParkirIn core-service',
    version: '1.0.0',
    docs: 'Lihat README.pdf di repositori',
    endpoints: {
      health: 'GET /api/health',
      auth: '/api/auth/*',
      zones: '/api/zones',
      reservations: '/api/reservations',
      sessions: '/api/sessions',
      enforcement: '/api/enforcement/*',
      public: 'GET /api/public/availability',
    },
  });
});

app.get('/api/health', (_req, res) => {
  const state = db.load();
  res.json({ status: 'ok', uptimeSec: Math.round(process.uptime()), zones: state.zones.length, time: new Date().toISOString() });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/public', require('./routes/public'));
app.use('/api', require('./routes/zones'));
app.use('/api/enforcement', require('./routes/enforcement'));
app.use('/api', require('./routes/parking'));

app.use((req, _res, next) => next(new HttpError(404, 'NOT_FOUND', `Route ${req.method} ${req.path} tidak ada.`)));

// Format error seragam: { error: { code, message, details } }
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') err = new HttpError(400, 'BAD_JSON', 'Body bukan JSON yang valid.');
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: { code: err.code || 'INTERNAL_ERROR', message: status >= 500 ? 'Terjadi kesalahan di server.' : err.message, details: err.details },
  });
});

if (require.main === module) {
  db.load();
  app.listen(config.port, () => console.log(`ParkirIn core-service jalan di port ${config.port}`));
}

module.exports = app;
