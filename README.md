# ParkirIn Microservice

Tugas 2 Tugas Besar II3160 Teknologi Sistem Terintegrasi

ParkirIn adalah layanan parkir pintar kota (topik Smart City). Repositori ini berisi microservice inti yang berjalan di STB, gateway Nginx, Cloudflare Tunnel, dan aplikasi mobile Expo.

| Item | Nilai |
| --- | --- |
| Kelompok | Sebatskuy |
| Anggota | Muhammad Ghiffary Alfathan (18224084) 
Muhammad Arkan Dhaifullah (18224116) |
| URL publik | `https://sebatskuy.site` |
| Base URL API | `https://sebatskuy.site/api` |
| Repositori | [github.com/mgalfathan/TST-PAWM-SEBATSKUYY](https://github.com/mgalfathan/TST-PAWM-SEBATSKUYY) |

## 1. Arsitektur

```
 Aplikasi mobile (Expo)          Kelompok lain
          |                            |
          v                            v
 https://sebatskuy.site   (HTTPS, Cloudflare)
          |
   Cloudflare Tunnel  (container: tunnel, tanpa membuka port router)
          |
   Nginx gateway :80  (container: gateway, rate limit 10 req/s per IP)
          |
   core-service :3000 (container: core-service, Node.js + Express)
          |
   Volume parkirin-data  (/data/db.json)
```

Semua container berjalan di STB (Armbian + Docker) lewat `docker-compose.yml`.

| Container | Image | Batas memori | Batas CPU | Fungsi |
| --- | --- | --- | --- | --- |
| core-service | build `./core-service` (node:22-alpine) | 256 MB | 0.5 | API utama ParkirIn |
| gateway | nginx:1.28-alpine | 64 MB | 0.25 | Reverse proxy, rate limit |
| tunnel / tunnel-quick | cloudflare/cloudflared | 64 MB | 0.25 | Akses publik via Cloudflare (pilih salah satu profile) |

Pembagian modul di core-service mengikuti bounded context dari Tugas 1:

| Bounded context | Jenis | File | Prefix endpoint |
| --- | --- | --- | --- |
| Okupansi Slot | Core | `src/routes/zones.js` | `/api/zones`, `/api/slots` |
| Tarif Dinamis | Core | `src/domain.js`, `src/routes/zones.js` | `/api/zones/:id/tariff` |
| Reservasi & Sesi Parkir | Core | `src/routes/parking.js` | `/api/reservations`, `/api/sessions` |
| Penegakan Parkir | Supporting | `src/routes/enforcement.js` | `/api/enforcement` |
| Identitas & Akun | Generic | `src/routes/auth.js` | `/api/auth` |
| Pembayaran (mock, ACL) | Generic | `src/routes/parking.js` | `/api/sessions/:id/pay` |
| Open Host Service | Integrasi | `src/routes/public.js` | `/api/public` |

Aturan domain utama:

- Tarif per jam = tarif dasar x pengali okupansi (0.8 jika < 50%, 1.0 jika 50 sampai 80%, 1.5 jika > 80%), ditambah 0.2 pada jam sibuk WIB (07.00 sampai 09.00 dan 16.00 sampai 19.00). Hasilnya dibulatkan ke Rp500 dan dibatasi tarif minimum dan maksimum zona.
- Reservasi menahan satu slot selama 15 menit. Setelah lewat, reservasi kedaluwarsa dan slot dilepas.
- Tarif dikunci saat reservasi atau check-in. Biaya = durasi dibulatkan ke atas per jam x tarif terkunci.
- Slot yang terisi menurut sensor tetapi tidak punya sesi aktif masuk daftar pelanggaran.

## 2. Cara mendapat akses

### Autentikasi (JWT)

1. Login lewat `POST /api/auth/login` atau daftar lewat `POST /api/auth/register`.
2. Ambil `token` dari respons.
3. Kirim di setiap request: `Authorization: Bearer <token>`. Token berlaku 12 jam.

### Otorisasi (peran)

| Peran | Akun demo | Bisa mengakses |
| --- | --- | --- |
| driver | `driver@parkirin.id` / `parkirin123` | Zona, tarif, reservasi, sesi, pembayaran milik sendiri |
| officer | `petugas@parkirin.id` / `parkirin123` | Semua akses driver + penegakan + update sensor |
| admin | `admin@parkirin.id` / `parkirin123` | Semua akses + atur batas tarif zona |
| sensor | header `X-Sensor-Key` | Hanya `PATCH /api/slots/:id/sensor` |

Registrasi publik selalu mendapat peran `driver`. Data milik pengguna lain ditolak dengan `403`.

### Akses untuk kelompok lain

Endpoint `/api/public/*` terbuka tanpa login. Formatnya versi `v1` dan dijaga stabil (Open Host Service + Published Language).

## 3. Daftar endpoint

Semua endpoint diawali base URL `https://sebatskuy.site`.

| Method | Endpoint | Auth | Keterangan |
| --- | --- | --- | --- |
| GET | `/api/health` | Publik | Status service |
| GET | `/api/public/availability` | Publik | Ketersediaan semua zona. Query opsional `near=lat,lng` dan `radiusKm` |
| GET | `/api/public/availability/:zoneId` | Publik | Ketersediaan satu zona |
| POST | `/api/auth/register` | Publik | Daftar akun pengendara |
| POST | `/api/auth/login` | Publik | Login, mendapat JWT |
| GET | `/api/auth/me` | Login | Profil pengguna |
| POST | `/api/auth/me/vehicles` | Login | Tambah plat nomor kendaraan |
| GET | `/api/zones` | Login | Daftar zona. Query opsional `available=true` |
| GET | `/api/zones/:zoneId` | Login | Detail zona, tarif, status tiap slot |
| GET | `/api/zones/:zoneId/tariff` | Login | Rincian tarif dinamis |
| PUT | `/api/zones/:zoneId/tariff` | admin | Ubah tarif dasar dan batas tarif |
| PATCH | `/api/slots/:slotId/sensor` | sensor, officer, admin | Simulasi sensor atau ANPR mengubah status slot |
| POST | `/api/reservations` | Login | Buat reservasi |
| GET | `/api/reservations/me` | Login | Riwayat reservasi |
| POST | `/api/reservations/:id/cancel` | Pemilik | Batalkan reservasi |
| POST | `/api/sessions` | Login | Check-in, mulai sesi parkir |
| GET | `/api/sessions/me` | Login | Riwayat sesi |
| GET | `/api/sessions/:id` | Pemilik | Detail sesi |
| POST | `/api/sessions/:id/end` | Pemilik | Check-out, hitung biaya |
| POST | `/api/sessions/:id/pay` | Pemilik | Bayar (`qris` atau `ewallet`, simulasi) |
| GET | `/api/enforcement/violations` | officer, admin | Daftar kandidat pelanggaran |
| POST | `/api/enforcement/violations` | officer, admin | Catat tindakan (`teguran`, `tilang`, `derek`) |
| GET | `/api/enforcement/records` | officer, admin | Riwayat tindakan |

Format error selalu sama:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Input tidak valid.", "details": { "plateNumber": "format plat contoh: D 1234 ABC" } } }
```

| Status | Arti |
| --- | --- |
| 400 | Body atau query tidak valid |
| 401 | Belum login atau token salah |
| 403 | Peran tidak diizinkan atau bukan pemilik data |
| 404 | Data atau route tidak ditemukan |
| 409 | Konflik, misalnya zona penuh atau reservasi ganda |
| 422 | Validasi field gagal |
| 429 | Terlalu banyak request (rate limit gateway) |

## 4. Contoh request

Set variabel dulu:

```bash
BASE=https://sebatskuy.site/api
```

Login:

```bash
curl -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"driver@parkirin.id","password":"parkirin123"}'
```

```json
{ "token": "eyJhbGciOi...", "user": { "id": "U-1", "name": "Pengendara Demo", "role": "driver", "vehicles": ["D 1234 ABC"] } }
```

Daftar zona (simpan token di `TOKEN`):

```bash
curl $BASE/zones -H "Authorization: Bearer $TOKEN"
```

```json
{ "data": [ { "id": "Z-BRAGA", "name": "Jl. Braga", "totalSlots": 10, "freeSlots": 7, "occupancyRate": 0.3, "tariffPerHour": 4000 } ], "count": 4 }
```

Reservasi, check-in, check-out, bayar:

```bash
curl -X POST $BASE/reservations -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"zoneId":"Z-BRAGA","plateNumber":"D 1234 ABC"}'

