# GridData Under the React Compiler — Design Plan — 2026-09-26

What it costs to make the React Compiler compile `GridData`, which causes stop it today, and why a split of the component is not necessary. Each cause has a local fix. The fixes help only together, because the compiler reports one cause at a time and skips the whole function on the first.

## Thesis

`GridData` (`modules/grid/grid-data.tsx`) is the largest component in `ui`, at about 1,600 lines. The compiler skips it, so it runs as plain React with only its manual memoization. The skip ledger records one cause, `Todo`, but that cause hides three more layers.

An earlier reading said the fix was a split into smaller components. The probes below show that five small changes are sufficient. The compiler needs frozen values at a few points, and a hook boundary gives them. The component keeps its shape.

## Current state (verified in tree, 2026-09-26, main at d3c03ec)

Each layer shows only when the layer above it is gone. A script that runs `babel-plugin-react-compiler` 1.0.0 with a logger found them in this order:

1. **A computed key from a call.** `pinColumn` writes `{ ...prev, [String(id)]: … }`. The compiler cannot lower a computed key that is a call (`Todo`).
2. **Refs written during render.** Nine refs get their value in the render body: `rowsRef`, `colCountRef`, `rowIndexMapRef`, `colIndexMapRef`, `rowKeysRef`, `dataColumnsRef`, `editSourceRef`, `hiddenColumnsRef`, and `selectableRef`. `bridgeCellActivate` also takes three refs inside a `useMemo`. Each is a `Refs` error.
3. **A forward reference.** `toggleActiveRow` calls `toggleRow`, which the render declares later (effect-event plan, increment 2). The compiler holds `toggleRow` as a context variable that can change, so the memo that lists it cannot keep its guarantee.
4. **Plain helpers that take objects.** `resolveResizeLayout({…})`, `resolveGroupingMode({…})`, and `resolveActionable({…})` are module functions. The compiler must assume that a call can change its arguments. The values that these calls give (`resizing`, `manualGroupingActive`, `hasData`) and the values they alias stay mutable until the last such call, near the end of the render. Five manual memos list them, so none can keep its guarantee (`PreserveManualMemo`, "this dependency may be modified later").

Layer 4 was read from the compiler's own mutable ranges (`debugLogIRs`, pass `InferMutationAliasingRanges`). For example, `resizing` was live from instruction 845 to instruction 1457, where `slotAt(newRowPlace, …)` could change `newRowPlace`. Inlining that one call only moved the end to the next call. The problem is the shape of each value, not one call.

## Why the refs stay render-phase writes

The grid cells read `rowIndexMapRef`, `colIndexMapRef`, and `rowKeysRef` during their own render (`use-grid-navigation-columns.tsx`, `use-grid-editing-columns.tsx`). They render in the same pass as `GridData`, before any effect runs. A write in an effect would give them the maps of the last commit, so a sort or a filter would show stale indices. The write must stay in render. The fix moves it out of the `GridData` body, and does not change when it runs.

## The approach

Five changes, all in `grid-data.tsx`:

1. **Hoist the key.** `const key = String(id)` before the updater, then `[key]: pin`.
2. **`useSyncRef(ref, value)`.** A local hook that writes `ref.current = value`. It opens with a function-level `'use no memo'`, so it stays plain React, and the ledger records it. Each of the nine writes becomes one call at the same place in the render, so the order of the writes does not change.
3. **`useCellActivate`.** A local hook that holds the `bridgeCellActivate` memo. `GridData` gives it the refs as hook arguments, which the compiler accepts.
4. **`toggleRowRef`.** `toggleActiveRow` reads `toggleRowRef.current` at key time, and `useSyncRef(toggleRowRef, toggleRow)` fills it after `useGridSelectionActions`. This brings back one ref that increment 2 of the effect-event plan removed. The reason now is the compiler, not the declaration order. An effect event cannot do it, because the forward reference is the cause.
5. **Hook boundaries for three resolvers.** `useResizeLayout`, `useGroupingMode`, and `useActionable` each call the resolver of that name and return its result. The compiler treats a hook result as frozen, so the ranges stop at the call. The three hooks sit in `grid-data-resolvers.ts`, which holds two of the resolvers. `resolveGroupingMode` stays in `engine/grid-group/resolve.ts`.

Probe result: with all five, the compiler compiles `GridData`. Three skips stay in the file: `useSyncRef` (by intent), and `useStableHandler` and `useTableRevealed`, which were already in the ledger. Each of the five alone clears nothing, because the next layer then shows.

### Rejected

- **Split `GridData` into components.** This is large, it touches the most delicate module in `ui`, and the probes show that it is not necessary.
- **Move the ref writes into layout effects.** This makes the cells read stale maps (see above).
- **`useMemo` around each resolver.** This also freezes the result, but each memo needs a full list of dependencies for an object argument of up to eight fields. A hook boundary gives the same freeze with no list to keep correct.
- **Turn off `validatePreserveExistingMemoizationGuarantees`.** This removes a check that protects every component, to fix one.

## Risk

With the compiler on, `GridData` memoizes its JSX. A child then renders only when its props change. This is the contract that the grid's hand memoization already follows, because rows and cells are memoized now. The risk is a child that reads a ref during render and gets no new props when the ref changes. Such a child was already stale before this change, because a memoized row does not render again for a ref write. The proof must still show it.

Without the compiler, nothing changes. `useSyncRef` runs the same assignment at the same point, and each hook boundary calls the same function.

## Increments

1. **The five changes, one PR.** They help only together. The ledger drops `GridData` and adds `useSyncRef`.
2. **A render-count bench.** Add a compiled render count for a sort and a selection change on a 1,000-row grid to `__benchmarks__`, before and after, so that the gain is a number and not an inference.

## Proof

- The grid suites, jsdom, with and without the compiler (`test:compiler`), plus `grid-compiler.test.ts`.
- The Chromium grid suites (`test:browser`, grid files), which caught the render-phase setter in the effect-event plan.
- `test:related` over `grid-data.tsx` and `grid-data-resolvers.ts`.
- The skip ledger, regenerated with `-u`, in the same commit.

A change to a test means a change to behavior, so the bar is that no test changes.

---

**See also:** [`2026-08-08-EFFECT-EVENT-PLAN.md`](2026-08-08-EFFECT-EVENT-PLAN.md) · [`CONVENTIONS.md` §10.7–10.8](../../../../CONVENTIONS.md).
