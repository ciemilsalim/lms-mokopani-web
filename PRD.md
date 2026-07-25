# Product Requirements Document (PRD)
**Project Name**: LMS Mokopani Web (Kurikulum Merdeka AI Platform)
**Version**: 2.0
**Last Updated**: 25 July 2026

## 1. Executive Summary
LMS Mokopani Web adalah sistem manajemen pembelajaran (Learning Management System) mutakhir yang dirancang khusus untuk ekosistem **Kurikulum Merdeka** di Indonesia. Platform ini menggunakan integrasi **Kecerdasan Buatan (OpenRouter AI via SIPADA)** untuk memberdayakan guru dalam merancang, melaksanakan, dan mengevaluasi pembelajaran secara otomatis, presisi, dan berbasis data. Sistem ini terintegrasi erat dengan *Sistem Pangkalan Data (SIASEK)* menggunakan arsitektur *shared database* dan API AI yang tersentralisasi.

## 2. Tech Stack & Architecture
- **Backend Framework**: Laravel 11 (PHP 8.2+)
- **Frontend Framework**: React v19 + TypeScript
- **Frontend Bridge**: Inertia.js v2.0
- **Styling**: Tailwind CSS v4 + Shadcn UI
- **Database**: MySQL (Shared database `db_absen` dari SIASEK)
- **AI Engine**: OpenRouter AI (tersentralisasi melalui ekosistem SIPADA)

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
LMS ini dikendalikan oleh arsitektur *AI Services* yang terhubung langsung ke **OpenRouter AI via SIPADA**. Semua permintaan AI disentralisasi dari SIPADA, dengan kemampuan utama:
1. **Auto-Suggest TP & ATP**: AI memformulasikan Tujuan dan Alur secara otonom dari teks Capaian Pembelajaran (CP) nasional.
2. **KKTP Generation**: Pembuatan rubrik Kriteria Ketercapaian secara cepat.
3. **Deskripsi Rapor Otomatis**: Membaca seluruh nilai dari *Gradebook* dan menyusun deskripsi naratif yang memotivasi dan sesuai kaidah Kurikulum Merdeka.
4. **Offline Fallback System**: Jika koneksi ke server OpenRouter terputus atau limit kuota tercapai, sistem secara cerdas akan beralih ke skenario lokal heuristik (*fallback*) sehingga layanan pembuatan Modul Ajar, TP, atau Rapor tetap bisa berjalan untuk keperluan luring/demonstrasi.

## 5. Security & Authentication
- **SSO (Single Sign-On)**: Integrasi *login* tersentralisasi bersama sistem Presensi dan SIPADA.
- **Role-Based Access Control (RBAC)**: Pembatasan rute (*routes*) secara ketat bagi entitas `admin`, `teacher`, `student`, dan `parent`.
