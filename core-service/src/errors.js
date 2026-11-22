class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Validasi sederhana: rules = { field: { required, type, min, max, pattern, oneOf } }
function validate(body, rules) {
  const errors = {};
  const data = body || {};
  for (const [field, r] of Object.entries(rules)) {
    const v = data[field];
    if (v === undefined || v === null || v === '') {
      if (r.required) errors[field] = 'wajib diisi';
      continue;
    }
    if (r.type === 'string' && typeof v !== 'string') errors[field] = 'harus berupa teks';
    else if (r.type === 'number' && (typeof v !== 'number' || Number.isNaN(v))) errors[field] = 'harus berupa angka';
    else if (r.type === 'boolean' && typeof v !== 'boolean') errors[field] = 'harus true/false';
    else if (r.min !== undefined && (typeof v === 'string' ? v.length : v) < r.min) errors[field] = `minimal ${r.min}`;
    else if (r.max !== undefined && (typeof v === 'string' ? v.length : v) > r.max) errors[field] = `maksimal ${r.max}`;
    else if (r.pattern && !r.pattern.test(String(v))) errors[field] = r.patternMessage || 'format tidak valid';
    else if (r.oneOf && !r.oneOf.includes(v)) errors[field] = `harus salah satu dari: ${r.oneOf.join(', ')}`;
  }
  if (Object.keys(errors).length) {
    throw new HttpError(422, 'VALIDATION_ERROR', 'Input tidak valid.', errors);
  }
  return data;
}

// Plat nomor Indonesia: 1-2 huruf, 1-4 angka, 0-3 huruf. Contoh: D 1234 ABC
const PLATE_PATTERN = /^[A-Z]{1,2}\s?\d{1,4}\s?[A-Z]{0,3}$/i;
function normalizePlate(p) {
  return String(p || '').toUpperCase().replace(/\s+/g, ' ').trim();
}

module.exports = { HttpError, validate, PLATE_PATTERN, normalizePlate };
