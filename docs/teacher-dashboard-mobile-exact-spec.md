# Teacher Dashboard Mobile Exact Specification

## 1. Viewport
* **Target Mobile Viewports**: 320px, 326px, 360px, 375px, 390px, 412px, 430px.
* **Horizontal Page Padding**:
  * Viewport `320–359px`: `12px` (`px-3`)
  * Viewport `360–639px`: `16px` (`px-4`)
  * Viewport `640px+`: `24px` (`px-6`)
* **Page Bottom Padding**: `88–96px` (`pb-24`) to guarantee zero occlusion by the fixed bottom navigation bar.
* **Container Rule**: `width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;`.

---

## 2. Header
* **Height**: `56px` on mobile (`h-14`), scaling to `64px` on desktop (`sm:h-16`).
* **Padding**: `px-3 sm:px-6` horizontal, `8px` (`py-2`) vertical.
* **Layout Structure**: `[Logo (32x32px)] [Brand "LMS Mokopani" (15px / 600)] ... [Bell Button (44x44px)] [Avatar (32x32px)]`.
* **Semester Indicator**: Removed from the tight mobile header row and placed cleanly inside the **Welcome Card**.

---

## 3. Welcome Card
* **Dimensions**: Width `100%`, Target Height `~148px` (`min-h-[140px] sm:min-h-[148px]`).
* **Radius**: `20px` (`rounded-[20px]`).
* **Padding**: `16px` (`p-4`).
* **Typography**:
  * Greeting: `11–12px / 500` (`Selamat sore, Emil 👋`)
  * Nama: `20px / 700` (`Emil Salim, S.Kom`)
  * Badge Guru: `11px / 700` (`Guru`)
  * Mapel: `12px / 600` (`Informatika`)
  * Sekolah: `12px / 500` (`SMP Negeri 1 Biau`)
  * Tahun Ajaran & Semester: `11–12px / 500` (`2026/2027 · Ganjil`)
* **Desktop Illustration**: Pop-out illustration displayed on `sm:` and hidden on mobile.

---

## 4. Agenda Hari Ini
* **Position**: Section 03 (Primary hero agenda).
* **Card Height**:
  * With schedule: `120–150px`
  * Empty: `96–110px`
* **Header**: Padding `16px` (`p-4`), Title `16px / 700`, Icon `32x32px` (`rounded-[10px]`).
* **Schedule Item Row**: Min-height `56px`, Number/Icon `40x40px`, Gap `12px`, Time column `48px`.

---

## 5. Perlu Tindakan
* **Position**: Section 04 (**SETELAH AGENDA**).
* **Card Dimensions**: Min-height `76px`, Padding `12–16px` (`p-3 sm:p-4`), Radius `16px` (`rounded-2xl`).
* **Status Icon**: `40x40px` (`h-10 w-10`).
* **Title & Description**: Title `14px / 700` (`text-sm font-bold`), Description `11–12px` (`text-xs`).
* **0 Pending State**: Compact clean message `✓ Semua tugas sudah dinilai` (no bloated empty cards).

---

## 6. Aksi Cepat Guru
* **Position**: Section 05 (**SETELAH PERLU TINDAKAN**).
* **Grid Layout**: `2 columns`, `gap: 8px` (`grid grid-cols-2 gap-2`).
* **Card Size**: Target height `76px` (min `72px`), Radius `16px` (`rounded-2xl`).
* **Icon Container**: `36x36px` (`h-9 w-9`), Icon size `20px` (`h-5 w-5`).
* **Title & Subtitle**:
  * Title: `13px / 700` (`text-[13px] font-bold`).
  * Subtitle: Hidden on `<=360px` (`hidden xs:block`), `10–11px` on `>360px`.

---

## 7. Ringkasan Pembelajaran
* **Position**: Section 06 (**SETELAH QUICK ACTIONS**).
* **Section Header**: Title `Ringkasan Pembelajaran`, Subtitle `Statistik utama pembelajaran`.
* **Grid Layout**: `2 × 2` grid, `gap: 8px` (`grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3`).
* **Card Size**: Target height `~100px` (`h-[98px] sm:h-[104px]`), Padding `14px` (`p-3.5`).
* **Canonical Terminology**:
  * `SISWA` (`text-[11px] font-bold text-muted-foreground uppercase`)
  * `MATERI`
  * `ASESMEN`
  * `PERLU DINILAI`
* **Metric Numbers**: `24px` on mobile (`text-2xl`), scaling to `28px` on tablet/desktop (`sm:text-[28px] font-bold text-foreground leading-none`).

---

