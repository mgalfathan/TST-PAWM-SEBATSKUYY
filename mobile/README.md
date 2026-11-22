# ParkirIn Mobile (Expo)

Aplikasi React Native (Expo SDK 58, Expo Router) untuk ParkirIn.

## Fitur

| Layar | Navigasi | Isi |
| --- | --- | --- |
| Login | Stack | Form email dan password dengan validasi |
| Daftar | Stack | Form registrasi dengan validasi (nama, email, password, konfirmasi, plat) |
| Cari Parkir | Tab | Daftar zona, slot kosong, tarif, filter zona kosong |
| Detail Zona | Stack | Tarif dinamis, status tiap slot, tombol reservasi dan check-in |
| Reservasi | Stack | Form plat nomor dengan validasi |
| Check-in | Stack | Form plat nomor dengan validasi |
| Aktivitas | Tab | Sesi dan reservasi, akhiri parkir, bayar, batalkan |
| Info Kota | Tab | Data parkir publik ParkirIn + API 2 kelompok lain |
| Profil | Tab | Data akun, tambah kendaraan, keluar |

Semua panggilan HTTP ada di `src/services/ApiService.js`:

- Microservice sendiri: auth, zona, tarif, reservasi, sesi, pembayaran.
- API kelompok lain: `getPartner('partner1')` dan `getPartner('partner2')`, URL diatur di `.env`.

## Menjalankan

```bash
cd mobile
npm install
cp .env.example .env     # isi URL API sendiri dan API kelompok lain
npx expo start
```

Scan QR dengan Expo Go (Android/iOS), atau tekan `w` untuk versi web.

## Akun demo

| Email | Password | Peran |
| --- | --- | --- |
| driver@parkirin.id | parkirin123 | Pengendara |
| petugas@parkirin.id | parkirin123 | Petugas Dishub |
| admin@parkirin.id | parkirin123 | Admin kota |

## Struktur

```
src/
  app/                 rute Expo Router (setiap file = layar)
    _layout.js         Stack + proteksi login
    login.js, register.js, reserve.js, checkin.js
    zone/[id].js
    (tabs)/_layout.js  Tabs
    (tabs)/index.js, activity.js, city.js, profile.js
  services/ApiService.js, storage.js, validators.js
  context/AuthContext.js
  components/ui.js, PlateForm.js
  config.js
```
