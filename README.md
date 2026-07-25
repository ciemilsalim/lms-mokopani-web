# 🎓 LMS Mokopani Web — Kurikulum Merdeka AI Platform
**Version**: 2.0
**Last Updated**: 25 July 2026

## 1. Executive Summary
LMS Mokopani Web adalah sistem manajemen pembelajaran (Learning Management System) mutakhir yang dirancang khusus untuk ekosistem **Kurikulum Merdeka** di Indonesia. Platform ini menggunakan integrasi **Kecerdasan Buatan (OpenRouter AI)** yang konfigurasinya tersentralisasi melalui **Shared Database SIPADA** untuk memberdayakan guru dalam merancang, melaksanakan, dan mengevaluasi pembelajaran secara otomatis, presisi, dan berbasis data. Sistem ini terintegrasi erat dengan *Sistem Pangkalan Data (SIASEK)* menggunakan arsitektur *shared database* dengan sentralisasi konfigurasi AI.

## 2. Tech Stack & Architecture
- **Backend Framework**: Laravel 11 (PHP 8.2+)
- **Frontend Framework**: React v19 + TypeScript
- **Frontend Bridge**: Inertia.js v2.0
- **Styling**: Tailwind CSS v4 + Shadcn UI
- **Database**: MySQL (Shared database `db_absen` dari SIASEK)
- **AI Engine**: OpenRouter AI (konfigurasi tersentralisasi via shared database SIPADA, koneksi langsung ke OpenRouter API)

## 3. Core Modules & Features

### 3.1. Kurikulum Merdeka Hub (Teacher Module)
- **Manajemen Capaian Pembelajaran (CP) & Tujuan Pembelajaran (TP)**: 
  - Penyusunan CP dan pemecahan menjadi TP menggunakan bantuan AI (`auto-breakdown`).
  - Pengurutan TP (*Auto-Sequence*) secara kronologis dan logis berdasarkan Taksonomi Bloom.
- **Modul Ajar & Alur Tujuan Pembelajaran (ATP) Wizard**:
  - *Smart Instructional Design*: AI merumuskan langkah-langkah pembelajaran, menyusun Kriteria Ketercapaian Tujuan Pembelajaran (KKTP), serta menghasilkan ilustrasi sampul modul ajar.
- **Smart Assessment (Asesmen Cerdas)**:
  - Pembuatan kuis, penugasan (*Assignments*), dan tes formatif/sumatif.
  - Penilaian instan dan distribusi nilai ke *Gradebook*.
- **Manajemen Kelas (*Class Sessions & Live Teaching*)**:
  - Pembuatan sesi kelas interaktif (mode *Live*).
  - AI secara langsung (*real-time*) dapat men-generate *learning steps* (langkah belajar) yang adaptif bagi siswa.
- **Early Warning System (EWS) & Remedial**:
  - Dasbor deteksi dini (EWS) untuk melacak siswa yang memiliki performa akademik atau presensi rendah.
  - Sistem otomatis yang memetakan siswa ke program Remedial atau Pengayaan berdasarkan batas nilai KKTP.
- **Pelaporan Akademik (E-Rapor & Gradebook)**:
  - Ekspor rapor (PDF/CSV) dan generasi deskripsi naratif capaian siswa secara otomatis menggunakan AI.

### 3.2. Interactive Student Dashboard (Student Module)
- **Materi & Penugasan**: Akses terhadap materi interaktif dan dasbor unggah tugas.
- **Refleksi Pembelajaran**: Pengisian jurnal refleksi pembelajaran (seperti 4P atau 3-2-1).
- **P5 Project Portfolio**: Dasbor khusus untuk melacak partisipasi dan penyelesaian tugas terkait Proyek Penguatan Profil Pelajar Pancasila (P5).
- **Adaptive Learning**: Jalur belajar siswa dapat menyesuaikan berdasarkan tingkat pemahaman mereka pada topik sebelumnya.

### 3.3. Family Portal (Parent Module)
- **Child Progress Tracker**: Orang tua dapat memantau indikator akademik anak secara *real-time*.
- **Attendance & EWS Alert**: Mendapatkan rekapitulasi kehadiran serta notifikasi jika anak termasuk dalam sistem *Early Warning*.

### 3.4. Administrator & Analytics (Admin Module)
- **Global Semester Switch**: Manajemen periode akademik untuk beralih antar-semester tanpa kehilangan konteks.
- **AI Analytics & Weighting Settings**: Dasbor administrator untuk melihat penggunaan AI dan mengatur bobot persentase perhitungan nilai (Tugas vs Kuis vs Proyek).
- **Master Data Management**: Terhubung langsung dengan konfigurasi dari Sistem Pangkalan Data.

