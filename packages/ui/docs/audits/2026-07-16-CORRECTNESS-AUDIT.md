# Correctness & Cleanliness Audit — the `ui` component surface

**Date:** 2026-07-16 · **Scope:** every public `ui` component, swept in
alphabetical batches of ten. **Lens:** correctness (behavioral bugs, a11y,
state, edge cases) and cleanliness (pattern concision, dead/duplicated code,
optimization). Deliberate architecture — the controlled/uncontrolled triads,
the form-binding cascade, recipe variants, static-tier explicit sizing and DOM
projections, `data-slot` anchors, §3.6 per-item render callbacks — is screened
out before flagging, exactly as the [props audit](2026-07-13-PROPS-AUDIT.md)
did. **Method:** direct source reads of each component's every file plus the
core/recipe/hook machinery it composes; each claim re-verified against source,
tests, and grep before it lands. **Living record — resolve rows in place with
the commit.**

Verdicts: **FIX** (correctness defect) · **SIMPLIFY** (dead/duplicated/verbose
code, concision) · **OPTIMIZE** (measurable waste) · **DOC** (stale or wrong
doccomment) · **WATCH** (recorded so the next sweep doesn't relitigate).

## Coverage

| Batch | Components | Status |
|---|---|---|
| 1 | accordion, address-input, alert, aspect-ratio, avatar, badge, banner, box, breadcrumb, button | ✅ swept |
| 2 | calendar, card, checkbox, code, collapse, color, combobox, command-palette, confirm, container | ✅ swept |
| 3 | context-menu, control, copy-button, credit-card-input, currency-input, date-input, date-picker, dialog, divider, dl | ◯ pending |
| 4– | remaining 67 components, ten at a time | ◯ pending |

---

## Batch 1 — accordion · address-input · alert · aspect-ratio · avatar · badge · banner · box · breadcrumb · button

### Executive summary

No correctness defects. The batch is behaviorally sound: Alert's
controlled-without-handler dismissal, its polite-severity re-announcement (which
correctly stays silent for an alert already open on mount — pinned by
`alert.test.tsx:142`), Avatar's image-vs-initials accessible-name resolution,
Button's icon-only-vs-labeled sizing and loading-anchor gating, and
address-input's abort-on-change fetch lifecycle each hold up under trace. What
the sweep found is one un-migrated skeleton duplicate (with a stale factory
doc pointing at it), plus a thin sediment of dead-in-one-mode branches and one
re-export layer that half its own consumer already bypasses.

### Findings

| # | Verb | Surface | Site | Issue | Fix | Status |
|---|---|---|---|---|---|---|
| 1 | SIMPLIFY + DOC | AvatarSkeleton | avatar-skeleton.tsx:12 · placeholder-skeleton.ts:72 | Hand-rolls exactly what `createSkeleton(k.skeleton, …)` emits — `<Placeholder className={cn(k.skeleton.base, k.skeleton.size[size ?? 'md'], className)}>`. `k.skeleton` is `kokkaku.avatar` (`{ base, size: shaku.avatar }`) and `AvatarVariants['size']` is keyed to that same `shaku.avatar` scale, so `sizeClassFor` resolves identically to the direct index — the factory output is byte-for-byte the same. The factory's own doc names Avatar the reason to write inline ("Components that wrap the placeholder (Avatar's `DensityScope`)…"), but `DensityScope` lives only in `input-frame.tsx`; Avatar has no wrap. The exception is stale and the leaf is an un-migrated duplicate. | `AvatarSkeleton = createSkeleton(k.skeleton, 'AvatarSkeleton')` + `AvatarSkeletonProps = SkeletonProps<NonNullable<AvatarVariants['size']>>` (badge-skeleton verbatim); add `} as const` to `kokkaku/avatar.ts` for inference parity with button/badge; repoint the factory doc at a real inline case (Control's join-aware skeleton). | ✅ RESOLVED (folded into `createSkeleton`; factory doc repointed; `kokkaku/avatar` aligned with `as const`) |
| 2 | SIMPLIFY | Box | box.tsx:4-18,104-111 · box/variants.ts:9-15 | `variants.ts` re-exports `k.padding`→`paddingMap`, `k.px`→`pxMap`, … as pass-through aliases, and `box.tsx` imports the seven maps from it — yet reaches `k.bg`/`k.outline` **directly** from the kata in the same `cn()` call. The indirection layer isn't a consistent boundary; it's bypassed for two of nine axes. | Drop the map aliases; index `k.padding[p]` etc. directly (as bg/outline already do). Keep the exported `Box*` types in `variants.ts`. | ◯ OPEN |
| 3 | SIMPLIFY | address-input | use-address-input-suggestions.ts:64 | `const delay = query.length === 0 ? 0 : debounceMs` — the `=== 0` arm is unreachable under the default `minQueryLength` (3): the effect returns early at `query.length < minQueryLength`, so length 0 only survives when `minQueryLength ≤ 0`. For every default consumer `delay` is just `debounceMs`. | Collapse to `debounceMs`, or document the `minQueryLength: 0` zero-debounce intent if deliberate. | ◯ OPEN |
| 4 | SIMPLIFY | Accordion | use-accordion-selection.ts:68 | `const collapsible = isMultiple ? true : (props.collapsible ?? true)` — the `isMultiple ? true` arm is dead: multiple-mode `toggle` adds/removes unconditionally and never reads `collapsible`. | Compute only for the single branch (or inline `props.collapsible ?? true` where the single-mode toggle reads it). | ◯ OPEN |

