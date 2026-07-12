# Keyboard-Complete Virtualization for Option Lists — 2026-07-01

**Status: landed 2026-07-12.** PR 1 (index-based item source in `useA11yRoving` + `VirtualOptions` registration + `aria-setsize`/`aria-posinset`) and PR 2 (Combobox + CommandPalette integration, demos, docs, browser tests) both shipped in the same change. PR 3 (Listbox/Select focus-mode virtualization) is still open — see "What's left" below. This doc is kept as the design record; "Current state" and "Design sketch" below describe the *pre-landing* state and are historical.

## What actually shipped, vs. the original sketch

- **The core index-based source landed roughly as sketched** (§ Design sketch 1): `VirtualItemSource` in `hooks/a11y/use-a11y-roving.ts`, registered by `VirtualOptions` through a new `VirtualItemSourceContext` (`primitives/virtual-options/virtual-item-source-context.ts`) that the host (`Combobox`, `CommandPalette`) provides and reads via a caller-owned `activeIndexRef`/`itemSource` ref pair passed into `useA11yRoving`.
- **The json-tree precedent (§ Current state) was wrong.** `json-tree-virtualized.tsx` doesn't do index-based navigation — it reuses the same DOM-query `useA11yRoving` (focus mode) as the non-virtualized tree, so it has the *same* windowed-out-items gap this plan closes elsewhere, just not in scope here. The actual precedent for `scrollToIndex`-driven index navigation in this codebase is the **grid module** (`modules/grid/grid-virtualized-body.tsx` + `use-grid-cursor.ts`), which publishes a `scrollIntoViewRef` callback up to its cursor — a different, bespoke 2D system, not directly reusable, but confirms the "index math + explicit scroll" shape was already established.
- **Two real, previously-unknown bugs surfaced during integration, both fixed:**
  1. **`VirtualOptions`'s scroll-container lookup was wrong for real composition.** It resolved the nearest `[role="listbox"]` ancestor, but `ComboboxPanel`/`ListboxPanel` put the scrollable `overflow-y-auto` + `max-h-*` styling on the *floating panel* that wraps the listbox element, not on the listbox element itself — so a real `<Combobox><VirtualOptions>…` never actually windowed (renders 0 rows, confirmed via a live Playwright check against `ComboboxPanel`'s real DOM). Fixed by walking up to the nearest ancestor with a computed scrollable `overflow-y`, regardless of role (`findScrollableAncestor` in `virtual-options.tsx`). `CommandPalette`'s `DialogBody` additionally needs an explicit *definite* height wrapper (not just `max-height`) around `VirtualOptions` — `max-height` alone has no floor, so a `DialogBody` that sizes to its own (initially empty) content never grows past zero. Documented on `VirtualOptions` and `CommandPalette`'s `children` prop; both demos show the wrapper.
  2. **`CommandPaletteItem` silently discarded an explicit `id`** (its internal `useId()` always won, spread after the caller's props). This is required for `getOptionId`-driven ids to actually land on the DOM, and broke `aria-activedescendant` resolution for virtualized `CommandPalette` specifically. Fixed: an explicit `id` prop now wins, matching `option.tsx`'s existing `id ?? autoId` convention.
- **The mount-catch-up mechanism ended up call-scoped, not hook-scoped.** The plan sketch (§2) assumed a `useEffect`-owned `MutationObserver` reacting to "the container ref." In practice `containerRef.current` can lag the effect that reads it by a render (the same class of ref/commit-ordering issue `useVirtualWindow`'s own re-sync guard exists for) — verified live: it broke `Combobox`'s virtualized demo, and a bounded-retry fix broke `CommandPalette`'s (whose `listRef` sits behind a `Dialog`/`AnimatePresence` mount cycle the effect's re-render didn't always follow). The landed design instead has `setVirtualActiveIndexed` arm a short-lived, per-navigation `MutationObserver` scoped to the exact `container` it was called with, keyed to the `index` it's watching for — a *newer* move (a changed `activeIndexRef.current`) makes a stale watcher disconnect instead of applying outdated state. This is simpler than the original sketch and doesn't depend on component re-render timing at all.

## Current state (verified in the synced tree, 2026-07-01) — pre-landing, historical

- `primitives/virtual-options/virtual-options.tsx` exists: `VirtualOptions<T>` renders `items: T[]` through `useVirtualWindow` (the 63-line wrapper over `@tanstack/react-virtual`), finding its scroll element via `closest('[role="listbox"]')`. It assumes uniform row heights and **discards `scrollToIndex`**.
- Benchmarks already cover virtualized listbox/combobox (`__benchmarks__/listbox.bench.tsx`, `combobox.bench.tsx`, 500/2k options).
- **The gap is keyboard navigation**: `hooks/a11y/use-a11y-roving.ts` resolves items via `queryItems(containerRef, itemSelector)` per keystroke — DOM-only. Windowed-out options are unreachable (arrows stop at the rendered window edge; Home/End/typeahead can't reach offscreen items). `VirtualOptions` documents the limitation (lines 37–38); `command-palette.tsx:49` caps usage at "~100s items" for the same reason.
- Highlight models split the components in two:
  - **Virtual active-descendant** (focus stays on the input): Combobox, CommandPalette. Options mint stable ids (`primitives/option/option.tsx:88`). Combobox has a MutationObserver (`combobox.tsx:329–349`) re-anchoring the highlight when options swap.
  - **Focus-roving** (real DOM focus moves): Listbox (Select is a thin wrapper over it), Menu, via `PopoverPanel` (`primitives/popover/popover.tsx:60`).
- No `aria-setsize`/`aria-posinset` anywhere.
- ~~json-tree precedent (`json-tree-virtualized.tsx`): custom keyboard nav over the flattened data array + explicit `scrollToIndex` — i.e., index-based navigation, not DOM queries. This is the pattern to generalize.~~ **Incorrect — see "What actually shipped" above.**

## Design sketch — pre-landing, historical (see "What actually shipped" for the as-built shape)

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

**5. Scroll container contract.** Virtualization requires a fixed max-height scrollable `[role="listbox"]`. Panels get this from floating-ui sizing today; document the requirement on `VirtualOptions` TSDoc and demos rather than adding new layout machinery. **As-built: the contract is "nearest ancestor with a scrollable `overflow-y`," not `[role="listbox"]` specifically, and needs a *definite* height where nothing else provides one (`CommandPalette`) — see "What actually shipped."**

**6. Non-goals.** No data-prop rewrite of the components — children composition stays; `VirtualOptions` remains the opt-in data-driven path.

## Tests

- Unit: virtual item source navigation over 10k items (arrow past window edge, Home/End, typeahead to offscreen item, disabled skipping, Enter selects, activedescendant id resolves post-windowing) — landed in `__tests__/hooks/use-a11y-roving.test.tsx` and `__tests__/boundary/virtual-options.test.tsx`. Neither `Combobox` nor `CommandPalette` wires `typeahead: true` (their input owns typing as a filter query, not a listbox jump) or routes Home/End to roving (reserved for the textbox caret) — so those two components' own coverage is arrow-reachability only; the fuller keyboard surface (Home/End, typeahead, disabled-skipping) is exercised at the hook level against a hand-built `VirtualItemSource`, decoupled from any one consumer.
- a11y: jest-axe over open virtualized panels (`test:a11y` suite) — not added in this pass; flagged as a gap.
- Browser mode (`test:browser`): real scroll + keyboard on a 5k-item Combobox/CommandPalette — landed as `__tests__/browser/virtualization-keyboard.test.tsx`.
- Bench: existing listbox/combobox benches (`__benchmarks__/*.bench.tsx`) re-verified unaffected; no new keyboard-nav-while-virtualized bench cases added.

## Docs surface (per tms-ui CLAUDE.md §3.5 equivalent here)

TSDoc on `VirtualOptions`, `useA11yRoving`, `Combobox`, `CommandPalette`, `CommandPaletteItem`, `option.tsx`'s `OptionProps` — landed. `packages/ui/docs/PRIMITIVES.md` and `HOOKS.md` one-liners updated; `COMPONENTS.md` is a bare name index, no per-component summary to update. Large-list demos landed in `src/docs/demos/components/combobox.tsx` and `command-palette.tsx`.

## What's left

- **PR 3 — Listbox/Select focus-mode virtualization.** Not started. Needs the two-phase move (`scrollToIndex` → focus the newly-mounted node) the original sketch calls out; the active-descendant model this PR built doesn't directly transfer to focus-roving.
- **a11y suite coverage** (jest-axe over an open virtualized panel) — not added.
- **Bench cases for keyboard-nav-while-virtualized** — not added; existing benches only measure render cost, not roving.
- Downstream (tms-ui, after sync): carrier-combobox loads the full carrier list (drops the `page=1&pageSize=50` truncation in `use-carriers.ts`) behind `VirtualOptions`; option-picker sheets where lists are large. The tms-ui Query plan's Q-5 (`useCarriers` → Query) pairs with that adoption.
