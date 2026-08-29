# Formative Observation Mobile UX Correction (Prompt 20B)

## 1. Executive Summary
Optimasi komprehensif pada antarmuka Formatif Observasi guru (`/assignments/{id}`) untuk memberikan pengalaman **mobile-native** yang cepat (*fast-grading workflow*), ergonomis, dan tahan terhadap viewport ekstrem sempit (dari `253px` hingga `430px+`) tanpa horizontal overflow.

---

## 2. Target Viewports & Responsive Safety
- **Target Viewports Teruji**: `253px`, `280px`, `320px`, `326px`, `360px`, `375px`, `390px`, `412px`, `430px`.
- **Aturan No Horizontal Overflow**:
  - Semua elemen menggunakan `box-sizing: border-box`, `w-full`, `max-w-full`, dan `min-w-0`.
  - Tidak ada fixed width yang melebihi container.
  - Text breaking menggunakan `truncate`, `line-clamp-2`, dan `overflow-wrap-anywhere`.

---

## 3. Struktur Header & Assessment Context Card
- **Header**: Tinggi 56px, navigasi cepat kembali dan title kontekstual.
- **Context Card**:
  - Badge jenis asesmen: `ASESMEN FORMATIF • Informatika`
  - Judul instrumen: `Observasi: Dapur Komputer`
  - Metadata: `Kelas 8A • 27 siswa`
  - Tombol aksi: `Detail Asesmen` (collapsible drawer) & `Split-Screen` (touch target $\ge 44\text{px}$).

---

## 4. Progress Card & Actionable Metrics
- **Format Teks**:
  - `PROGRES PENILAIAN`
  - `1 / 27 siswa dinilai (4%)`
  - `26 siswa belum dinilai` (dengan alert indicator pulse)
- **Progress Bar**: Tinggi 8px (`h-2`), radius rounded-full dengan transisi halus.

---

## 5. Search & Filter Controls
- **Search Bar**: Tinggi 48px, radius 16px (`rounded-2xl`), font 14px, placeholder `"Cari nama atau NIS siswa..."`.
- **Filter Tabs**: Tinggi 44px, tabs:
  - `Semua (27)`
  - `Belum (26)`
  - `Selesai (1)`

---

## 6. Compact Mobile Student Cards (72–92px)
- **Desain Khusus Mobile**:
  - Seluruh kartu berstatus interactive tap target (`role="button"`, `min-h-[76px]`).
  - Nomor urut: `01` (`font-mono text-muted-foreground`).
  - Avatar: `36x36px` (`h-9 w-9 rounded-xl`).
  - Nama: `13px font-bold text-foreground` (max 2 baris).
  - NIS: `11px font-mono text-muted-foreground`.
  - Status yang jelas:
    - Belum dinilai: `○ Belum dinilai` + Tombol `Nilai →` (44px target).
    - Sudah dinilai: `✓ Dinilai` + Skor besar `18–20px bold` + Badge `Tuntas` / `Remedial`.

---

## 7. Fast Observation Modal & Student Switcher
- **Header Modal**:
  - Switcher atas: `[← Sebelumnya]  Siswa X dari Y  [Berikutnya →]` (touch target $\ge 40\text{px}$).
- **Indikator Observasi**:
  - Tombol `Muncul` (Emerald) dan `Belum` (Rose) dengan tinggi 44px untuk kemudahan tap dengan jempol.
- **Catatan Kualitatif**:
  - Textarea kompak (76–88px) untuk Catatan Observasi & Rencana Tindak Lanjut.
- **Sticky Actions**:
  - `[ Batal ]`
  - `[ Simpan ]`
  - `[ Simpan & Berikutnya → ]` (Menyimpan data dan langsung berpindah ke siswa selanjutnya).

---

## 8. Diskusi Kelas (Collapsible by Default)
- Pada tampilan mobile, bagian diskusi dirender dengan toggle: `▼ Diskusi Pembelajaran`.
- Default: **Tertutup (*collapsed*)** agar fokus guru tetap pada penilaian siswa.
- Jika kosong: Menampilkan pesan ringkas `"Belum ada pertanyaan. Jadilah yang pertama memulai diskusi."`

---

## 9. Verifikasi
- Build sistem: `npm run build` sukses tanpa error.
- Backend, scoring, KKTP, database, dan route tetap 100% kompatibel dan utuh.
