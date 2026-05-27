---
name: Notes todo board polish
overview: Improve visual separation between todo checklist rows on the Notes board (readonly/unfocused cards) and restyle `.notes-todo-done` checkboxes to match the app’s control language (borders, radii, theme tokens) using CSS only in [styles.css](styles.css), scoped where appropriate so modal editing layout stays readable.
todos:
  - id: readonly-row-tiles
    content: "styles.css: scoped .notes-card--readonly.notes-card--todo checklist row/item spacing and subtle per-row separation (tiles or dividers); harmonize with done-row green block"
    status: completed
  - id: todo-checkbox-theme
    content: "styles.css: replace .notes-todo-done native look with appearance:none themed box + checked state + focus-visible; align margins with text/tiles"
    status: completed
isProject: false
---

# Notes todo: clearer row separation + themed checkboxes

## Scope

- **Primary target:** the Notes **board** todo preview (`compact: true` in [`renderNoteCardHtml`](renderer.js)), which adds `notes-card--readonly` on the card and renders rows with [`notes-checklist-row--readonly`](renderer.js) (same structure as today; **no HTML/markup change required** unless we later add a wrapper class for even tighter scoping).
- **Checkboxes:** all todo rows use `<input type="checkbox" class="notes-todo-done">` in both readonly and rich/modal paths; styling can be unified on `.notes-todo-done` in [`styles.css`](styles.css) so board and modal stay consistent.

## 1. Clearer item-to-item separation (unfocused board)

**File:** [`styles.css`](styles.css) (after existing `.notes-checklist-item` / `.notes-checklist-row` rules, ~6304–6333).

Add rules scoped to **readonly todo cards** only, e.g.:

- `.notes-card--readonly.notes-card--todo .notes-checklist-item` — slightly larger vertical rhythm (`margin-bottom` 10–12px instead of bare 8px), optional `padding-bottom` with a subtle `border-bottom: 1px solid var(--border-default)` on each item **except** `:last-child` to avoid a double line above “Add item”.
- `.notes-card--readonly.notes-card--todo .notes-checklist-row--readonly` — light container treatment: `padding: 8px 10px`, `border-radius: var(--radius-md)`, `background: var(--bg-surface-raised)` or `var(--bg-inset)`, `border: 1px solid var(--border-default)` so each row reads as its own “tile” (pick one of full tile vs divider-only to avoid visual noise; **prefer single subtle bordered tile** per row).

**Interaction with existing “done” styling:** `.notes-checklist-item--done` / `:has(.notes-todo-done:checked)` already adds green wash and padding (~6314–6321). Ensure new readonly row chrome **does not double-padding** awkwardly: either nest padding on `.notes-checklist-row--readonly` only inside `.notes-card--readonly.notes-card--todo`, or reduce done-row’s negative margin if tiles already inset—tune in CSS so done rows still look intentional (green background can sit inside the tile border).

No changes to [`renderer.js`](renderer.js) unless spacing still fights the done-row rules; CSS-only is the default.

## 2. Checkbox styling aligned with the app

**Current:** [`.notes-todo-done`](styles.css) (~6335–6341) is mostly native appearance with `accent-color: var(--accent-green-bright)` and `margin-top: 8px`.

**Direction:** Match the feel of other form controls (e.g. [`.flag-check input`](styles.css) ~2120–2127: 16px, `accent-color: var(--accent-blue)`), but **avoid** raw OS chrome where possible:

- Set `appearance: none` (and `-webkit-appearance: none` if needed for WebKit/Electron) on `.notes-todo-done`.
- Define a **square** control (~17–18px), `border-radius: var(--radius-sm)` (or ~5px), `border: 1.5px solid var(--border-emphasis)`, `background: var(--bg-inset)`.
- **Checked** state: `background` + `border-color` using `var(--accent-blue)` (or `var(--accent-green)` if you want done=green; default recommendation **blue** to align with task flag inputs and focus rings), plus a **small SVG check** via `background-image` (data URL) or layered `box-shadow` so it reads at small size.
- **Focus:** `:focus-visible { outline: 2px solid var(--accent-blue); outline-offset: 2px; }` (and remove default ugly focus where applicable).
- **Disabled/readonly:** board checkboxes are still interactive for “done”; modal uses same class—no behavior change.

**Vertical alignment:** Re-tune `margin-top` on `.notes-todo-done` so the custom box lines up with `.notes-todo-text-display` / text line-height (likely 6px–8px instead of 8px after tile padding).

## 3. Verification

- Manually: Notes tab, todo card on grid (unfocused)—rows should read as distinct tiles with clearer gaps; checkbox should look like the rest of the UI (not default Windows/WebKit chrome).
- Open modal: checklist rows still usable; checkbox + delete + text alignment unchanged functionally.
- Optional: `npx playwright test tests/regression/notes-rich-text.spec.js` if any selector relied on native checkbox metrics (unlikely).

## Files touched

- [`styles.css`](styles.css) only (unless visual conflict forces a tiny class on the readonly row in [`renderer.js`](renderer.js)—unlikely).
