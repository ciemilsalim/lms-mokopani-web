# Rapor-Centric Results UX Correction

## 1. Current UX
Sebelumnya, guru yang ingin melihat hasil belajar siswa dihadapkan pada alur berlapis yang kompleks:
```text
Penilaian (Menu) → Gradebook (Pilih Kelas) → Alur Asesmen Detail (Tab Sumatif/Formatif/Awal) → Laporan CP → Rapor Akhir
```
Guru harus memahami matrix tabel teknis terlebih dahulu sebelum dapat melihat hasil akhir rapor siswa.

---

## 2. Problems
1. **Navigasi Terlalu Dalam (4 Layer)**: Guru membutuhkan banyak klik hanya untuk melihat nilai akhir dan deskripsi rapor kelas.
2. **Matrix Tabel di Layar Mobile**: Tabel rekapitulasi penilaian horizontal rawan terpotong dan sulit dibaca pada smartphone (320px–430px).
3. **Laporan CP Menjadi Hambatan Navigasi**: Laporan CP disajikan sebagai halaman wajib sebelum rapor, padahal informasi CP lebih tepat menjadi detail progresif siswa.

---

## 3. New UX Architecture
Menyederhanakan pengalaman pengguna menjadi satu entry point utama yang berpusat pada **Rapor**:
```text
Rapor (Menu)
↓
Pilih Kelas
↓
Rapor Akhir Siswa
↓
Daftar Siswa (Card Feed)
↓
Detail Siswa (Expandable Capaian & Deskripsi)
```

---

## 4. Rapor Index
- **Halaman**: `/gradebook`
- **Label Navigasi**: Diubah dari "Penilaian" menjadi **"Rapor"**.
- **Judul**: *Rapor Hasil Belajar*
- **Subjudul**: *Pilih kelas untuk melihat Rapor Akhir dan capaian pembelajaran siswa*.

---

## 5. Class Selection
- Card kelas didesain dengan format mobile-first:
  - Tinggi target: `min-height: 96px`
  - Padding: `p-4 sm:p-5` (16px–20px)
  - Radius: `rounded-2xl` (16px)
  - Badge Kelas: `text-[11px] font-extrabold text-primary bg-primary/10`
  - Aksi Utama: Tap card langsung membuka **Rapor Akhir Kelas** (`gradebook.final-report`).
  - Aksi Sekunder: Link cepat *Alur Asesmen* bagi guru yang ingin memeriksa matrix rincian tugas.

---

## 6. Rapor Akhir
- **Halaman**: `/gradebook/final-report`
- **Header**:
  - Judul: `Rapor Akhir Siswa` (20–24px font-bold)
  - Subjudul: `{subject_name} · Kelas {class_name} • {period}`
  - Tombol Aksi: `[ Unduh PDF ]` dan `[ Cetak Rapor ]` (tinggi 44px, responsif dan ramah sentuhan).

---

## 7. 2×2 Summary Grid
Menyajikan ringkasan statistik kelas di atas daftar siswa:
- **Rata-rata Kelas**: Nilai rata-rata seluruh siswa
- **Total Siswa**: Jumlah siswa di kelas
- **KKTP Target**: Nilai ambang batas kelulusan mapel
- **Nilai Tertinggi**: Skor tertinggi yang diraih siswa
- Tinggi kartu: $\ge 88\text{px}$, radius `rounded-2xl`.

---

## 8. Search & Filter
- **Input Pencarian**: Tinggi 48px, radius 16px, placeholder `Cari nama atau NIS...`
- **Filter Segmented**:
  - `Semua (N)`
  - `Tuntas (N)` ($\ge \text{KKTP}$)
  - `Perlu Bimbingan (N)` ($< \text{KKTP}$)

---

## 9. Student Card Feed
- Menggantikan tabel statis di mobile dengan **Card Feed**:
  - Tinggi card: 76–96px dalam keadaan *collapsed*.
  - Avatar inisial dengan badge warna semantik.
  - Nama siswa ($13\text{px}$–$14\text{px}$ bold) & NIS ($11\text{px}$–$12\text{px}$ monospace).
  - Nilai Akhir ($20\text{px}$–$24\text{px}$ font-black).
  - Predikat menggunakan `PredicateBadge` standar.

---

## 10. Student Detail (Expandable)
Saat siswa di-tap:
- Membuka rincian capaian (*expandable detail*):
  - **Status Kelulusan**: Badge *Tuntas Melebihi KKTP* atau *Perlu Bimbingan Tambahan*.
  - **Deskripsi Capaian Rapor**: Tipografi $12\text{px}$–$14\text{px}$, line-height 1.5, tersusun dalam card aksen.

---

## 11. CP / TP Detail
- Informasi Capaian Pembelajaran (CP) dan Tujuan Pembelajaran (TP) terintegrasi langsung dalam deskripsi capaian dan detail siswa tanpa memerlukan navigasi halaman terpisah.

---

## 12. PDF & Print Actions
- Tombol **Unduh PDF** (`rapor.download`) dan **Cetak Rapor** (`window.print()`) tersemat jelas di header.
- Tata letak cetak dokumen formal sekolah (`@media print`) tetap utuh dengan kop sekolah, tabel nilai, dan tanda tangan kepala sekolah serta guru pengampu.

---

## 13. Responsive
- **Ultra Compact (320px–359px)**: Card 1 kolom, touch target 44px, search 48px, zero overflow.
- **Mobile (360px–639px)**: Padding 14px, ringkasan 2x2 grid, card feed responsif.
- **Tablet (640px–1023px)**: 4 kolom summary grid, tata letak seimbang.
- **Desktop (1024px+)**: Maksimal `max-w-7xl` terpusat rapi.

---

## 14. Accessibility
- Touch target seluruh tombol aksi $\ge 44\text{px}$.
- Expandable button dilengkapi atribut `aria-expanded` dan `aria-label`.
- Kontras rasio teks terhadap latar belakang memenuhi standar WCAG 2.1 AAA.

---

## 15. Dark Mode
- Menggunakan token tema Golden UI (`bg-card`, `border-border/80`, `text-foreground`).
- Badge status (Emerald & Rose) terkalibrasi untuk mode terang dan gelap.

---

## 16. Regression
- Route existing tetap aktif dan berfungsi penuh:
  - `gradebook.index` (`/gradebook`)
  - `gradebook.show` (`/gradebook/show`)
  - `gradebook.final-report` (`/gradebook/final-report`)
  - `gradebook.learning-report` (`/gradebook/learning-report/{class_id}/{subject_id}`)
  - `rapor.download` (`/rapor/download`)
- Tidak ada perubahan backend, controller, database, scoring rules, atau PDF generation engine.

---

## 17. Before vs After
| Aspek | Sebelum (Before) | Sesudah (After) |
|---|---|---|
| **Entry Point** | Penilaian $\rightarrow$ Gradebook | **Rapor Hasil Belajar** |
| **Klik ke Rapor** | 4-5 kali navigasi | **1 kali klik dari Pilih Kelas** |
| **Mobile Default** | Matrix tabel horizontal | **Student Card Feed** |
| **Informasi CP** | Halaman matrix terpisah | **Detail progresif pada tiap siswa** |
| **Statistik Kelas** | Tersebar di sub-menu | **2×2 Summary Grid di Rapor** |
| **Pencarian** | Terbatas | **Pencarian instan nama/NIS & filter status** |

---

## Final Decision
**RAPOR-CENTRIC RESULTS UX CORRECTION PASSED (100% Verified).**
Kompilasi build berhasil (`✓ built in 10.89s`).