curl -X POST $BASE/sessions -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"zoneId":"Z-BRAGA","plateNumber":"D 1234 ABC"}'

curl -X POST $BASE/sessions/S-0001/end -H "Authorization: Bearer $TOKEN"

curl -X POST $BASE/sessions/S-0001/pay -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"method":"qris"}'
```

Data publik untuk kelompok lain (tanpa token):

```bash
curl "$BASE/public/availability?near=-6.8932,107.6106&radiusKm=2"
```

```json
{ "version": "v1", "source": "ParkirIn", "data": [ { "zoneId": "Z-ITB", "name": "Jl. Ganesha (ITB)", "lat": -6.8932, "lng": 107.6106, "totalSlots": 8, "freeSlots": 5, "occupancyRate": 0.38, "tariffPerHour": 2500, "currency": "IDR", "distanceKm": 0 } ], "count": 3 }
```

Simulasi sensor:

```bash
curl -X PATCH $BASE/slots/Z-ITB-01/sensor -H "X-Sensor-Key: <SENSOR_API_KEY>" \
  -H "Content-Type: application/json" -d '{"occupied":true,"plateNumber":"B 99 ZZ"}'
```

## 5. Deploy di STB

Prasyarat: STB sudah Armbian, Docker dan Docker Compose terpasang.

```bash
git clone https://github.com/mgalfathan/TST-PAWM-SEBATSKUYY.git
cd TST-PAWM-SEBATSKUYY
cp .env.example .env
nano .env        # isi JWT_SECRET dan SENSOR_API_KEY
```

Pilih salah satu cara membuka akses publik:

| Profile | Kapan dipakai | URL |
| --- | --- | --- |
| `quick` | Cadangan kalau belum punya domain | `https://<acak>.trycloudflare.com`, berubah setiap restart |
| `token` | Tunnel di akun Cloudflare dengan domain (yang dipakai sekarang) | `https://sebatskuy.site` |

