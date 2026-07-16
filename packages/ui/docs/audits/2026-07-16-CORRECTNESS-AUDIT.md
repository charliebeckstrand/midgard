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
| 2 | calendar, card, checkbox, code, collapse, color, combobox, command-palette, confirm, container | ◯ pending |
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
