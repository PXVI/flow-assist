---
name: Todo order + UI polish
overview: Restyle Relax top-bar timer chips to match app surfaces and borders; sort todo checklists so incomplete items appear first in board and modal; tighten the compact-board “more items” line copy and CSS.
todos:
  - id: relax-pill-theme
    content: Restyle top-bar Relax timer buttons (HTML/CSS) to match btn/surface tokens; subtle focus vs break accent; calmer icon
    status: completed
  - id: todo-open-first
    content: "renderer.js: partitionChecklistOpenFirst + use in renderNoteCardHtml; normalize after sync/delete/add"
    status: completed
  - id: truncated-hint
    content: "renderer.js: 'N more items' copy; styles.css: tighter .notes-checklist-truncated (+ optional readonly scope)"
    status: completed
isProject: false
---

# Todo ordering, truncation line, and Relax top-bar theme

## 1. Relax top-bar timer pills (theme-coherent)

**Current state:** Loud full-gradient pills, white text, heavy shadows, and animated gradient-mask “icons” in [styles.css](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\styles.css) (~529–642) and markup in [index.html](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\index.html) (~193–201).

**Direction:** Treat them like other top-bar controls (compare [`.notif-bell-btn`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\styles.css) ~649+ and [`.filter-dropdown-btn`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\styles.css)): `background: var(--btn-bg)` or `var(--bg-surface-raised)`, `border: 1px solid var(--border-default)`, compact padding, `color: var(--text-secondary)` / `var(--text-primary)` for the countdown, **no** large outer glow. Differentiate modes with subtle accents only:

- **Focus:** left border or thin inset strip using `var(--accent-red)` or `color-mix` with `--accent-amber`; optional very soft `background: color-mix(in srgb, var(--accent-red) 8%, var(--btn-bg))`.
- **Break:** same pattern with `var(--accent-green)` / `--accent-green-bright`.

**Icon:** Replace the animated CSS-mask block with a small inline SVG (or single-color icon) using `currentColor` so it matches the pill text—optionally keep a **very** subtle opacity pulse or drop the motion entirely for calmer UI. Respect `prefers-reduced-motion` if any animation remains.

**Files:** [index.html](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\index.html) (optional markup tweak for icon), [styles.css](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\styles.css) (replace most `.top-bar-relax-*` rules). No change required to [renderer.js](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) pill update logic (`updateRelaxTopBarPills`) unless class names change.

---

## 2. Todo checklist: open items first, completed at bottom (board + modal)

**Rendering:** In [`renderNoteCardHtml`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) (~2348–2351), today `fullList` is used in storage order; compact view uses `fullList.slice(0, 5)`.

- Add a small helper, e.g. `partitionChecklistOpenFirst(list)`, that returns a **new** array: all non-`done` rows in their original relative order, then all `done` rows in their original relative order (stable, predictable).
- Use `var ordered = partitionChecklistOpenFirst(item.checklist || [])` everywhere this block needs the list: **stats counts** (total/done/open), **row mapping** for HTML, and **compact slice** / **moreCount**:
  - `rowSource = compact ? ordered.slice(0, 5) : ordered`
  - `moreCount = compact && ordered.length > 5 ? ordered.length - 5 : 0`

**Persistence (recommended):** After updates, normalize `item.checklist` so JSON and future renders stay consistent:

- At the end of [`syncNoteCardToModel`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) for `item.kind === 'todo'` (after the existing `forEach` that updates by `data-item-id`), assign `item.checklist = partitionChecklistOpenFirst(item.checklist)`.
- After mutating the checklist in [`notesOnChecklistItemDelete`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) and [`notesOnChecklistAddClick`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) (post-filter / post-push), call the same partition on `it.checklist`.

`syncNoteCardToModel` matches rows by id, not DOM order, so reordering the array is safe.

**File:** [renderer.js](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js) only for this item.

---

## 3. Compact “more items” line: copy + compact spacing

**Copy:** In `renderNoteCardHtml`, replace the truncated hint string (~2381–2383) with plain text like `moreCount + ' more items'` (no leading `+`, no em dash).

**Markup/CSS:** Keep a single line element (still a `<p>` is fine) with class `notes-checklist-truncated` (and `muted` if desired). Tighten [`.notes-checklist-truncated`](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\styles.css) (~3161–3165): reduce `margin` (e.g. small top/bottom only), use a smaller type scale (`font-size: var(--font-2xs)` or ~0.65rem), tighter `line-height` (~1.2). If vertical gap is still dominated by the checklist’s last item margin, optionally add a **readonly-scoped** rule (e.g. `.notes-card--readonly.notes-card--todo .notes-checklist-truncated`) with zero top margin.

**Files:** [renderer.js](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\renderer.js), [styles.css](c:\Users\padma\OneDrive\Documents\Projects-Darwin\flow-assist\styles.css).

---

## Verification

- Manually: Notes board todo with mixed done/open—board and modal show open first, done at bottom; compact card shows up to five from that ordered list; “N more items” is one small line.
- Relax: start focus/break timers, switch views—top pills look consistent with notif/view controls; click still navigates to Relax (existing behavior).
- Run `npx playwright test tests/regression/notes-rich-text.spec.js` if time (wording/layout tweaks rarely break selectors).
