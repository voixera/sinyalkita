# SinyalKita

Portal resmi pelanggan SinyalKita untuk login, cek tagihan WiFi, pembayaran, riwayat, status layanan, dan panel admin internal. Tidak ada pendaftaran publik; akun pelanggan dibuat oleh admin.

## Stack

- Frontend: Next.js, React, TailwindCSS, Framer Motion
- Backend: Node.js, Express, Prisma ORM
- Database: PostgreSQL
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

3. Jalankan PostgreSQL dan pastikan `DATABASE_URL` di `server/.env` sesuai.

4. Generate Prisma, migrasi, dan seed:

```bash
npm --prefix server run prisma:generate
npm --prefix server run prisma:migrate
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
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_SECRET=isi-dengan-random-secret-panjang
CLIENT_URL=https://domain-vercel-kamu.vercel.app
PORT=4000
```

`NEXT_PUBLIC_API_URL` boleh terlihat di browser karena memang public client config. `DATABASE_URL` dan `JWT_SECRET` wajib rahasia.

## Akun Seed Lokal

Pelanggan:

```txt
Email: faisal@sinyalkita.test
Password: pelanggan123
```

Admin:

```txt
Email: admin@sinyalkita.test
Password: admin123
```

Data akun di atas dibuat oleh `npm --prefix server run prisma:seed` untuk local development. Aplikasi tidak memiliki mode demo di frontend; semua data pelanggan harus datang dari backend dan PostgreSQL.
