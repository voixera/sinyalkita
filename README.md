# SinyalKita

Portal resmi pelanggan SinyalKita untuk login, cek tagihan WiFi, pembayaran, riwayat, status layanan, dan panel admin internal. Tidak ada pendaftaran publik; akun pelanggan dibuat oleh admin.

## Stack

- Frontend: Next.js, React, TailwindCSS, Framer Motion
- Backend: Node.js, Express, Prisma ORM
- Database: Supabase Postgres
- Auth: JWT + role-based access

## Struktur

```txt
client/
  app/                 Next.js App Router pages
  components/          UI shell, toast, auth provider
  lib/                 API client, formatter, shared types
  public/images/       Asset visual landing
server/
  prisma/              Schema dan seed data
  src/controllers/     REST controller
  src/middleware/      JWT auth dan role guard
  src/routes/          Route modular
```

## Menjalankan

1. Install dependency:

```bash
npm install --prefix client
npm install --prefix server
```

2. Siapkan environment:

```bash
cp server/.env.example server/.env
cp client/.env.local.example client/.env.local
```

3. Buat project Supabase, lalu isi `DATABASE_URL` dan `DIRECT_URL` di `server/.env`.

4. Generate Prisma, migrasi, dan seed:

```bash
npm --prefix server run prisma:generate
npm --prefix server run prisma:deploy
npm --prefix server run prisma:seed
```

5. Jalankan backend dan frontend di terminal terpisah:

```bash
npm run dev:server
npm run dev:client
```

Frontend: http://localhost:3000  
Backend: http://localhost:4000

## Environment: GitHub vs Vercel

File yang aman diupload ke GitHub hanya file contoh:

```txt
server/.env.example
client/.env.local.example
```

File berisi key asli jangan diupload:

```txt
.env
server/.env
client/.env.local
```

Variabel untuk deploy Vercel disimpan di dashboard Vercel, bukan di repo GitHub:

```txt
NEXT_PUBLIC_API_URL=https://domain-backend-kamu.com/api
```

Variabel backend disimpan di server/hosting backend kamu:

```txt
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
JWT_SECRET=isi-dengan-random-secret-panjang
CLIENT_URL=https://domain-vercel-kamu.vercel.app
PORT=4000
```

`NEXT_PUBLIC_API_URL` boleh terlihat di browser karena memang public client config. `DATABASE_URL`, `DIRECT_URL`, dan `JWT_SECRET` wajib rahasia.

## Alur Admin

Admin login memakai akun seed atau akun admin yang dibuat langsung di database. Dari halaman `/admin`, admin dapat membuat akun pelanggan baru:

1. Isi nama pelanggan, nomor WhatsApp, alamat, paket, dan kata sandi awal.
2. Sistem membuat `ID login` otomatis dari nama pelanggan + nomor unik, misalnya `faisalriza00123`.
3. Admin menyalin credential dan membagikannya ke pelanggan satu per satu.
4. Pelanggan login memakai `ID login` dan kata sandi tersebut.

## Akun Seed Lokal

Admin seed lokal:

```txt
ID login: admin-sinyalkita
Password: admin123
```

Pelanggan seed lokal:

```txt
ID login: faisalriza00123
Password: pelanggan123
```

Data akun di atas dibuat oleh `npm --prefix server run prisma:seed` untuk local development. Aplikasi tidak memiliki mode demo di frontend; semua data pelanggan harus datang dari backend dan Supabase Postgres.