### Watch-list

| Surface | Note | Status |
|---|---|---|
| useAccordionSelection | Wraps `props.onValueChange` in its own ref **and** memoizes `onControllableChange` (`useCallback([isMultiple])`) — but `useControllable` already reads its `onValueChange` off a ref behind a stable `setValue`, so an unstable inline callback would be handled. The ref+memo pair is belt-and-suspenders, not a correctness requirement; harmless, recorded so it isn't re-derived. | ◯ OPEN |
| Leaf `data-slot` override policy | Static leaves split on whether a consumer can clobber the slot name: box/alert destructure `'data-slot'` with a default (stable identity); aspect-ratio/badge/banner spread `{...props}` last (overridable). No bug — the overridable ones aren't typed to accept `data-slot` from most call sites — but the split is worth one policy note. | ◯ OPEN |
| Banner `position` · Box `m`/`mx`/`my` | Already filed by the [props audit](2026-07-13-PROPS-AUDIT.md) (`position` REMOVE; margins REMOVE). Not re-litigated here. | ↗ props audit |

### Audited clean (no findings)

accordion (root/item/trigger/panel/context), alert, aspect-ratio, avatar (root
+ group), badge, banner, breadcrumb (all six parts), button (root, headless,
constants, utilities, skeleton), address-input (photon provider + suggestions
hook). The shared machinery these compose — `createSlot`, `createContext`,
`createSkeleton`, `useControllable`, `useA11yDisclosure`, `useA11yRoving` — was
read to verify the claims above and is sound.

---

## Batch 2 — calendar · card · checkbox · code · collapse · color · combobox · command-palette · confirm · container

### Executive summary

Two real correctness bugs, one per-keystroke re-render hole, and one
cross-cutting empty-state gap — all clustered where a popover or a virtualized
list meets focus/highlight state; the leaves (card, checkbox, code, collapse,
confirm, container) and the large date subsystem are otherwise clean. Calendar
is exceptionally sound: the day-grid roving under a constant CSS column offset,
the sub-100-year date math routed through `@internationalized/date`, and the
render-phase re-anchor all hold up. The bugs: a virtualized command-palette
resumed keyboard navigation from the prior session's highlight index on reopen;
the popover color picker's hex/RGB inputs couldn't be focused by click; two
black colours differing only in saturation compared unequal; and the combobox's
`setQuery` reintroduced the per-keystroke option re-render its own `queryRef`
machinery exists to prevent. All four are fixed. The remaining one — shared
`VirtualOptions` keeping the listbox non-`:empty`, so the "No results" CSS state
never fires under virtualization (both Combobox and CommandPalette) — is recorded
for a shared-primitive decision rather than fixed autonomously.

### Findings

