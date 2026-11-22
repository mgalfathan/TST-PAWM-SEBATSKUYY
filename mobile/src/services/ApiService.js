// ApiService: satu tempat untuk semua panggilan HTTP.
// 1) Microservice sendiri (ParkirIn core-service di STB)
// 2) API minimal 2 kelompok lain (PARTNER_APIS di config.js)
import { API_BASE_URL, PARTNER_APIS, REQUEST_TIMEOUT_MS } from '../config';

let authToken = null;
let onUnauthorized = null;

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(url, { method = 'GET', body, token, headers = {} } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    if (!res.ok) {
      const err = data?.error || {};
      if (res.status === 401 && token && onUnauthorized) onUnauthorized();
      throw new ApiError(res.status, err.code || 'HTTP_ERROR', err.message || `Request gagal (${res.status})`, err.details);
    }
    return data;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e.name === 'AbortError') throw new ApiError(0, 'TIMEOUT', 'Server tidak merespons. Cek koneksi.');
    throw new ApiError(0, 'NETWORK_ERROR', 'Tidak bisa terhubung ke server.');
  } finally {
    clearTimeout(timer);
  }
}

const own = (path, opts = {}) => request(`${API_BASE_URL}${path}`, { token: authToken, ...opts });

const ApiService = {
  setToken(token) {
    authToken = token;
  },
  setUnauthorizedHandler(fn) {
    onUnauthorized = fn;
  },

  // ---------- Auth ----------
  login: (email, password) => own('/auth/login', { method: 'POST', body: { email, password } }),
  register: (payload) => own('/auth/register', { method: 'POST', body: payload }),
  me: () => own('/auth/me'),
  addVehicle: (plateNumber) => own('/auth/me/vehicles', { method: 'POST', body: { plateNumber } }),

  // ---------- Okupansi & tarif ----------
  getZones: (onlyAvailable = false) => own(`/zones${onlyAvailable ? '?available=true' : ''}`),
  getZone: (zoneId) => own(`/zones/${encodeURIComponent(zoneId)}`),
  getTariff: (zoneId) => own(`/zones/${encodeURIComponent(zoneId)}/tariff`),

  // ---------- Reservasi ----------
  createReservation: (zoneId, plateNumber) => own('/reservations', { method: 'POST', body: { zoneId, plateNumber } }),
  myReservations: () => own('/reservations/me'),
  cancelReservation: (id) => own(`/reservations/${id}/cancel`, { method: 'POST' }),

  // ---------- Sesi parkir & pembayaran ----------
  startSession: (zoneId, plateNumber) => own('/sessions', { method: 'POST', body: { zoneId, plateNumber } }),
  mySessions: () => own('/sessions/me'),
  endSession: (id) => own(`/sessions/${id}/end`, { method: 'POST' }),
  paySession: (id, method) => own(`/sessions/${id}/pay`, { method: 'POST', body: { method } }),

  // ---------- Open Host Service (data publik ParkirIn) ----------
  publicAvailability: (lat, lng, radiusKm = 2) =>
    request(`${API_BASE_URL}/public/availability?near=${lat},${lng}&radiusKm=${radiusKm}`),

  // ---------- API kelompok lain ----------
  partners: PARTNER_APIS,
  getPartner: (key) => {
    const p = PARTNER_APIS.find((x) => x.key === key);
    if (!p) throw new ApiError(0, 'UNKNOWN_PARTNER', `Partner ${key} tidak dikonfigurasi.`);
    return request(`${p.baseUrl}${p.path}`, { headers: p.apiKey ? { 'X-API-Key': p.apiKey } : {} });
  },
};

export default ApiService;
