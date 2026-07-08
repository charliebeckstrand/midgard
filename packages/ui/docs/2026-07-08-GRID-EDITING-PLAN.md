# Grid Inline Editing — Feature Plan — 2026-07-08

What the `editable` feature is trying to be, what ships today, and the increments that take it the rest of the way. Companion to the [Grid roadmap](../src/modules/grid/ROADMAP.md) §Selection & editing, which tracks status; this doc holds the design.

## Thesis

`editable` is heading at **spreadsheet-grade inline editing without a form detour**: the user edits values where they read them, with the pointer and keyboard ergonomics of a spreadsheet (double-click or type to edit, Enter/Tab to commit and move, Escape to bail) and the data discipline of a form (typed editors, validation, batched commits the consumer applies). Everything layers on the one existing model — the controllable editable-row `Set<key>` plus the `CellChange[]` commit sink — rather than introducing a second editing state; each increment widens who drives that set (consumer → grid) and how narrowly a session scopes (row → cell), never how values commit.

## Current state (verified in tree, 2026-07-08)

- **Row-session model.** A row key in the `editable` set puts every editable cell of that row into edit mode at once (`use-grid-editing.ts`, `grid-editing-cell.tsx`). A column is editable when it has a `field` or an `editCell` slot and isn't `readOnly` (`isColumnEditable`).
- **Staged drafts, batched flush.** Edits stage into a grid-held ref (no per-keystroke render); a row leaving the set flushes its changed, `validate`-passing cells as one `onValueChange` batch, announced politely (WCAG 4.1.3). Escape reverts a single cell.
- **Editors.** Inferred from the value's primitive type (text / number / yes-no listbox, `grid-edit-inputs.tsx`) or supplied per column via `editCell` — a render-prop slot over `onValueUpdate` / `commit` / `cancel`; no editor components are exported.
- **Cursor.** An editable grid always carries the keyboard cursor (`useGridCursor`: `cursorEnabled = navigable || editing`) — a single tab stop with `aria-activedescendant`, arrows/Home/End/PageUp/Down movement, and Enter/Space activation.
- **Grid-owned sessions (shipped with this change).** `editable.trigger: 'doubleClick'` — entry on an editable data cell's double-click (through the grid's built-in cell double-click event, so `resolveCellContext`'s data-cell resolution and the interactive-content guard apply, and a consumer `onCellDoubleClick` still fires after) or on the cursor's Enter; the entered cell's editor takes focus once mounted. An inferred text/number editor's Enter saves the row (the same batch flush); Escape from *any* editor — inferred, listbox, or `editCell` slot — abandons the row's drafts, owned once on the table's key surface (`sessionEscape`, layered onto `navTableProps`) and deferring to an open floating surface (a consumed press, focus in a portaled panel, or an `aria-expanded="true"` trigger — that press closes the surface; the next abandons). Focus reseats on the grid's tab stop on exit; an `editCell` slot's `commit` also ends the session. Every transition flows through `rows`/`onRowsChange`, so a controlled binding can decline an entry. Default stays `'manual'` — no behavior change for existing consumers.
- **Bindings that gate it.** Grouping and master-detail stand the cursor down but not editing; virtualization keeps editing (rows mount their editors when scrolled into the window).

## Design sketch — increments

Each increment is independently shippable, in dependency order. The `editable` binding grows options; nothing new is exported.

**1. Edit triggers (shipped, this change).** `trigger?: 'manual' | 'doubleClick'` as described above. Foundation for everything below: the grid can now begin and end a session itself, with focus management in both directions (`enterRowEdit` + pending-focus effect into the editor; `restoreGridFocus` back to the tab stop).

**2. Cell-scoped sessions.** `scope?: 'row' | 'cell'` (default `'row'`, the current model). Under `'cell'` a session is one cell, not one row: the double-clicked/Enter-entered cell alone mounts its editor, and the session key (Enter) or blur commits just that cell — still a `CellChange[]` batch of length one, so the sink contract is unchanged. Internally the editable set is joined by an active-edit coord; `GridEditingCell` renders an editor only when its cell is the active edit (row mode keeps the has-rowKey test). This is where the spreadsheet feel starts; `'row'` remains right for form-like "edit this record" grids.

**3. Commit-and-move keys.** Spreadsheet muscle memory, on by default wherever the grid owns the session: Enter commits and moves the cursor down one row (re-entering edit under `scope: 'cell'` when the next cell is editable — a column-wise fill flow); Tab / Shift+Tab commit and move right/left within the row's editable cells, wrapping at the edges; F2 toggles edit on the cursor's active cell (the keyboard-only entry that needs no activation semantics); typing a printable character on the active cell enters edit seeded with that character (replacing the value, as spreadsheets do). Movement rides the existing cursor `moveTo`; the keys extend `editorKeys` and the cursor's key handler.

