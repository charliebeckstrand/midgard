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
| 6 | menu, nav, number-input, odometer, pagination, password-confirm, password-input, password-strength, pdf-viewer, phone-input | ✅ swept |
| 7 | pivot-table, placeholder, popover, progress, radio, resizable, scroll-area, search-input, segment, select | ✅ swept |
| 8 | sheet, shiny-text, sidebar, signature-pad, slider, spacer, sparkline, split, stack, stat | ✅ swept |
| 9 | status, stepper, swatch, switch, table, tabs, tag-input, text, textarea, time-ago | ✅ swept |
| 10 | timeline, toast, toggle-icon-button, toolbar, tooltip, tree, zipcode-input | ✅ swept |

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
| 5 | DOC | flattenTree | json-tree-utilities.tsx:239-250 | The doccomment claimed a filtered match-free branch collapses to a `branch-open` row with `open=false`, but the flatten pass reads `open` straight from `expanded` and never forces a branch closed — that behavior belongs to the recursive renderer, not this path. Stale on `@internal` machinery invites a wrong mental model of the filter/virtualize divergence. | Restate the real divergence: filter mode omits non-matching leaves and keeps only match-path children, but a branch's open state still follows `expanded` (unlike the recursive renderer, which forces match-free branches closed). | ✅ RESOLVED |

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
| MarkdownRenderer | markdown-renderer.tsx:25 | `safeUrl` whitespace-strips the whole URL to read a ~4-char scheme — O(payload) for a large `data:` image URI. A scheme-bounded match (`^\s*([a-z][a-z0-9+.\s-]*):`) would cap the work, but the leading `\s*` is mandatory: an anchored `^[a-z]` form silently readmits `" javascript:"` (browsers trim leading space before resolving the scheme), so the naive optimization is a security regression. Deferred — the win is uncommon-path and the current tested form is correct. | OPTIMIZE | ◯ OPEN |

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

## Batch 6 — menu · nav · number-input · odometer · pagination · password-confirm · password-input · password-strength · pdf-viewer · phone-input

### Executive summary

