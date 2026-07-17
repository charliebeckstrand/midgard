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
| 3 | context-menu, control, copy-button, credit-card-input, currency-input, date-input, date-picker, dialog, divider, dl | ✅ swept |
| 4 | drawer, fieldset, file-upload, filters, flex, form, group, heading, hold-button, icon | ✅ swept |
| 5 | input, json-tree, kanban, kbd, link, list, listbox, loading, markdown, mask-input | ✅ swept |
| 6– | remaining 47 components, ten at a time | ◯ pending |

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
| 2 | FIX (high) | ColorPicker (popover) | color-picker-content.tsx:71 · color-hex-input.tsx · color-channel-inputs.tsx | The content wrapper's `onMouseDown={preventDefault}` (which holds focus for the area/slider drag model that self-focuses via `useColorDrag`) suppresses the native mousedown→focus for the hex and RGB(A) text inputs, so they can't be edited by mouse. DatePicker documents and guards the identical hazard per field (`date-picker-relative.tsx:152`, `stopPropagation`); the color inputs lacked it. Inline `ColorPanel` is unaffected (no wrapper). | `onMouseDown` stopPropagation on the hex and channel `<Input>`s (lands on the `<input>` via `…rest`; a no-op inline; mirrors DatePicker). | ✅ RESOLVED |
| 3 | FIX (med) | equalHsva | color-utilities.ts:44 | Two colours that render identically as black (`v=0`) but differ in saturation compared unequal, contradicting the doccomment ("render identically"): `hueMoot` collapses hue at `v=0`/`s=0` but the return still required `s` equality, so the `#000000` swatch never showed active once the area was dragged to the bottom at `s>0`. | Add `satMoot` (`v=0`) mirroring `hueMoot`; a new synchronous `equalHsva` case pins it. | ✅ RESOLVED |
| 4 | OPTIMIZE (med) | combobox | use-combobox-state.ts:66 | `setQuery`'s `[onQueryChange]` dependency reintroduces exactly the churn the file's `queryRef`/`deferredQueryRef` exist to prevent: an inline `onQueryChange` (a realistic consumer pattern) gives `setQuery` — and through it `close`, `select`, and the combobox context — a new identity every render, re-rendering every `ComboboxOption` on the typing path the deferred query keeps cheap (the memoized option can't bail; its `onSelect` changes). The `open` path avoids this because `useControllable` refs its callback. | Read `onQueryChange` through a ref (the `useControllable` pattern); `setQuery` becomes empty-dep and stable. | ✅ RESOLVED |
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

## Batch 3 — context-menu · control · copy-button · credit-card-input · currency-input · date-input · date-picker · dialog · divider · dl

### Executive summary

Two real bugs, both again at the seam where a formatted input meets shared
popover/caret machinery: the relative date-picker's custom mode had its
Start/End fields' arrow keys stolen by the dialog's virtual-model focus
reclaim, and the currency input turned a typed leading decimal (`.5`) into `5.`
— ten times the intended value — because it lacked the type-at-end caret branch
its date-input sibling documents for the identical pad hazard. One reuse
consolidation: `resolveContextMenuEntries` re-implemented the exported
`mergeContextMenuItems` primitive inline, leaving the primitive with zero real
consumers. Three doccomment corrections rode along. Batch-2's open lead on
DatePicker keyboard navigation resolved clean: every grid-highlight write is
clamped into `[min, max]`, so arrow keys cannot park the highlight on a
disabled date. Dialog, date-input, control's cascade, and the small leaves
(copy-button, divider, dl) audited clean.

### Findings

| # | Verb | Surface | Site | Issue | Fix | Status |
|---|---|---|---|---|---|---|
| 1 | FIX (med-high) | DatePicker (relative custom) | date-picker-content.tsx:166 · use-date-picker-relative-state.ts:358 | The dialog keydown's `NAVIGATION_KEYS` focus-reclaim (`event.currentTarget.focus()`) runs for every content variant, but its rationale — a grid move can unmount the focused day button — applies only to the calendar variants. Custom mode passes `onKeyDown = undefined` and renders editable Start/End `<DatePicker input>` fields whose keydowns bubble unimpeded, so pressing ArrowLeft/Right to move the text caret yanked focus to the dialog container; caret arrows were unusable and the nested-picker roving broke after the first key. Untested path (custom-mode tests only type digits and click). | Gate the reclaim on `onKeyDown &&`: no virtual model, no reclaim — the presence-implies-control convention (props audit T5) already distinguishes the modes. | ✅ RESOLVED (early-return form; contract added to the prop TSDoc) |
| 2 | FIX (med-high) | CurrencyInput | currency-input.tsx:107 · currency-input-utilities.ts:56 | `onChange` always routed through `reformat`'s meaningful-count caret restore, but `formatEditing` pads a `0` before a bare decimal (`.` → `0.`); the restore counts that pad as the first meaningful char and pins the caret between `0` and `.`, so the next digit lands in the integer part: typing `.5` produced `5.` — `$5.00`, 10× off, wrong side of the decimal. Exactly the pad hazard `date-input.tsx:214-218` defends with its type-at-end branch; currency had no equivalent, and no test typed a leading decimal incrementally. | Mirror DateInput: when the caret is at the end, format without queuing the caret restore. New test pins `.5` → `0.5`. | ✅ RESOLVED (shared local `format` keeps the branch and the hook formatter from drifting) |
| 3 | SIMPLIFY | context-menu | context-menu-merge.ts:42-48 | `resolveContextMenuEntries` re-implemented `mergeContextMenuItems` inline — the same empty-group filtering and separator join, via two early returns plus a `GROUP_SEPARATOR` constant — while the exported primitive, billed by its own doc as "the building block a host uses," had zero non-test consumers repo-wide. | Route the resolver through `mergeContextMenuItems([a, b])`; delete the constant and early returns. Behavior-identical (tests assert separator shape and item identity, not the separator key). | ✅ RESOLVED (single-call form: the ternary picks the group order, the merge stays invariant) |
| 4 | DOC | Control | use-control-props.ts:46 | Doccomment described fields composing `size ?? control?.size` at the call site — a code path that exists nowhere; size resolves purely through `useControlSize`/`useDensity`, and the context's `size` only seeds the `<Density>` scope. The phrasing invites adding the exact read the architecture avoids. | Rewrite to describe the real resolution path. | ✅ RESOLVED |
| 5 | DOC | CreditCardInput (+ Cvv) | credit-card-input.tsx:33 · credit-card-input-cvv.tsx:55 | "Emits the raw value" misdescribes `onValueChange` — it emits the formatted, spaced text (test-pinned), and in a masking component "raw" reads as the digit string it is not. Plus "defaults an 'Security code'" grammar. | "raw" → "formatted"; "an" → "a". | ✅ RESOLVED |

### Minor / watch-list

| Surface | Site | Note | Verb | Status |
|---|---|---|---|---|
| CurrencyInput | currency-input.tsx:84 | An external controlled-value change while `editingText` is non-null is shadowed until blur; date-input handles this with its `known`/`emitted` reconciliation (test-pinned). Real asymmetry with the sibling; may be an accepted simplification since currency has no calendar-like concurrent writer. | WATCH | ◯ OPEN |
| CurrencyInput | currency-input.tsx:112 | `setNum` fires on every keystroke, so no-op edits (trailing `.`, digits past `precision`) re-emit the same value; the blur path guards (`parsed !== num`), onChange doesn't. | SIMPLIFY | ◯ OPEN |
| CreditCardInputCvv | credit-card-input-cvv.tsx:94-114 | The `mountedRef` mount-skip effect self-defeats under StrictMode's setup→cleanup→setup (one spurious dev-only `onValidityChange`); the repo's convention elsewhere is StrictMode-resilient prev-value refs. | SIMPLIFY | ◯ OPEN |
| CreditCardInput | credit-card-input.tsx:63 | Full `formatCardNumber` memo computed only to read `brand`; `detectCardBrand(masked.value)` is equivalent (card-validator strips separators) and skips the grouping work. | OPTIMIZE | ◯ OPEN |
| CreditCardInputCvv | credit-card-input-cvv.tsx:25 · utilities:104 | The Amex-4/others-3 CVV rule is encoded three times (`CVV_LENGTHS`, `validateCardCvv`, card-validator's `code.size`); consistent only while Amex stays the sole 4-CVV brand. | WATCH | ◯ OPEN |
| Control | control.tsx:35 | `autoComplete` is a declared, cascaded, context-carried prop the component doc omits from its broadcast list. | DOC | ◯ OPEN |
| DateInput | date-input.tsx:152 | `activeMessage` (re-parses when text is complete) computes every render but is read only under `typedInvalid`; gate it. Negligible. | OPTIMIZE | ◯ OPEN |
| ContextMenu | menu-content.tsx:96 · use-floating-ui.ts:200 | Standalone `<ContextMenu>` restores no focus on Escape/selection close (`returnFocusTo` never attaches — no persistent trigger); grid implements its own restore, signalling host-responsibility by design. | WATCH | ◯ OPEN |
| DatePicker / ColorPicker | date-picker-content.tsx:174 · color-picker-content.tsx:66 | Verbatim-duplicated focus-holding `motion.div` surface (motion + Density + Box). A shared `PopoverSurface` would absorb ~6 lines while both keep their own focus-manager scaffolding — worth it at a third consumer, not two. | WATCH | ◯ OPEN |
| DatePicker (relative) | use-date-picker-relative-state.ts:362 | `chips`/`selectedIds` memos read `nowRef.current` without depending on it: a value committed before midnight on a long-mounted page can show a stale preset match until the next interaction. Consistent with the one-`now`-per-interaction design. | WATCH | ◯ OPEN |
| useFormattedInput | use-formatted-input.ts:10 | Padding formatters (currency's `.` → `0.`, date's `1/` → `01/`) violate the `meaningful` "preserved across format" contract, forcing type-at-end caret branches at two call sites. When a third padding consumer appears, absorb an at-end option into the hook (`atEnd: 'jump' \| 'restore'`) — masks must keep `'restore'` (caret before trailing separators is what makes backspace work). | WATCH | ◯ OPEN |

### Audited clean (no findings)

dialog (open/close, focus trap/restore, dismiss ordering, scroll lock, ARIA —
all verified against the Overlay/panel primitives), date-input (the cap/carry
mask, parse validation incl. leap years and the sub-100-year `setFullYear` fix,
all three caret branches, the `known`/`emitted` reconciliation, commit guards),
control (the id/disabled/severity/readOnly/variant/size cascade verified
against its tests), copy-button (+ state hook), divider, dl (all three parts).
Batch-2's calendar lead is closed: `moveGridDate`/`moveGridMonths`/
`getInitialActiveDate` and the footer path all clamp into `[min, max]`, so the
DatePicker keyboard path cannot highlight or select a disabled date.

---

## Batch 4 — drawer · fieldset · file-upload · filters · flex · form · group · heading · hold-button · icon

### Executive summary

The two heavy subsystems are clean where it counts: form's `useSyncExternalStore`
snapshot is a stable ref (no render loop), and file-upload's drag depth-counter,
same-file input reset, and object-URL story (there are none to leak) all hold up.
The one real bug is small and self-inflicted by a helper: `FiltersClear` guarded
its child with `Children.only`, which throws on the bare-string child its own
doc promises to wrap in a default Button — so the documented fallback was
unreachable dead code and a string child crashed. Beyond that: one stale doc
(Field claiming an `invalid` inheritance that doesn't exist), one empty-`role=
alert` edge in Message, and a six-site `hasIssues` predicate begging to be one
helper. drawer, group, heading, icon, flex/stack/spacer/split, and hold-button
audited clean.

### Findings

| # | Verb | Surface | Site | Issue | Fix | Status |
|---|---|---|---|---|---|---|
| 1 | FIX (high) | FiltersClear | filters-clear.tsx:24 | `const child = Children.only(children)` throws for any non-single-element child — including the bare string (`<FiltersClear>Clear</FiltersClear>`) the doccomment says "fall back to a default `<Button>`". `Children.only` also guarantees an element on return, so the `isValidElement(child)` check is always true and the entire Button fallback (41-45) is unreachable dead code; every test passes a single `<Button>`, so the promised path was never exercised. | Test `isValidElement(children)` directly (drop `Children.only`): a single element clones, anything else renders the default Button. New test pins the string fallback. | ✅ RESOLVED |
| 2 | DOC | Field | field.tsx:33 | The TSDoc lists `invalid` among the props Field inherits from an enclosing Control, but `ControlContextValue` has no `invalid` field — validation is carried solely by `severity` (Control's own doc correctly omits it). Stale doc on a public export invites a nonexistent read. | Drop `invalid` from the inherited list. | ✅ RESOLVED |
| 3 | FIX (low) | Message | message.tsx:109 | The `return null` guard covered only the form-bound path, so an unbound `error` Message with no children (the default `severity`) rendered a stray empty `<p role="alert">` — contradicting the doc's "(unbound) given children". | Guard on the existing `rendersError` flag: `severity === 'error' && !rendersError`, which covers both the form-bound-no-issues and unbound-no-children cases (warning/success still render their children). | ✅ RESOLVED |
| 4 | SIMPLIFY | form | form-reducer.ts:195 · use-form-reducer.ts:175,258 · use-form-{text,toggle,value}.ts | The "field is invalid" predicate `errors !== undefined && errors.length > 0` was inlined at six sites (two as `.some((issues) => …)` lambdas). | Extract `hasIssues(issues)` next to `normalizeIssues`; `.some(hasIssues)` at the reducer sites and `field && hasIssues(field.errors)` at the hooks — one definition of invalid. (The `field &&` guard stays: the hooks return `undefined` — not `false` — outside a Form, per §7.3.) | ✅ RESOLVED |

### Minor / watch-list

| Surface | Site | Note | Verb | Status |
|---|---|---|---|---|
| FileUpload | use-file-upload-handlers.ts:56 | `partitionFiles` filters only `maxSize`/`maxCount`; a drop doesn't re-enforce `accept`/`multiple` (the native input constrains only the OS picker). So a `multiple={false}` dropzone accepts N dropped files and `accept=".pdf"` accepts a dropped `.exe`. The `onReject` doc scopes rejection to size/count, so likely deliberate — confirm the boundary. | WATCH | ◯ OPEN |
| FileUpload | use-file-upload-handlers.ts:110 | A pointer that leaves the window mid-drag without a final `dragleave`/`drop` leaves `dragDepth > 0` and the highlight stuck until the next enter. Inherent to the depth-counter pattern; no global `dragend` reset. | WATCH | ◯ OPEN |
| Form | use-form-reducer.ts:275 | `onSettled` on success reports `valuesRef.current` (re-read after the async `onSubmit`), so a field edited mid-flight is reflected rather than the submitted snapshot. Likely intentional ("current values"). | WATCH | ◯ OPEN |
| Filters | filters.tsx:14 | `isActive(false) === true`, so toggling a Checkbox/Switch filter off keeps `{name: false}` in the payload and counts it — against the "drops empty fields" contract and inflating the count announcement. Likely deliberate (explicit-false filters). | WATCH | ◯ OPEN |
| Message | message.tsx:123 | The multi-error `<ul>` branch can't forward `{...props}` (the component types them as `<p>` attributes; spreading onto `<ul>` is a type error, so the single-error `<p>` branch and the `<ul>` diverge). Forwarding would need an unsafe cast; the real fix is a broader element typing, out of scope. | WATCH | ◯ OPEN |
| HoldButton | hold-button.tsx:76 · use-hold-button-gesture.ts:110 | No `touch-action` (a finger-drift can let the browser claim the press as a scroll) and the completion timer closes over the reset-duration snapshot (a reduced-motion flip mid-press uses pre-flip timing). Both sub-frame/package-wide-uniform; `touch-action` appears nowhere in the package by choice. | WATCH | ◯ OPEN |

### Audited clean (no findings)

drawer (panel family, mirrors the verified Dialog), group (+ `useGroup`
fragment-flattening position stamp), heading (+ its type-rung skeleton), icon,
and flex/stack/spacer/split (the literal responsive maps are deliberate for
Tailwind's scanner). hold-button verified against every failure mode — timer
cleanup, guard add/remove pairing, no double/missed completion, reduced-motion
parity, no pointer-capture mismanagement. form's core (snapshot stability,
resolution order, submit-race token guarding, zod-resolver cache) and
file-upload's core (drag counter, same-file reset, no object-URL leak) are
sound beyond the rows above.

---

## Batch 5 — input · json-tree · kanban · kbd · link · list · listbox · loading · markdown · mask-input

### Executive summary

The audit's most severe finding lands here, and it is a real cross-site
scripting hole: the Markdown renderer emitted `href`/`src` straight from
`marked`'s lexed tokens, so untrusted Markdown carrying a `javascript:`,
`data:text/html`, or `vbscript:` URL (including the tab-obfuscated
`java&#9;script:` form) produced a live link/image that ran script on click —
while the component's own doc billed raw-HTML stripping as the safety story. It
is fixed with a scheme allowlist (`safeUrl`), whitespace-normalized before the
scheme test, with two regression tests and a corrected security contract. Past
it, the batch is quiet: a memory-leak fix in the kanban drag-overlay map (a
mounted card's entry never got reclaimed), two concision tidies, and one
doccomment correction. The four leaves — kbd, link, loading (dots + spinner),
mask-input — audited clean. The two heavier subsystems, json-tree's virtualized
flatten/search machinery and the listbox select-state machine, are behaviorally
sound; what they surface (a bound-field `invalid` the select family discards,
roving that can't cross the virtualization window in one key) is recorded for a
family-level decision rather than reworked under a single component's sweep.

### Findings

| # | Verb | Surface | Site | Issue | Fix | Status |
|---|---|---|---|---|---|---|
| 1 | FIX (high · XSS) | MarkdownRenderer | markdown-renderer.tsx:104,115 | `link`/`image` tokens rendered `href={token.href}` / `src={token.href}` verbatim from the lexer, so `[x](javascript:alert(1))` — or a `data:text/html`, `vbscript:`, or whitespace-obfuscated `java\tscript:` URL — emitted a live `href`/`src` that executes script on click. The renderer's doc names raw-HTML stripping as the safety guarantee (`Raw HTML tokens render nothing`) but never scheme-checked URLs, so a link/image was the open vector. Most severe finding of the audit. | Add a `safeUrl` scheme allowlist — `http`/`https`/`mailto`/`tel`, plus `data:` for images only — that strips ASCII whitespace before matching the scheme (defeating `java\tscript:`) and passes relative/root-relative/anchor/protocol-relative URLs through unchanged; an unsafe scheme resolves to `undefined` so no attribute renders. `href={safeUrl(token.href)}`, `src={safeUrl(token.href, true)}`. Two tests pin dangerous-scheme stripping and safe-URL / data-image passthrough; the `Markdown` security doccomment now states the guarantee. | ✅ RESOLVED |
| 2 | FIX (med) | KanbanCard | kanban-card.tsx:53-63 | The drag-overlay sync effect did `overlayMap.current.set(cardId, children)` on mount/update with no cleanup, so a card that unmounts (deleted, or the whole board torn down) left its entry in the shared `overlayMap` ref for the board's lifetime — an unbounded leak across a long-lived board that churns cards. | Effect returns `() => overlayMap.current.delete(cardId)`. Cleanup runs before setup within a flush, so a card moved across columns re-sets its own entry on remount and the overlay never sees a gap. | ✅ RESOLVED |
| 3 | SIMPLIFY | Input | input.tsx:93 | A dead `const resolvedInvalid = invalid ?? sharedAttrs.invalid` was computed and never read; the validation ternary independently recomputed the invalid resolution. | Drop the variable; inline `invalidAttrs(invalid)` in the `invalid === undefined ? sharedAttrs.validation : …` ternary — one expression of the resolution. | ✅ RESOLVED |
| 4 | SIMPLIFY | ListItem | list-item.tsx:107 | `{suffix && suffix}` — the `&&` short-circuit is a no-op (React renders `undefined`/`null`/`false` as nothing), so the guard only obscures that `suffix` renders itself. | `{suffix}`. | ✅ RESOLVED |
| 5 | DOC | flattenTree | json-tree-utilities.tsx:239-250 | The doccomment claimed a filtered match-free branch collapses to a `branch-open` row with `open=false`, but the flatten pass reads `open` straight from `expanded` and never forces a branch closed — that behavior belongs to the recursive renderer, not this path. Stale on `@internal` machinery invites a wrong mental model of the filter/virtualize divergence. | Restate the real divergence: filter mode omits non-matching leaves and keeps only match-path children, but a branch's open state still follows `expanded` (unlike the recursive renderer, which forces match-free branches closed). | ◯ OPEN |

### Minor / watch-list

| Surface | Site | Note | Verb | Status |
|---|---|---|---|---|
| Listbox | listbox.tsx:200,370 · use-listbox-state.ts:56 | `useFormValue` returns the bound field's `invalid`, but Listbox destructures only `value`/`setValue`/`setTouched` (200) and the trigger's `invalid` derives solely from `control?.severity` (370) — so a Form-bound Listbox with a field error but no `<Control severity>` shows no invalid chrome, unlike Input which routes the field's `invalid`. Select-family pattern (Combobox mirrors it); a family-level decision, not a per-component fix. | WATCH | ◯ OPEN |
| Listbox | listbox.tsx:210 · use-listbox-state.ts:32,56 | `useListboxState` returns `close`, and `use-listbox-state.test.ts` exercises it, but the Listbox consumer never destructures it — `select` calls `close` internally within the hook. Tested-in-isolation surface, not dead; recorded so a reuse pass doesn't drop it (which breaks the hook test, as the batch-5 attempt confirmed). | WATCH | ◯ OPEN |
| VirtualOptions | virtual-options.tsx:170 | Empty-state gap first filed in batch 2 (the `containerRef` wrapper keeps the listbox non-`:empty`, so `peer-empty` "No results" never fires under virtualization). Still open; still a shared-primitive decision spanning Combobox + CommandPalette. | WATCH | ◯ OPEN |
| Input | input-frame.tsx:60 | The prefix span carries `peer/prefix`, but no `peer-*/prefix` variant consumes it anywhere in the recipes or components, and the suffix span carries no matching marker — vestigial Tailwind peer metadata. Harmless; drop it or wire the intended `peer`-driven affix style. | SIMPLIFY | ◯ OPEN |
| JsonTree | json-tree.tsx:69,74-91 · json-tree-utilities.tsx:251 | Under `virtualize`, `useA11yRoving`'s `[role="treeitem"]` selector sees only the rendered viewport slice, so arrow-key roving can't step past the window edge in one press (the next item isn't in the DOM until scroll). Inherent to windowing + DOM-roving; recorded, not a one-line fix. | WATCH | ◯ OPEN |
| JsonTree | json-tree.tsx:67 | `searchIndex` memoizes on `[data, searchValue]`, so a new `data` identity with unchanged content rebuilds the whole index. Correct (content-equality would cost more than the rebuild); noted so it isn't re-flagged. | WATCH | ◯ OPEN |
| JsonTree | json-tree-utilities.tsx:336 | `PrimitiveValue` prints a string as `` `"${value}"` `` without escaping embedded `"`, `\`, or control chars, so a value containing a quote renders visually ambiguous (not valid JSON text). Display-only — the tree is a viewer, not a serializer — but a `JSON.stringify(value)` per scalar would render faithfully. | WATCH | ◯ OPEN |
| KanbanCard | kanban-card.tsx:36-63 | An inert (read-only) card still calls `useKanbanContext()` and subscribes to the full board context; `memo` can't stop a re-render when any board-level field changes, even though the inert path reads none of the interactive handlers. Splitting a card-facing slice is the deeper fix; the memo already covers the common pointer-drag case. | WATCH | ◯ OPEN |
| Kbd | kbd.tsx:21-23 | Modifiers render command-then-control (`⌘⌃`), the reverse of the platform ordering convention (Control before Command, `⌃…⌘`). Cosmetic and possibly deliberate; flag for the props-audit modifier pass. | WATCH | ◯ OPEN |
| LoadingDots | loading-dots.tsx:37-39 | `k.dot({ size })` is re-evaluated once per dot inside the `.map`, though `size` is constant across the three; hoist to one `const dotClass` and `cn(dotClass, delay)`. Micro (three iterations). | OPTIMIZE | ◯ OPEN |
| List | list.tsx:139 | The reorderable `<ul>` keeps its implicit `role="list"`; keyboard-reorder semantics (lift/move/drop) are announced through dnd-kit's live region on the items rather than an ARIA composite-widget role on the container. Consistent with the semantic-list-plus-live-announcement design; recorded, not reworked. | WATCH | ◯ OPEN |
| MarkdownRenderer | markdown-renderer.tsx:22-31 | `safeUrl(url, true)` intentionally allows `data:` on `<img src>` (inline images are a legitimate Markdown use); only script-capable schemes are blocked. The `data:text/html` link vector is closed because links pass `allowData = false`. Design boundary, recorded alongside the fix. | WATCH | ◯ OPEN |

### Audited clean (no findings)

kbd (pure server-renderable glyph leaf), link (defers to the `useLink`
component; `rel` auto-defaults for `target="_blank"`), loading-dots and
loading-spinner (static `<output>` live leaves with `sr-only` labels),
mask-input (+ `useMaskInput` — caret-preserving reformat through
`useFormattedInput`, Form binding through `useFormValue`, pre-formatted default
seeding). json-tree's path-encoding / search-index / flatten machinery and the
recursive-vs-virtualized renderers were traced beyond the rows above; the
listbox open/close/selection state machine, the deferred-toggle commit, and the
`readOnly` open-guard hold up. list's dnd-kit wiring (stable-key requirement,
memoized `<ul>` isolating the overlay from item re-renders, keyboard-lift
refocus) is sound.

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

Batch 4's `hasIssues` dedup was the instructive one: the first pass used
`hasIssues(field?.errors)`, which collapsed the hooks' deliberate
`undefined`-outside-a-Form return (§7.3 — no opinion, defers to context) into
`false`. Three "outside a Form" tests caught it immediately; the landed form is
`field && hasIssues(field.errors)`, exactly equivalent to the original. The
Message `{...props}` inconsistency was left unfixed once the type checker showed
it's forced by the component's `<p>` typing, not an oversight. The FiltersClear
fix carries a new test that exercises the previously-dead string-fallback path.

Batch 5's headline is a genuine XSS vector, so it carries the batch's only new
security tests: one asserting a `javascript:`/`data:text/html` link and image
render no `href`/`src`, one asserting `http(s)`/`mailto` links and a `data:`
image URI survive — the allowlist has to fail closed without breaking inline
images. The whitespace strip in `safeUrl` is load-bearing, not cosmetic:
browsers drop ASCII tab/newline when resolving a scheme, so `java&#9;script:`
resolves to `javascript:` at click time; the regex `noControlCharactersInRegex`
lint forced the `\s`-class form over a literal `[ - ]` range. The
kanban leak fix was verified against the cross-column move it must not regress —
cleanup-before-setup means a remounting card re-populates `overlayMap` in the
same flush, so the drag overlay never reads an empty slot. The listbox `close`
row is recorded rather than removed precisely because the batch-5 reuse attempt
dropped it and `use-listbox-state.test.ts` went red on three assertions: the
returned surface is the hook's tested contract, not the component's dead code.
Types and the scoped Vitest suite (1498 tests across 72 files) ran green after
the revert.
