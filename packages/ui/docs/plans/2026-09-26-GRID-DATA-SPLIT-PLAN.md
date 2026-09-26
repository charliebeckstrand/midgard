# GridData Split — Design Plan — 2026-09-26

How to split `GridData` into phase hooks and render components that follow its data flow, and how the split lets the React Compiler compile it. The split is for structure first. The compiler result comes from the same seams.

## Thesis

`GridData` (`modules/grid/grid-data.tsx`) is the largest component in `ui`, at about 1,600 lines. One function body holds the column model, the keyboard cursor, the engine call, the derived view, the layout math, two menus, three dialogs, and the whole table tree. Several local hooks exist only to keep the body under its cognitive-complexity budget. The compiler skips the body.

The body already runs in phases, and data moves down through them in one direction. Four values go back up. Each has a clear owner. The split makes the phases into hooks and the two large subtrees into components, and gives each back-edge one named mechanism.

## Current state (verified in tree, 2026-09-26, main at 1b3334a)

The body runs these phases in order:

1. **Columns.** Preference seeds, `resolveSortable`, the pin state with `pinColumn`, row grouping and its gates, master-detail, column groups, `useGridColumns`, and the narration of a column show or hide. The narration reads the hidden set through `hiddenColumnsRef`, which the body writes in render.
2. **Cursor.** Eight index refs, four stable click handlers, the activation bridges, `useGridCursor`, the imperative handle, and the new-row Add column.
3. **Engine.** `useGridTable`, which gives the rendered rows, the visible columns, and the engine state.
4. **View.** The data columns, the two index maps, the render-phase ref writes, the cursor clamp, the selection actions, the actionable flags, and the announcements.
5. **Frame.** The width gate, the resize layout, the group band, the grand total, the new-row place, the ARIA row count, the footer stats, the grid semantics, the hover, and the reorder and animation gates.
6. **Render.** Menus, the row manager, the column and row reorder, the table tree, three dialogs, and the shell.

Four values go back up against this order:

- **The index state.** The cursor (phase 2) reads the rendered rows, the keys, and the index maps, which exist only after the engine (phase 4). Today, refs made in phase 2 carry them, and phase 4 writes them in render.
- **`toggleRow`.** The cursor calls it on Space. `useGridSelectionActions` makes it in phase 4, and `toggleActiveRow` names it before its declaration.
- **`wrapperRef`.** `pinColumn` (phase 1) reads the direction of the root `<div>`, which the shell attaches in phase 6.
- **The Add width.** The new-row slot (phase 6) measures its Add control. The width feeds the engine columns (phase 2).

The compiler reports these as its four skip layers: the computed key in `pinColumn` (`Todo`), the ref writes (`Refs`), the forward reference to `toggleRow`, and the mutable ranges of plain resolvers (`PreserveManualMemo`). Only the first comes from syntax. The other three come from the back-edges and the one long body.

## The approach

### Files

The grid module is flat, and `grid-data-cell.tsx`, `grid-data-resolvers.ts`, and `grid-data-types.ts` already form a `grid-data-*` family. The split extends that family ([`CONVENTIONS.md`](../../../../CONVENTIONS.md) §3.3):

| File | Holds |
| --- | --- |
| `grid-data.tsx` | `GridData`: calls the phases in order, builds the `GridContext` value, and renders the shell. |
| `use-grid-data-columns.ts` | `useGridDataColumns`, phase 1. |
| `use-grid-data-cursor.ts` | `useGridIndexRefs`, `useGridDataCursor` (phase 2), and `useGridIndexSync`. |
| `use-grid-data-view.ts` | `useGridDataView`, phase 4. |
| `use-grid-data-frame.ts` | `useGridDataFrame`, phase 5. |
| `grid-data-table.tsx` | `GridDataTable`: the `<Table>`, the head, the new-row slot, the body, the grand total, the cursor wrap, the highlight context, and the scroll region. |
| `grid-data-dialogs.tsx` | `GridDataDialogs`: the column manager, the row manager dialog, and the auto-size confirm. |

Phase 3 stays one call to `useGridTable` in `GridData`. The menus, the row manager, and the two reorders are hooks now, so `GridData` calls them as it does today.

The local helpers move with their callers. The pure ones (`placeNewRow`, `slotAt`, `resolveNewRowIndex`, `rowReorderPermitted`, `resolveHighlightQuery`, `widthGateClass`) go to `grid-data-resolvers.ts`. `useServerSortSettle` goes to `grid-sort-state.ts`, beside `useGridSort`. `useStableHandler` goes to the cursor file. `useBodyRowCount` and `useTableRevealed` go to the frame file. `useMaxHeightGuard` stays in `grid-data.tsx`, so its effect stays the first one of `GridData`.

### Rules

- Data goes down only. A phase reads its own inputs and the results of the phases above it.
- The four back-edges use the mechanisms below, and no others.
- Each phase returns one object, and `GridData` destructures it at the call. A result object that holds a ref makes each property read a `Refs` error, so no result is read through a dot.
- No new context. The subtrees get props, so the data flow stays visible in `grid-data.tsx`.