## 8. Aktivitas Terkini
* **Position**: Section 07.
* **Header Padding**: `14–16px` (`p-3.5 sm:p-4`).
* **Item Row**: Min-height `56px`, Padding `12px` (`p-3`), Icon `36x36px` (`h-9 w-9`).
* **Item Quantity**: **MAX 3 ITEMS**.
* **Title Typography**: `12–13px / 700` with `line-clamp: 2` and `overflow-wrap: anywhere` (strictly no `whitespace-nowrap`).
* **Metadata**: Secondary `11px`, Timestamp `10–11px`.

---

## 9. Progress Pembelajaran
* **Position**: Section 08.
* **Structure**: Single summary insight card (5-student individual table rows removed from mobile dashboard).
* **Card Height**: `110–130px`.
* **Elements**:
  * Total Students: `${totalStudents} siswa`
  * Percentage: `${avgProgress}%`
  * Description: `Rata-rata progres pembelajaran`
  * Progress Bar: `8px` (`h-2`), width `100%`, radius `999px` (`rounded-full`).
  * Action CTA: `Lihat Semua Siswa →` (min-height `44px`).

---

## 10. Pengumuman Sekolah
* **Position**: Section 09.
* **Empty State**: Height `88–96px` with centered message `Belum ada pengumuman baru`.
* **Filled State**: **MAX 2 ITEMS** (`min-height: 52px` per item).

---

## 11. Bottom Navigation
* **Height**: `64px` (`h-16`) + Safe Area padding (`pb-safe`).
* **Items**: 5 items (4 primary role items + 1 "Lainnya" drawer trigger), each `20%` width (`flex-1`).
* **Icon Size**: `20px` (`h-5 w-5`).
* **Label**: `10px / 700` (`text-[10px] font-bold`).

---

## 12. Typography Hierarchy
* **Heading**: `16px / 700` (`text-base font-bold`)
* **Body Default**: `14px` (`text-sm font-medium`)
* **Card Titles**: `13–14px / 700` (`text-[13px] sm:text-sm font-bold`)
* **Metadata & Captions**: `11–12px` (`text-xs text-muted-foreground`)
* **Micro Badges**: `10–11px / 700` (`text-[10px] sm:text-[11px] font-bold`)

---

## 13. Spacing Scale
* Strictly limited to: `4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`.
* Gaps between sections: `16–20px` (`space-y-4 sm:space-y-5`).

---

## 14. Radius Scale
* **Global Cards**: `16px` (`rounded-2xl`).
* **Welcome Card**: `20px` (`rounded-[20px]`).
* **Icon Containers**: `10–12px` (`rounded-[10px]` / `rounded-xl`).
* **Pills & Badges**: `999px` (`rounded-full`).

---

## 15. Touch Targets
* All buttons, navigation items, links, and card triggers have a minimum touch area of `44 × 44px` or `48px` for primary CTAs.

---

## 16. Responsive Rules
* `320–359px` (Ultra Compact): `12px` padding, hide quick action subtitles, compact badges.
* `360–639px` (Standard Mobile): `16px` padding, show subtitles where fit.
* `640–1023px` (Tablet): `24px` padding, 4-column summary grid.
* `1024px+` (Desktop): Full desktop sidebar, richer secondary columns.

---

## 17. Overflow Prevention Rules
* `width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;` on all containers.
* All flex children with text use `min-w-0` and `truncate` or `line-clamp-2`.
* Grid containers use `repeat(2, minmax(0, 1fr))`.

---

## 18. Screenshot QA & Viewports
* `320 × 800`
* `326 × 800`
* `360 × 800`
* `375 × 812`
* `390 × 844`
* `412 × 915`
* `430 × 932`
* `1440 × 900`

---

## 19. Acceptance Checklist
* [x] **01 Header**: 56px height, 32x32 logo, 44x44 bell, 32x32 avatar.
* [x] **02 Welcome Card**: ~148px height, 20px radius, 16px padding.
* [x] **03 Agenda Hari Ini**: 56px min row height, 40x40 icon, 120-150px height.
* [x] **04 Perlu Tindakan**: Positioned after agenda, 76px min height.
* [x] **05 Aksi Cepat Guru**: 2 columns, 8px gap, 76px height, 20px icons.
* [x] **06 Ringkasan Pembelajaran**: 2x2 grid, 100px height, canonical labels (SISWA, MATERI, ASESMEN, PERLU DINILAI).
* [x] **07 Aktivitas Terkini**: Max 3 items, 56px min row height, line-clamp:2.
* [x] **08 Progress Pembelajaran**: Single summary card with 8px progress bar and CTA button.
* [x] **09 Pengumuman Sekolah**: Max 2 items or compact 88-96px empty card.
* [x] **10 Bottom Navigation**: 64px height + safe area, 20px icons, 10px labels.
