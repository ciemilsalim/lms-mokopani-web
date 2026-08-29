# Assessment List — Mobile-Native UX Correction

## 1. Evidence
* Target Page: `/assignments` (`resources/js/pages/assignments/index.tsx`, `resources/js/components/assignments/assessment-card.tsx`, `resources/js/components/assignments/assessment-filter.tsx`).
* Visual Archetype: Mobile-native assessment management experience designed for one-handed thumb interaction on mobile devices (`320px–430px`) while retaining rich desktop capabilities on `≥1024px`.

---

## 2. Current Problems
1. **Desktop Accordion in Mobile**: The previous interface expanded all classes and all assessments by default, causing massive vertical page length (>1600px).
2. **Dense Assessment Cards**: Assessment cards contained excessive metadata (long multi-line descriptions, redundant TP notes, squeezed action buttons).
3. **Misaligned Hierarchy**: Header, CTA, filters, and counter were cluttered and not thumb-friendly.

---

## 3. Header
* Height: `56px` (`h-14`) on mobile, `64px` on desktop.
* Navigation: `[← Back (44x44px)] Asesmen ... [🔔 Notification (44x44px)] [Avatar (32x32px)]`.
* Semester context cleanly encapsulated in content/dashboard view without cluttering the tight mobile header row.

---

## 4. Page Header
* **Title**: `Asesmen` (`24px font-bold text-foreground`).
* **Subtitle**: `Kelola dan pantau penilaian siswa` (`13–14px text-muted-foreground font-medium`, max 2-line wrap).

---

## 5. Add Assessment CTA
* **Mobile Layout**: Full width `100%` (`w-full sm:w-auto`), Height `48px` (`min-h-[48px]`), Radius `16px` (`rounded-2xl`).
* **Typography & Icon**: Icon `20px` (`h-5 w-5`), Text `14px / 700` (`text-sm font-bold`).
* **Placement**: Immediately following the Page Header.

---

## 6. Active Assessment Summary
* Compact indicator chips with height `38–44px` and rounded-xl styling:
  * `● 4 asesmen aktif` (`bg-primary/10 text-primary border border-primary/20`)
  * `🟠 X perlu dinilai` (`bg-amber-500/10 text-amber-700 dark:text-amber-300`)
  * `🔴 X terlambat` (`bg-rose-500/10 text-rose-700 dark:text-rose-300`)

---

## 7. Filter Tabs
* **Container**: Height `50–54px`, Radius `16px` (`rounded-2xl`), Padding `4px`, Background `bg-muted/80`.
* **Tab Buttons**: `min-h-[44px]`, Radius `12px` (`rounded-xl`), Text `12px font-bold`.
* **Active Style**: Soft card elevation (`bg-card text-foreground font-black shadow-xs border border-border/60`).

---

## 8. Search
* **Container**: Height `48px` (`min-h-[48px]`), Radius `16px` (`rounded-2xl`), Background `bg-card border border-border/70`.
* **Icon**: `20px` (`h-5 w-5 text-muted-foreground`).
* **Typography**: `14px` (`text-sm font-medium`), Placeholder: `Cari asesmen, kelas, atau mapel...`.
* **Clear Action**: Integrated `(✕)` button with instant reset.

---

## 9. Class Card (Major Correction)
* **Default State**: **STRICTLY COLLAPSED BY DEFAULT** (`expanded: false`).
* **Dimensions**: Height `72–80px` (`min-h-[72px] sm:min-h-[78px]`), Radius `16px`, Padding `16px` (`p-4`).
* **Elements**:
  * Icon Container: `40 × 40px` (`rounded-xl bg-primary/10 text-primary`).
  * Class Title: `14–15px / 700` (`Kelas 8A`).
  * Subtitle: `27 siswa • 4 asesmen` (`12px text-muted-foreground`).
  * Pending Badge (if any): `🟠 X Perlu Nilai` (`11px font-bold`).
  * Indicator: Smooth rotating Chevron icon `32x32px`.

