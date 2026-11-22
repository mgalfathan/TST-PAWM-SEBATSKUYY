const jwt = require('jsonwebtoken');
const config = require('./config');
const { HttpError } = require('./errors');

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, name: user.name }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

// Authentication: wajib membawa header Authorization: Bearer <token>.
function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, 'UNAUTHORIZED', 'Token tidak ada. Login dulu di /api/auth/login.'));
  }
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    next(new HttpError(401, 'INVALID_TOKEN', 'Token tidak valid atau sudah kedaluwarsa.'));
  }
}

// Authorization: batasi endpoint berdasarkan peran (driver, officer, admin).
function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new HttpError(403, 'FORBIDDEN', `Endpoint ini hanya untuk peran: ${roles.join(', ')}.`));
    }
    next();
  };
}

// Sensor IoT memakai API key, bukan JWT. Petugas/admin dengan JWT juga boleh.
function requireSensorOrStaff(req, res, next) {
  if (req.headers['x-sensor-key'] && req.headers['x-sensor-key'] === config.sensorApiKey) {
    req.user = { sub: 'SENSOR', role: 'sensor' };
    return next();
  }
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    requireRole('officer', 'admin')(req, res, next);
  });
}

module.exports = { signToken, requireAuth, requireRole, requireSensorOrStaff };
