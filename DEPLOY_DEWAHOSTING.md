# Deploy SinyalKita ke Dewahosting/cPanel

Project ini adalah Next.js + Prisma, jadi hosting harus mendukung Node.js app dan PostgreSQL. Upload static ke `public_html` saja tidak cukup karena app memakai API route, login JWT, dan database.

## 1. Siapkan di cPanel

1. Buka cPanel Dewahosting.
2. Pastikan ada menu Node.js App/Application Manager. Pakai Node.js 20 jika tersedia.
3. Buat database PostgreSQL, user database, dan password.
4. Catat host, port, nama database, user, dan password.

## 2. Environment

Isi environment variable di menu Node.js App atau file `.env` production:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public"
JWT_SECRET="ganti-dengan-random-secret-panjang"
NEXT_PUBLIC_API_URL="/api"
GROQ_API_KEY=""
GROQ_MODEL="llama-3.3-70b-versatile"
```

`JWT_SECRET` wajib diganti dengan string acak panjang. `GROQ_API_KEY` boleh kosong, tetapi fitur chat AI akan memakai fallback lokal.

## 3. Build dari lokal

Jalankan dari folder `client`:

```bash
npm install
npm run build
```

Build production memakai Next.js standalone. Output utama ada di:

```text
client/.next/standalone
client/.next/static
client/public
```

## 4. Upload ke hosting

Upload isi `client/.next/standalone` ke folder aplikasi Node.js di hosting, misalnya:

```text
/home/USERNAME/sinyalkita
```

Lalu salin juga:

```text
client/.next/static -> /home/USERNAME/sinyalkita/.next/static
client/public       -> /home/USERNAME/sinyalkita/public
client/prisma       -> /home/USERNAME/sinyalkita/prisma
```

Pastikan file `server.js` ada di root folder aplikasi hasil upload.

## 5. Setup Node.js App

Di cPanel Node.js App:

```text
Application root: sinyalkita
Application URL: domain kamu
Application startup file: server.js
Node environment: production
```

Jika cPanel memaksa startup file bernama `app.js`, buat salinan `server.js` menjadi `app.js` di folder aplikasi, lalu pakai `app.js` sebagai startup file.

## 6. Migrasi database

Masuk ke terminal cPanel pada folder aplikasi:

```bash
npx prisma migrate deploy
npx prisma db seed
```

Seed hanya perlu dijalankan sekali untuk membuat akun awal.

Akun default dari seed:

```text
Admin login: admin-sinyalkita
Admin password: admin123
Customer login: faisalriza00123
Customer password: pelanggan123
```

Ganti password setelah berhasil login.

## 7. Restart app

Restart lewat tombol Restart di Node.js App. Jika memakai Passenger manual, buat/touch file:

```bash
mkdir -p tmp
touch tmp/restart.txt
```

## Catatan penting

- Kalau menu Node.js App tidak ada, paket hosting itu belum cocok untuk app ini. Solusinya pindah ke paket yang support Node.js/VPS, atau deploy app ke Vercel lalu arahkan domain Dewahosting lewat DNS.
- Kalau database PostgreSQL tidak tersedia di hosting, pakai database eksternal seperti Supabase/Neon dan masukkan URL-nya ke `DATABASE_URL` dan `DIRECT_URL`.
- Jangan upload `.env` lokal yang berisi secret ke GitHub.
