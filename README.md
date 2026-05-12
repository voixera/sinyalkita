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
```

2. Siapkan environment:

```bash
cp client/.env.local.example client/.env.local
```

3. Buat project Supabase, lalu isi `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, dan `CLIENT_URL` di `client/.env.local`.

4. Generate Prisma, migrasi, dan seed:

```bash
npm --prefix client run prisma:generate
npm --prefix client run prisma:deploy
npm --prefix client run prisma:seed
```

5. Jalankan aplikasi:

```bash
npm run dev:client
```

Frontend: http://localhost:3000  
API lokal Next/Vercel: http://localhost:3000/api/health

## Environment: GitHub vs Vercel

File yang aman diupload ke GitHub hanya file contoh:

```txt
client/.env.local.example
```

File berisi key asli jangan diupload:

```txt
.env
client/.env.local
```

Karena frontend dan backend sekarang sama-sama berjalan di Vercel melalui Next.js API routes, `NEXT_PUBLIC_API_URL` tidak wajib diisi. Frontend otomatis memakai `/api`.

Di Vercel, set **Root Directory** ke:

```txt
client
```

Build command cukup default dari package `client`:

```txt
npm run build
```

Variabel untuk deploy Vercel disimpan di dashboard Vercel, bukan di repo GitHub:

```txt
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
JWT_SECRET=isi-dengan-random-secret-panjang
CLIENT_URL=https://sinyalkita.vercel.app
```

Untuk local development di `client/.env.local`:

```txt
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
JWT_SECRET=isi-dengan-random-secret-panjang
CLIENT_URL=http://localhost:3000
```

`DATABASE_URL`, `DIRECT_URL`, dan `JWT_SECRET` wajib rahasia. Jangan masukkan ke GitHub.

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

Data akun di atas dibuat oleh `npm --prefix client run prisma:seed` untuk local development. Aplikasi tidak memiliki mode demo di frontend; semua data pelanggan harus datang dari API Vercel dan Supabase Postgres.