### The back-edges

- **Index state.** `useGridIndexRefs()` makes one bundle, `GridIndexRefs<T>`. It holds the seven refs the cursor reads now, `selectable`, and `toggleRow`. `GridData` passes the bundle to phase 2 and to phase 4. `useGridIndexSync(refs, values)` in phase 4 writes all of them except the edit source. The editing layer reads the edit source in render, so `useGridEditSourceSync` in phase 2 writes it before the cursor. Both hooks open with a function-level `'use no memo'`, so they stay plain React. The ledger does not list a function that opts out.
- **`toggleRow`.** It is in the bundle. `toggleActiveRow` reads it at key time. The cursor API does not change.
- **`wrapperRef`.** `GridData` makes it and passes it to phase 1, the engine, the dialogs, and the root `<div>`.
- **The Add width.** The state stays in phase 2, and its setter goes to `GridDataTable` as a prop.

### Why the ref writes stay in render

The grid cells read `rowIndexMapRef`, `colIndexMapRef`, and `rowKeysRef` during their own render (`use-grid-navigation-columns.tsx`, `use-grid-editing-columns.tsx`). They render in the same pass as `GridData`, before any effect runs. A write in an effect would give them the maps of the last commit, so a sort or a filter would show stale indices. `useGridIndexSync` runs at the same point in the render as the writes do today.

### Compiler result

- The computed key moves to a local (`const key = String(id)`) in phase 1.
- `useGridIndexSync` and `useGridEditSourceSync` replace eight of the nine writes and the forward reference.
- The narration in phase 1 reads the hidden set through `useStableEvent`, which replaces `hiddenColumnsRef`.
- `bridgeCellActivate` gets the refs from the bundle, which is a hook argument in phase 2. The compiler accepts that.
- Each phase ends at a hook boundary, and the compiler treats a hook result as frozen. The mutable ranges of the resolvers stop at the phase that calls them.

`useStableHandler` and `useTableRevealed` write refs in render by intent, and stay in the ledger.

A probe of the same fixes in one body (the prior version of this plan) made the compiler compile `GridData`. The probe used hook wrappers around three resolvers, and the phase hooks give the same boundaries. The probe did not cover the new phase bodies. Increment 2 regenerates the ledger, and a phase that still skips gets its fix in that increment.

### Rejected

- **Only the compiler fixes, with no split.** This works, and the probe proves it. But `GridData` stays 1,600 lines, with its budget hooks.
- **A split by feature** (selection, grouping, editing, each with its own hook). The features cross the phases. Grouping gates the cursor, the engine, and the frame. A feature split would send the gates back and forth.
- **A store or context between the phases.** This adds a subscription layer that no cell needs, and it hides the data flow.
- **A `grid-data/` directory.** The module is flat, and the `grid-data-*` family already names its parts.
- **Ref writes in layout effects.** The cells would read stale maps (see above).

## Risk

The move changes the order of some hook calls. `useGridGroup` and `useGridColumns` move ahead of the cursor, into phase 1. React runs the effects of one component in call order, and the effects of a child before those of its parent. So a move can change the order of two effects. Each increment lists the effects it reorders and shows that they are independent. The direction read stays in `GridData`. React attaches the ref of the root `<div>` after the layout effects of its children, so a child cannot read the wrapper on mount.

With the compiler on, `GridData` memoizes its JSX. A child then renders only when its props change. The rows and cells are memoized now, so they already follow this contract. The risk is a child that reads a ref in render and gets no new props when the ref changes. Such a child is stale today, because a memoized row does not render again for a ref write.

Without the compiler, the split does not change behavior. Each phase runs the same calls in the same render.

## Increments

1. **Helpers and subtrees.** Move the pure helpers and `useServerSortSettle`, and extract `GridDataTable` and `GridDataDialogs`. No hook order changes. The hooks that go to a phase file move in increment 2, because each file must export the symbol of its name. `GridData` loses about 250 lines. The compiler still skips it on the computed key.
2. **Phases.** Extract the four phase hooks, the index bundle, and `useGridIndexSync`, and hoist the key. `GridData` compiles. The ledger drops `GridData`. `useStableHandler` and `useTableRevealed` stay in it, under their new files.
3. **Render-count bench.** Add a compiled render count for a sort and a selection change on a 1,000-row grid to `__benchmarks__`, before and after. The gain is then a number, not an inference.

## Proof

Each increment runs:

- The grid suites, jsdom, with and without the compiler (`test:compiler`), plus `grid-compiler.test.ts`.
- The Chromium grid suites (`test:browser`, grid files), which caught the render-phase setter in the effect-event plan.
- `test:related` over each moved file.
- The skip ledger, regenerated with `-u`, in the same commit.

A change to a test means a change to behavior, so the bar is that no test changes.

---

**See also:** [`2026-08-08-EFFECT-EVENT-PLAN.md`](2026-08-08-EFFECT-EVENT-PLAN.md) · [`CONVENTIONS.md` §3.3, §10.7–10.8](../../../../CONVENTIONS.md).
