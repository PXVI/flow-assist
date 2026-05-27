---
name: Notes todo UX tweaks
overview: Remove the rich formatting toolbar from editable todo checklist rows (modal/full edit) while keeping markdown/rich contenteditable behavior, add a per-row delete control with model persistence, and adjust Playwright coverage that currently asserts a todo toolbar exists.
todos:
  - id: strip-todo-toolbar
    content: "renderer.js: remove renderRichFormatToolbarHtml from todo editable row HTML; optional styles.css cleanup for .notes-todo-rich-wrap toolbar rules"
    status: completed
  - id: delete-item-ui-logic
    content: "renderer.js: add delete button HTML (readonly + rich rows), notesOnChecklistItemDelete + board/modal click wiring"
    status: completed
  - id: tests-notes-rich
    content: "tests/regression/notes-rich-text.spec.js: update todo modal test; optional delete-item test"
    status: completed
isProject: false
---

# Notes: todo toolbar removal + per-item delete

## Context (current behavior)

- Todo cards on the board are built with [`renderNoteCardHtml(it, { compact: true })`](renderer.js) in [`renderNotes`](renderer.js): `readonlyPreview` is true, so rows use the readonly branch (no toolbar) — unchanged.
- The **modal** uses [`renderNoteCardHtml(item, { compact: false, modal: true })`](renderer.js) in [`renderNotesModal`](renderer.js). In the todo branch when `!readonlyPreview`, each row includes [`renderRichFormatToolbarHtml()`](renderer.js) inside `.notes-todo-rich-wrap` ([~2345–2348](renderer.js)). That is what users still see for “focused” todo items.

## 1. Omit formatting bar for todo checklist editors

**File:** [`renderer.js`](renderer.js) — function `renderNoteCardHtml`, todo `!readonlyPreview` branch (~2341–2349).

- Remove the `renderRichFormatToolbarHtml()` concatenation from the checklist row markup.
- Keep the outer `.rich-textarea-wrap.notes-todo-rich-wrap` with `data-rich-wysiwyg="1"` and the existing `.notes-todo-text.rich-markdown-wysiwyg` so [`bindRichFormatToolbars`](renderer.js) (called from [`renderNotes`](renderer.js) / [`renderNotesModal`](renderer.js)) still runs [`bindRichMarkdownWysiwygPaste`](renderer.js) and toolbar sync for an **empty** toolbar (no `data-rich-cmd` buttons); formatting can still be done via paste / existing markdown / keyboard where the browser supports it.

**File:** [`styles.css`](styles.css) — optional cleanup: rules under `.notes-todo-rich-wrap .rich-format-toolbar` ([~6243–6250](styles.css)) become unused for todos; either delete those blocks or leave them (harmless). Prefer removing dead rules to avoid confusion.

## 2. Delete a single todo checklist item

**Markup (`renderer.js` — same `renderNoteCardHtml` todo branches):**

- **Editable row** (`!readonlyPreview`): append a small `type="button"` control (e.g. `btn-icon notes-checklist-item-delete`) with `title` / `aria-label` “Remove item”, placed in the flex row (e.g. after `.notes-todo-rich-column` so it sits to the right of the text column). Use an inline SVG consistent with other icon buttons in the app.
- **Readonly board row** (`readonlyPreview`): add the same delete control so items can be removed from the grid without opening the modal (same class for one handler path).

**Logic (`renderer.js`):**

- Add `notesOnChecklistItemDelete(btn)` (or equivalent):
  - Resolve `card` (`closest('.notes-card')`), `row` (`closest('.notes-checklist-item')`), `noteId`, `itemId` from `data-note-id` / `data-item-id`.
  - `findNoteItemById`, ensure `kind === 'todo'`.
  - Call [`syncNoteCardToModel(card)`](renderer.js) first so the latest text/checkbox state is saved for all rows.
  - `item.checklist = item.checklist.filter(r => r.id !== itemId)`.
  - If the array is empty, push one default row `{ id: generateId(), text: '', done: false }` to match [`normalizeNoteItem`](renderer.js) behavior (~1593–1595).
  - Set `item.updatedAt`, [`flushNotesSave(true)`](renderer.js).
  - If `state.notesModalNoteId === noteId`, call [`renderNotesModal`](renderer.js); else [`renderNotes`](renderer.js).

**Events:**

- [`bindNotesEventsOnce`](renderer.js) — in the board `click` handler, handle `closest('.notes-checklist-item-delete')` with `stopPropagation` / `preventDefault` before the generic “open modal” card click logic (so deleting does not open the modal). Mirror handling in [`bindNotesModalEventsOnce`](renderer.js) modal `click` delegate (alongside `.notes-checklist-add`).

## 3. Tests

**File:** [`tests/regression/notes-rich-text.spec.js`](tests/regression/notes-rich-text.spec.js)

- Update **“todo modal shows toolbar above item editor and bold round-trip”** (~70–99): assert **no** `.rich-format-toolbar` inside `#notes-modal .notes-todo-rich-wrap` (or count 0). Keep bold coverage using **`Ctrl+B`** (and `Meta+b` on mac if the harness requires it — Playwright’s `ControlOrMeta` modifier) or a small `editor.evaluate(() => document.execCommand('bold'))` after selecting text, then assert `strong`/`b` still present — avoids depending on removed buttons.
- Optionally add a short test that adds a todo with two items in the modal, removes one via `.notes-checklist-item-delete`, and expects one row remaining (or placeholder row if both removed).

## Risk / UX note

Removing the todo row toolbar removes bold/italic/underline/list buttons for checklist lines; rich text and markdown round-trip remain for content already stored or pasted. This matches the stated product request.