**Opsi A: quick tunnel (tanpa akun, tanpa token)**

```bash
docker compose --profile quick up -d --build
docker compose logs tunnel-quick | grep trycloudflare.com
curl https://<acak>.trycloudflare.com/api/health
```

**Opsi B: tunnel dengan token**

Isi `TUNNEL_TOKEN` di `.env`. Di dashboard Cloudflare Zero Trust, buka tunnel, Add route > Published application, hostname `sebatskuy.site`, Service URL `http://gateway:80`.

```bash
docker compose --profile quick down      # kalau sebelumnya pakai quick tunnel
docker compose --profile token up -d --build
curl https://sebatskuy.site/api/health
```

Port router tidak perlu dibuka di kedua opsi. Port `8080` di STB hanya untuk tes lokal (`curl http://localhost:8080/api/health`).

Perintah berguna:

| Perintah | Fungsi |
| --- | --- |
| `docker compose logs -f core-service` | Lihat log API |
| `docker compose restart core-service` | Restart API |
| `docker stats` | Pantau pemakaian memori dan CPU |
| `docker compose --profile quick down -v` | Hapus container dan data (reset ke data awal) |

## 6. Menjalankan tanpa Docker (pengembangan)

```bash
cd core-service
npm install
npm test         # 5 tes end-to-end
npm run dev      # http://localhost:3000
```

## 7. Struktur repositori

```
TST-PAWM-SEBATSKUYY/
  docker-compose.yml
  .env.example
  gateway/nginx.conf
  core-service/
    Dockerfile
    src/server.js, config.js, db.js, auth.js, domain.js, errors.js
    src/routes/auth.js, zones.js, parking.js, enforcement.js, public.js
    test/api.test.js
  mobile/            (aplikasi Expo, lihat mobile/README.md)
```

## 8. Batasan

- Data disimpan di file JSON pada volume Docker. Cukup untuk demo, belum untuk beban tinggi.
- Pembayaran masih simulasi. Di produksi diganti payment gateway melalui ACL yang sama.
- Sensor dan ANPR disimulasikan lewat endpoint `PATCH /api/slots/:id/sensor`.