**4. Blur / click-outside commit policy.** `commitOn?: ('enter' | 'blur' | 'clickOutside')[]` (default `['enter']`). `'blur'` commits a cell-scoped session when its editor loses focus to elsewhere in the grid; `'clickOutside'` commits when focus leaves the grid entirely — the forgiving mode where wandering off doesn't discard work. Needs care against the floating-overlay cases the cursor's blur guard already handles (`[data-floating-ui-portal]`): a `DatePicker` slot opening its popover must not read as blur.

**5. Async / optimistic commit** (roadmap backlog). `onValueChange` may return a `Promise`: the grid renders the committed cells in a pending state (subtle shimmer + `aria-busy`), settles on resolve, and on reject restores the drafts and re-enters the row/cell in edit with a per-cell error — the `validate` error surface reused for server rejections. `CellChange` stays the unit, so partial acceptance (resolve with the rejected subset) is expressible.

**6. Undo / redo** (backlog). A value-based history of committed batches wrapping the sink: Ctrl/Cmd+Z re-emits the inverse batch (old values, captured at flush time from the live rows), Shift+Z / Y replays. Purely a layer over `onValueChange` — the consumer still owns the data — bounded (e.g. 100 entries) and cleared when `rows` identity changes wholesale (a refetch).

**7. Range selection, fill handle, paste** (backlog, own plan when picked up). The cursor grows an anchored rectangular range; fill drags the active cell's value/series across it and paste maps a clipboard TSV block through the same per-column `validate` + `CellChange[]` path — the batch just spans rows. Depends on nothing above except the cursor; listed here because its commit semantics must stay the one sink.

**8. New-row entry.** A pinned blank editor row (top or bottom) whose commit emits an `onRowAdd(values)` rather than `CellChange[]` — the one place the sink doesn't fit, so it's a sibling callback. Furthest out; needs the pinned-row primitive from the row-model backlog.

## Non-goals

- **Exported editor components** — the `editCell` slot plus staging callbacks stay the whole override surface.
- **A form state model** — no dirty-tracking API, no submit lifecycle; the editable set and the batch sink remain the entire contract.
- **Editing under manual (server) grouping's header rows** — group headers are not data rows.

## Accessibility

Every increment keeps the established invariants: editors carry `aria-label` ("Edit Status, row 2") and `aria-required`; validation errors link via `aria-describedby` and `role="alert"`; commits announce politely (WCAG 4.1.3); the cursor's tab stop owns focus between sessions, and session transitions move focus deliberately (into the entered editor, back to the grid on exit — WCAG 2.4.3). New keys must not shadow editor-internal keys: Enter is claimed only by editors that don't need it (the listbox keeps it for open/select); Escape lives once on the table's key surface and defers to any open floating surface, so a panel closes on its own press and the next abandons; increment 3's typing-starts-edit fires only from the table tab stop, never from within a control. Increment 5's pending state needs `aria-busy` plus an announced settle.

## Tests

- Unit (`grid-editing.test.tsx`): per-increment describe blocks in the established harness style — trigger entry/exit paths shipped with increment 1; scope, keys, and policy matrices as they land.
- Browser mode: focus-order assertions jsdom can't validate (double-click → editor focus → Enter → tab stop), plus the floating-overlay blur cases of increment 4 (`grid-edit-validation-visible.test.tsx` precedent).
- Benchmarks (`grid-editing.bench.tsx`): keep the no-per-keystroke-render property as sessions gain scope and policy branches.

## Docs surface

Per CLAUDE.md §3.5: TSDoc on every `GridEditableConfig` addition in the same change; the grid ROADMAP §Selection & editing row tracks status; demos in `src/docs/demos/modules/grid/editable.tsx` grow one example per user-visible behavior (the double-click trigger rides the first example as of this change). No new exports, so the MODULES.md index is untouched.

## Suggested PR slicing

| PR | Scope | Size |
|---|---|---|
| 1 | `trigger: 'doubleClick'` — entry via double-click / cursor Enter, editor Enter/Escape session exit, focus both ways (this change) | M |
| 2 | `scope: 'cell'` — single-cell sessions over the same set + coord | M |
| 3 | Commit-and-move: Enter ↓, Tab ⇄, F2, typing-starts-edit | M |
| 4 | `commitOn` blur / click-outside policy | S |
| 5 | Async commit: pending / rejected cell states over a promise-returning sink | M |
| 6 | Undo / redo history layer | S |
| 7 | Range + fill + paste (separate plan) | L |
| 8 | New-row editor row | M |

---

**See also:** [`ROADMAP.md`](../src/modules/grid/ROADMAP.md) · [`grid-editing-types.ts`](../src/modules/grid/grid-editing-types.ts) · [`2026-07-01-VIRTUALIZATION-KEYBOARD-PLAN.md`](2026-07-01-VIRTUALIZATION-KEYBOARD-PLAN.md) (plan-doc precedent).
