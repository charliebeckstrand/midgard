# Keyboard-Complete Virtualization for Option Lists — 2026-07-01

Extracted from the tms-ui TanStack refactor plan (2026-07-01) for direct authoring here; tms-ui no longer tracks this workstream. Untracked scratch doc — commit, move, or delete as you see fit.

## Current state (verified in the synced tree, 2026-07-01)

- `primitives/virtual-options/virtual-options.tsx` exists: `VirtualOptions<T>` renders `items: T[]` through `useVirtualWindow` (the 63-line wrapper over `@tanstack/react-virtual`), finding its scroll element via `closest('[role="listbox"]')`. It assumes uniform row heights and **discards `scrollToIndex`**.
- Benchmarks already cover virtualized listbox/combobox (`__benchmarks__/listbox.bench.tsx`, `combobox.bench.tsx`, 500/2k options).
- **The gap is keyboard navigation**: `hooks/a11y/use-a11y-roving.ts` resolves items via `queryItems(containerRef, itemSelector)` per keystroke — DOM-only. Windowed-out options are unreachable (arrows stop at the rendered window edge; Home/End/typeahead can't reach offscreen items). `VirtualOptions` documents the limitation (lines 37–38); `command-palette.tsx:49` caps usage at "~100s items" for the same reason.
- Highlight models split the components in two:
  - **Virtual active-descendant** (focus stays on the input): Combobox, CommandPalette. Options mint stable ids (`primitives/option/option.tsx:88`). Combobox has a MutationObserver (`combobox.tsx:329–349`) re-anchoring the highlight when options swap.
  - **Focus-roving** (real DOM focus moves): Listbox (Select is a thin wrapper over it), Menu, via `PopoverPanel` (`primitives/popover/popover.tsx:60`).
- No `aria-setsize`/`aria-posinset` anywhere.
- json-tree precedent (`json-tree-virtualized.tsx`): custom keyboard nav over the flattened data array + explicit `scrollToIndex` — i.e., index-based navigation, not DOM queries. This is the pattern to generalize.

## Design sketch

**1. Index-based item source for roving (the core change).** Extend `useA11yRoving` with a pluggable item source. Default remains the DOM-query source (zero behavior change for every current consumer). A new *virtual source* is registered by `VirtualOptions` via context:

```ts
type VirtualItemSource<T> = {
	count: number
	getKey: (index: number) => string        // stable option id for aria-activedescendant
	isDisabled?: (index: number) => boolean
	getTextValue?: (index: number) => string // typeahead over data, not DOM
	scrollToIndex: (index: number) => void
}
```

Navigation becomes index math: arrow/Home/End/typeahead compute the target index, `scrollToIndex` mounts it, then the highlight applies (activedescendant id / `data-active`) once the row renders (layout effect after the virtualizer updates). `VirtualOptions` grows the props to feed the source (`getOptionId`, `isDisabled`, `getTextValue`) and stops discarding `scrollToIndex`.

**2. Active-descendant id validity.** `aria-activedescendant` must reference an element in the DOM. With overscan the active row is mounted by the time the highlight lands (scrollToIndex precedes anchor). Guard: if the active index unmounts (resize/filter), re-anchor or clear — extend Combobox's MutationObserver logic to be index-aware so windowing churn (constant childList mutations) doesn't fight the highlight. This interplay is the riskiest part; it deserves dedicated tests.

**3. a11y hardening.** Windowed listboxes lose "n of m" context for screen readers: `VirtualOptions` passes `aria-setsize`/`aria-posinset` through the render contract. Optional stretch: PageUp/PageDown in the virtual source.

**4. Integration order — virtual-highlight components first.**
- **Combobox**: consumers pre-filter on `deferredQuery` and hand the filtered array to `VirtualOptions`. The filter-reanchor effect (`combobox.tsx:280–320`) re-anchors by index. AddressInput inherits for free.
- **CommandPalette**: same pattern; delete the ~100s-items cap comment.
- **Listbox/Select (phase 2)**: focus-mode roving needs a two-phase move (scrollToIndex → focus the newly mounted node). Separate PR after Combobox/CommandPalette.
- **Excluded**: Menu (small action lists, no filtering — no payoff), Tree (nested composition, no flat row model), TagInput (renders chosen tags, not option lists).

**5. Scroll container contract.** Virtualization requires a fixed max-height scrollable `[role="listbox"]`. Panels get this from floating-ui sizing today; document the requirement on `VirtualOptions` TSDoc and demos rather than adding new layout machinery.

**6. Non-goals.** No data-prop rewrite of the components — children composition stays; `VirtualOptions` remains the opt-in data-driven path.

## Tests

- Unit: virtual item source navigation over 10k items (arrow past window edge, Home/End, typeahead to offscreen item, disabled skipping, Enter selects, activedescendant id resolves post-windowing). Extend `__tests__/components/combobox.test.tsx`, `command-palette.test.tsx`; listbox/select tests for phase 2.
- a11y: jest-axe over open virtualized panels (`test:a11y` suite).
- Browser mode (`test:browser`): real scroll + keyboard on a 10k combobox — jsdom can't validate scrollToIndex geometry.
- Bench: extend existing listbox/combobox benches with keyboard-nav-while-virtualized cases.

## Docs surface (per tms-ui CLAUDE.md §3.5 equivalent here)

TSDoc on `VirtualOptions`, `useA11yRoving`, `useVirtualWindow` changes; update `packages/ui/docs/PRIMITIVES.md`, `HOOKS.md`, `COMPONENTS.md`; add large-list demos to `src/docs/demos/components/combobox.tsx` and `command-palette.tsx`.

## Suggested PR slicing

| PR | Scope | Size |
|---|---|---|
| 1 | Virtual item source in `useA11yRoving` + `VirtualOptions` registration + setsize/posinset + unit tests | M |
| 2 | Combobox + CommandPalette integration, MutationObserver index-awareness, demos, docs, browser tests | M |
| 3 | Listbox/Select focus-mode virtualization | M |

Downstream (tms-ui, after sync): carrier-combobox loads the full carrier list (drops the `page=1&pageSize=50` truncation in `use-carriers.ts`) behind `VirtualOptions`; option-picker sheets where lists are large. The tms-ui Query plan's Q-5 (`useCarriers` → Query) pairs with that adoption.
