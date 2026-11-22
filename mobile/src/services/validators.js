// Validasi form di sisi app (aturan sama dengan validasi di server).
export const PLATE_PATTERN = /^[A-Z]{1,2}\s?\d{1,4}\s?[A-Z]{0,3}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin({ email, password }) {
  const e = {};
  if (!email?.trim()) e.email = 'Email wajib diisi';
  else if (!EMAIL_PATTERN.test(email.trim())) e.email = 'Format email tidak valid';
  if (!password) e.password = 'Password wajib diisi';
  return e;
}

export function validateRegister({ name, email, password, confirm, plateNumber }) {
  const e = validateLogin({ email, password });
  if (!name?.trim()) e.name = 'Nama wajib diisi';
  else if (name.trim().length < 3) e.name = 'Nama minimal 3 karakter';
  if (password && password.length < 8) e.password = 'Password minimal 8 karakter';
  if (confirm !== password) e.confirm = 'Konfirmasi password tidak sama';
  if (plateNumber && !PLATE_PATTERN.test(plateNumber.trim())) e.plateNumber = 'Format plat contoh: D 1234 ABC';
  return e;
}

export function validatePlate(plateNumber) {
  if (!plateNumber?.trim()) return 'Plat nomor wajib diisi';
  if (!PLATE_PATTERN.test(plateNumber.trim())) return 'Format plat contoh: D 1234 ABC';
  return null;
}

export const normalizePlate = (p) => String(p || '').toUpperCase().replace(/\s+/g, ' ').trim();

export const rupiah = (n) => `Rp${Number(n || 0).toLocaleString('id-ID')}`;