## 4. Artificial Intelligence (AI) Integrations
LMS ini menggunakan arsitektur **Shared Database Centralization** — konfigurasi AI (API Key, Model, Provider) dikelola admin di tabel `settings` pada shared database SIPADA, lalu LMS membaca konfigurasi tersebut dan memanggil OpenRouter AI secara langsung. Kemampuan utama:
1. **Auto-Suggest TP & ATP**: AI memformulasikan Tujuan dan Alur secara otonom dari teks Capaian Pembelajaran (CP) nasional.
2. **Smart Assessment Generation**: AI merancang instrumen asesmen (soal, rubrik, indikator, KKTP) pada Mode Cepat maupun Mode Detail.
3. **KKTP Generation**: Pembuatan rubrik Kriteria Ketercapaian secara cepat.
4. **Deskripsi Rapor Otomatis**: Membaca seluruh nilai dari *Gradebook* dan menyusun deskripsi naratif yang memotivasi dan sesuai kaidah Kurikulum Merdeka.
5. **Offline Fallback System**: Jika koneksi ke server OpenRouter terputus atau limit kuota tercapai, sistem secara cerdas akan beralih ke skenario lokal heuristik (*fallback*) sehingga layanan pembuatan Modul Ajar, TP, Asesmen, atau Rapor tetap bisa berjalan untuk keperluan luring/demonstrasi.

## 5. Security & Authentication
- **SSO (Single Sign-On)**: Integrasi *login* tersentralisasi bersama sistem Presensi dan SIPADA.
- **Role-Based Access Control (RBAC)**: Pembatasan rute (*routes*) secara ketat bagi entitas `admin`, `teacher`, `student`, dan `parent`.

---

## 🚀 Panduan Instalasi Cepat

Ikuti langkah-langkah di bawah ini untuk menjalankan LMS Mokopani Web di lingkungan lokal Anda (disarankan menggunakan **Laragon** atau lingkungan PHP 8.2+ lokal):

### 1. Kloning & Masuk ke Folder Proyek
```bash
cd lms-mokopani-web
```

### 2. Instal Dependensi Backend (Composer)
```bash
composer install
```

### 3. Instal Dependensi Frontend (NPM)
```bash
npm install
```

### 4. Salin & Konfigurasi File Lingkungan (`.env`)
```bash
copy .env.example .env
```
Buka file `.env` di editor Anda dan pastikan setelan database terhubung ke database terpusat SIASEK (`db_absen`):
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=db_absen
DB_USERNAME=root
DB_PASSWORD=
```
*(Catatan: LMS ini berbagi database yang sama dengan aplikasi SIPADA. Anda WAJIB menginstal SIPADA terlebih dahulu untuk menjalankan migrasi tabel utama).*

### 5. Generate Application Key
```bash
php artisan key:generate
```

### 6. Migrasi & Seeding Data Simulasi
Proyek ini dilengkapi dengan seeder komprehensif untuk mensimulasikan data belajar (guru, siswa, rapor, AI cache):
```bash
php artisan migrate:fresh --seed
```

---

## 🤖 Konfigurasi Teknis Kecerdasan Buatan (OpenRouter)

LMS Mokopani Web menggunakan arsitektur **Shared Database Centralization** untuk integrasi AI. Konfigurasi AI dikelola secara terpusat oleh admin SIPADA di tabel `settings` pada shared database (`db_absen`), dan LMS memanggil OpenRouter API secara **langsung** (tanpa proxy).

### Cara Kerja:
1. Admin SIPADA mengatur `global_ai_provider`, `global_ai_api_key`, dan `global_ai_model` di halaman pengaturan SIPADA.
2. LMS Mokopani membaca konfigurasi tersebut melalui `AiManager` dari shared database.
3. `AiManager` me-resolve provider aktif (OpenRouter, Gemini, Groq, dll) dan memanggil API secara langsung.
4. Jika provider tidak tersedia, sistem otomatis mencoba fallback ke provider lain atau ke **Offline Fallback Logic** (heuristik lokal).

### Konfigurasi Tambahan (Opsional — Development Only):
Jika ingin menggunakan API key lokal tanpa bergantung pada database SIPADA:
```env
# Di file .env LMS Mokopani Web
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.0-flash
ACTIVE_AI_PROVIDER=gemini
```
*(Catatan: Konfigurasi database SIPADA selalu diprioritaskan jika tersedia).*

---

## 🖥️ Menjalankan Aplikasi & Penggunaan

Jalankan dua perintah berikut di terminal terpisah:

### Terminal 1: Server Backend (Laravel)
```bash
php artisan serve
```
Aplikasi backend akan aktif di: `http://127.0.0.1:8000`

### Terminal 2: Server Compilator Frontend (Vite)
```bash
npm run dev
```

Buka browser Anda dan akses `http://127.0.0.1:8000`. Jika sudah dikonfigurasi SSO dengan SIPADA, login akan otomatis terintegrasi.
