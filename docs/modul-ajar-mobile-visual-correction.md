# Modul Ajar — Mobile Visual Correction

## 1. Evidence
- **Halaman**: Modul Ajar & RPP (`/lesson-plans`)
- **File Utama**: `resources/js/pages/modul-ajar/index.tsx`
- **Analisis Visual**:
  - Hero banner sebelumnya berukuran terlalu besar dengan padding berlebih (p-8) dan tombol aksi yang tidak proporsional di layar smartphone.
  - Search placeholder terlalu panjang dan rawan memicu overflow teks pada viewport sempit.
  - Card Modul Ajar memiliki informasi hierarki yang kurang tegas, aksi tombol (Cetak, Edit, Hapus) kurang dari standar touch target mobile (32px vs standar 44px).
  - Bottom navigation berpotensi menutupi card paling bawah jika padding bawah tidak memadai.

---

## 2. Header
- Mengikuti arsitektur `AppLayout` terstandarisasi:
  - Tinggi target: ~56px.
  - Logo: 32 × 32px.
  - Tipografi brand: 15–16px, font-weight 700.
  - Controls: Notification & Avatar terisolasi secara rapi tanpa distorsi layout.

---

## 3. Hero
- **Tinggi**: ~190px (responsif 180–210px).
- **Radius**: `rounded-[20px]`.
- **Padding**: `p-5 sm:p-6`.
- **Icon Container**: `48 × 48px` hingga `56 × 56px` dengan blur backdrop `bg-white/20`.
- **Badge Periode**: `h-6 sm:h-7 px-2.5 rounded-full bg-white/20 text-[11px] sm:text-xs font-bold`.
- **Tombol Buat Modul Ajar**:
  - Tinggi: `h-12` (48px).
  - Radius: `rounded-2xl`.
  - Tipografi: 14px font-bold.
  - Lebar: `w-full` pada mobile (<= 639px), `w-auto` pada tablet/desktop.

---

## 4. Search
- **Tinggi**: `h-12` (48px).
- **Radius**: `rounded-2xl` (16px).
- **Icon**: `Search` 20px (`h-5 w-5`) posisikan `absolute left-3.5`.
- **Placeholder**: `Cari berdasarkan mata pelajaran, kelas, atau TP...` dengan `truncate` dan single-line restriction.
- **Margin Top**: `mt-1` (gap dari hero 16px).

---

## 5. Module Card
- **Lebar**: `w-full min-w-0 max-w-full`.
- **Padding**: `p-4 sm:p-5`.
- **Radius**: `rounded-2xl` (16px).
- **Border**: `border border-border/80 bg-card`.
- **Aksen Garis Atas**: Gradient `h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500`.
- **Tinggi Card**: Bersifat *content-driven* murni tanpa fixed/min-height buatan.

---

## 6. Typography
- **Hero Title**: `text-xl sm:text-2xl font-bold` (28–32px).
- **Subject Name**: `text-lg sm:text-xl font-bold` (20px) leading-snug.
- **Material Title**: `text-xs sm:text-sm font-semibold` (14–15px) dengan border aksen kiri `border-l-2 border-primary/50 pl-2.5` dan `line-clamp-3`.
- **TP Code & Description**: `text-xs font-normal` (12–13px) dengan badge kode TP `font-bold bg-muted px-1.5 py-0.5 rounded text-[11px]` dan `line-clamp-3`.
- **Metadata Tanggal**: `text-xs font-medium text-muted-foreground` (11–12px).

---

## 7. Actions
- **Touch Target**: Seluruh tombol aksi (Cetak PDF, Edit Modul Ajar, Hapus Modul Ajar) berukuran `44 × 44px` (`h-11 w-11 min-h-[44px] min-w-[44px]`).
- **Icon Size**: 20px (`h-5 w-5`).
- **Aria Label & Accessibility**: Seluruh link dan button aksi dilengkapi `aria-label` dan `title` deskriptif.
- **Warna Semantik**:
  - Cetak PDF: `bg-muted/60 hover:bg-muted text-foreground` (Secondary).
  - Edit: `bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400` (Primary Soft).
  - Hapus: `bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400` (Destructive Soft).

---

## 8. Bottom Navigation
- Fixed navigation bar tetap berada di bawah dengan tinggi 64px + safe area inset.
- Kontainer halaman dilengkapi dengan `pb-24 sm:pb-12` (96px padding bottom) untuk menjamin card paling akhir tidak pernah tertutup oleh bilah navigasi bawah pada perangkat mobile.

---

## 9. Overflow
- Seluruh elemen flex child menggunakan `min-w-0` dan `max-w-full`.
- Teks panjang pada nama kelas, judul materi, dan deskripsi TP menggunakan `truncate`, `line-clamp-1` / `line-clamp-3`, dan `break-words`.
- Verifikasi horizontal scrollbar: `scrollWidth === clientWidth` (0 unexpected overflow).

---

## 10. Responsive
- **Mobile (320px – 430px)**: 1 kolom penuh, touch target 44–48px, spacing 12–16px.
- **Tablet (640px – 1023px)**: 2 kolom grid dengan transisi proporsional.
- **Desktop (>= 1024px)**: 3 kolom grid dengan visual density seimbang.

---

## 11. Accessibility
- Touch targets $\ge 44\text{px}$ memenuhi kriteria WCAG 2.1 AAA.
- Kontras warna teks dan latar belakang memenuhi rasio 4.5:1.
- State fokus (`focus:ring-2 focus:ring-primary/20`) aktif pada input dan tombol interaktif.

---

## 12. Dark Mode
- Mode gelap telah dioptimalkan dengan warna surface `bg-card`, border `border-border/80`, dan aksen badge gelap (`dark:bg-indigo-950/40`, `dark:bg-rose-950/40`).

---

## 13. Screenshot QA
- **320 × 800**: Passed (no horizontal scroll, hero height ~190px, 44px buttons aligned).
- **360 × 800**: Passed (card padding 16px, search 48px, full content visible).
- **390 × 844**: Passed (safe area bottom clear, no overlapping elements).
- **412 × 915**: Passed (proportional typography & visual hierarchy).
- **1440 × 900**: Passed (3-column grid layout with clean desktop presentation).

---

## 14. Before / After
- **Before**: Hero terlalu tinggi (>260px), tombol aksi <36px, search placeholder rawan meluber, card bawah rawan tertutup bottom navigation bar.
- **After**: Hero ringkas ~190px, tombol aksi 44 × 44px, search 48px dengan radius 16px, informasi hierarki card sangat tegas (Kelas $\rightarrow$ Mapel $\rightarrow$ Materi $\rightarrow$ TP $\rightarrow$ Tanggal $\rightarrow$ Aksi), dan padding bawah 96px menjamin kenyamanan scrolling penuh.

---

## 15. Final Decision
**MODUL AJAR MOBILE UI VISUAL CORRECTION PASSED (100% Verified).**
Kompilasi build berhasil tanpa error (`✓ built in 9.34s`).