---

## 10. Assessment Card (Item)
* **Target Height**: `96–120px` on mobile.
* **Layout**:
  * Top: Dot Indicator + Title (`14–15px font-bold`, 2-line clamp, `overflow-wrap: anywhere`) + `44x44px` Ghost Ellipsis Menu.
  * Sub-meta: `Mapel • Instrumen • Tipe Asesmen` (`12px font-semibold`).
  * Bottom: Status Badge + `44px` Primary Action CTA.

---

## 11. Status
* Clean, human-readable status:
  * With submissions: `🟢 1 dari 27 terkumpul`
  * Needs grading: `🟠 X Perlu Dinilai`
  * Zero submission: `Belum ada pengumpulan`

---

## 12. Actions
* Primary Action:
  * If submissions exist: `Lihat Rekap →` (`min-h-[44px]` height, `text-xs font-bold`).
  * If pending grading: `Nilai (X)` (`min-h-[44px]` height, `bg-amber-600`).
  * If empty: `Buka →` (`min-h-[44px]` height).
* Secondary Action:
  * Ghost three-dot menu `44 × 44px` with dropdown containing *Edit Asesmen*, *Mode Penilaian Split*, *Hapus Asesmen*.

---

## 13. Information Density
* Mobile hides heavy paragraph TP descriptions by default (available in detail/review or tablet/desktop).
* Visual clutter eliminated to ensure rapid teacher decision-making.

---

## 14. Empty State
* Compact rounded-2xl container with clear messaging.
* Provides `[Hapus Pencarian]` button during search and `[+ Buat Asesmen Baru]` during empty filter.

---

## 15. Responsive Rules
* `320–359px` (Ultra Compact): `12px` page padding (`px-3`), full width CTAs, compact badges.
* `360–639px` (Standard Mobile): `16px` page padding (`px-4`), standard layout.
* `640–1023px` (Tablet): `24px` page padding (`px-6`), richer metadata chips.
* `1024px+` (Desktop): Full desktop multi-column and sidebar view.

---

## 16. Overflow & Width Rules
* `width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;` on all containers.
* Zero horizontal overflow: `scrollWidth === clientWidth` on all mobile viewports (`320px–430px`).

---

## 17. Accessibility
* Minimum touch targets `≥44 × 44px` across buttons, tabs, links, and accordion toggles.
* Class headers feature `role="button"`, `aria-expanded`, and keyboard navigation support (`Enter` / `Space`).

---

## 18. Dark Mode
* Full semantic dark mode tokens (`bg-card`, `border-border`, `text-foreground`, `bg-muted`).

---

## 19. Bottom Navigation Safety Space
* Page bottom padding set to `pb-24 sm:pb-8` (88–96px) to guarantee that the last card is never obstructed by the fixed mobile bottom navigation.

---

## 20. Before / After Comparison

| Aspect | Before | After |
| :--- | :--- | :--- |
| **Class State** | All classes and items expanded by default (~1600px height) | **Collapsed by default (72–80px compact card)** |
| **Add Assessment CTA** | Small top-right desktop button | **Full-width 48px thumb-friendly mobile button** |
| **Filter & Search** | Misaligned heights and small click areas | **44px filter tabs + 48px search bar (16px radius)** |
| **Assessment Item** | Bulky multi-line metadata item | **Compact 96–120px mobile card with 44px CTAs** |
| **Page Length** | >1600px scrolling fatigue | **~700–900px clean mobile overview** |

---

## 21. TypeScript Verification
* Type-check clean: Zero regressions or type errors.

---

## 22. Build Verification
* `npm run build` completed successfully with code `0`.

---

## 23. Regression Testing
* Assessment list, create assessment, edit assessment, split-screen grading, student results, and teacher dashboard verified intact.

---

## 24. Final Decision
> **ASSESSMENT LIST MOBILE-NATIVE CORRECTION PASSED** (Ready for production).
