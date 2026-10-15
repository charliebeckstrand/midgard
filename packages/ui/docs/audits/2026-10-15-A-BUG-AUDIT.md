# Bug audit — 2026-10-15

Letter sweep A of the `packages/ui` components, a re-sweep: Accordion, AddressInput, Alert, AspectRatio, and Avatar. Two scopes, 29 files, 2,577 lines, then a second, finer read of each component. 47 claims in all; 35 were judged and 12 repeated a claim already judged. 28 are rows below: 8 `medium`, 20 `low`. 5 claims were refuted, and 2 more were duplicates.

The earlier A pass is PR [#1915](https://github.com/charliebeckstrand/midgard/pull/1915) (2026-10-04, no record), with the A entries of the project record `2026-10-02-component-bug-sweep.md`. Every #1915 fix holds at `e450f9527`; no row reopens one. See "Against the earlier pass" below.

## Scope

The area is the five component folders of the letter A at `main` `e450f9527`, plus the `kata` and `kokkaku` recipe files that style them: `recipes/kata/{accordion,alert,aspect-ratio,avatar}.ts` and `recipes/kiso/kokkaku/{accordion,avatar}.ts`. Tests, benchmarks, and the docs tree are out, per §1.2. `primitives/a11y`, `primitives/active-indicator`, `primitives/aspect-ratio.ts`, and `utilities/aggregate.ts` start with A but are not component folders, so the letter sweep leaves them out, as the L to P sweeps left out their primitives. The agents read shared pieces to trace (`hooks/use-controllable.ts`, `primitives/mount`, `primitives/reduced-motion`, `components/combobox`, `form/use-form-value.ts`, `recipes/kiso/sen`, `motion-dom`, `tailwindcss`); no row is anchored to them.

| Scope | Theme | Files | Lines | Claims |
| --- | --- | --- | --- | --- |
| B01 | Accordion, AspectRatio, Avatar, and their recipes | 19 | 1,184 | 8 |
| B02 | AddressInput, Alert, and the Alert recipe | 10 | 1,393 | 12 |
| B01-L | Second read: the Accordion folder and its recipes | 10 | 804 | 5 |
| B02-L | Second read: `address-input-photon.ts` (a routed lead) | 1 | 458 | 7 |
| B02-L2 | Second read: the rest of AddressInput (a routed lead) | 4 | 550 | 9 |
| B03-L | Second read: Alert, Avatar, AspectRatio, and their recipes | 13 | 763 | 6 |

The second reads cover files that B01 and B02 already hold; the first two rows sum to the area (29 files, 2,577 lines). This is a letter sweep, not a Clean pass: no lens set and no floor. Every confirmed finding is a row, whatever its severity.

File ownership: the T sweep runs in another thread and touches no file here.

## Method

One sweeper for each scope in parallel, a blind verifier for each scope on the stripped claims, and an overturn pass for each sheet with the sweep evidence. The first verifier of B02 surfaced a lead in `address-input-photon.ts`, and the first sweeps of the larger files returned fewer claims than their size suggests, so the caller ran a second, finer read of each component (B01-L, B02-L, B02-L2, B03-L). Each second read had its own blind pass and overturn pass, and was told which claims the sweep had already judged, so that it could mark a repeat as a duplicate. One merge pass joined the sheets and ordered the steps.

The `evidence` field was removed by script (`grep -v '^- evidence:'`), and a search for line references in the stripped text (`L[0-9]+`, `:[0-9]`) found one hit, in B02-C04's contract, which was removed before the blind pass. Each sweeper read every file in its list (19/19, 10/10, 10/10, 1/1, 4/4, 13/13).

The caller checked the external premises of the geocoder rows against the live public Photon instance (`photon.komoot.io`, 2026-10-15) and gave the results to the overturn passes as data: the Maryland and Alaska extents and the matches inside them (R14, R15), the shape of a road match and a postcode match (R16, R17), the Puerto Rico state feature (refutes B02-C02), an unspaced UK code (R18), a search in the Connecticut box (R21), a search in the Washington State box (refutes B02-C24), and a blank `q` (HTTP 400, R26). The caller also ran the #1915 regression tests at `e450f9527`: the accordion, alert, aspect-ratio, avatar, and address-input unit files (152/152), and the browser files `accordion-nested`, `geometry/accordion-width`, `geometry/alert-icon-close`, and `geometry/static-leaf-parent-size` (30/30).

The digest held: the #1915 change list; the A entries of `2026-10-02-component-bug-sweep.md` (B03-C14, B03-C15, B04-C05, B04-C09, B09-C04, B09-C08, B09-C09, B09-C11, B09-C12, B09-C13, the AspectRatio preset-path lead, V01, V02, V10, V11, V14, V19, V20, V38); S3-12 and S4-21 of `2026-10-03-html-semantics-sweep.md`; items 1 and 2 of `2026-10-05-display-pages-ui-findings.md` (D2, N10 of the triage); the `address-input.tsx` motion item of `2026-10-06-library-features-second-pass.md`; the Alert fallback and held-motion items of `2026-10-07-ui-surface-tightening.md`; the announce helper of `2026-10-14-simplification-assessment.md`; C7 of `2026-10-06-docs-refinement-audit.md`; and the ledger, where all five units are Not started with no "Known, not chasing" entry.

Reach: a page under `packages/ui/src/docs/pages` is a shipped surface, because the docs site deploys (`2026-10-11-BUG-AUDIT.md:21`). `apps/picks` renders `<Alert>` but is not a consumer root; the verifier checked that it would change no row.

| Pass | In | Out |
| --- | --- | --- |
| Sweep | 2 scopes | 20 claims, 2 leads |
| Verify | 20 stripped claims | 12 confirmed, 5 narrowed, 3 refuted; 11 questions |
| Overturn | 2 sheets plus evidence | B02-C01 narrowed; B01-C01 trigger narrowed; Q settled from code: 6 |
| Second read | 4 scopes | 27 claims (12 repeats), 3 leads |
| Verify | 15 stripped claims | 9 confirmed, 4 narrowed, 2 duplicates |
| Overturn | 2 sheets plus evidence and live data | B02-C24 refuted; B02-C29 confirmed; B02-C14 raised to medium |
| Merge | all sheets plus the settle of B02-C02 | B02-C02 refuted; 7 groups, 20 steps, 12 questions |

## Against the earlier pass

**Fixed and holding.** Each #1915 item: the nested accordion (look, focus ring, arrow keys under each mount mode), the root `ref`, `aria-disabled` on a locked header, the resolved `aria-controls`, a consumer `onKeyDown`, two toggles in one batch, the panel width (`contain: inline-size`), the Alert color precedence and density padding, `announceOnMount`, the AspectRatio numeric ratio against a consumer style, the Avatar `alt` node, the sidebar avatar size, and the anchors after the spread. The tests that #1915 added pass, and no claim of this sweep reopened one. The 2026-10-02 rows that #1771 and the group threads fixed (B03-C14, B03-C15, B04-C09, V11, V19, V20, V38) also hold.

**Partly fixed or left behind.** Three rows come from the edges of earlier fixes:

- R6: the 2026-10-02 lead "aspect-ratio.tsx preset path: inline style.aspectRatio also beats the preset class; a numeric-only C11 fix leaves the two paths inconsistent." #1915 fixed only the numeric path, as the lead foresaw.
- R13: #1915 reversed the color precedence and updated `AlertProps.color`, but the exported `AlertVariants.color` TSDoc still states the old order.
- The Avatar broken-image icon that #1915 named as a follow-up ("Chromium still draws its small broken-image icon") is still there. No claim raised it, so it is not a row; it is under "Surfaced, not judged".

**New.** The other 25 rows are new. 15 of the 28 are in AddressInput, which #1915 did not touch and which the 2026-10-02 sweep read only for two filter bugs; 12 are in the Photon provider and its query parser. Two are forced-colors gaps (R1, R9), a lens that the earlier pass did not use. The rest are small: public-API edge cases that no root builds (14 rows have reach `none`) and three wrong TSDoc sentences.

## Findings

28 rows: 0 high, 8 medium, 20 low. Reach: 14 `shipped`, 14 `none`. The rows at reach none stand under the M sweep's settled rule: a trigger that the public API builds and no root site builds stays a row (low, reach none).

`◯ OPEN` waits on a question or a fix. `◐ FIXED` is fixed on a branch. `✅ RESOLVED` cites the merged pull request.

| Row | File | Symbol | Verdict | Severity | Reach | Group | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | `recipes/kata/accordion.ts` | `k.trigger`, item focus ring | CONFIRMED | medium | shipped | — | ✅ RESOLVED ([#2570](https://github.com/charliebeckstrand/midgard/pull/2570)) |
| R2 | `components/accordion/use-accordion-selection.ts` | `useAccordionSelection` | NARROWED | low | none | — | ✅ RESOLVED ([#2569](https://github.com/charliebeckstrand/midgard/pull/2569)) |
| R3 | `components/accordion/accordion-skeleton.tsx` | `AccordionSkeleton` (TSDoc) | CONFIRMED | low | shipped | — | ✅ RESOLVED ([#2571](https://github.com/charliebeckstrand/midgard/pull/2571)) |
| R4 | `components/accordion/context.ts` | `useAccordionItem` (not exported) | CONFIRMED | low | none | — | ✅ RESOLVED ([#2572](https://github.com/charliebeckstrand/midgard/pull/2572)) |
| R5 | `components/accordion/accordion-panel.tsx` | `AccordionPanel` (held branch) | CONFIRMED | low | none | — | ◯ OPEN |
| R6 | `components/aspect-ratio/aspect-ratio.tsx` | `AspectRatio` (preset style) | CONFIRMED | low | none | G1 | ✅ RESOLVED ([#2577](https://github.com/charliebeckstrand/midgard/pull/2577)) |
| R7 | `components/aspect-ratio/aspect-ratio.tsx` | `AspectRatio` (invalid number) | CONFIRMED | low | none | G1 | ✅ RESOLVED ([#2577](https://github.com/charliebeckstrand/midgard/pull/2577)) |
| R8 | `components/avatar/avatar.tsx` | `Avatar` (wide initials) | NARROWED | low | shipped | — | ◯ OPEN |
| R9 | `recipes/kata/alert.ts` | `k.base` (forced colors) | CONFIRMED | medium | shipped | — | ✅ RESOLVED ([#2574](https://github.com/charliebeckstrand/midgard/pull/2574)) |
| R10 | `components/alert/alert.tsx` | `Alert` close `onClick` | CONFIRMED | low | none | — | ✅ RESOLVED ([#2573](https://github.com/charliebeckstrand/midgard/pull/2573)) |
| R11 | `components/alert/alert.tsx` | `AlertContent` (`0` title) | CONFIRMED | low | none | G7 | ◯ OPEN |
| R12 | `components/alert/alert.tsx` | `hasBody` | CONFIRMED | low | none | G7 | ◯ OPEN |
| R13 | `recipes/kata/alert.ts` | `AlertVariants.color` (TSDoc) | NARROWED | low | none | — | ✅ RESOLVED ([#2574](https://github.com/charliebeckstrand/midgard/pull/2574)) |
| R14 | `components/address-input/address-input-photon.ts` | `searchInState` (limit) | CONFIRMED | medium | shipped | G6 | ◯ OPEN |
| R15 | `components/address-input/address-input-photon.ts` | `boxOf` / `searchInState` | CONFIRMED | medium | shipped | G6 | ◯ OPEN |
| R16 | `components/address-input/address-input-photon.ts` | `featureToSuggestion` (road) | NARROWED | medium | shipped | G2 | ◯ OPEN |
| R17 | `components/address-input/address-input-photon.ts` | `featureToSuggestion` (postcode) | NARROWED | medium | shipped | G2 | ◯ OPEN |
| R18 | `components/address-input/address-input-photon-query.ts` | `splitPostcode` (unspaced) | NARROWED | medium | shipped | G4 | ◯ OPEN |
| R19 | `components/address-input/address-input-photon-query.ts` | `splitPostcode` (ZIP+4) | CONFIRMED | low | shipped | G4 | ◯ OPEN |
| R20 | `components/address-input/address-input-photon-query.ts` | `splitPostcode` (road number) | NARROWED | low | shipped | G4 | ◯ OPEN |
| R21 | `components/address-input/address-input-photon-query.ts` | `splitUsState` (`CT`) | CONFIRMED | medium | shipped | — | ◯ OPEN |
| R22 | `components/address-input/address-input-photon.ts` | `searchNearPostcode` (`@remarks`) | NARROWED | low | shipped | G5 | ◯ OPEN |
| R23 | `components/address-input/address-input-photon.ts` | `searchNearPostcode` (empty `layers`) | CONFIRMED | low | none | G5 | ◯ OPEN |
| R24 | `components/address-input/address-input-photon.ts` | `findPostcode` | CONFIRMED | low | none | — | ◯ OPEN |
| R25 | `components/address-input/address-input-photon.ts` | `request` | CONFIRMED | low | none | — | ◯ OPEN |
| R26 | `components/address-input/use-address-input-suggestions.ts` | `useAddressInputSuggestions` (blank) | NARROWED | low | shipped | G3 | ◯ OPEN |
| R27 | `components/address-input/use-address-input-suggestions.ts` | `useAddressInputSuggestions` (throw) | CONFIRMED | low | none | G3 | ◯ OPEN |
| R28 | `components/address-input/address-input.tsx` | `AddressInput` (re-pick) | CONFIRMED | low | none | — | ◯ OPEN |

## Mechanisms

Paths are under `packages/ui/src`.

**R1 (B01-C02).** File: `recipes/kata/accordion.ts`. Mechanism: the header removes its own outline, `:64` `'focus-visible:outline-none',`, and its only focus mark is a box-shadow ring on the item, `:20-22` `'[&:has([data-slot=accordion-trigger]:focus-visible):not(...)]:ring-2'`, `…:ring-blue-600`, `…:ring-inset`. In `tailwindcss@4.3.0`, `outline-none` has no forced-colors fallback while `outline-hidden` has one (`dist/lib.mjs:10`, `outline-hidden` adds `@media (forced-colors: active) { outline: 2px solid transparent }`). Forced colors remove `box-shadow`. The kata does not use `recipes/kiso/sen/forced.ts:10` `outline: 'forced-colors:outline'`. Trigger: forced colors (Windows High Contrast); Tab to an accordion header. No focus mark shows on the header or the item. Documented intent: `sen/forced.ts:2-3` "Windows High Contrast Mode safety nets. Restore visible edges and semantic color when the browser strips author colors."; `__tests__/recipes/overlay-forced-colors.test.ts:14-15` "Forced colors replace a background and remove a box-shadow. A part drawn with only those vanished"; that test covers the overlay family only. Reach: shipped, `docs/pages/components/accordion/playground.tsx:12`, `multiple.tsx:6`, `disabled-item.tsx:6`. Severity: medium (WCAG 2.4.7 on a shipped page; precedent `2026-10-11-BUG-AUDIT.md` R5). Prior art: NONE; the #1915 "own focus ring" is about nesting.

**R2 (B01-C01).** File: `components/accordion/use-accordion-selection.ts`. Mechanism: the single-mode controlled value is wrapped in a new array when `value` changes, `:105` `? toArray(props.value)`; a locked toggle returns the same set, `:160` `return collapsible ? [] : null`, `:139` `setOpen((prev = []) => nextOpenSet(prev, value, isMultiple, collapsible) ?? prev)`; the guard of the shared hook compares by identity, `hooks/use-controllable.ts:114` `if (Object.is(normalized, base) && Object.is(normalized, heldRef.current)) return`. After a click reports `'b'` (held array B1), the parent re-passes `'b'` (new array B2); a click on the locked header passes the guard and reports `'b'` once more. Trigger: controlled single accordion, `collapsible={false}`, an `onValueChange` that sets `value`; click `b`, then click `b` again. One spurious `onValueChange('b')` for each commit of a new `value`. Documented intent: `:135-136` "A toggle that changes nothing gives the same set back, which reports no change."; `use-controllable.ts:18-19` "It fires only for a change: a set to the value on screen that is also the value of the last report reports nothing."; CONVENTIONS §7.3 "Its change handler fires only for a change." The test `accordion.test.tsx:322-337` covers `defaultValue` only. Reach: none; no root wires `onValueChange` back to `value` with `collapsible={false}` (default `collapsible ?? true`, `:96`). Severity: low. Narrowed: a change the parent makes without a report is documented behavior of the shared hook (`use-controllable.ts:37-39` "An owner that shows a value other than the value it holds gets the report that moves its state back."; `__tests__/hooks/use-controllable.test.ts:248`); and repeat clicks after the first return early. Prior art: NONE; nearest is #1915 "two toggles in one batch".

**R3 (B01-C04).** File: `components/accordion/accordion-skeleton.tsx`. Mechanism: the skeleton header uses the trigger's box, `:34` `<div className={cn(k.header)}>`, and `k.header` (`kata/accordion.ts:36-43`) is `dan.gap.scale.sm`, `dan.space.accordion.header` (`dan/space.ts:286` `header: scale.p.lg`, `:17` `lg: 'density-p-[2,3,4,5,6]'`), and `ji.ramp`, all stepped by density. Trigger: render the skeleton in two density scopes. The header box changes, as the trigger's does; the TSDoc says neither does. Documented intent: `:22-23` "The header box does not follow density, as the trigger does not." The behavior is intended and tested (`__tests__/browser/geometry/skeleton-parity.test.tsx:559` "AccordionSkeleton has the box of a collapsed %s accordion at %s"); only the sentence is wrong. Reach: shipped TSDoc on a public export; `docs/pages/primitives/skeleton/skeleton-variants.tsx:48`. Severity: low. Prior art: NONE.

**R4 (B01-C05).** File: `components/accordion/context.ts`. Mechanism: `:52-53` `export const [AccordionItemContext, useAccordionItem] = createContext<AccordionItemContextValue>('AccordionItem')` carries no `@internal` (the sibling `useAccordion` has one, `:30`), and `components/accordion/index.ts` exports only the components, their props, and the variant types; `package.json` maps `"./*"` to `"./src/components/*/index.ts"`. Trigger: a consumer builds a custom trigger or panel with `useAccordionItem`, as the TSDoc invites. The import fails. Documented intent: `:48-50` "…the disclosure a11y props for wiring a custom trigger/panel."; `accordion-item.tsx:26-28` "provides the trigger/panel a11y wiring to its descendants via {@link useAccordionItem}."; precedent `collapse/index.ts:4` `export { useCollapseContext } from './context'`. Reach: none. Severity: low. Prior art: NONE; #1915 made `triggerProps` complete for a custom header.

**R5 (B01-C11).** File: `components/accordion/accordion-panel.tsx`. Mechanism: the held branch (`mount="always"` or `"lazy"`) renders the panel outside `AnimatePresence`, `:86-88` `<MountHold hold={hold} name="accordion-panel">` / `{panel(heldMotionProps(k.motion, open, hold, onAnimationComplete))}`, and the `m.div` is inert only when exiting under `AnimatePresence`, `primitives/reduced-motion/reduced-motion-elements.ts:35-37` `const exiting = !useIsPresent()` … `inert: inert || exiting` ("Outside an `AnimatePresence`, `useIsPresent` is `true`."). The hide waits for the landing (`:54` `useMountHold(open, mount, { defer: true })`; `primitives/mount/mount.ts:170` `hidden: defer ? rested : !active`), 200 ms later (`recipes/kiso/ugoki/collapse.ts:11`). Trigger: `<Accordion mount="lazy">` with focusable panel content; Enter on an open header, then Tab within 200 ms. Focus enters the closing panel, which then goes `display: none`, and focus falls to `<body>`. Under the default `mount="active"` the exiting panel is inert. Documented intent: CONVENTIONS §3.10 "An HTML `m` element is `inert` while it exits under `AnimatePresence`"; `reduced-motion-elements.ts:21-22` "The row unmounts at the end of the exit, and focus falls to the body." No test asserts focus or `inert` on a held close. Reach: none; the default is `mount = 'active'` (`accordion.tsx:102`), and only tests pass `mount`. Severity: low. Prior art: NONE.

**R6 (B01-C06).** File: `components/aspect-ratio/aspect-ratio.tsx`. Mechanism: a preset ratio is a class, `:36` `className={cn('overflow-hidden', isPreset && k.ratio[ratio], className)}`, and the preset branch passes the consumer style through untouched, `:38` `style={isPreset ? style : { ...style, aspectRatio: ratio }}`, so an inline `aspectRatio` beats the class. The default `ratio = '1/1'` takes the same path. Trigger: `<AspectRatio ratio="16/9" style={{ aspectRatio: '1' }}>`. The box is 1:1. Documented intent: `:37` "The consumer style spreads first, and the ratio wins (CONVENTIONS.md §3.9)."; §3.9 "`props.style` spreads in first, then the keys that carry the behavior of the component." The tests cover the numeric path only (`aspect-ratio.test.tsx:36`). Reach: none; no root passes `style`. Severity: low. Prior art: the 2026-10-02 lead quoted above, surfaced and not fixed; #1915 "numeric ratio wins".

**R7 (B01-C07).** File: `components/aspect-ratio/aspect-ratio.tsx`. Mechanism: `:31` `const isPreset = typeof ratio === 'string'` and `:38` `{ ...style, aspectRatio: ratio }` write any number unchecked; the browser drops `NaN` and `Infinity`, and a zero or negative ratio is degenerate. Trigger: `ratio={width / height}` with `height` 0, or `ratio={0}`. The box has no ratio and collapses to its content. Documented intent: the TSDoc "Box constraining its content to a fixed aspect ratio" and `@defaultValue '1/1'`; nothing defines an invalid number. Reach: none; `modules/chart/engine/chart-plot-box.tsx:71` passes a ratio that `utilities/aspect-ratio.ts:17,21` guards (it admits `Infinity` only from a consumer). Severity: low. Prior art: NONE.

**R8 (B01-C08).** File: `components/avatar/avatar.tsx`. Mechanism: `:86` `<svg className={k.initials} viewBox="0 0 100 100" aria-hidden="true">` draws the initials at a fixed size, `recipes/kata/avatar.ts:50` `initials: 'select-none fill-current text-[48px] font-medium uppercase'`, with no `textLength` or fit, inside an `overflow-hidden` circle. At 48 units "+100" is about 105–115 units wide (estimate, not measured). Trigger: `<Avatar initials="+100" alt="100 more" />`, the overflow count that the AvatarGroup TSDoc recommends, at N ≥ 100. The circle clips both ends. Documented intent: `avatar-group.tsx:23-24` "Append an overflow count as a final `<Avatar initials="+N" alt="N more" />` child." Reach: shipped only through the free text knob, `docs/pages/components/avatar/index.tsx:10` `free={{ initials: 'AB' }}`; fixed sites use 1–2 characters or "+3". Severity: low. Narrowed: four narrow glyphs ("IIII") fit; only wide strings overflow. Prior art: NONE; V01 (overlap) is a different mechanism. Test seam: `__tests__/browser/avatar-group-overlap.test.tsx:34` reads the text node.

**R9 (B02-C29).** File: `recipes/kata/alert.ts`. Mechanism: `:21` `base: [flex.row, 'w-fit', dan.space.alert, dan.gap.scale.sm, rounded.lg, ji.ramp],` has no forced-colors entry; soft and solid draw only a background (`recipes/katakana/palette.ts:37-38`), and the outline variant's `ring-1 ring-inset` is a box-shadow. Forced colors remove both. Trigger: forced colors; any soft or solid Alert. The alert's edge vanishes, and it reads as body text. Documented intent: `sen/forced.ts:2-3` (quoted in R1); `sen/ring.ts:7-8` "A ring is a box-shadow, which forced colors remove, so the default ring carries an outline". Reach: shipped, `apps/places/src/components/places-app/places-app.tsx:670`, `apps/places/src/components/place-form-drawer/form-drawer.tsx:172`, `apps/admin/app/(signed-in)/(dashboard)/security/page.tsx:26`, `modules/grid/grid-body.tsx:405`. Severity: medium (precedent `2026-10-11-BUG-AUDIT.md` R13, "draws its edge with a `ring-1` box-shadow, which forced colors remove"). Narrowed: "error and info look the same with no title" is deliberate, `components/alert/alert.tsx:131-132` "The icon of a severity needs a title: beside body text alone, it looks too heavy." Prior art: NONE.

**R10 (B02-C09).** File: `components/alert/alert.tsx`. Mechanism: the close button sets and then focuses with no condition, `:300` `setOpen(false)`, `:303` `returnFocusTo?.current?.focus()`. A controlled alert with no handler, or with a parent that refuses the close, stays open (`alert.test.tsx:206` "stays open when controlled open has no onOpenChange"). Trigger: `<Alert closable open returnFocusTo={ref} />` with no `onOpenChange`; press Dismiss. The alert stays, and focus jumps from the mounted Dismiss button to `ref`. Documented intent: `:115-116` "When the alert is dismissed via its close button, move focus to this element instead of letting it fall to the document body"; `:92` "A controlled alert stays open until `open` changes"; `alert.test.tsx:240-241` "The dismiss button unmounts with the alert". Reach: none; no root passes `returnFocusTo`. Severity: low. Prior art: the 2026-10-07 tightening item on the controlled-without-handler fallback (landed); it does not cover the focus move.

**R11 (B02-C07).** File: `components/alert/alert.tsx`. Mechanism: `:183` `{title && <Title className={cn(k.title, resolvedIcon && 'self-center')}>{title}</Title>}` and `:185` `{description && <div className={cn(k.description)}>{description}</div>}` render `0` bare for a numeric zero, and `Boolean(title)` (`:263`) is false, so the severity icon drops. `actions` (`:189`) has the same gate. Trigger: `<Alert description={count} />` with `count` 0. A bare "0" renders outside the description slot. Documented intent: `:64-65`, `:74-75` (the title and description TSDoc). Reach: none; root titles are strings, Toast titles are typed `string` (`components/toast/types.ts:39`). Severity: low. Prior art: NONE.

**R12 (B02-C08).** File: `components/alert/alert.tsx`. Mechanism: `:35-36` `function hasBody(children: ReactNode): boolean { return children != null && children !== false` passes `''`, `[]`, and `true`; `:268` `const multiRow = Boolean(title && (description || actions || hasBody(children)))` then moves the close button to the title line (`:293`). Trigger: `<Alert title="Saved" closable>{''}</Alert>`, or `{errors.map(…)}` with no errors. An empty body row adds a gap, and the close button leaves center. Documented intent: `:34` "Whether `children` holds body content. `undefined`, `null`, and `false` are empty."; `:39` "renders nothing for an empty child". Reach: none. Severity: low. Prior art: V11/V20 set the `multiRow` rule (#1771); not the same defect.

**R13 (B02-C10).** File: `recipes/kata/alert.ts`. Mechanism: the exported type's TSDoc, `:49` `/** The palette color of the alert. A \`severity\` sets its own color in place of this one. @defaultValue 'zinc' */`, states the order that #1915 reversed: `components/alert/alert.tsx:146` `const resolvedColor = color ?? (severity ? severityColors[severity] : 'zinc')`. `AlertVariants` is public (`components/alert/index.ts:1`). Trigger: a consumer reads `AlertVariants.color`. Documented intent: `alert.tsx:47` "It replaces the color of the `severity`."; `:129-130` "An explicit `color` or `icon` wins over the default of the severity." Reach: none at runtime; `AlertProps` re-declares `color` with the right text, so the API table is right. Severity: low (TSDoc only). Narrowed: "renders blue" is intended. Prior art: `2026-10-05-display-pages-ui-findings.md` #1 (the `@defaultValue` half of the same line).

**R14 (B02-C13).** File: `components/address-input/address-input-photon.ts`. Mechanism: the scoped search asks for `limit` matches from the whole state box, `:313` `const features = await search(rest, { box, localize: false }, signal)`, and filters by state after, `:317` `feature.properties.state === state.name || feature.properties.state === state.code,`; when the filter leaves none, `:382` `return (named || scoped.length === 0 ? typed : scoped).map(featureToSuggestion)` returns the typed query. Live: "starbucks" with limit 5 in the Maryland box returns DC, District of Columbia, DC, DC, DC. Trigger: region `US` (the en-US default, `:358`, `:170`), "starbucks Maryland". The search inside Maryland returns nothing, and matches from anywhere show. Documented intent: `:196-199` "Where the region is `US`, a query that ends in a state searches inside that state … The query as typed wins where the state has no match."; `:289-290` makes the removal of out-of-state matches deliberate, not the shortfall. The test (`address-input.test.tsx:961`) does not cover a full page of neighbours. Reach: shipped, `apps/places/.../place-search-field.tsx:46` (`placeGeocoder`), `trip-stops-field.tsx:127`, `docs/pages/components/address-input/business-search.tsx:21`, the `AddressInput` default (`address-input.tsx:123`). Severity: medium. Prior art: NONE; B03-C14 (#1771) is the `lang` seam.

**R15 (B02-C14).** File: `components/address-input/address-input-photon.ts`. Mechanism: `boxOf` passes the extent through, `:160` `const [west, north, east, south] = extent as number[]`, with no check of its span, and `:309` `const box = boxOf(area?.properties.extent)` uses it. Live: Photon's Alaska extent is `[-180.0, 71.589, 180.0, 51.007]`, and "starbucks" in that box returns five matches in England. The state filter (`:317`) empties them, and `:382` returns the typed query. Trigger: region `US`, "starbucks Alaska" or "starbucks AK". The search never stays inside Alaska. Documented intent: `:196` (quoted in R14); `:289` "Photon filters by a box". Reach: as R14. Severity: medium. Settled in the overturn: splitting the box is out, because the extent does not say where the land lies. Prior art: NONE.

**R16 (B02-C01).** File: `components/address-input/address-input-photon.ts`. Mechanism: `:422` `const street = [properties.housenumber, properties.street].filter(Boolean).join(' ')`, `:430` `street: street || undefined,`, and `:427` `const own = (kind: string) => (properties.type === kind ? properties.name : undefined)` fills only city, state, and country. Live: "Main Street" answers `type: street`, `osm_key: highway`, `name: "Main Street"`, no `street` property. Trigger: pick a road match. The suggestion has no `address.street`; `apps/places` builds the address line from the parts (`location-form.ts:182-184`), so the street is lost. Documented intent: `:424-426` "A city, a state, or a country is its own part of the address, but Photon leaves that part out of the feature that is the area itself … The name fills it."; `types.ts:6-8` "Parted rather than left in the display `label` alone, because a consumer that stores a match needs the pieces." Reach: shipped, `place-search-field.tsx:46`, `trip-stops-field.tsx:127`. Severity: medium. Narrowed: `name === "Main Street"` is the rule for every named match (`:452` `name: properties.name,`; area fixtures keep `name`), so the name half is ruled out. Prior art: NONE.

**R17 (B02-C15).** File: `components/address-input/address-input-photon.ts`. Mechanism: a code-only query answers with the postcode feature, `:340` `if (rest === '' && layers === undefined && osmTag === undefined) return [code]`, and `:433` `postcode: properties.postcode,` is undefined for it, because `own()` (`:427`) has no postcode case. Live: "97140" answers `osm_value: postcode`, `type: other`, `name: "97140"`, no `postcode` property. Trigger: pick the answer to "97140". The stored address line has no postal code. Documented intent: `types.ts:6-8` (quoted in R16); `:424-426`. Reach: shipped, `place-search-field.tsx:31` `actions?.setValue('address', addressLine(place))`. Severity: medium. Narrowed: whether the code is also a `name` is Q10 (`name` is kept under the R16 ruling). Prior art: R16 (same root cause).

**R18 (B02-C20).** File: `components/address-input/address-input-photon-query.ts`. Mechanism: `:30` `if (!/^[A-Za-z0-9]{2,5}(?:[ -][A-Za-z0-9]{2,4})?$/.test(tail)) continue` lets one word hold only 2 to 5 characters, so "SW1A2AA" (7) and "M5V3L9" (6) are never candidates; the query is searched as typed with no code bias (`address-input-photon.ts:354` `return null`). The rest of the path would accept it: `:48` "A code with its spaces removed, so that `sw1a1aa` and `SW1A 1AA` compare equal." Live: "SW1A2AA" answers the postcode feature "SW1A 2AA". Trigger: "10 Downing St SW1A2AA" or "Toronto M5V3L9". Results are not located near the code that the same text with a space would find. Documented intent: `:14-15` "a code such as `SW1A 1AA` or `M5V 3L9` is two words". Reach: shipped, `place-search-field.tsx:46`. Severity: medium. Narrowed: a Dutch code ("1012AB") fails with its space too (`:35`, every word must hold a digit); that part is under "Surfaced, not judged". Prior art: NONE.

**R19 (B02-C22).** File: `components/address-input/address-input-photon-query.ts`. Mechanism: `:37` `const zipPlusFour = /^(\d{5})-\d{4}$/.exec(tail)` admits only the hyphen, while `:30` admits "97140 1234" as a two-word tail; its compacted form matches no code, so "1234" is tried next and the query is searched as typed. Trigger: "ice cream 97140 1234". Documented intent: `:17-18` "A US ZIP+4 reads as its first five digits, which is the code the geocoder holds." The test covers the hyphen only (`address-input.test.tsx:812`). Reach: shipped, `place-search-field.tsx:46`. Severity: low. Prior art: NONE.

**R20 (B02-C21).** File: `components/address-input/address-input-photon-query.ts`. Mechanism: "Highway 101" fails as two words, but "101" passes as one (`:32` two digits and three characters, `:35` every word holds a digit), so it is looked up as a code (`address-input-photon.ts:238-240`) and, where the region holds that exact code, biases the search to it. Trigger: a region whose codes include the number, for example Iceland ("101" is Reykjavík), and "Highway 101". Documented intent: `:16-17` "It must hold two digits or more and three characters or more … Thus "5th Ave" and "Pier 39" stay text."; `address-input-photon.ts:129-130` "When a region is set, a code that has no match in that region is not read as a postal code." Reach: shipped (user-typed, browser region). Severity: low. Narrowed: under region `US` no 3-digit code exists (live "101" answers no postcode); the only US effect is the extra lookup of R22. Prior art: R22.

**R21 (B02-C23).** File: `components/address-input/address-input-photon-query.ts`. Mechanism: `:138` `const coded = count === 1 ? US_STATES[tail] : undefined` with `:61` `CT: 'Connecticut',` reads the USPS street suffix "CT" (Court) as a state; then `address-input-photon.ts:382` returns the scoped results unless a typed match names the state. Live: "12 OAK" in the Connecticut box returns five features with state "CT". Trigger: region `US`, "12 OAK CT" (an address in USPS capitals). The user's Oak Court results are replaced by Connecticut results. Documented intent: `:121-122` "A USPS code matches only in capitals. In lowercase, "or", "in", and "me" are words of the query." The rule guards lowercase words; nothing guards a capitalized suffix. Reach: shipped, `place-search-field.tsx:46`. Severity: medium. Prior art: NONE.

**R22 (B02-C11).** File: `components/address-input/address-input-photon.ts`. Mechanism: `searchNearPostcode` awaits one `findPostcode` for each candidate in turn (`:331-332`), and a trailing number of 3 or more digits that is not a code is a candidate (`address-input-photon-query.ts:25-43`). Trigger: "Hwy 101" or "Pier 390". One sequential lookup that the `@remarks` do not count. Documented intent: `:208-209` "A query that ends in a postal code costs one more request, and a state two more." Reach: shipped, `place-search-field.tsx:46`, `trip-stops-field.tsx:127`, `business-search.tsx:18`. Severity: low (latency and rate limit, no visible wrong result). Narrowed: "up to two on every such query" holds only for a two-word tail in which both words hold a digit. Prior art: NONE.

**R23 (B02-C17).** File: `components/address-input/address-input-photon.ts`. Mechanism: `:340` `if (rest === '' && layers === undefined && osmTag === undefined) return [code]` treats `[]` as a filter, while `:278` `for (const layer of layers ?? []) params.append('layer', layer)` adds none for it. Trigger: `createPhotonProvider({ layers: [] })`, query "97140". A loose search near the code replaces the code. Documented intent: `:121` "Keep only these layers; every layer otherwise."; `:192-193` "With `layers` or `osmTag`, it searches the code near that position instead, so the filters apply." Reach: none. Severity: low. Prior art: B03-C15 (#1771) is the inverse case.

**R24 (B02-C19).** File: `components/address-input/address-input-photon.ts`. Mechanism: `:240` `if (region !== undefined) params.set('countrycode', region)` sends the region, and the match at `:246-250` (`compact(feature.properties.name ?? '') === compact(postcode)`) never compares `feature.properties.countrycode`. Trigger: an `endpoint` whose Photon ignores `countrycode`, region `US`, "cafe 97140". The search runs near a foreign 97140. Documented intent: `:129-130` (quoted in R20). Reach: none; no root sets `endpoint`. Severity: low. Prior art: NONE.

**R25 (B02-C03).** File: `components/address-input/address-input-photon.ts`. Mechanism: `:221` ``const response = await fetch(`${endpoint}?${params}`, { signal })``. Trigger: `createPhotonProvider({ endpoint: 'https://geo.example/api?key=abc' })`. The URL reads `…?key=abc?q=…`, `q` is lost, and each lookup fails into `onError`. Documented intent: `:98` "The Photon instance to query. Point it at your own where the public one's rate limit or its terms do not suit." Reach: none. Severity: low. Prior art: NONE.

**R26 (B02-C04).** File: `components/address-input/use-address-input-suggestions.ts`. Mechanism: `:51` `if (query.length < minQueryLength) {` counts untrimmed characters, so three spaces reach the provider, and the Photon provider sends `q` as typed (`address-input-photon.ts:264`). Live: a blank `q` answers HTTP 400, which `request` throws (`:223`). Trigger: type three spaces. A request that fails, and an empty menu. Documented intent: `address-input.tsx:76` "Shortest query length that triggers a fetch; below it the menu stays empty." Reach: shipped, `place-search-field.tsx:46`, `trip-stops-field.tsx:127`. Severity: low. Narrowed: `onError` has no root; the `minQueryLength={0}` path with Photon has no root (`suggestions-on-focus.tsx:16` uses a local provider). Prior art: NONE.

**R27 (B02-C05).** File: `components/address-input/use-address-input-suggestions.ts`. Mechanism: `:81` `fetchSuggestions(query, { signal: controller.signal })` is followed by `.then`/`.catch` with no try, so a synchronous throw leaves the timer callback before `.catch` attaches; `loading` (set at `:63`) stays true and `onError` never fires. Trigger: a non-`async` provider that throws. The spinner runs on. Documented intent: `address-input.tsx:81` "Fires when the `provider` rejects, with whatever it threw." Reach: none; every root provider is `async`. Severity: low. Prior art: NONE.

**R28 (B02-C28).** File: `components/address-input/address-input.tsx`. Mechanism: the consumer's `onValueChange` sits on a second, uncontrolled hook, `:154` `const [held, setHeld] = useControllable<AddressSuggestion>({`, fed by `:193` `onValueChange={setHeld}`. A Form reset or `setValue` changes the bound field but not `held`, so a re-pick of the same object returns early at `hooks/use-controllable.ts:114`. Trigger: `name` binds the field, the provider returns stable objects; pick A, reset the Form, pick A. `onValueChange` does not fire. Documented intent: CONVENTIONS §7.3 "Its change handler fires only for a change." Reach: none; Photon builds new objects for each fetch, and the stable-object docs providers are not bound. Severity: low. Prior art: NONE.

## Root-cause groups

- **G1.** `AspectRatio` does not own its ratio: a consumer style beats the preset class, and a number goes inline unchecked. Members: R6, R7.
- **G2.** `featureToSuggestion` fills a feature's own part from `name` only for city, state, and country. Members: R16, R17.
- **G3.** The suggestions effect neither trims the query nor guards a synchronous throw. Members: R26, R27.
- **G4.** `splitPostcode` reads a code by a shape that misses real forms and takes road numbers. Members: R18, R19, R20.
- **G5.** `searchNearPostcode` spends a lookup for each candidate, and its shortcut tests `layers`/`osmTag` for `undefined`, not for empty. Members: R22, R23.
- **G6.** `searchInState` trusts the state box: it limits before it filters, and it takes a globe-wide extent as a box. Members: R14, R15.
- **G7.** `AlertContent` has no single presence test for a slot. Members: R11, R12.
- R1, R2, R3, R4, R5, R8, R9, R10, R13, R21, R24, R25, and R28 are independent.

## Recommended resolution

Steps that share a file run in the order given. The address steps all share `__tests__/components/address-input.test.tsx`, and S14 to S20 share `address-input-photon.ts`, so they run in sequence. The existing provider tests stub `fetch` (`address-input.test.tsx:454`, `:684`, `:771`, `:941`); a step adds its case in that pattern, or exports a pure helper (`featureToSuggestion`, `boxOf`) as a synchronous seam (CONVENTIONS §10.3).

**S1.** Change: keep a stable array for the controlled single value (give back the held array when `props.value` equals its only item). Rows closed: R2. Files: `components/accordion/use-accordion-selection.ts`, `__tests__/components/accordion.test.tsx`. Order: before S2 and S5 (test file). Gate: none. Test seam: a controlled wrapper, `fireEvent.click`, an `onValueChange` spy.

**S2.** Change: give the header a focus mark that forced colors keep (`focus-visible:outline-hidden`, or a `forced-colors:` outline on the item rule). Rows closed: R1. Files: `recipes/kata/accordion.ts`, `__tests__/components/accordion.test.tsx` or a recipe class test as `overlay-forced-colors.test.ts`. Order: after S1. Gate: none (local fix settled; `sen/focus.ts` is a lead). Test seam: the class strings; a paint check in the browser suite.

**S3.** Change: correct the `@remarks` to say the header box follows density, as the trigger's does. Rows closed: R3. Files: `components/accordion/accordion-skeleton.tsx`. Order: any. Gate: none. Test seam: none (TSDoc).

**S4.** Change: export `useAccordionItem` from the accordion barrel, as Collapse exports `useCollapseContext`; update its TSDoc and the surface index (CLAUDE.md §3.4). Rows closed: R4. Files: `components/accordion/index.ts`, `components/accordion/context.ts`, `packages/ui/docs/COMPONENTS.md`. Order: any. Gate: none (settled: export). Test seam: an import from the barrel.

**S5.** Change: make the held panel inert while it closes. Rows closed: R5. Files: `components/accordion/accordion-panel.tsx`, `__tests__/components/accordion.test.tsx`; under Q3 (shared), also `primitives/mount/mount-held-motion.ts` and checks of `collapse/collapse-panel.tsx` and `tree/tree-item-children.tsx`. Order: after S2. Gate: Q3. Test seam: after the header click, before the animation lands, assert `inert` on `[data-slot=accordion-panel]`.

**S6.** Change: the ratio wins over a consumer `style.aspectRatio` on both paths (settled); an invalid number falls back per Q1. Rows closed: R6, R7. Files: `components/aspect-ratio/aspect-ratio.tsx`, possibly `recipes/kata/aspect-ratio.ts`, `__tests__/components/aspect-ratio.test.tsx`. Order: any. Gate: Q1 (R7 part only). Test seam: `toHaveStyle` / `toHaveClass`.

**S7.** Change: fit initials of four or more wide characters per Q2. Rows closed: R8. Files: `components/avatar/avatar.tsx`, possibly `recipes/kata/avatar.ts`, a browser geometry test beside `avatar-group-overlap.test.tsx`. Order: any. Gate: Q2. Test seam: the text box of "+100" against the viewBox, in the browser suite.

**S8.** Change: move focus to `returnFocusTo` only when the alert closes (settled: no move while it stays open). Rows closed: R10. Files: `components/alert/alert.tsx`, `__tests__/components/alert.test.tsx`. Order: before S9. Gate: none. Test seam: a controlled render, `fireEvent.click` on Dismiss, assert focus.

**S9.** Change: one presence test for title, description, actions, and body, used by the render, `multiRow`, and the icon gate. Rows closed: R11, R12. Files: `components/alert/alert.tsx`, `__tests__/components/alert.test.tsx`. Order: after S8. Gate: Q5. Test seam: plain renders.

**S10.** Change: correct the `AlertVariants.color` TSDoc to the order #1915 set. Rows closed: R13. Files: `recipes/kata/alert.ts`. Order: before S11. Gate: none. Test seam: none (TSDoc).

**S11.** Change: add `sen.forced.outline` to `k.base` (settled; it covers soft, solid, and outline); add a severity cue under forced colors only if Q12 says so. Rows closed: R9. Files: `recipes/kata/alert.ts`, a recipe class test; `components/alert/alert.tsx` under Q12. Order: after S10, and after S8 and S9 if it touches `alert.tsx`. Gate: Q12 (cue part only). Test seam: the class string.

**S12.** Change: catch a synchronous provider throw into the same path as a rejection (settled); handle a blank query per Q4. Rows closed: R26, R27. Files: `components/address-input/use-address-input-suggestions.ts`, `__tests__/components/address-input.test.tsx` (or `use-address-input-suggestions.test.ts`); under Q4 (Photon), the R26 part moves into `address-input-photon.ts` after S20. Order: first of the address steps. Gate: Q4 (R26 part). Test seam: `renderHook` with fake timers and a synchronous stub provider.

**S13.** Change: forward the consumer's `onValueChange` from the Combobox report when the field is bound, or read the held value from the field. Rows closed: R28. Files: `components/address-input/address-input.tsx`, `__tests__/components/address-input.test.tsx`. Order: after S12. Gate: none. Test seam: a stub provider with constant objects in a Form; pick, `setValue`, pick.

**S14.** Change: build the request URL with `new URL(endpoint)` and `searchParams`. Rows closed: R25. Files: `components/address-input/address-input-photon.ts`, the address test file. Order: first Photon step. Gate: none. Test seam: the `requestedUrl` pattern (`address-input.test.tsx:684`).

**S15.** Change: `findPostcode` also requires the feature's `countrycode` to match the region when one is set. Rows closed: R24. Files: as S14. Order: after S14. Gate: none. Test seam: `stubPostcode` (`:771`) with a foreign first match.

**S16.** Change: fill `street` from `name` for a road match (settled; `name` kept); fill `postcode` from `name` for a postcode feature per Q10. Rows closed: R16, R17. Files: as S14. Order: after S15. Gate: Q10 (R17 part). Test seam: `stubFeatures` (`:454`) with a street and a postcode feature.

**S17.** Change: read an unspaced UK or Canadian code as a candidate, and a spaced ZIP+4 as its five digits; treat a road number per Q7. Rows closed: R18, R19, and R20 if Q7 says to chase it. Files: `components/address-input/address-input-photon-query.ts`, the address test file. Order: before S18 (S18 counts its candidates). Gate: Q7 (R20 part). Test seam: `splitPostcode` is pure.

**S18.** Change: treat an empty `layers` or `osmTag` as unset (settled); document or cap the lookups per Q6. Rows closed: R22, R23. Files: `components/address-input/address-input-photon.ts`, the address test file. Order: after S17. Gate: Q6 (R22 part). Test seam: `stubPostcode` and a URL count.

**S19.** Change: detect an extent that spans 180° or more (settled; no split) and act per Q9; over-fetch the scoped search, filter, then trim to `limit`, per Q8. Rows closed: R14, R15. Files: as S18. Order: after S18, before S20. Gate: Q8, Q9. Test seam: `stubState` (`:940-957`) with a page of out-of-state matches and a globe-wide extent.

**S20.** Change: stop reading "CT" after a street word as Connecticut, or merge scoped and typed results, per Q11. Rows closed: R21. Files: `components/address-input/address-input-photon-query.ts` and/or `components/address-input/address-input-photon.ts`, the address test file. Order: last. Gate: Q11 (decided with Q8). Test seam: `splitUsState` is pure; the merge goes through `stubState`.

## Open questions

Charlie chose "Proceed" on 2026-10-15: each question is settled as its recommendation. Every gate in the resolution steps is open.

**Q1 (R7, S6).** What does a numeric ratio that is not finite or not positive fall back to?

- (a) The documented default `'1/1'` (`@defaultValue`). The box keeps a shape.
- (b) No ratio, as `parseAspectRatio` gives `null` for charts (`utilities/aspect-ratio.ts:2-3`). The box is free-form, and the content sizes it.

Recommended: (a). The `@defaultValue` already names `'1/1'`, and a box that keeps its shape is the safer failure.

Settled (Charlie, 2026-10-15): "Proceed", as recommended.

**Q2 (R8, S7).** How do wide initials fit the circle?

- (a) Shrink the text to fit (`textLength`, or a size step by length). The content stays as passed.
- (b) Cap the visible text (for example "99+"). The size stays; the content changes.

Recommended: (a) shrink. A count such as "+100" stays true.

Settled (Charlie, 2026-10-15): "Proceed", as recommended.

**Q3 (R5, S5).** Fix the inert gap in the accordion only, or in the shared `heldMotionProps`?

- (a) Local: only `accordion-panel.tsx` changes.
- (b) Shared: Collapse and Tree get the same fix (they build the same held branch, `collapse-panel.tsx:116`, `tree-item-children.tsx:103`), with their own tests. This widens the step past the letter A.

Recommended: (b) shared. The three panels share one mechanism, and a fix in one leaves the other two (no piecemeal patches).

Settled (Charlie, 2026-10-15): "Proceed", as recommended.

**Q4 (R26, S12).** Where is a blank query stopped?

- (a) In the hook: `minQueryLength` counts trimmed characters, for every provider.
- (b) In the Photon provider: a blank `q` returns `[]`; custom providers still get whitespace.

Recommended: (a) in the hook. "Below it the menu stays empty" then holds for every provider.

Settled (Charlie, 2026-10-15): "Proceed", as recommended.

**Q5 (R11, R12, S9).** What is an empty slot in an Alert?

- (a) `0` is content and renders in its slot; `''`, `[]`, `true`, and arrays of only those are empty.
- (b) `0` is empty, like `''`.

Recommended: (a). React renders `0`, and a count of zero is content.

Settled (Charlie, 2026-10-15): "Proceed", as recommended.

**Q6 (R22, S18).** Correct the `@remarks` to count a lookup for each candidate, or cap the lookups at one for each query? Decide after Q7.

Recommended: correct the `@remarks`. The lookup is how the design tells a code from a number.

Settled (Charlie, 2026-10-15): "Proceed", as recommended.

**Q7 (R20, S17).** Chase a road number that is a real code in the region (a table of code lengths for each region), or leave R20 as a known low row?

Recommended: leave R20 open as a known low row; a table of code lengths is more than the defect costs.

Settled (Charlie, 2026-10-15): "Proceed", as recommended.

**Q8 (R14, S19).** How many matches does the scoped search ask for? Photon has no paging. A larger multiplier costs response size and makes the typed fallback rarer; it keeps the `@remarks` count.

Recommended: four times `limit`, trimmed to `limit` after the filter. Live, "whole foods" in the Maryland box gives 1 of 5 in the state at `limit`.

Settled (Charlie, 2026-10-15): "Proceed", as recommended.

**Q9 (R15, S19).** For a state whose extent spans the globe:

- (a) Drop the box and bias to the state's point (`area.geometry.coordinates`), still filtered by state.
- (b) Skip the scoped search and keep the typed results.

Recommended: (a). The search still stays near the state.

Settled (Charlie, 2026-10-15): "Proceed", as recommended.

**Q10 (R17, S16).** For a postcode feature, fill `address.postcode` from `name`, and:

- (a) keep `name` (the R16 rule). In `apps/places` the name fill then writes "97140" as the place's name (`use-name-fill.ts:34`).
- (b) leave `name` unset for a postcode feature, as for a plain address (`use-name-fill.ts:13-14` "A match with no name, such as a plain address, leaves the name alone").

Recommended: (b). A postal code is not a place name.

Settled (Charlie, 2026-10-15): "Proceed", as recommended.

**Q11 (R21, S20).** How does "12 OAK CT" stop reading as Connecticut?

- (a) A USPS code that is also a common street suffix or directional (CT, PL, NE…) after a word does not count as a state. Only `splitUsState` changes.
- (b) Scoped results merge with the typed results in place of replacing them. Every state query changes, together with Q8.

Recommended: (a). It changes only the parse, and it leaves the R14 merge alone.

Settled (Charlie, 2026-10-15): "Proceed", as recommended.

**Q12 (R9, S11).** Besides the edge, show the severity under forced colors? It reopens the rule that the icon needs a title (`alert.tsx:131-132`).

Recommended: no cue; the edge only. The icon rule is deliberate, and the text says the severity.

Settled (Charlie, 2026-10-15): "Proceed", as recommended.

## Ruled out

- **B01-C03** (AccordionPanel height animates under reduced motion). `motion-dom@14.0.0` `animation/interfaces/visual-element-target.mjs:84` `shouldReduceMotion && positionalKeys.has(key) ? { type: false } : valueTransition`, and `render/utils/keys-position.mjs` lists `"height"`. The height snaps. Intent: `__tests__/browser/motion/tree-exit-focus.test.tsx:9` "Under reduced motion the height snaps, but the fade runs."
- **B02-C02** (Puerto Rico state lookup sends `countrycode: 'US'`). Live Photon files Puerto Rico under `countrycode` US with an extent, and its places carry `state: "Puerto Rico"`, so `address-input-photon.ts:304` `countrycode: 'US',` finds it and `:317` `feature.properties.state === state.name` keeps its matches.
- **B02-C06** (a provider's own `AbortError` leaves loading on). Tested intent: `__tests__/components/use-address-input-suggestions.test.ts:138` "swallows AbortError without flipping loading state".
- **B02-C12** (`findPostcode` does not take the first match when no region is known). Deliberate: `address-input-photon.ts:244-245` "Only a code that is the typed code is its position."; test `address-input.test.tsx:875`.
- **B02-C24** ("1600 Pennsylvania Ave NW Washington" read as Washington State). Live, the Washington State box answers `[]`, so `:382` keeps the typed DC results; "<chain> Washington" searching Washington State is the stated rule, `:196-200` "… so "starbucks Oregon" and "starbucks OR" search Oregon. It also wins where one of its matches holds the state in its name, as "Mount Washington" does."
- **Duplicates.** B02-C16 of B02-C01 (R16); B02-C18 of B02-C03 (R25); and, from the second reads, B01-C09 (R1), B01-C10 (B01-C03), B01-C12 (R4), B01-C13 (R3), B02-C25 (B02-C06), B02-C26 (R27), B02-C27 (R26), B03-C01 (R10), B03-C03 (R12), B03-C04 (R11), B03-C05 (R6), B03-C06 (R7).
- **Dropped parts.** R2: the parent-driven trigger and repeat clicks (`use-controllable.ts:37-39`, `:126`). R8: four narrow glyphs fit. R9: error and info alike with no title (`alert.tsx:131-132`). R13: "renders blue" (`alert.tsx:47`). R16: the `name` half (`:452`). R18: the Dutch code (`address-input-photon-query.ts:35`). R20: the US bias (`:240`, `:246-249`). R22: two lookups for "Hwy 101" (`address-input-photon-query.ts:35`). R26: the `onError` and `minQueryLength={0}` paths (no root).

## Surfaced, not judged

- Sweeper, B01: `components/collapse/collapse-panel.tsx` uses the same `ReducedMotion` and height preset (the B01-C03 mechanism, refuted). Not a defect by that ruling.
- Sweeper, B01: `hooks/use-controllable.ts:114` compares by identity, so any caller that wraps an equal array or object again between renders can get one redundant report, as in R2.
- Verifier, B01: the `ReducedMotion` TSDoc (`primitives/reduced-motion/reduced-motion.tsx:35-36`) says only transforms are skipped; `motion-dom` also snaps width, height, top, left, right, and bottom.
- Verifier, B01: `recipes/kiso/sen/focus.ts:52` `inset: ['outline-none', 'focus-visible:ring-2 ring-inset focus-visible:ring-blue-600']` has the R1 gap in every component that uses it.
- Verifier, B01: `utilities/aspect-ratio.ts:17` `ratio > 0 ? ratio : null` admits `Infinity`, which reaches `AspectRatio` through Chart and Map.
- Verifier, second read: `collapse-panel.tsx` and `tree/tree-item-children.tsx` build the same held branch as R5 (Q3).
- Verifier, B02: `alert.tsx:189` `{actions && …}` has the R11 gate; `hasBody(true)` is true.
- Verifier, B02: `components/banner/banner.tsx:27-34` defaults `closable` to true and forwards `returnFocusTo`, `open`, and `children` to Alert, so R10 and R12 reach Banner consumers.
- Verifier, B02: the `region` TSDoc branch "no region is known" is reachable mostly in SSR, because `browserRegion()` maximizes nearly any tag to a region.
- Verifier, B02: `findPostcode` asks for five matches (`:238`); with a region ignored as in R24, five foreign near-misses could hide an exact code.
- Verifier, B02: `apps/places` `addressLine` (`location-form.ts:181-186`) prefers the parts over the label, so any part `featureToSuggestion` drops leaves the stored line.
- Verifier, B02: the `boxOf` comment (`:152`, "west, south, east, north") and the `extent` comment (`:21`, "west, north, east, south") describe different orders; both match the code.
- Verifier, second read: a Dutch code ("1012 AB") is never a candidate, because each word must hold a digit (`address-input-photon-query.ts:35`).
- Verifier, second read: `splitUsState` reads other capitalized trailing tokens, such as the directional "NE" (Nebraska) in "100 MAIN ST NE"; towns named for states (Nevada, Delaware) follow the stated rule.
- Sweeper, B03-L: `recipes/kiso/dan/space.ts:394` gives the form-group gap to `[role=alert]` only, so an `info` or `success` Alert (`role="status"`) gets no gap above it. Possibly intentional.
- Caller: the Avatar broken-image icon that #1915 left as a follow-up (a CSS background layer or a client load check) is still drawn by Chromium.
- Caller: `apps/picks` renders `<Alert>` (`prediction-sheet.tsx:118,269`) and is not in the consumer-root list; no row changes with it.
