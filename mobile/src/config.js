// Atur lewat file .env di folder mobile (variabel EXPO_PUBLIC_* dibaca saat build).
// Contoh: EXPO_PUBLIC_API_URL=https://sebatskuy.site/api

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://sebatskuy.site/api';

// API kelompok lain (minimal 2). Ganti URL dan path sesuai dokumentasi kelompok tersebut.
export const PARTNER_APIS = [
  {
    key: 'partner1',
    name: process.env.EXPO_PUBLIC_PARTNER1_NAME || 'Kelompok Transportasi Publik',
    baseUrl: process.env.EXPO_PUBLIC_PARTNER1_URL || 'https://kelompok-a.stei.fun/api',
    path: process.env.EXPO_PUBLIC_PARTNER1_PATH || '/public/routes',
    apiKey: process.env.EXPO_PUBLIC_PARTNER1_KEY || '',
  },
  {
    key: 'partner2',
    name: process.env.EXPO_PUBLIC_PARTNER2_NAME || 'Kelompok Lingkungan Kota',
    baseUrl: process.env.EXPO_PUBLIC_PARTNER2_URL || 'https://kelompok-b.stei.fun/api',
    path: process.env.EXPO_PUBLIC_PARTNER2_PATH || '/public/air-quality',
    apiKey: process.env.EXPO_PUBLIC_PARTNER2_KEY || '',
  },
];

export const REQUEST_TIMEOUT_MS = 10000;
