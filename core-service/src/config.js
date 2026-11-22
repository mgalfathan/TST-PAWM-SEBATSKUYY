// Semua konfigurasi dibaca dari environment (.env di docker-compose).
const config = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-ganti-di-env',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  sensorApiKey: process.env.SENSOR_API_KEY || 'dev-sensor-key',
  dataFile: process.env.DATA_FILE || './data/db.json',
  reservationHoldMinutes: Number(process.env.RESERVATION_HOLD_MINUTES || 15),
  timezoneOffsetHours: 7, // WIB, dipakai untuk menentukan jam sibuk
};

if (process.env.NODE_ENV === 'production' && config.jwtSecret.startsWith('dev-only')) {
  console.warn('[config] JWT_SECRET belum diset. Set di .env sebelum deploy.');
}

module.exports = config;
