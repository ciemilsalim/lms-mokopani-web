# 🎓 LMS Mokopani Web — Kurikulum Merdeka AI Platform

LMS Mokopani Web adalah platform Learning Management System (LMS) modern berbasis web yang dirancang khusus untuk mendukung implementasi **Kurikulum Merdeka** di Indonesia. Platform ini diperkuat oleh kecerdasan buatan (**Google Gemini API**) untuk mendesain pembelajaran secara cerdas, mengurutkan Tujuan Pembelajaran secara adaptif, dan mendeteksi performa belajar siswa secara dini.

Aplikasi ini menggunakan perpaduan teknologi terkini (Laravel, Inertia, React, dan Tailwind CSS v4) untuk menyajikan performa tinggi dengan estetika visual kelas premium.

---

## 🛠️ Premium Tech Stack

Platform ini dibangun menggunakan arsitektur modern bertaraf industri:

* **Backend Framework**: [Laravel 11](https://laravel.com) (PHP 8.2+)
* **Frontend Bridge**: [Inertia.js v2.0](https://inertiajs.com) (Server-Side Rendering & Single Page Application feel)
* **Frontend Framework**: [React v19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
* **Styling & Design System**: [Tailwind CSS v4](https://tailwindcss.com) (Modern utility-first & lightning-fast compilation)
* **Build Tool**: [Vite](https://vite.dev)
* **Database**: SQLite (Sangat portabel & cepat untuk deployment lokal)
* **AI Orchestrator**: [Google Gemini AI v2.0 Flash](https://aistudio.google.com/) (Melalui `GeminiApiService`)

---

## ✨ Fitur Ungkapan & Kemampuan Utama

LMS Mokopani Web menyediakan ekosistem terintegrasi bagi **Guru, Siswa,** dan **Orang Tua**:

### 👨‍🏫 Untuk Guru (Kurikulum Merdeka Hub)
* **Smart Instructional Design Orchestrator**: Pembuatan Alur Rencana Pelaksanaan Pembelajaran (RPP / Modul Ajar) dan Lembar Kerja Peserta Didik (LKPD) sekali klik dibantu AI (Gemini).
* **Manajemen CP & TP**: Penyusunan Capaian Pembelajaran (CP) dan Tujuan Pembelajaran (TP) secara digital, lengkap dengan fitur *Auto-Sequence* berbasis Taksonomi Bloom.
* **Smart Assessment**: Pembuatan instrumen penilaian Diagnostik Awal, Formatif (seperti *Reflective Journal, Exit Ticket, Peer Assessment*), dan Sumatif (*Written Test, Project-based*).
* **Remedial & Pengayaan Terautomasi**: Sistem otomatis mendeteksi siswa di bawah Kriteria Ketercapaian Tujuan Pembelajaran (KKTP) dan menyusun program remedial/pengayaan.
* **E-Rapor Digital**: Pembuatan dan unduh draf laporan capaian pembelajaran langsung berformat PDF standar nasional.
* **Early Warning System (EWS)**: Dashboard analitik khusus untuk memetakan murid dengan risiko akademis tinggi.

### 🧑‍🎓 Untuk Siswa
* **Interactive Learning**: Akses materi pembelajaran interaktif, pengumpulan tugas, refleksi 3-2-1 / 4P, serta kuis diagnostik yang adaptif.
* **P5 Project Portfolio**: Pelacakan partisipasi Proyek Penguatan Profil Pelajar Pancasila (P5) dan pengisian penilaian diri.

### 👪 Untuk Orang Tua
* **Child Progress Tracker**: Dashboard khusus bagi orang tua untuk memantau nilai tugas, grafik ketuntasan KKTP anak, presensi, dan program remedial yang sedang dijalani anak secara langsung.

---

## 🚀 Panduan Instalasi Cepat

Ikuti langkah-langkah di bawah ini untuk menjalankan LMS Mokopani Web di lingkungan lokal Anda (disarankan menggunakan **Laragon** atau lingkungan PHP 8.2+ lokal):

### 1. Kloning & Masuk ke Folder Proyek
Jika Anda menggunakan git, jalankan perintah di bawah ini, atau langsung buka folder ini melalui terminal/editor kode Anda:
```bash
cd lms-mokopani-web
```

### 2. Instal Dependensi Backend (Composer)
Instal seluruh paket PHP yang didefinisikan dalam `composer.json`:
```bash
composer install
```

### 3. Instal Dependensi Frontend (NPM)
Instal paket-paket JavaScript/TypeScript yang dibutuhkan oleh React:
```bash
npm install
```

### 4. Salin & Konfigurasi File Lingkungan (`.env`)
Salin file `.env.example` menjadi file `.env`:
```bash
copy .env.example .env
```

Buka file `.env` di editor Anda dan pastikan setelan database menggunakan **SQLite**:
```env
DB_CONNECTION=sqlite
```
*(Secara default Laravel akan menggunakan file database di `database/database.sqlite` yang sudah disertakan dalam proyek).*

### 5. Generate Application Key
```bash
php artisan key:generate
```

### 6. Migrasi & Seeding Data Simulasi
Proyek ini dilengkapi dengan modul seeder data komprehensif yang mensimulasikan aktivitas belajar riil (guru, siswa, nilai, tugas, dan grafik analitik):
```bash
php artisan migrate:fresh --seed
```
*Catatan: Ini akan mengaktifkan seeder utama `LmsMockDataSeeder`, `LmsAiPromptSeeder`, dan `P5Seeder`.*

---

## 🤖 Konfigurasi Kecerdasan Buatan (Google Gemini AI)

Untuk menggunakan modul **Auto-Suggest RPP, KKTP, & Analisis CP** menggunakan AI secara *online*:

1. Masuk ke [Google AI Studio](https://aistudio.google.com/) dan buat API Key baru secara gratis.
2. Buka file `.env` proyek Anda, lalu masukkan API Key tersebut pada baris berikut:
   ```env
   GEMINI_API_KEY=AIzaSyYourActualAPIKeyHere...
   GEMINI_MODEL=gemini-2.0-flash
   ```

*💡 **Hebatnya!** Jika Anda tidak memiliki kuota internet atau API Key belum diisi, platform ini secara otomatis mengaktifkan **Offline Fallback Logic** menggunakan model heuristik tertanam agar Anda tetap dapat memaparkan fitur cerdas ini saat demo luring.*

---

## 🖥️ Menjalankan Aplikasi secara Lokal

Jalankan dua perintah berikut di terminal terpisah untuk menjalankan aplikasi:

### Terminal 1: Server Backend (Laravel)
```bash
php artisan serve
```
Aplikasi backend akan aktif di: `http://127.0.0.1:8000`

### Terminal 2: Server Compilator Frontend (Vite)
```bash
npm run dev
```

Sekarang, buka browser favorit Anda dan akses `http://127.0.0.1:8000`.

---

## 🧪 Menguji Koneksi Gemini API

Untuk memverifikasi apakah integrasi API Key Gemini Anda sudah terhubung secara sempurna dengan server Google, jalankan perintah pengujian berikut di terminal:

```bash
php test-gemini.php
```

Skrip ini akan mensimulasikan permintaan pembuatan alur RPP berbasis materi Informatika menggunakan model `gemini-flash` terbaru dan menampilkan hasil responsnya secara langsung di terminal Anda.

---

## 📂 Struktur Penting Proyek

* `app/Http/Controllers/` — Berisi kontroler utama untuk mengelola asesmen, analitik, e-rapor, P5, dan rancangan pembelajaran.
* `app/Services/` — Berisi mesin layanan inti seperti `GeminiApiService` (API Gateway), `InstructionalSmartService` (AI & offline RPP generator), dan `PlanningService` (pengurutan TP).
* `database/seeders/` — Penyedia data dummy kaya (`LmsMockDataSeeder`) untuk menyimulasikan ratusan data murid dan nilai.
* `resources/js/pages/` — Seluruh antar muka premium Single Page Application (React + Inertia) yang responsif dan memukau.

---

*Dibuat dengan dedikasi penuh untuk kemajuan ekosistem pendidikan digital Indonesia.*
