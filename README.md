# 🖼️ MyGallery — Galeri Pribadi Foto & Video

Galeri foto dan video pribadi dengan autentikasi penuh, album management, dan penyimpanan di MEGA.nz.

## Stack
- **Frontend**: React + Vite + Tailwind CSS
- **Database & Auth**: Supabase
- **File Storage**: MEGA.nz (via Edge Function)
- **Hosting**: Cloudflare Pages

---

## 🚀 PANDUAN SETUP LENGKAP

### LANGKAH 1 — Setup Supabase

1. Buka [supabase.com](https://supabase.com) → New Project
2. Catat `Project URL` dan `anon key` (Settings > API)
3. Pergi ke **SQL Editor** → paste semua isi `supabase/schema.sql` → Run
4. Buat akun login kamu di **Authentication > Users > Add User**
   - Masukkan email dan password
   - Pastikan "Auto Confirm User" diaktifkan

### LANGKAH 2 — Setup MEGA.nz

1. Buat akun MEGA di [mega.nz](https://mega.nz) (gratis 20GB)
2. Gunakan email & password akun MEGA ini untuk langkah berikutnya

### LANGKAH 3 — Deploy Supabase Edge Function

Install Supabase CLI jika belum:
```bash
npm install -g supabase
```

Login dan link project:
```bash
supabase login
supabase link --project-ref primomvlsachqdqzuelv
# PROJECT_ID ada di Settings > General
```

Set MEGA credentials sebagai secret (TIDAK di-expose ke public):
```bash
supabase secrets set MEGA_EMAIL=uleuwol@gmail.com
supabase secrets set MEGA_PASSWORD=@Mega2026
```

Deploy edge function:
```bash
supabase functions deploy mega-proxy
```

Verifikasi function sudah aktif di: **Supabase Dashboard > Edge Functions**

### LANGKAH 4 — Setup Project Lokal

Clone/download project ini, lalu:

```bash
cd mygallery
npm install
```

Buat file `.env` dari template:
```bash
cp .env.example .env
```

Edit `.env` dan isi:
```env
VITE_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Test lokal:
```bash
npm run dev
```

Buka `http://localhost:5173` → Login dengan email/password yang kamu buat di Supabase.

### LANGKAH 5 — Deploy ke Cloudflare Pages

**Opsi A: Via Git (Direkomendasikan)**

1. Push project ke GitHub/GitLab
2. Buka [Cloudflare Pages](https://pages.cloudflare.com)
3. **Create a project** → Connect to Git → Pilih repo
4. Build settings:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. **Environment Variables** → Tambahkan:
   - `VITE_SUPABASE_URL` = URL Supabase kamu
   - `VITE_SUPABASE_ANON_KEY` = Anon key Supabase kamu
6. Klik **Save and Deploy**

**Opsi B: Via Wrangler CLI**
```bash
npm install -g wrangler
npm run build
wrangler pages deploy dist --project-name mygallery
```

### LANGKAH 6 — Konfigurasi Auth Redirect URL

Di **Supabase Dashboard > Authentication > URL Configuration**:

- **Site URL**: `https://mygallery.pages.dev` (URL Cloudflare Pages kamu)
- **Redirect URLs**: tambahkan `https://mygallery.pages.dev/**`

---

## 📁 Struktur Project

```
mygallery/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx          # Header navigasi
│   │   ├── AlbumCard.jsx       # Card album di grid
│   │   ├── AlbumModal.jsx      # Modal buat/edit album
│   │   ├── UploadModal.jsx     # Modal upload dengan drag-drop
│   │   ├── MediaLightbox.jsx   # Viewer foto/video fullscreen
│   │   ├── ProtectedRoute.jsx  # Guard route auth
│   │   └── LoadingScreen.jsx   # Loading splash
│   ├── pages/
│   │   ├── LoginPage.jsx       # Halaman login
│   │   ├── GalleryPage.jsx     # Halaman utama (semua album)
│   │   ├── AlbumPage.jsx       # Halaman isi album
│   │   └── ResetPasswordPage.jsx
│   ├── store/
│   │   ├── authStore.js        # State autentikasi (Zustand)
│   │   └── galleryStore.js     # State galeri (Zustand)
│   ├── lib/
│   │   ├── supabase.js         # Supabase client
│   │   ├── mega.js             # MEGA.nz integration
│   │   └── dateUtils.js        # Date formatting
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── supabase/
│   ├── schema.sql              # ⭐ Jalankan ini di Supabase SQL Editor
│   └── functions/
│       └── mega-proxy/
│           └── index.ts        # ⭐ Deploy ini sebagai Edge Function
├── public/
│   └── _redirects              # Cloudflare Pages SPA routing
├── .env.example
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## 🔐 Arsitektur Keamanan

```
Browser (React App)
    │
    ├── Login/Auth → Supabase Auth (JWT token)
    │
    ├── CRUD Album/Media → Supabase Database (RLS: hanya owner)
    │
    └── Upload/Stream File → Supabase Edge Function (mega-proxy)
                                    │
                                    └── MEGA.nz API (credentials disimpan
                                        sebagai Supabase Secret, tidak
                                        pernah ter-expose ke browser)
```

**Kenapa aman?**
- MEGA email & password **TIDAK pernah** ada di kode frontend
- Semua operasi MEGA melalui Edge Function yang diproteksi JWT
- Row Level Security di Supabase: data hanya bisa diakses oleh pemilik
- Supabase Auth mengelola session & refresh token otomatis

---

## 🎨 Fitur

- ✅ Login/Logout dengan email & password
- ✅ Lupa password (reset via email)
- ✅ Buat, edit, hapus album
- ✅ Upload foto & video (drag & drop, multi-file, hingga 500MB)
- ✅ Chunked upload untuk file besar
- ✅ Streaming video langsung dari MEGA
- ✅ Lightbox viewer foto & video dengan navigasi keyboard
- ✅ Edit judul foto/video
- ✅ Filter foto/video dalam album
- ✅ Pilihan ukuran grid (2-5 kolom)
- ✅ Animasi & transisi halus
- ✅ Responsive (mobile-friendly)

---

## 🐛 Troubleshooting

**"MEGA credentials tidak dikonfigurasi"**
→ Pastikan `supabase secrets set MEGA_EMAIL=...` sudah dijalankan dan function di-redeploy

**"File tidak ditemukan di MEGA"**
→ Kemungkinan nodeId tidak valid; coba hapus dan upload ulang

**Login gagal**
→ Pastikan user sudah dibuat di Supabase Authentication > Users

**Upload gagal di production**
→ Cek Cloudflare Pages environment variables sudah diset dengan benar

---

## 📦 Format File yang Didukung

| Kategori | Format |
|----------|--------|
| Foto | JPG, PNG, WebP, GIF, HEIC, HEIF |
| Video | MP4, MOV, WebM, MKV, AVI |
| Ukuran maks | 500MB per file |