| # | Verb | Surface | Site | Issue | Fix | Status |
|---|---|---|---|---|---|---|
| 1 | FIX (high) | command-palette | use-command-palette-state.ts:60,108 | `activeIndexRef` is reset nowhere on close, so a virtualized palette reopens at the prior session's index: the close branch clears only the query, the seed effect early-returns on the unchanged empty `deferredQuery`, and the dialog unmounts its options (no DOM `data-active` to read the index back off). The first arrow then lands at `index+1`, not the first item — contra the seed doc. Combobox clears it via `clearVirtualActiveIndexed` on `!open`; the palette had no equivalent. | Reset `activeIndexRef.current = -1` in the render-phase close branch; the dialog's `PresencePortal` unmounts the options, so no DOM clear is needed. | ✅ RESOLVED |
| 2 | FIX (high) | ColorPicker (popover) | color-picker-content.tsx:71 · color-hex-input.tsx · color-channel-inputs.tsx | The content wrapper's `onMouseDown={preventDefault}` (which holds focus for the area/slider drag model that self-focuses via `useColorDrag`) suppresses the native mousedown→focus for the hex and RGB(A) text inputs, so they can't be edited by mouse. DatePicker documents and guards the identical hazard per field (`date-picker-relative.tsx:152`, `stopPropagation`); the color inputs lacked it. Inline `ColorPanel` is unaffected (no wrapper). | `onMouseDown` stopPropagation on the hex and channel `<Input>`s (lands on the `<input>` via `…rest`; a no-op inline; mirrors DatePicker). | ◯ OPEN |
| 3 | FIX (med) | equalHsva | color-utilities.ts:44 | Two colours that render identically as black (`v=0`) but differ in saturation compared unequal, contradicting the doccomment ("render identically"): `hueMoot` collapses hue at `v=0`/`s=0` but the return still required `s` equality, so the `#000000` swatch never showed active once the area was dragged to the bottom at `s>0`. | Add `satMoot` (`v=0`) mirroring `hueMoot`; a new synchronous `equalHsva` case pins it. | ◯ OPEN |
| 4 | OPTIMIZE (med) | combobox | use-combobox-state.ts:66 | `setQuery`'s `[onQueryChange]` dependency reintroduces exactly the churn the file's `queryRef`/`deferredQueryRef` exist to prevent: an inline `onQueryChange` (a realistic consumer pattern) gives `setQuery` — and through it `close`, `select`, and the combobox context — a new identity every render, re-rendering every `ComboboxOption` on the typing path the deferred query keeps cheap (the memoized option can't bail; its `onSelect` changes). The `open` path avoids this because `useControllable` refs its callback. | Read `onQueryChange` through a ref (the `useControllable` pattern); `setQuery` becomes empty-dep and stable. | ◯ OPEN |
| 5 | FIX (med, cross-cutting) | VirtualOptions | virtual-options.tsx:170 · combobox-panel.tsx · command-palette.tsx:166 | `VirtualOptions` always renders its `containerRef` wrapper `<div role="presentation">` inside the listbox — needed for scroll measurement even at zero items — so the listbox is never `:empty` and the `peer-empty` "No results" state can't fire under virtualization; a virtualized Combobox/CommandPalette filtered to zero shows a blank panel with no message. Reachable via the `VirtualizedPeople` demo. | Shared decision: signal emptiness from the primitive (or move the empty-state off CSS `:empty`) without dropping `containerRef` (a naive `return null` loses scroll measurement). Both consumers share the pattern. Recorded, not fixed. | ◯ OPEN |

### Minor / watch-list

| Surface | Site | Note | Verb | Status |
|---|---|---|---|---|
| combobox | use-combobox-input.ts:51,57 | Dead `selectionStart/End === null` guard + stale "a selectionless input type" comment after the `inputType` removal (#993): the input is always `type="text"`, so the selection is never null. | SIMPLIFY + DOC | ◯ OPEN |
| combobox | use-combobox-state.ts:134 | `select` re-tests `shouldClose` in two separate `if` blocks; one `if/else` evaluates it once and reads cleaner. | SIMPLIFY | ◯ OPEN |
| combobox | use-combobox-state.ts:101 | A purely external controlled `open={false}` routes through `setOpen` only, leaving `editing`/`query` unreset — the input shows stale query text until retype. Every in-component close path already reaches `close()`. | WATCH | ◯ OPEN |
| color | color-utilities.ts:94 | `((G - B) / d) % 6` — the `% 6` is a dead no-op (`(G-B)/d ∈ [-1,1]`; the later `if (h < 0) h += 360` handles the wrap). Mirrors the textbook formula. | SIMPLIFY | ◯ OPEN |
| color | color-swatches.tsx:20 | `hexToHsva(swatch)` re-parses ~20 preset hexes on every panel render (each drag frame included); a `useMemo` over `swatches` hoists it. Micro. | OPTIMIZE | ◯ OPEN |
| color | color-eyedropper.tsx:63 | `disabled={disabled}` on the Button is dead: `ColorEyedropper` renders only under `!disabled` (color-panel.tsx:102). | SIMPLIFY | ◯ OPEN |
| color | color-area.tsx:39,75 · color-slider.tsx:44,75 | Keyboard nudges derive the changed channel from the render snapshot, not the `setHsva` `prev`, so fast key-repeat before a commit can coalesce a step. Drag path (absolute) is immune. | WATCH | ◯ OPEN |
| calendar | calendar-utilities.ts:114 | `getMonthLabels` uses raw `new Date(2021, i, 1)` — the lone bypass of the file's `CalendarDate` convention (year hardcoded safe, so cosmetic). | SIMPLIFY | ◯ OPEN |
| calendar | use-calendar-picker.tsx:141 | `dispatch({ type: 'open', year })` duplicates the open effect's dispatch, but seeds the reducer pre-paint in the same click tick (a defensible stale-year guard). | WATCH | ◯ OPEN |
| command-palette | command-palette.tsx:72 · use-command-palette-state.ts:32 | Docs cite type-ahead reaching windowed items, but the palette never enables roving `typeahead` — arrow-only. | DOC | ◯ OPEN |
| command-palette | command-palette.tsx:166 | The "No results" `<output>` carries constant text toggled purely by CSS; announcement of a `display` toggle of unchanged text varies by screen reader (verify against a real SR). | WATCH | ◯ OPEN |
| code | code-block.tsx:65 | The doc calls the cache "LRU" but eviction is FIFO (no recency bump on hit); immaterial for stable snippets. | DOC | ◯ OPEN |

### Audited clean (no findings)

card (frame + five slots), checkbox (root/field/group), code + code-block,
collapse (root/trigger/panel/context), confirm, container. Calendar's fourteen
files — day-grid roving under CSS offset, month/year date math, range-edge
rounding, the picker reducer, and the a11y wiring — were traced and verified
sound, as were the color drag/state hooks (`useColorDrag` pointer-capture
lifecycle, `useColorState` reconcile) and the combobox open/close/highlight/
selection machine and command-palette non-virtual path beyond the rows above.

---

## Reliability appendix

Every row was traced to its definition and its consumption in source, then
cross-checked against the component's test file and grep before landing — the
Alert mount-announcement row was demoted from a suspected a11y gap to
"deliberate" precisely because `alert.test.tsx:142` pins it. Usage/consumption
claims are grep-verified (`DensityScope` reaches only `input-frame.tsx`;
`k.skeleton` shape confirmed against `kokkaku/avatar.ts` and `shaku.avatar`).
Findings marked SIMPLIFY change no behavior; the AvatarSkeleton conversion is
the one row touching a public export, and it preserves the `AvatarSkeletonProps`
surface (same `size` prop, same default) — its TSDoc and the `COMPONENTS.md`
row need no change.

Batch 2's two hardest calls were confirmed against the sibling precedents that
guard the same hazard — combobox's `clearVirtualActiveIndexed` on close (the
command-palette stale-index bug) and DatePicker's per-field `stopPropagation`
(the color-input focus bug) — and the Dialog→Overlay `PresencePortal` unmount was
verified to justify the ref-only palette fix. The four fixes ran the scoped suite
green (command-palette, combobox, and color, plus a new synchronous `equalHsva`
case). Per CONVENTIONS.md §10.3 the two floating/virtualized bugs carry no new
driven-lifecycle test; they rest on the
precedent guards and the passing existing suites. The cross-cutting VirtualOptions
row is recorded, not fixed: its resolution is a shared-primitive decision.