The batch's weight is in its three subsystems — the menu state machine, the
navigation family, and the 18-file pdf.js viewer — and that is where the nine
fixes cluster; the leaves (number-input, odometer, phone-input, password-input,
pagination) are correct and well-tested. The pdf-viewer async load lifecycle is
genuinely robust (every await boundary cancels its render task, destroys the
document, and revokes its blob URLs), but three subtler holes surfaced: a
document swap reused the previous document's per-page rotation for one paint
because the reset ran in an effect rather than in render (the page-size hook's
own precedent); a null `canvas.toBlob` was misclassified as teardown and
stranded `loading` at `true` forever; and the `PdfViewerContext` memo was
quietly defeated — two plain-arrow callbacks and a fresh `pageSize` literal gave
it a new identity every render, so its 18-entry dep array and its "identity
stays stable" comment were both dead. Menu contributed two robustness fixes: a
static inline menu still wired `onContextMenu` and so silently suppressed the
native right-click menu, and `MenuItem` spread consumer props *after* its
structural `role`/`tabIndex`/`type`, letting a caller drop a row out of roving.
Password-confirm had a real idref bug (a falsy-but-non-null `warning` dangled
the confirm field's `aria-describedby`), and password-strength shipped a public
props type referencing an un-exported `StrengthLevel` union. Two cleanups (a
dedup and a recipe-default/doc alignment) round it out. One real menu bug — a
static menu running the shared disclosure's Escape layer, so Escape reports a
false close and can swallow a Dialog's own dismiss — is recorded rather than
fixed: the clean fix needs a `dismissable` knob on the shared
`useFloatingDisclosure`, an architectural change to surface first.

### Findings

| # | Verb | Surface | Site | Issue | Fix | Status |
|---|---|---|---|---|---|---|
| 1 | FIX (med) | usePdfViewerPageRotation | use-pdf-viewer-page-rotation.ts:32 | Per-page rotations were cleared in a post-paint `useEffect` keyed on the `pages` array identity, so a document swap rendered the new document's page N once with the *previous* document's `rotations[N]` before the effect cleared it — a one-frame stale-rotation flash. The sibling page-size hook resets in render specifically to avoid this class (test-pinned). | Move the reset to render-phase (`if (prev !== key) { prev = key; setRotations({}) }`), mirroring `usePdfViewerPageSize`; drop the now-unused `useEffect`. | ✅ RESOLVED |
| 2 | FIX (low) | usePdfViewerDocument | use-pdf-viewer-document.ts:110 | `if (!blob \|\| controller.cancelled) return 'cancelled'` conflated a failed rasterization with teardown: when `canvas.toBlob` yields `null` (oversized/tainted canvas, reachable at the ≤2 device-pixel scale on a large page) the caller ran `releasePdf` and returned without ever reaching `setLoading(false)`, so the viewport showed the loading placeholder forever with no error. | Split the checks: re-test `cancelled` (teardown) then `if (!blob) return 'ok'` — skip the page like the existing missing-2D-context branch and keep loading the rest. | ✅ RESOLVED |
| 3 | OPTIMIZE (med) | usePdfViewer (context memo) | use-pdf-viewer.ts:150 · use-pdf-viewer-pagination.ts:45 · use-pdf-viewer-page-size.ts:41,46 | The `PdfViewerContext` memo's "identity stays stable" guarantee was defeated: `goToPage` and `onImageLoad` were plain arrows (new identity every render), and `pageSize` was a fresh `{ width, height }` literal whenever the active page carried explicit dimensions — which also churned the `scale` memo that feeds the context. The 18-entry dep array and the stability comment were both inert. | `useCallback` `goToPage` (`[total, setCurrentPage]`) and `onImageLoad` (`[]`); `useMemo` `pageSize` on the primitive `width`/`height`. The memo now delivers its documented guarantee. | ✅ RESOLVED |
| 4 | FIX (low-med) | Menu (static) | menu.tsx:69 · use-menu-state.ts:93 | `onContextMenu` was wired whenever `!isDropdown`, which is also true for a static inline menu (`defaultOpen`, no `placement`). So right-clicking inside a static menu ran `handleContextMenu` → `preventDefault()`, silently killing the browser's native context menu for no benefit (the panel is already open; `setOpen(true)` is a no-op). | Compute `isContextMenu = !isDropdown && !isStatic` in `useMenuState` and gate the handler on it. | ✅ RESOLVED |
| 5 | FIX (low) | MenuItem | menu-item.tsx:88,118 | Both the link and button branches spread `{...rest}` *after* `role="menuitem"`, `tabIndex={-1}`, `data-slot`, and `type="button"`, so a consumer passing any of those wins — overriding `role` drops the item out of the `MENUITEM_SELECTOR` roving, `tabIndex`/`type` break the tab model or make it a form-submit. Asymmetric with the component's own `onClick`/`onKeyDown`, deliberately composed after the spread. | Move `role`/`tabIndex`/`data-slot`/`type` after `{...rest}`, matching the handler ordering and `MenuTrigger`. | ✅ RESOLVED |
| 6 | FIX (low) | PasswordConfirm | password-confirm.tsx:59 | `warningId` was assigned whenever `warning != null`, but the warning element renders only when `warning` is truthy — so a falsy-but-non-null `warning` (the `cond && 'text'` idiom with `cond` false) during a live mismatch pointed the confirm field's `aria-describedby` at an id no element carried (a WCAG idref violation). | Gate `warningId` on the same truthiness as the render: `warning ? generatedWarningId : undefined`. | ✅ RESOLVED |
| 7 | FIX + DOC (low) | password-strength | password-strength.tsx:15 · index.ts · use-password-strength.ts:12 | `StrengthLevel` is referenced by two exported public types (`PasswordStrengthProps.labels`, `PasswordStrengthChange.level`) but was not itself re-exported — the sibling `export type { PasswordRule, PasswordStrengthChange }` omitted it — so a consumer handling `onStrengthChange` couldn't name the `level` union, and declaration emit referenced an un-exported alias. | Add `StrengthLevel` to the component re-export and the barrel; give it a TSDoc (it had none). | ✅ RESOLVED |
| 8 | SIMPLIFY | password-confirm | password-confirm-utilities.ts:3 · use-password-confirm-state.ts:6 · context.ts:6 | `type LastEdited` was declared verbatim in two files and `Status` (`'idle' \| 'warning'`) was re-inlined at three sites. | Export both `@internal` from the utilities module (the folder's shared home per §3.5) and import them in the state hook and context. | ✅ RESOLVED |
| 9 | DOC | nav (bar recipe) | recipes/kata/nav.ts:82,93,122 | The `bar` recipe declared `defaults: { variant: 'outline' }`, but `NavBar` ships `variant = 'solid'` and always passes it explicitly — the recipe default was unreachable and contradicted the effective ship default (a latent trap if the component default were ever dropped). Both variant doccomments also mislabeled the set as `outline` \| `plain`, omitting the shipped `solid`. | Align the recipe default to `solid`; correct the docs to `solid` \| `outline` \| `plain`. | ✅ RESOLVED |

### Minor / watch-list

| Surface | Site | Note | Verb | Status |
|---|---|---|---|---|
| Menu (static) | use-floating-disclosure.ts:125 · menu-content.tsx:56 | A static menu initializes `open: true`, so `useFloatingDisclosure`'s `useEscapeLayer` is active and registers it in the shared dismiss-layer stack — pressing Escape calls `close()` → `onOpenChange(false)` while the panel (gated on `isStatic`, not `open`) stays visible, contradicting MenuContent's "static renders inline" doc, and a static menu inside a Dialog swallows the first Escape meant for the Dialog. The clean fix needs a `dismissable: false` knob on the shared disclosure hook (used by dialog/listbox/menu) — architectural, to surface before applying. | FIX | ◯ OPEN |
| MenuContent | menu-content.tsx:60,85 | `aria-label`/`aria-labelledby` are forwarded to `PopoverPanel` only in the static branch; the dropdown/context-menu branch drops them. A right-click context menu has no trigger to name it and equally can't be named. | WATCH | ◯ OPEN |
| Menu | context.ts:66 | `useMenuContext` is exported with full TSDoc but has no production consumer (the barrel exports only `useMenuActions`; grep finds only its own test). Possibly dead, possibly deliberate advanced-composition surface — flagged tentatively, not treated as dead. | WATCH | ◯ OPEN |
| Nav | nav-bar.tsx:15 · nav.tsx:21 | `NavBar` renders `<nav aria-label="Main">` and the value-binding `Nav` composition nests a second, unnamed `<nav>` inside it — two same-type landmarks, the inner unlabeled (discouraged by APG). The axe case and the demo's context tab both sidestep the nested path. Fix (emit a fragment from `Nav` inside a `NavBar`, or document `NavContext` for in-bar selection) is a design call. | WATCH | ◯ OPEN |
| NavBar | nav-bar.tsx:22 | Opens an `ActiveIndicatorScope`, but the sole `ActiveIndicator` (`NavItem`, an `<li>`) always lives inside a `NavList`, which opens its own nearer scope — so `NavBar`'s scope resolves nothing in any valid composition (Pagination is the clean contrast: only its list opens a scope). Left as-is: the component doc explicitly claims it "establishes an active-indicator scope," so removing it is a doc-contradicting behavior change, not a pure cleanup. | WATCH | ◯ OPEN |
| Nav | nav.test.tsx:186 · sidebar.test.tsx:378 | Test descriptions cite a `createNavItem` factory that doesn't exist (grep: only these two stale strings); `NavItem` renders the icon directly. Stale wording from a pre-`useNavItem` refactor. | DOC | ◯ OPEN |
| PdfViewer (viewport) | pdf-viewer-viewport.tsx:50 · use-pdf-viewer-document.ts:189 | `loading` is document-level and flips false only after the whole render loop, yet pages `setPages` as they rasterize — so the main viewport shows the placeholder until the last page finishes even though the thumbnail rail streams pages in. Progressive infra exists but the main view is all-or-nothing; confirm intent for large PDFs. | WATCH | ◯ OPEN |
| usePdfViewerViewportSize | use-pdf-viewer-viewport-size.ts:36 | `measure` unconditionally `setSize({ width, height })` with a fresh literal, so an unchanged content box still re-renders (and recomputes scale/context). An `Object.is` guard on width/height would drop the redundant updates. | OPTIMIZE | ◯ OPEN |
| PdfViewer | pdf-viewer-toolbar.tsx:111 · pdf-viewer-viewport.tsx:46 | The toolbar's static page count and the viewport's `aria-live` "Page X of Y" announcer share `data-slot="pdf-viewer-page-status"`; `bySlot` returns the first, so tests pass, but the slot is ambiguous as a query/style anchor. | WATCH | ◯ OPEN |
| PdfViewer (mobile) | pdf-viewer-toolbar.tsx:71 | The mobile thumbnail toggle carries `aria-expanded` and a fixed "Show thumbnails" label but only ever opens (`setThumbsOpen(true)`; the Sheet owns close) — the expanded+"Show"+no-collapse combination is mildly inconsistent for AT. Desktop a11y case doesn't exercise it. | WATCH | ◯ OPEN |
| NumberInput | number-input.tsx:119 | The native `type="number"` has no `onWheel` guard, so a focused field increments/decrements on mouse-wheel scroll (the classic scroll-past-a-form footgun). Unoverridden native behavior; a `blur()`-on-wheel guard has its own downsides (interrupts wheel+keyboard users), so it's a genuine tradeoff, not an obvious fix. | WATCH | ◯ OPEN |
| NumberInput | number-input.tsx:77 | From an empty field both Increase and Decrease seed to `clamp(0, min, max)` — decrease-from-empty lands on 0/min rather than `-step`. Deliberate and test-pinned for Increase (`'seeds the value to 0'`). | WATCH | ◯ OPEN |
| Odometer | odometer.tsx:55 | `aria-label={format(value)}` recomputes every animation frame during a tween though `value` is constant across it; `format` defaults to a cached `Intl.NumberFormat`, so the cost is negligible. | OPTIMIZE | ◯ OPEN |
| usePasswordStrength | use-password-strength.ts:108 | The effect dep array lists `passedCount`, which is exactly `passedIds.length` and only changes when `passedIds` identity changes — strictly redundant, harmless, arguably self-documenting. | WATCH | ◯ OPEN |

### Audited clean (no findings)

number-input (precision-derivation, clamp-after-round ordering, per-step
rounding, empty/NaN, controlled/uncontrolled/Form cascade, spinbutton a11y),
odometer (+ its rAF animated-value hook — mid-animation cancel, unmount cleanup,
reduced-motion snap, no hydration mismatch), phone-input (the NANP/international
formatters, the caret engine through `useMaskInput`/`useFormattedInput`, Form
binding), password-input (APG show/hide toggle, disabled mirroring, re-mask on
disable), and pagination (a consumer-driven compound family — no range algorithm
to get wrong; list/landmark semantics, `aria-current`, tap-feedback, skeleton
all correct). Menu's trigger activation-key handling, three-mode focus model,
roving, and outside-press dismissal; nav's `useNavItem` selection/scroll wiring;
and pdf-viewer's load lifecycle, ResizeObserver cleanup, zoom/scale/rotation
math, and print/download utilities were all traced sound beyond the rows above.

---

## Batch 7 — pivot-table · placeholder · popover · progress · radio · resizable · scroll-area · search-input · segment · select

### Executive summary

Nine fixes, clustered in the three data/pointer-heavy subsystems; the rest of the
batch — placeholder, popover, select, progress, segment, radio, search-input —
is correct and well-tested, with several apparent divergences traced to
deliberate house patterns (radio delegates single-select to native same-`name`
grouping and so binds no Form field; segment delegates roving to Tabs; popover
gates every dismiss path on `open` and mounts only while open, so it has none of
the static-menu dismiss-layer hazard). The one real correctness bug with data
consequences is in the pivot engine: `groupValues` coerced every value cell with
`Number()`, which maps `null` / `''` / `false` / `[]` to a finite `0` — so a
nullable numeric field counted its empty cells as real zeros and corrupted
count / avg / min, while `undefined` was (asymmetrically) skipped. Two pointer
subsystems each gave up a lower-severity fix: the resizable drag attached fresh
document listeners without tearing down a still-active prior drag, so a
re-entrant/multi-touch second drag orphaned the first's listeners past the
unmount cleanup (a post-unmount `setSizes`); and `computeThumb` let a track
shorter than the minimum thumb drive the offset negative, inverting the
scrollbar. The remaining cleanups are concision: a dead per-colour `fill` slice
(with three actively-wrong doccomments) in the progress kata, a redundant
get-then-has map lookup, a duplicated normalize-to-100, an always-true guard, and
a dead empty `grip.dragging` recipe variant.

### Findings

| # | Verb | Surface | Site | Issue | Fix | Status |
|---|---|---|---|---|---|---|
| 1 | FIX (med) | groupValues | pivot-table-pivot.ts:62 | `const value = typeof raw === 'number' ? raw : Number(raw)` gated by `Number.isFinite`: `Number(null)` / `Number('')` / `Number(false)` / `Number([])` are all a finite `0`, so a nullable value field bucketed its empty cells as real zeros — corrupting `count` (inflated), `avg` (pulled toward 0), and `min` (0) — while `undefined → NaN` was skipped. Asymmetric and unpinned (the test covered only number / numeric-string / `'not-a-number'`). | Accept only real numbers and non-empty numeric strings (`typeof === 'string' && trim() !== '' ? Number(raw) : NaN`), so all non-numeric cells drop out via the existing `isFinite` guard. New test pins null / `''` / `false` skipped. | ✅ RESOLVED |
| 2 | FIX (low-med) | useResizablePanel | use-resizable-panel.ts:156 | `startDrag` attached fresh `document` pointer listeners and overwrote `cleanupRef.current` without tearing down a still-active prior drag. A re-entrant/multi-touch second drag (a second pointer on another handle before the first lifts) left the first drag's `onMove`/`onUp` attached while `cleanupRef` held only the second — so the unmount effect cleaned only the latest, and a later `pointermove` ran the orphaned `onMove` → `setSizes`/`onSizesChange` after unmount. The sibling `beginScrollbarDrag` guards this. | Call `cleanupRef.current?.()` at the top of `startDrag`, superseding any active drag before attaching new listeners. | ✅ RESOLVED |
| 3 | FIX (low) | computeThumb | scroll-area-utilities.ts:20 | Guarded `trackSize <= 0` but not a positive track shorter than `MIN_THUMB_SIZE` (20): `maxOffset = trackSize - size` then went negative (e.g. `10 - 20 = -10`), so `offset` inverted — the thumb slid the wrong way and overflowed a sub-20px track. Asymmetric with the drag path, which guards `maxOffset > 0`. | `maxOffset = Math.max(trackSize - size, 0)` — pin the thumb at the origin when the min-size floor leaves no travel. | ✅ RESOLVED |
| 4 | SIMPLIFY | groupValues | pivot-table-pivot.ts:66 | Redundant double map lookup per entry: `groups.get(r) ?? new Map()` then a separate `if (!groups.has(r)) groups.set(r, row)` (same `get`+`has` for the bucket). | Single lookup: `let row = groups.get(r); if (!row) { row = new Map(); groups.set(r, row) }` (and likewise for the bucket). Behavior-identical. | ✅ RESOLVED |
| 5 | SIMPLIFY | useResizablePanel | use-resizable-panel.ts:95,115 | The normalize-to-100 arithmetic (`map(defaultSize)` → sum → `total > 0 ? map(s/total*100) : raw`) was duplicated verbatim between the `useState` initializer and the render-phase resync. | Extract a pure `normalizeSizes(configs)` and call it in both. (Orthogonal to the deliberate `prevCountRef` render-phase reset, which stays inline.) | ✅ RESOLVED |
| 6 | SIMPLIFY | ResizableHandle | resizable-handle.tsx:98 · recipes/kata/resizable.ts:30 | `k.grip.dragging` is `''`, so `isDragging && k.grip.dragging` never contributes a class — the grip has no active-drag visual, only hover/focus. Dead. (`data-dragging` on the handle is live/tested and stays.) | Remove the empty `dragging` variant and the conditional term. | ✅ RESOLVED |
| 7 | SIMPLIFY | usePivotTable (cells) | use-pivot-table.ts:98 | `if (values.length > 0) rowCells.set(...)` is always true — `groupValues` creates a bucket only at the moment it pushes a value, so no empty bucket can exist. Dead defensive guard. | Drop the condition; note the invariant in a comment. | ✅ RESOLVED |
| 8 | SIMPLIFY + DOC | progress kata | recipes/kata/progress.ts:22 | Each colour entry carried a `fill` slice that nothing reads (the bar's `fill` recipe reads `bg`; the gauge ring reads `stroke`; track/label use fixed tokens), and two doccomments described the consumption wrongly ("the gauge reads all three", "`fill` on the indicator circle, `stroke` on the track, `bg` on the label"). | Delete the five `fill:` lines; rewrite both doccomments to the real `bg` (bar) / `stroke` (gauge ring) split. `ProgressColor` keys on colour names, so the type is unaffected. | ✅ RESOLVED |
| 9 | DOC | usePivotTable | use-pivot-table.ts:63 | The `@remarks` said cells and totals "recompute only when `rows`, `keys`, or `aggregation` change", but `colTotals`/`rowTotals` read the resolved key arrays and so also recompute when `rowOrder`/`columnOrder` change. | State that the totals additionally recompute on axis-ordering changes. (Also softened `computeThumb`'s doc to mention the no-track early return, alongside finding 3.) | ✅ RESOLVED |

### Minor / watch-list

| Surface | Site | Note | Verb | Status |
|---|---|---|---|---|
| Popover | context.ts:11 · popover.tsx:62 | `setOpen`/`close` are published on `PopoverContextValue` and its memo but read by no consumer, and `PopoverContext` isn't exported. Left in place: `close` on a popover context reads as deliberate scaffolding for a conventional `PopoverClose` affordance — removal deferred pending that intent (mirrors the menu `useMenuContext` call). | SIMPLIFY | ◯ OPEN |
| Popover / Tooltip | popover-trigger.tsx:29 | The 3-line `assignRef` writer is byte-identical in popover-trigger and tooltip-trigger. Hoisting to a shared util touches out-of-batch tooltip and is low-value (the surrounding `mergeRefs` deliberately diverges), so recorded, not applied. | SIMPLIFY | ◯ OPEN |
| PivotTable | pivot-table-pivot.ts:117 | `aggregateRow`/`aggregateColumn` are near-identical (fix one axis, walk the other). Plausibly deliberate per §1.1 (row-vs-column are distinct boundaries, each body ~6 lines) — left as-is. | WATCH | ◯ OPEN |
| PivotTable / map / chart | pivot-table-pivot.ts:57 · modules/map/map-value-scale.ts:35 · modules/chart/choropleth-chart/choropleth-chart.tsx:160 | The `toFiniteInput` numeric-coercion guard (number → non-empty-numeric-string → NaN, blanking `null`/`''`/`false` so `Number()` can't bucket them as `0`) is now the third byte-identical copy, alongside `toBinnableNumber` and `binnable`. All three are `@internal` module-private; no shared `utilities` coercion helper exists. Deduping means promoting one `toFiniteNumber` into `utilities` and rewiring two out-of-batch modules — cross-cutting work to surface, not fold into this sweep. | REUSE | ◯ OPEN |
| ProgressGauge | progress-gauge.tsx:94 | The track `<circle>` carries `strokeLinecap="round"` but no `strokeDasharray`, so a closed circle has no sub-path ends for the cap to round — a no-op (only the dashed value arc needs it). | SIMPLIFY | ◯ OPEN |
| ResizableHandle | resizable-handle.tsx:49 | `aria-valuemin`/`aria-valuemax` report the left panel's own `minSize`/`maxSize`, not the tighter range the adjacent panel's constraints also impose — so the announced range can exceed what a resize can actually reach. Own-bounds semantics are test-pinned, so likely by design. | WATCH | ◯ OPEN |
| ScrollArea | use-scroll-area-scrollbar.ts:37 | `beginScrollbarDrag` has no `event.button` guard and no `contextmenu` teardown, unlike the resizable drag — a right/middle-click on the thumb starts a scroll-drag that persists while the context menu is open (it still ends on `pointerup`). Minor cross-engine inconsistency. | WATCH | ◯ OPEN |
| Radio | radio.tsx:34 | Radio binds no Form field (only `useControlToggle`), unlike Checkbox/Switch — deliberate and documented (a radio group is one string value across N inputs, not per-input booleans, so a per-radio `useFormToggle` would be wrong). A consumer coming from Checkbox may expect symmetric auto-binding; a one-line TSDoc pointer showing the external-control pattern would help. | DOC | ◯ OPEN |
| Radio (kiso) | kiso/kokkaku/radio.ts:2 | The silhouette comment says "Fixed 4.5-square circle" but `base` is `size-5` (20px). Stale, and in the kiso layer (adjacent to the component surface). | DOC | ◯ OPEN |

### Audited clean (no findings)

placeholder (static `aria-hidden` leaf, `sizeClassFor` clamp traced correct),
popover (focus restore to the trigger, ARIA `haspopup`/`expanded`/`controls`,
non-modal Tab-through — all test-pinned; no static-menu dismiss-layer hazard),
select (a sound single-select narrowing of Listbox), progress bar + gauge
(geometry hand-traced across 0/50/100/over-max/negative, determinate vs
indeterminate routing, `progressbar` ARIA, skeletons), segment (thin Tabs
delegation — roving/selection/active-indicator live in Tabs and are test-pinned),
radio (native same-`name` single-select, only-checked-tabbable, skeletons
mirroring Checkbox), and search-input (native-setter clear + focus return, single
`onClear`, load-bearing `name` for Input's value resolution). The pivot
aggregation math (empty-input, div-by-zero, min/max with negatives), totals
computed from raw values (correct grand mean), key stringification consistency,
and complete memo dep lists were traced sound beyond the rows above; the
resizable `clampPair` redistribution and both drag engines' observer/rAF/pointer
teardown, and the scroll-area observer lifecycle, are correct.

---

## Batch 8 — sheet · shiny-text · sidebar · signature-pad · slider · spacer · sparkline · split · stack · stat

### Executive summary

A quieter batch: the two large subsystems (sidebar navigation, the slider +
two-thumb range) and the canvas-heavy signature-pad are all correctness-clean at
the interaction level — sidebar's collapse/`aria-current`/roving, the range's
snap-then-clamp and thumb-crossing re-sort, and signature-pad's pointer/observer
lifecycle all hand-traced sound and test-pinned. The one bug with visual
consequence is in the sparkline: a stray non-finite value mapped straight into
the SVG path (`L 50 NaN`), which browsers abort at, dropping the *entire* line
and area — directly contradicting the geometry's own "a stray NaN doesn't
collapse the whole series" doc; the `finite` filter only guarded domain
derivation, not the marks. Fixed to skip non-finite vertices in the drawn marks
(leaving a gap), which also let a single-point fill close as a band instead of a
centre triangle and retired three now-dead defensive branches. Signature-pad gave
up one real state inconsistency (pointerdown set the drawing flag before the
2D-context null-check, so a context-less pad could `commit` a value while still
reporting `empty`). The rest are concision and doc accuracy: a duplicated
size-default the recipe already supplies, a double `getBoundingClientRect` on a
range pointerdown, a colour-only `StatDelta` a11y note, and several stale
comments. Stack's "fixed to `col`" doc was the instructive one — it's not fixed
(eight demos pass `direction="row"`), so the doc was corrected rather than the
type locked.

### Findings

| # | Verb | Surface | Site | Issue | Fix | Status |
|---|---|---|---|---|---|---|
| 1 | FIX (med) | sparklineGeometry | sparkline-geometry.ts:106,124 | `points`/`bars` mapped over raw `data`, so a non-finite entry produced `yAt(NaN) = NaN` in the path (`M 2 38 L 50 NaN L 98 2`) — browsers abort at the invalid token, dropping the whole line **and** the area under it; a bar got `Math.max(1, NaN) = NaN` and vanished. Contradicts the function's "a stray NaN doesn't collapse the whole series" doc; the `finite` filter guarded only domain derivation. Unpinned (the NaN test asserted only domain separation). | Keep `points` index-aligned for callers, but build the drawn line/area/bars from a finite-filtered subset (`bars` via `flatMap` skipping non-finite) so a NaN leaves a gap. New tests pin the NaN-skip and the single-point band. | ✅ RESOLVED |
| 2 | FIX (low) | useSignaturePadDrawing | use-signature-pad-drawing.ts:67 | `handlePointerDown` set `drawingRef`/pointer-capture/`lastPointRef` **before** the `getContext('2d')` null-check, so on a context-less pad it returned with `drawingRef === true` while `empty` stayed `true` (the `setEmpty(false)` sits after the guard). A later `commit` then passed its `drawingRef` gate, `toDataURL`'d the unpainted canvas, and emitted a non-null value while `empty` — placeholder over a "signed" pad, clear button hidden, a `required` rule wrongly passing. | Acquire and null-check the context first, so a context-less pointerdown is a clean no-op (no capture, no drawing flag). Test-compatible (the null-context test asserts only no-throw). | ✅ RESOLVED |
| 3 | FIX (low) | sparklineGeometry | sparkline-geometry.ts:118 | The single-point `line` is special-cased to span full width, but the `area` closed on `first.x`/`last.x`, which for one datum are both the point's centre x — so a single-point fill rendered as a triangle apexing at the centre, not a band down to the baseline. | Close the area on the track edges (`width - padding` / `padding`), which the drawn line always spans (single or multi point). New test pins the band. | ✅ RESOLVED |
| 4 | SIMPLIFY | sparklineGeometry | sparkline-geometry.ts:116,118,120 | Dead defensive branches, unreachable past the `finite.length === 0` guard where `drawn.length >= 1`: `points.at(-1) ?? null` (never null at runtime), `last?.x ?? width - padding` (fallback never taken), and `data.length === 0 ? 0 : …` (ternary always else). | Retired by the finding-1/3 rewrite: `last = drawn.at(-1) ?? null` keeps the type-required coalescing; the area uses fixed edges; `slot = innerWidth / data.length`. | ✅ RESOLVED |
| 5 | SIMPLIFY | StatValue / StatValueSkeleton | stat-value.tsx:19 · stat-value-skeleton.tsx:13 | `k.value({ size: size ?? 'md' })` and `k.skeleton.value({ size: size ?? 'md' })` duplicate the recipes' own `defaults: { size: 'md' }` — `k.value({ size: undefined })` already yields `md` (the engine seeds from defaults then skips `undefined` props). `StatDelta` does it right with bare `k.delta({ trend })`; two independent `md` defaults can drift. | Reduce both to `k.value({ size })`. | ✅ RESOLVED |
| 6 | OPTIMIZE | useRangePointer | use-range-pointer.ts:107,153 | A non-stacked pointerdown computed `valueFromPointer(clientX)` for `raw`, then `closestThumb(clientX)` recomputed it internally — two `getBoundingClientRect()` (forced layout) per drag-start. | `closestThumb(raw)` takes the already-computed value; drops the second rect read and the `valueFromPointer` dep. | ✅ RESOLVED |
| 7 | DOC | StatDelta | stat-delta.tsx:10 | `trend` maps only to colour (up→green, down→red, neutral→muted); direction is otherwise carried by whatever glyph/sign the consumer supplies, so a colour-only delta fails WCAG 1.4.1. The leaf can't guarantee a non-colour cue. | Add a TSDoc `@remarks` telling consumers to pair the tint with a textual sign/arrow in `children`. | ✅ RESOLVED |
| 8 | DOC | useSignaturePadDrawing / SignaturePad | use-signature-pad-drawing.ts:36 · signature-pad.tsx:135 | Two stale comments: the `@remarks` said the state hook's effect skips its own "emission" (it skips a *repaint*, never emits), and the canvas comment said "State (empty/disabled) rides the name" (only `empty` rides `aria-label`; disabled is via `aria-disabled`). | Correct both. | ✅ RESOLVED |
| 9 | DOC | useRangeUpdate / slider kata | use-range-update.ts:6 · recipes/kiso/slider/color.ts:5 | `useRangeUpdate` carried no TSDoc while its two sibling hooks have full blocks; and the kiso colour doccomment named `<SliderRange />`, but the exported component is `RangeSlider`. | Add a one-line TSDoc for the snap→clamp→sort setter; correct the component name. | ✅ RESOLVED |
| 10 | DOC | Stack | stack.tsx:3 | The type and component docs said `direction` is "fixed to `col`", but it isn't — `direction="col"` is spread-overridable and eight demos pass `direction="row"` to lay Stack out horizontally. Locking the type would break those, so the doc over-claimed. | Reword to "defaulting to `col`" (a caller may still pass `direction="row"`). | ✅ RESOLVED |

### Minor / watch-list

| Surface | Site | Note | Verb | Status |
|---|---|---|---|---|
| SidebarItem | sidebar-item.tsx:115 | The non-mini item wraps its content in a `TouchTarget` inside a `Button` that already wraps its own — two overlapping invisible spans per item. Harmless (both bubble to the same host), and not simply removable: in mini mode the inner renders through `ButtonHeadless`, which drops the `TouchTarget`, so the item-level one is the hit-target floor there. A clean fix gates the wrapper on the mini/headless branch. | WATCH | ◯ OPEN |
| Sidebar (recipe) | recipes/kata/sidebar.ts:132 | `k.section.label` (a `{sm,md,lg}` inset map) has no consumer — `SidebarSection` uses only `section.base`, and the docs engine reimplements the stops locally. Its comment frames it as scaffolding for a composed section label; recorded pending that intent (like the popover `close` / nav-scope calls). | SIMPLIFY | ◯ OPEN |
| useRangeKeyboard | use-range-keyboard.ts:94 | `clamp(snapToStep(raw, min, step), min, max)` duplicates `useRangeUpdate`'s resolution, recomputed to decide focus before the async `setRange`. A shared `resolve(raw)` would dedup, but the keyboard path genuinely needs the value pre-commit, so it's partly inherent; low value, cross-hook. | SIMPLIFY | ◯ OPEN |
| RangeSlider | range-slider.tsx:140 | Hand-built LTR-horizontal only (`left:${pct}%`, `clientX - rect.left`, no `dir`/orientation axis); the native single Slider's fill gradient is also authored `to_right`. No RTL/vertical test and neither is a stated feature — confirm the non-goal. | WATCH | ◯ OPEN |
| useSignaturePadCanvasSizing | use-signature-pad-canvas-sizing.ts:58 | No `devicePixelRatio`-change listener — the canvas rescales only on container-size changes (`ResizeObserver`), so dragging the window to a different-DPR monitor softens existing strokes until the next resize. Would need a `matchMedia((resolution))` subscription. | WATCH | ◯ OPEN |
| useSignaturePadState | use-signature-pad-state.ts:136 | `commit`/`clear` (and the `useImperativeHandle`) never stabilize because `setTouched` is a fresh arrow from `useFormValue` each render — ineffective local memoization. The real fix is upstream in `useFormValue` (a screened-out house pattern), so no correctness impact and nothing actionable in the pad. | WATCH | ◯ OPEN |
| Sheet | sheet.tsx:76 · recipes/kata/sheet.ts:58 | Two shared-with-Drawer items: the panel `onClick` `@remarks` misattributes the mechanism (the backdrop is a sibling, so a panel click never reaches it regardless — the handler really swallows the portal synthetic-click to consumer ancestors), and the recipe's `close` slot classes are never consumed (`SheetClose` is a behavior-only `PanelClose` alias). Both are byte-identical in Drawer, so fixing one diverges the pair — recorded for a shared-panel decision. | DOC | ◯ OPEN |
| Split | split.tsx:52 | `const resolvedGap = gap ?? 'lg'` is indirection its `orientation`/`ratio` siblings avoid with a destructure default; since `SplitGap` excludes null, `gap = 'lg'` in the destructure is equivalent. Possibly deliberate signalling (the test comment emphasises in-component resolution). | WATCH | ◯ OPEN |
| Stack / Flex | stack.tsx:6 · flex.tsx:46 | Finding 10 reworded Stack's doc to "`direction` defaulting to `col` (overridable)", but Flex's own doc still says "Use Flex for rows, Stack for columns" — the codebase now asserts both. Whether Stack is strict-column (type-lock + migrate the eight row-usages) or a col-defaulted Flex is a deliberate identity call for the maintainer; recorded so the Flex doc, the Stack type, and the row-usages can be reconciled together. | WATCH | ◯ OPEN |

### Audited clean (no findings)

spacer and shiny-text (reduced-motion parks the sweep before `animate`, effect
cleanup stops the animation and nulls the ref — pinned), sheet (mirrors the
already-audited Dialog/Overlay: controlled/uncontrolled, modal `aria-modal`,
Title-registration label precedence, scroll-lock gating, focus trap/restore),
sidebar (collapse `data-mini`/`resolvedMini` seam, `aria-current`, landmark/list
semantics, the affix-as-sibling design keeping actions out of the button, roving
single-tab-stop — all axe/test-pinned), signature-pad (ResizeObserver and pointer
lifecycle with no leak, DPR/scale math, redraw-on-resize preserving strokes,
value-sync `lastEmittedRef` coordination, controlled/uncontrolled + Form
binding), slider + range (snap-then-clamp order, two-thumb crossing/re-sort, ARIA
neighbour bounds, pointer nearest-thumb + stacked-deferral — all hand-traced and
test-pinned), split (its `variants.ts` boundary is consistent, not bypassed — the
`Ma` import is enforced single-site), and stat (skeleton typing, delta trend→colour
mapping). The sparkline geometry core (spread, y-inversion, flat/single-point,
negative scaling, bar flooring) is sound beyond the rows above.

---

## Batch 9 — status · stepper · swatch · switch · table · tabs · tag-input · text · textarea · time-ago

### Executive summary

Another quiet batch — the two big subsystems (stepper, tabs), the table family,
and the well-engineered time-ago ticker are all correctness-clean where it
counts: stepper's state derivation / reciprocal aria / roving, tabs' roving-focus
+ tab↔panel id pairing + observer-cleanup, table's `colSpan` spanning and `scope`
semantics, and time-ago's timer teardown, cadence adaptation, formatting
boundaries, and SSR determinism all hand-traced sound and test-pinned. Two real
(both low-severity) bugs surfaced. The tag-input Backspace-removes-last-tag branch
omitted the IME `isComposing` guard its sibling Enter/comma branch carries, so an
IME user editing candidate text could silently delete a committed tag. And tabs
tracked "an all-mounted TabContents is present" as a bare boolean, which a second
`<TabContents>` unmounting would clear while the first still held panels in the
DOM — dropping `aria-controls` from inactive tabs; fixed with a ref-count. The
rest are concision and doc accuracy: a `manageTabIndex` left on for display-only
steppers (spinning a focusin listener + MutationObserver for nothing), three
inconsistent ways to clear the tag draft, a redundant `cursor-pointer`, a dead
`aria-selected` coalesce, and two doccomments (a tab-list "exactly one tabbable"
overstatement and a `Text` `size` axis the doc omitted).

### Findings

| # | Verb | Surface | Site | Issue | Fix | Status |
|---|---|---|---|---|---|---|
| 1 | FIX (low-med) | useTagInputKeyboard | use-tag-input-keyboard.ts:52 | The Backspace-removes-trailing-tag branch had no IME `isComposing` guard, unlike the Enter/comma commit branch one line above. An IME user backspacing to edit in-progress candidate text (committed `inputValue` still `''`) silently deleted the last tag. | Add `&& !event.nativeEvent.isComposing`, matching the commit branch; extend the `@remarks`. Test-safe (the key-event helper sets `isComposing: false`). | ✅ RESOLVED |
| 2 | FIX (low) | Tabs (panelsMounted) | tabs.tsx:58 | `panelsMounted` was a bare boolean toggled by every `TabContents`; with two `<TabContents mount="always">` under one `<Tabs>`, one unmounting ran `setPanelsMounted(false)` while the other still held panels in the DOM — inactive tabs then lost `aria-controls` though their panels remained. Untested (all tests render a single `TabContents`). | Ref-count the registrants (`+1` on register, `-1` on cleanup); derive `panelsMounted = count > 0`. Single-`TabContents` behavior unchanged. | ✅ RESOLVED |
| 3 | OPTIMIZE (low) | Stepper | stepper.tsx:89 | `useA11yRoving` was called with `manageTabIndex: true` even for a display-only stepper (no `onValueChange`), so its tab-stop effect attached a `focusin` listener and a `childList`/`subtree`/`attributes` MutationObserver that only ever no-op'd (steps render as `<div>`, never matching the `button` item selector). | Gate `manageTabIndex: onValueChange !== undefined`, mirroring the already-gated `onKeyDown`; the effect then returns immediately for display-only steppers. | ✅ RESOLVED |
| 4 | SIMPLIFY | TagInput | tag-input.tsx:123,129 | Three ways to clear the draft: a stable `clearInput` callback passed to the keyboard hook, plus two inline `setInputValue('')` in `handleBlur`/`handleSubmit`. | Call `clearInput()` in both (adding it to their stable deps) — one clear path. | ✅ RESOLVED |
| 5 | SIMPLIFY | StepperStep | stepper-step.tsx:136 | The button branch did `cn(classes, 'cursor-pointer')`, but `classes` already resolves `cursor-pointer` (the `k.step` base spreads `hannou.cursor`). The literal is a twMerge-deduped no-op. (The sibling `<div>`'s `cn(classes, 'cursor-default')` is *not* redundant — it overrides the inherited pointer — and stays.) | Drop the redundant literal: `className={classes}`. | ✅ RESOLVED |
| 6 | SIMPLIFY | Tab | tab.tsx:175 | `aria-selected={current ?? false}` — `current` is typed and computed as `boolean` (never null/undefined), so the `?? false` is dead. | `aria-selected={current}`. | ✅ RESOLVED |
| 7 | DOC | TabList | tab-list.tsx:20 | The doccomment said the MutationObserver "keeps exactly one tab tabbable", but it only guarantees *at least one* (it acts only when none is tabbable and never demotes extras — two `current` tabs legitimately yield two). The single Tab stop actually comes from each `<Tab>`'s roving `tabIndex`. | Reword to "at least one … as a floor" and attribute the single stop to `Tab`'s roving `tabIndex`. | ✅ RESOLVED |
| 8 | DOC | Text | text.tsx:6,18 | Both doccomments named only the `severity`/`color` recipe axes, but `size` is a public `TextVariants` member, destructured/forwarded, and test-pinned (§3.5). | Add `size` to both doc strings. (COMPONENTS.md is a name-level index — no surface change.) | ✅ RESOLVED |

### Minor / watch-list

| Surface | Site | Note | Verb | Status |
|---|---|---|---|---|
| Table (recipe) | recipes/kata/table.ts:86 | `head: [text.muted, border.subtleColor]` puts a border *colour* on `<thead>` with no border *width*, so the header rule renders nothing (and the `text.muted` duplicates the `<th>` cells' own). Whether a header separator was intended (add a width — a visible rule appears, a design change) or the token is dead (drop it) is a design call. | FIX | ◯ OPEN |
| Table | table.tsx:85 | The `overflow-x-auto` scroll wrapper isn't keyboard-focusable and has no accessible name, so a keyboard-only user can't scroll an overflowing table (WCAG 2.1.1). Modern Chromium auto-focuses overflow scrollers, but not universally. | WATCH | ◯ OPEN |
| TableLoading | table-loading.tsx:19 | The loading body has no `aria-busy`/`role="status"` and its skeletons are `aria-hidden`, so AT perceives a table of empty cells with no "loading" signal. A consumer may own the live region. | WATCH | ◯ OPEN |
| Stepper | stepper-indicator.tsx:42 | `data-display-state={state}` duplicates the parent step's `data-state` (which the recipe actually styles through) and has zero consumers — dead, or an undocumented styling hook. Recorded pending intent. | SIMPLIFY | ◯ OPEN |
| TagInput | tag-input.tsx:178 | Paste-with-separators isn't implemented — only a live comma *keystroke* splits, so pasting `a,b,c` then Enter commits one tag. The TSDoc promises only Enter/comma, so it's a feature gap, not a broken contract. | WATCH | ◯ OPEN |
| TabContent | tab-contents.tsx:71 | `useTabPanelTabIndex(ref)` is called unconditionally but applied only when `auto`; a value-less or outside-`<Tabs>` `TabContent` still spins up the panel MutationObserver to compute a discarded `tabIndex`. Near-zero cost (fires only on mutation). | OPTIMIZE | ◯ OPEN |
| useTimeAgoRelativeTime | use-time-ago-relative-time.ts:113 | In `interval="auto"`, the first render (`now === null`) subscribes to the 5s bucket, then re-subscribes to the true cadence once `now` is set — one throwaway timer + bucket churn per mount for any timestamp ≥ ~60s old. Correctness-neutral; the deps-safe fix is fiddly. | OPTIMIZE | ◯ OPEN |
| TimeAgo | time-ago.tsx:50 | `new Date(date)` on a timezone-less datetime string (`'2026-04-29T11:30:00'`, no `Z`) parses as local time, so `toISOString()` on the `dateTime` attr differs server (UTC) vs client (user tz) — a hydration mismatch. Inherent to JS `Date`; the doc could note inputs should carry an offset. | WATCH | ◯ OPEN |

### Audited clean (no findings)

status-dot and swatch (decorative-by-default, `role="img"`+`aria-label` only when
`label` set; `swatch` uses `Object.hasOwn` and correct `style` precedence — all
test-pinned), switch (controlled/uncontrolled/form-bound resolution, `role="switch"`
+ `aria-checked` winning over the spread, the uncontrolled-reset effect's
listener + rAF cleanup), textarea (value-prop controlled coercion, Control/Form
cascade; auto-resize is pure CSS `field-sizing-content`, no JS to leak), text (the
polymorphic static leaf), and time-ago (ticker teardown — one shared interval per
cadence, paused on `document.hidden`; adaptive cadence; formatting boundaries
hand-traced; deterministic SSR with no live-clock read in render; `<time datetime>`
UTC-stable; correctly no `aria-live`). Stepper's state derivation, panel
visibility, reciprocal `aria-controls`/`aria-labelledby`, and roving; tabs'
roving/manual-activation, tab↔panel id pairing, `aria-controls` mount gating, the
scroll hook (no observer/listener leak), and the panel-tabindex hook; and table's
`colSpan` spanning, `scope` semantics, and projection/spread-order policy were all
traced sound beyond the rows above.

---

## Batch 10 — timeline · toast · toggle-icon-button · toolbar · tooltip · tree · zipcode-input

### Executive summary

The final batch — the timeline family, the toast viewport and its alert, and the
toggle-icon-button, toolbar, tooltip, tree, and zipcode-input leaves — closes the
97-component sweep. Three real bugs surfaced, each a value reaching the wrong
element. `TimelineMarker`'s `color` prop painted the wrapper `<span>` (a
`currentColor` carrier with nothing of its own to fill) and *still* rendered a
`<StatusDot>` underneath, whose own default `inactive` colour overrode the
inherited hue — so every colour-only marker showed zinc, never the requested
colour; `StatusDot` even `Omit`s `color`, so the hue could reach the dot no other
way. Fixed by painting a decorative `<Swatch>` straight from the marker hue.
`TreeItem` derived `hasChildren` from `children != null`, so a `children={false}`
(a `{cond && <TreeItem/>}` that didn't render) or `children={[]}` (an empty
branch) announced a leaf as a collapsed parent — chevron, `aria-expanded="false"`,
and an empty `role="group"` on toggle; fixed with
`Children.toArray(children).length > 0`. And `TooltipTrigger`'s `<div>`-fallback
wired the floating ref with raw `setReference`, dropping the cleanup-returning
`mergeRefs` the element path uses to suppress React 19's unmount
`setReference(null)` cascade — the very asymmetry `popover-trigger` doesn't have.
The rest are concision and doc accuracy: a dead empty `k.item.base` slot and its
inert `className`, a redundant `TimelineVariants` type intersection, a
twice-computed `position.startsWith('top')`, a never-read tooltip `portal` slot, a
`self-stretch` the divider recipe already emits, and a tooltip-context doccomment
naming two symbols that don't exist (`usePointerTooltipState` / `<PointerTooltip>`).
The batch's one deferred bug is toast's — pause-on-hover/focus has no unmount
release, so a toast dismissed under a stationary pointer strands the shared pause
flag and silently disables auto-dismiss for every later toast — and its correct
fix source-counts the pause in the shared provider timer, so per §3.1 it is
surfaced rather than applied under a single batch.

### Findings

| # | Verb | Surface | Site | Issue | Fix | Status |
|---|---|---|---|---|---|---|
| 1 | FIX (medium) | TimelineMarker | timeline-marker.tsx:58 | A colour-only marker applied `k.marker.palette[color].dot` (an `iro.marker` `text-*` class) to the wrapper `<span>`, which has no `bg`/`border` to paint, then still rendered a `<StatusDot>` whose own default `inactive` colour (`bg-current` zinc) overrode the inherited hue. So `color="blue"` drew a zinc dot; `StatusDot` `Omit`s `color`, so the hue could never reach it. Hue was untested (the decorative test asserted only no role/label). | Render a decorative `<Swatch shape="circle" color={cn(k.marker.palette[color].dot)}>` for the colour case instead of `StatusDot`, and drop the inert wrapper colour class. New test pins `text-blue-600` on the dot. | ◯ OPEN |
| 2 | FIX (medium) | TreeItem | tree-item.tsx:70 | `hasChildren = children != null` treats any non-null `children` as a branch, so `children={false}` (an unrendered `{cond && …}`) or `children={[]}` (an empty directory) renders a chevron, emits `aria-expanded="false"` (a leaf announced as a collapsed parent), and mounts an empty `role="group"` on toggle. Unpinned (every leaf test omits `children`). | `const hasChildren = Children.toArray(children).length > 0` — `toArray` strips `null`/`boolean`/empty; `Children.count` would miscount `false` as 1. | ◯ OPEN |
| 3 | FIX (low-med) | TooltipTrigger | tooltip-trigger.tsx:91 | The non-element `<div>` fallback wired the floating ref with raw `ref={setReference}`, not the cleanup-returning `mergeRefs` the element path uses. React 19 calls a ref with `null` on unmount only when it returns no cleanup, so the fallback reintroduced the `setReference(null)` cascade `mergeRefs` exists to suppress. `popover-trigger` applies `mergeRefs` to both its clone and fallback — the tooltip fallback was the outlier. Untested (every trigger passes a valid element). | `ref={mergeRefs}` on the div; `childRef` is `undefined` there, so its `assignRef` is a no-op. | ◯ OPEN |
| 4 | SIMPLIFY | TreeItem / tree kata | tree-item.tsx:73, kata/tree.ts:64 | `item.base` is `[]`, so `className={cn(depth === 0 && k.item.base)}` on the `tree-item` wrapper always resolves to `''` — inert dead code — and the recipe doccomment still listed `item.base` among the static slots. | Drop the `className` (and its now-orphaned `cn`/`k`/`depth`/context reads — the `depth+1` increment lives in `TreeItemChildren`), remove the empty slot, update the doccomment. | ◯ OPEN |
| 5 | SIMPLIFY | Timeline | timeline.tsx:10 | `TimelineProps = TimelineVariants & { … }` intersected `VariantProps<typeof root>` (`orientation` + `variant`) then re-declared both explicitly with identical types, so the intersection contributed nothing. | Drop `TimelineVariants &` and its import; the explicit, TSDoc'd props stay, and `TimelineVariants` remains a standalone kata export. | ◯ OPEN |
| 6 | SIMPLIFY | ToastAlert | toast-alert.tsx:11 | `getToastMotion(position)` computed `position.startsWith('top')`, and the body recomputed the same for `positionTop` one block down. | Compute `positionTop` once, derive `motionConfig = positionTop ? k.motion.top : k.motion.bottom`, drop the single-use helper. | ◯ OPEN |
| 7 | SIMPLIFY | tooltip kata | kata/tooltip.ts:24 | `portal: 'z-100'` is never read — the two importers (`tooltip-trigger`, `tooltip-content`) use only `trigger`/`cursor`/`content`/`surface`/`motion`; the `k.portal` hits elsewhere belong to other katas. | Delete the member. | ◯ OPEN |
| 8 | SIMPLIFY | ToolbarSeparator | toolbar-separator.tsx:26 | `cn(isHorizontal ? 'mx-1 self-stretch' : 'my-1', className)` re-adds `self-stretch`, but the horizontal toolbar's separator renders `<Divider orientation="vertical">`, whose recipe already emits `h-auto self-stretch border-l`. Only `mx-1` is unique. | `cn(isHorizontal ? 'mx-1' : 'my-1', className)`; tests stay green (the class still arrives via the recipe). | ◯ OPEN |
| 9 | DOC | TooltipContext | context.ts:10 | The doccomment said the value is built by `usePointerTooltipState` for `<PointerTooltip>` — neither symbol exists (repo-wide grep finds only this comment). | Correct to `useTooltipPointer` / `<TooltipPointer>`. | ◯ OPEN |

### Minor / watch-list

| Surface | Site | Note | Verb | Status |
|---|---|---|---|---|
| ToastAlert / useToastTimer | toast-alert.tsx:120, use-toast-timer.ts:35 | Pause-on-hover/focus sets a single shared `pausedRef` released only by `onMouseLeave`/`onBlur` — DOM events that don't fire when the element is removed under a stationary pointer or held focus. A toast dismissed/evicted while hovered strands `pausedRef=true`, and the next toast's `startTimer()` early-returns, so it never auto-dismisses (self-heals only if the user later hovers a live toast and leaves). The correct fix source-counts the pause in the shared provider timer (multi-file); per §3.1 surfaced, not applied under a single batch. | FIX (medium) | ◯ OPEN |
| ToastAlert | toast-alert.tsx:133 | `onBlur` resumes on `relatedTarget` alone, not whether the pointer is still inside (asymmetric with `onMouseLeave`'s focus guard), so Tab-out under a stationary pointer restarts auto-dismiss (WCAG 2.2.1 edge). Likely subsumed by the source-counted fix above. | WATCH | ◯ OPEN |
| TreeItemContent | tree-item-content.tsx:92 | APG ArrowRight-on-open (→ first child) and ArrowLeft-on-leaf/closed (→ parent) focus moves are unimplemented; only the toggle halves exist, and the roving hook passes L/R through (vertical orientation, no `row` config). Documented as intended (tree-item.tsx:44-46) and not contradicted by tests — a scope decision to confirm. | WATCH | ◯ OPEN |
| Tree | tree.tsx:38 | `useA11yRoving` is called without `typeahead: true`, so the APG-recommended first-letter jump for trees is absent though the hook supports it. No doc claims it — an enhancement. | WATCH | ◯ OPEN |
| TreeItemChildren | tree-item-children.tsx:47 | The `collapse.fade` exit keeps a collapsing group mounted through its exit window while the roving query has no visibility filter, so ArrowDown mid-collapse can land focus on an item animating to `height:0`. Minor in production; moot under the test motion mock. | WATCH | ◯ OPEN |
| TreeItemContent | tree-item-content.tsx:69 | `querySelector(PREFIX_INTERACTIVE_SELECTOR)?.click()` (leaf-forward) repeats verbatim in `handleClick` and `handleKeyDown`; extractable to a `forwardToPrefix` helper. Cosmetic. | SIMPLIFY | ◯ OPEN |
| Tree | tree.tsx:73 | The mount-effect + `handleFocus` capture + `setActiveItem`/`ensureFirstItemActive` partly reimplement the hook's `manageTabIndex`, but not as a clean drop-in — `handleFocus` moves the stop onto the row even when an inner control is focused, which the hook's `manageTabIndex` (no `row` config) would not. Recorded as checked. | WATCH | ◯ OPEN |
| TooltipContent | tooltip-content.tsx:55 | The inner `motion.div`'s `pointer-events-{auto,none}` duplicates the `pointerEvents` inline style on the `FloatingSurface` wrapper (an inherited property; the wrapper always gates the subtree). Defense-in-depth; tests pin only the wrapper style. | SIMPLIFY | ◯ OPEN |
| ToolbarSeparator | toolbar-separator.tsx:17 | A separator inside an orientation-overridden `ToolbarGroup` still aligns to the toolbar axis — the group renders a bare `role="group"` div with no context provider. Relevant only if separators-inside-groups is a supported layout (then re-provide context with the group's orientation); else document that separators belong between groups. Primary path unaffected. | WATCH | ◯ OPEN |
| TimelineTimestamp | timeline-timestamp.tsx:17 | `<TimelineTimestamp>Jan 2026</TimelineTimestamp>` with no `dateTime` emits `<time>Jan 2026</time>` — invalid HTML (a `<time>` without `datetime` requires machine-readable text). Component-correct (it exposes `dateTime`); a consumer/example concern the doc could note. | WATCH | ◯ OPEN |
| Timeline (recipe) | kata/timeline.ts:53 | The `<ol>` root carries `list-none` without a re-added `role="list"`, so Safari/VoiceOver strips list semantics; the sibling `List` behaves identically, so this is a consistent house stance, not a timeline defect. | WATCH | ◯ OPEN |
| TimelineMarker | timeline-marker.tsx:73 | The status label's `charAt(0).toUpperCase() + slice(1)` re-implements `capitalizeFirst` (primitives/select-trigger/capitalize.ts); a shared import crosses a boundary for one line — declined. | SIMPLIFY | ◯ OPEN |
| ToggleIconButton | toggle-icon-button.tsx:53 | The `<Button>` prop block repeats across the two `animate` branches, but the children-vs-prefix delivery is a meaningful structural difference (Button's icon-slot projection sizes direct children only), so it stays explicit. | SIMPLIFY | ◯ OPEN |

### Audited clean (no findings)

zipcode-input (all four formatters traced — US nine digits → `12345-6789`, five
bare, the tenth digit dropped by `slice(0,9)`, paste stripped to digits; caret
preservation delegated to the shared formatted-input engine; form binding,
`inputMode`, placeholder cascade, ref forwarding, and prop/`data-slot` override
order all correct), toggle-icon-button (`aria-pressed` set after the spread so a
consumer can't override it, `disabled` forwarded, both crossfade branches render
an icon-only box, class mapping correct, skeleton reference resolves,
`AccessibleName` enforced), the toast provider + viewport (post-mount hydration
gate against SSR mismatch, portal fallback to `document.body`,
`zIndex`/`flex-col-reverse` layout, no `aria-live` on the viewport, the mount-only
announce effect that doesn't double-announce because the wrapped `Alert` gets no
`severity`, safe onReset-vs-close ordering), tooltip (hover-delay/close/click/focus
open-close wiring, `forceOpen` controlled handoff, the `enabled` render-phase reset
and `:disabled` polling both real-browser-pinned, `aria-describedby`/`role`, the
deliberately-unlayered Escape, the leak-free overlay-signal unsubscribe,
element-path ref composition, and both memo dep lists — and there is no arrow
element, "pointer" being the mouse client-point for chart/map readouts), toolbar
(roving with disabled-skip and a single Tab stop, separator and groups both
transparent to roving, `h-auto` correctly scoped per axis, `role="toolbar"` +
explicit `aria-orientation`, no stale closures or dead code), and tree
(context-stamped level/posinset/setsize math — 1-based and per-group, structural
collapsed-subtree skipping with no flatten utility to audit, roving `tabIndex`
surviving re-render, per-item controlled/uncontrolled open, inner-control key
isolation) were traced sound beyond the rows above.

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
the revert. The four-angle simplify pass (reuse, simplification, efficiency,
altitude) found the batch already clean: `safeUrl` duplicates no existing helper
and sits at the correct module-private altitude (Markdown is the only component
parsing URLs from untrusted input), and its lone efficiency note — the
full-URL whitespace strip — was deferred rather than applied because the obvious
scheme-bounded rewrite drops the leading-whitespace defense and readmits
`" javascript:"`; the naive optimization is a security regression, so it is
recorded as an OPEN optimize row instead.

Batch 6 was the widest sweep — three real subsystems (menu, nav, the 18-file
pdf.js viewer) plus five leaves — run as five parallel per-unit audit agents,
every candidate then re-verified against source and tests before landing. Two
verifications reshaped the plan. The pdf-viewer context-memo finding was
confirmed by reading all three churn sources (the two plain-arrow callbacks and
the `pageSize` literal); its fix honors the documented "stable identity" intent
rather than deleting the memo, because the codebase clearly means the context to
be stable — nothing downstream is memoized yet, but the design says it should
be. The rotation-flash fix copies the page-size hook's own render-phase reset
verbatim, so it rests on an already-test-pinned precedent. The menu static-Escape
bug is the batch's deliberate non-fix: it is real (a static menu inside a Dialog
swallows the Dialog's Escape), but the clean fix is a `dismissable` knob on the
shared `useFloatingDisclosure` — used by dialog, listbox, and menu — so per
§3.1 it is surfaced as a FIX-verb watch row rather than applied under a single
batch. The nav `ActiveIndicatorScope` removal was likewise declined: the scope
is dead in every shipped composition, but the component doc explicitly claims
it, so dropping it is a doc-contradicting behavior change, not a cleanup. Types
and the scoped Vitest suite (1210 tests across 71 files, including all menu,
pdf-viewer, and password-confirm suites) ran green after the nine fixes. The
four-angle simplify pass then confirmed the batch clean on reuse, altitude, and
efficiency — the render-phase reset is a deliberate inline idiom across 3+
divergent sites so a shared `useResetOnChange` was declined, and the context
memo now holds fully stable (`pageSize` was its linchpin) — and landed one
refinement: `pageSize` memoizes only the caller dimensions and falls back with
`??`, so a caller-dimensioned page keeps one identity across the natural-size
measurement its image load triggers, rather than minting an identical object
once post-load.

Batch 7 ran as five parallel per-unit agents, every candidate re-verified against
source and tests. The pivot coercion bug was the instructive one: the fix accepts
only numbers and non-empty numeric strings, so it changes only the unpinned
null / `''` / `false` cases (the existing number / numeric-string / `'not-a-number'`
tests stay green) and carries a new test pinning those cells as dropped, not
counted as `0`. The resizable drag-cleanup and scroll-thumb-clamp fixes each rest
on a sibling precedent already in the same subsystem (`beginScrollbarDrag`'s
supersede-guard; the drag path's `maxOffset > 0` clamp), so they align two engines
rather than inventing a rule. Two findings were verified-then-declined: the
popover `setOpen`/`close` context fields are dead but read as `PopoverClose`
scaffolding, and the pivot `aggregateRow`/`aggregateColumn` near-duplication sits
at a genuine row-vs-column boundary (§1.1) — both recorded, not churned. Types and
the scoped Vitest suite (254 tests across 11 files, including the new pivot case)
ran green after the nine fixes. The four-angle simplify pass then found the batch
efficiency- and altitude-clean (the `computeThumb` clamp was confirmed the
right-altitude choice over an early-return-hidden, which would drop a grabbable
scrollbar for a 1–19px overflowing track; the resizable drag-supersede is right
inline, the two drag engines diverging past a 3-line lifecycle) and landed one
refinement: the `groupValues` numeric-parse ternary became a named file-local
`toFiniteInput` helper, matching the file's own `extremum`/`defaultFormat` habit.
The reuse angle surfaced that this guard is now triplicated across pivot / map /
chart — recorded as an OPEN reuse row, since deduping it into `utilities` reaches
two out-of-batch modules.

Batch 8 ran as five parallel per-unit agents, every candidate re-verified. The
sparkline fix was shaped by the test: it accesses `points[2]` for `[1, NaN, 3]`,
so `points` had to stay index-aligned (one entry per datum, NaN included) while
only the *drawn* line/area/bars filter out non-finite — the fix carries two new
tests (NaN-vertex skipped, single-point band). The Stack finding was the
instructive reversal: the reflex fix (`Omit<FlexProps, 'direction'>`) type-checked
green in the component but broke the docs-project build — eight demos pass
`direction="row"` to Stack, so the "fixed to `col`" claim was the inaccuracy, not
the type; the doc was corrected and the type left overridable. Two findings were
recorded rather than churned for the same shared-surface reason as prior batches:
the sheet panel-`onClick` comment and unused `close` recipe slot are byte-identical
in Drawer (fixing one diverges the pair), and the signature-pad ineffective-memo
traces to the upstream `useFormValue` house pattern. Types and the scoped Vitest
suite (319 tests across 16 files, including the two new sparkline cases) ran green
after the nine fixes. The four-angle simplify pass then found the batch reuse-,
efficiency-, and altitude-clean, and three of the four agents independently
converged on one refinement of the sparkline fix: the line/area filtered the
projected `point.y` while the bars filtered the raw `value`, which agreed for
`NaN` but diverged for `±Infinity` (`norm` clamps it to a finite `y`, so the line
drew a spurious edge-pinned vertex the bars dropped). Unified by guarding `yAt` to
return `NaN` for any non-finite input, so all three marks key off one predicate;
a new test pins the `Infinity`-drop, and the "leaves a gap" wording was corrected
to "bridges the dropped sample" (the path re-joins with `L`, it doesn't break).
The Flex-vs-Stack identity tension the reword exposes is recorded for a maintainer
call, not resolved here.

Batch 9 ran as five parallel per-unit agents, every candidate re-verified against
source and tests. Both real bugs came from a *sibling asymmetry* — the tag-input
Backspace branch missing the `isComposing` guard the commit branch beside it
carries, and the tabs boolean where a ref-count was needed — so each fix simply
brings the outlier into line with its own established pattern. The tabs ref-count
and the tag-input guard are both test-safe by construction (single-`TabContents`
behavior is unchanged; the key-event helper sets `isComposing: false`), so the
existing suites stayed green without new tests. The table `<thead>` border-colour
finding was verified-then-recorded rather than fixed: the colour is inert (no
width), so the current shipped look is "no header rule" — adding a width to render
the intended rule is a visible design change, and dropping the token cements the
current look, so which way to resolve it is a maintainer call. Types and the
scoped Vitest suite (1271 tests across 75 files) ran green after the eight fixes.
The four-angle simplify pass then found the batch reuse-, efficiency-, and
altitude-clean (the tabs ref-count confirmed the correct primitive over a
boolean or a shared registry, the stepper gate's listener/observer saving
confirmed real) and landed one refinement: with both the Enter/comma and the new
Backspace branch now guarding `isComposing`, and the handler acting on no other
keys, the guard hoisted to a single top-of-handler early return — stating "ignore
every key mid-composition" once instead of per branch. Behavior-identical; the
existing suite stayed green.

Batch 10 ran as five parallel per-unit agents (an initial launch hit a transient
529 and was re-run whole), every candidate re-verified against source and tests.
The three bugs share a shape — a value reaching the wrong element: the timeline
hue painted a carrier `<span>` while a `<StatusDot>` underneath repainted it zinc,
the tree branch check read any non-null `children` as a parent, and the tooltip
fallback ref skipped the unmount-safe merge its element path and its
`popover-trigger` sibling both use. Each fix aligns the outlier with an in-repo
precedent (`StatusDot`'s own `Swatch`, the sibling file's `Children.toArray`,
`popover-trigger`'s `mergeRefs`) rather than inventing a mechanism. The timeline
fix is the one that changed rendered output, so it carries the test change: the
colour-only marker now emits a `data-slot="swatch"` dot, and the previously
hue-blind test was retargeted and strengthened to assert `text-blue-600` — the
assertion that would have caught the bug. Toast's pause-strand bug was
verified-then-deferred: a single shared `pausedRef` can't tell which toast holds
the pause, so the robust fix source-counts it in `use-toast-timer.ts`
(multi-file) — surfaced per §3.1, like batch 6's menu static-Escape, rather than
applied under a single batch; a single-file unmount-resume was rejected because a
pointer on one toast and keyboard focus on another can both hold the boolean, and
an unconditional release would re-arm the stack under a still-present cursor. Types
and the scoped Vitest suite (1530 tests across 89 files, including the retargeted
timeline case) ran green after the nine fixes.
