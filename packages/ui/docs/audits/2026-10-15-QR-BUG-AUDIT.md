# Bug audit — 2026-10-15

Letter sweep Q and R of the `packages/ui` components: Radio, Rating, and Resizable. One scope, 16 files, 1,478 lines, 10 claims. Nine are rows below: 2 `medium`, 7 `low`. One claim was refuted (C04). The overturn pass settled four of the eight questions from code; the reader settled Q1 to Q4 as recommended. The settle pass found that Q2's answer does not close R3, so Q2b waits on the reader and gates S2.

## Scope

The area is the three component folders of the letters Q and R at `main` ab4c4cedf. No component folder starts with Q. Tests, benchmarks, and the docs tree are out, per §1.2. `primitives/query`, `primitives/ready-reveal`, `primitives/reduced-motion`, the `modules/query` module (QueryBuilder, 3,179 lines), the R hooks (`use-reorder-drag.ts`, `use-reported-change.ts`, `use-resize-observer.ts`), the R utilities (`random-id.ts`, `range-keys.ts`, `resolve-locale.ts`), and `core/query-slot.ts` start with Q or R but are not component folders, so the letter sweep leaves them out, as the L to P sweeps left out their primitives, modules, and utilities. The agents read shared pieces to trace (`core/create-context.ts`, `hooks/use-id-scope.ts`, `hooks/use-form-reset-sync.ts`, `components/form/use-form-value.ts`, `components/control/use-control-props.ts`, `primitives/toggle/toggle-group.tsx`, `utilities/primary-press.ts`, `recipes/kata/resizable.ts`); no row is anchored to them.

| Scope | Theme | Files | Lines | Claims |
| --- | --- | --- | --- | --- |
| B01 | Radio, Rating, Resizable | 16 | 1,478 | 10 |

This is a letter sweep, not a Clean pass: no lens set and no floor. Every confirmed finding is a row, whatever its severity.

File ownership: PdfViewer (#2495) merged before this sweep; no open thread touches `components/radio`, `components/rating`, or `components/resizable`.

## Method

One sweeper, a blind verifier on the stripped claims, an overturn pass with the sweep evidence, and a merge pass over the one sheet. A script (`jq 'map(del(.evidence))'`) removed the `evidence` field and a search checked the stripped text for line references (0 hits) before the blind pass; the blind input sat in its own directory, apart from the evidence. The sweeper read every file in its list (16/16). It returned no lead.

The digest held the Q/R entries of the project record `2026-10-02-component-bug-sweep.md` (outside the repository): B05-C10 (Rating touch preview, fixed in #1755), B08-C05 to B08-C09 (Resizable RTL drag and keys, `aria-valuemin`/`max`, `defaultSize` as weights, seed clamp; fixed), the ruled-out B05-C01 (Radios sharing a Field id), B05-C05 (native reset), B05-C11, and B05-C12 (Rating), the surfaced Radio, Rating, and Resizable leads, and V27, V69, and V70. The repository record `2026-10-11-BUG-AUDIT.md` has no entry for these folders. The ledger lists `radio`, `rating`, and `resizable` as Not started.

| Pass | In | Out |
| --- | --- | --- |
| Sweep | 1 scope | 10 claims, 0 leads |
| Verify | 10 stripped claims | 8 confirmed, 2 refuted; 8 questions; 5 leads |
| Overturn | 1 sheet plus evidence | C10 refuted → confirmed (Q7, §7.3); no other verdict or severity changed; Q1, Q4, Q7, Q8 settled from code or the standing rule; 2 more leads |
| Merge | 1 sheet plus the overturn | 1 group, 8 steps, 4 questions |
| Settle | the reader's answers to Q1 to Q4 | S1, S2, S5, S6 derived again; Q2b raised (R3 not closed by Q2 (a)) |

## Findings

9 rows: 0 high, 2 medium, 7 low. Reach: 3 `shipped` (docs pages, which deploy, and `apps/places`), 1 `test-only`, 5 `none`. The rows at reach none stand under the M sweep's settled rule: a trigger that the public API builds and no root site builds stays a row (low, reach none).

`◯ OPEN` waits on a question or a fix. `◐ FIXED` is fixed on a branch. `✅ RESOLVED` cites the merged pull request.

| Row | File | Symbol | Verdict | Severity | Reach | Group | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | `components/resizable/use-resizable-panel.ts` | `useResizablePanel` (drag ignores `pointerId`) | CONFIRMED | medium | shipped | G1 | ◯ OPEN |
| R2 | `components/resizable/use-resizable-panel.ts` | `useResizablePanel` (orientation flip mid-drag) | CONFIRMED | low | none | G1 | ◯ OPEN |
| R3 | `components/resizable/use-resizable-panel.ts` | `seedSizes` (one forward pass) | CONFIRMED | low | none | — | ◯ OPEN |
| R4 | `components/resizable/resizable-panel.tsx` | `ResizablePanel` (throws outside a group) | CONFIRMED | low | none | — | ✅ RESOLVED ([#2512](https://github.com/charliebeckstrand/midgard/pull/2512)) |
| R5 | `components/rating/rating.tsx` | `Rating` (`id` on no element) | CONFIRMED | low | shipped | — | ✅ RESOLVED ([#2513](https://github.com/charliebeckstrand/midgard/pull/2513)) |
| R6 | `components/rating/rating.tsx` | `Rating` (preview over a keyboard commit) | CONFIRMED | medium | shipped | — | ◯ OPEN |
| R7 | `components/rating/rating.tsx` | `Rating` (native reset while dead) | CONFIRMED | low | none | — | ◯ OPEN |
| R8 | `components/radio/radio.tsx` | `Radio` (Field id inside a RadioGroup) | CONFIRMED | low | none | — | ◯ OPEN |
| R9 | `components/radio/radio.tsx` | `Radio` (extra `onChange` after read-only) | CONFIRMED | low | test-only | — | ◯ OPEN |

All paths are under `packages/ui/src/`.

## Mechanisms

**R1 (B01-C02).** File: `components/resizable/use-resizable-panel.ts`. Mechanism: the drag's document listeners do not check `pointerId`: `:345-350` adds `pointermove`, `pointerup`, and `pointercancel` with `onMove` / `onUp`; `:285-292` `const onMove = (event: PointerEvent) => {` … `const deltaPercent = dragDeltaPercent(drag, event, currentOrientation)`; `:42` `const pos = horizontal ? event.clientX : event.clientY`; `:307-334` `onUp` clears the drag and calls `reportResizeEnd(handleIndex)` for any pointer's up or cancel. `:248` reads the starting `pointerId` but `DragState` does not keep it. Only the handle has `touch-none` (`recipes/kata/resizable.ts:17`), so a second finger on panel content sends its own events to the document. Trigger: on a touch screen, drag a handle with one finger and tap or move a second finger elsewhere on the page. A move jumps the split to the second finger; an up or cancel ends the drag and fires `onResizeEnd` while the first finger is still down. Documented intent: `:236` "A new drag supersedes any still-active one (a second pointer landing on another handle before the first lifts)"; nothing lets a second pointer elsewhere steer or end the drag. Every sibling drag hook filters by pointer: `hooks/use-panel-resize.ts:374-375` "Gives `null` when no gesture is in flight, or when the event comes from another pointer."; `components/signature-pad/use-signature-pad-drawing.ts:161-162` "The release of another pointer does not end the stroke." / `if (event && event.pointerId !== pointerRef.current) return false`. The tests send only `pointerId: 1` (`__tests__/browser/resizable-rtl.test.tsx:68-75`). Reach: shipped, `docs/pages/components/resizable/playground.tsx:11` and `three-panels.tsx:6`, on a touch device. Severity: medium; a shipped surface shows a wrong split and ends the drag early; the user can drag again. Prior art: NONE (B08-C05 is the RTL seam).

**R2 (B01-C03).** File: `components/resizable/use-resizable-panel.ts`. Mechanism: the drag takes its length and start from the axis of the render that starts it, `:221` `const totalSize = orientation === 'horizontal' ? rect.width : rect.height`, `:250` `const startPos = orientation === 'horizontal' ? event.clientX : event.clientY`, while each move reads the newest axis, `:184` `const readLayout = useStableEvent(() => ({ orientation, constraints: panelConfigs }))`, `:290` `const { orientation: currentOrientation, constraints } = readLayout()`, `:46` `return ((pos - drag.startPos) / drag.availableSize) * 100 * sign`. Trigger: the group's `orientation` prop changes while a pointer drag is in progress (a layout that flips at a breakpoint). The next move mixes a coordinate on the new axis with the start and length of the old one, and the panels jump to an unrelated size. Documented intent: `:182-183` "A drag reads the orientation and the constraints of the newest render on each move"; it wants the live layout, not a mixed one. No test flips the orientation during a drag. Reach: none; the playground (`docs/pages/components/resizable/playground.tsx:11`) can change the orientation, but not while a pointer holds a handle. Severity: low. Prior art: NONE.

**R3 (B01-C05).** File: `components/resizable/use-resizable-panel.ts`. Mechanism: `seedSizes` makes one forward pass, `:120-122` `sizes = clampPair(sizes, leftIndex, configs)`, and an infeasible pair falls back to the left panel's own bounds, `:76-81` `const feasibleMin = Math.max(leftMin, total - rightMax)` / `const feasibleMax = Math.min(leftMax, total - rightMin)` / `? { min: feasibleMin, max: feasibleMax, total } : { min: leftMin, max: leftMax, total }`. Trace with equal weights, middle `maxSize={20}`, last `minSize={60}`: start 33.3/33.3/33.3; pair 0 gives 46.7/20; pair 1 has total 53.3 and feasibleMax −6.7 < feasibleMin 0, so it falls back to [0, 20] and gives 20/33.3. Final 46.7/20/33.3, with the last panel under its `minSize`, though 20/20/60 meets every bound. Trigger: as traced. Documented intent: seedSizes TSDoc `:108-109` "Thus each panel goes into its min/max, and the next panel takes the difference"; `resizable-panel.tsx:13-14` "Then each panel goes into its `minSize` and `maxSize`". A fix must keep the neighbor-first rule that B08-Q3 settled, `__tests__/components/use-resizable-panel.test.ts:115-116` "Seeding clamps each panel into its bounds, and the neighbor takes the difference (B08-C09, B08-Q3)." and `:134-140` `'raises the last panel and takes the difference from its neighbor'` → `[25, 35, 40]`. Reach: none; the only three-panel root, `docs/pages/components/resizable/three-panels.tsx:7-15` (25/50/25, `minSize` 15/20/15), is feasible on one pass. Severity: low. Prior art: B08-C09 "defaultSize below minSize not clamped on first render", fixed; this is the remaining multi-panel case of that seam.

**R4 (B01-C01).** File: `components/resizable/resizable-panel.tsx`. Mechanism: `:40` `const { sizes, panelId } = useResizable()`; `context.ts:24` `export const [ResizableContext, useResizable] = createContext<ResizableContextType>('Resizable')` has no default, so `core/create-context.ts:68-69` `if (!hasDefault && (value as unknown) === MISSING) {` / `throw new Error(customError ?? \`use${name} must be used within <${name}>\`)` throws before the fallback at `:44` `const size = panelIndex !== undefined ? (sizes[panelIndex] ?? defaultSize) : defaultSize` can run. Trigger: `<ResizablePanel defaultSize={30}>` with no enclosing `ResizableGroup`; the render throws. Documented intent: `:34` "(or `defaultSize` outside a group)"; `context.ts:31-33` "Defaults to an empty object outside a group." No test renders a panel outside a group. Reach: none; every docs site sits in a group (`docs/pages/components/resizable/playground.tsx:11-16`, `three-panels.tsx:6-15`). Severity: low. Prior art: NONE.

**R5 (B01-C06).** File: `components/rating/rating.tsx`. Mechanism: `:216` `const scope = useIdScope({ id: resolvedId })` (`hooks/use-id-scope.ts:21` `const id = options?.id ?? generatedId`); the id appears only as the radio name, `:379` `name={scope.id}`; the interactive row `:397-408` has no `id` attribute; the display form names its row `:41` `return { id: ids.row, 'aria-label': name.label, ...}` with `ids.row = scope.sub('row')` (`:289`). Trigger: pass `id="score"` to an interactive Rating, or wrap it in a Field that supplies an id. No element carries that id, so `getElementById`, an `aria-labelledby` or `aria-describedby` reference, or a skip link finds nothing. Documented intent: `:117` "Id for the row; resolves through the explicit prop, then an enclosing `<Control>` / `<Field>`." `:158-159` ("No one element of the stars is labelable, so a `<label for>` points at nothing") covers `label for` only; `COMPONENTS.md:26` covers the name, not the id. Reach: shipped; Fields supply the id at `apps/places/src/components/place-form-drawer/place-form-drawer.tsx:200-203` and `docs/pages/components/rating/{half-stars.tsx:6-8, named-levels.tsx:8-10, star-count.tsx:7-13, in-a-form.tsx:20-22, controlled.tsx:11-13}`, but nothing in the roots reads it. Severity: low; no visible result on a shipped surface. Prior art: NONE.

**R6 (B01-C08).** File: `components/rating/rating.tsx`. Mechanism: `:226` `const preview = live ? previewed : null`, `:230` `const shown = preview ?? current`, `:235` `const clearing = clearable && preview !== null && preview === current`. The preview clears only on pointer leave, `:406` `onPointerLeave={() => setPreviewed(null)}`; a keyboard change goes through `:384` `onChange={() => commit(score)}`, and `commit` (`:251-255`) does not reset `previewed`. Trigger: the mouse rests over a star (for example after a click on it) and the user changes the score with the arrow keys. The value changes and is announced, but the stars keep drawing the hovered score, with the clearing style when the value passes through it, until the pointer moves or leaves. Documented intent: `:198-200` "The score under the pointer, which stands in for the value while the pointer is over the row. A star rating that does not answer the pointer makes the reader guess which star they are about to commit to."; `:100-101` "so that click previews its result like every other one does". No test covers the keyboard while hovered (`rating.test.tsx:100-160` are pointer only; `browser/geometry/rating-half-step.test.tsx:61-79` drives keys with no hover). Reach: shipped, `apps/places/src/components/place-form-drawer/place-form-drawer.tsx:203` `<Rating name="rating" size="lg" step={0.5} />`, `docs/pages/components/rating/playground.tsx:4`, `half-stars.tsx:8`, `named-levels.tsx:10`, `star-count.tsx:9,13`, `in-a-form.tsx:22`, `controlled.tsx:13`. Severity: medium; a shipped surface draws a score other than the committed one in normal mixed mouse and keyboard use, and does not heal until the pointer moves. Prior art: B05-C10 (fixed in #1755), the touch seam of the same `previewed` state; the keyboard is not covered.

**R7 (B01-C07).** File: `components/rating/rating.tsx`. Mechanism: the reset listener lives on a radio, `:376` `ref={score === step ? resetRef : undefined}`; a dead row returns before any radio renders, `:222` `const live = !resolvedReadOnly && !resolvedDisabled`, `:284` `if (!live) {`; with no input the listener goes away, `hooks/use-form-reset-sync.ts:37` `if (!enabled || !input || !form) return` and `:51-52` `form.removeEventListener('reset', handleReset)`. Trigger: an uncontrolled Rating in a native `<form>` is set to 4, then turns `readOnly` or `disabled`, and the form resets. The rating stays at 4 and `onValueChange` does not fire. Documented intent: `:153-154` "An uncontrolled rating goes back to `defaultValue` on a native form reset, and `onValueChange` reports it." `COMPONENTS.md:22` exempts "A control that puts no value in a native form … `RangeSlider`, `Listbox`, `Calendar`, the `DatePicker` family, `ColorPicker`, and `SignaturePad`"; Rating is not in that list. Slider and Switch keep their reset input while disabled (`slider/slider.tsx:156` `ref={setRef}` beside `:158` `disabled={controlProps.disabled}`; `switch/switch.tsx:134,137`). The tests `__tests__/components/rating.test.tsx:463-489` cover a live row only. Reach: none; the places site is form-bound and so controlled (`use-form-value.ts:97` `const controlled = bound || value !== undefined`), and no root puts an uncontrolled Rating in a bare `<form>`. Severity: low. Prior art: B05-C05 (ruled out for reach); this is a dead-row gap in the later `resetRef` fix.

**R8 (B01-C09).** File: `components/radio/radio.tsx`. Mechanism: `:64` `useControlProps({ id, disabled, required, readOnly, 'aria-describedby': ariaDescribedBy })`, `:102-106` `id={resolvedId}` … `required={resolvedRequired}` … `aria-describedby={resolvedDescribedBy}`, with `use-control-props.ts:112` `id: explicitId ?? wrapperId`. RadioGroup does not shadow the Control context: `radio-group.tsx:52-53` provides only `RadioGroupReadOnlyContext` around `<ToggleGroup …>`, and `primitives/toggle/toggle-group.tsx:13` is a bare div. Trigger: `<Field>` around a `<RadioGroup aria-label="Plan">` of bare `<Radio>` elements. Every radio adopts the Field id (duplicate ids), the Field's Label points at the first radio only, and every radio takes the Field's `required`, `disabled`, and `aria-describedby`. Documented intent: `radio/context.ts:7-9` "a group with no `<Control>` above it has no id to give, and a radio adopts the id of that context"; `radio-group.tsx:18` "Bind the group's value through a {@link Field} instead." `CheckboxGroup` scopes itself to `{@link CheckboxField}` children (`checkbox/checkbox-group.tsx:15`); RadioGroup points at Field. Reach: none; every docs site wraps each Radio in its own `RadioField` (`docs/pages/components/radio/playground.tsx:10`, `with-description.tsx:14`, `disabled-option.tsx:7-15`, `controlled.tsx:19`). Severity: low. Prior art: B05-C01 (ruled out for reach: "several Radios in one Field share the Field id, no root does it") and the surfaced lead "radio-group.tsx remarks tell consumers to bind via Field". Under the standing rule it is a row.

**R9 (B01-C10).** File: `components/radio/radio.tsx`. Mechanism: the read-only guard `:77-84` writes `event.currentTarget.checked = false` and calls `event.preventDefault()`. Its comment `:74-76`: "In an uncontrolled group, React reads the old radio before the browser checks it again. A later click on that checked radio then fires one extra `onChange`." Trigger: in an uncontrolled RadioGroup, click an unchecked radio while read-only; turn read-only off; click the radio that is already checked. The consumer `onChange` fires for a radio that did not change. Documented intent: `CONVENTIONS.md` §7.3 "Its change handler fires only for a change." (the sentence is about `useControllable`; the native radio contract, a change fires only when checkedness changes, gives the same answer). The comment records a known side effect, not a design. `browser/radio-read-only.test.tsx:77-91` covers only a click on a different radio after read-only ends (`expect(onChange).toHaveBeenCalledOnce()`). Reach: test-only, `browser/radio-read-only.test.tsx:17-30` builds the shape; `docs/pages/components/radio/playground.tsx:11` can toggle `readOnly` but passes no `onChange`. Severity: low. Prior art: NONE.

## Root-cause groups

- **G1.** `DragState` captures the drag at its start but pins neither the pointer nor the axis that later events must match. Members: R1, R2.
- R3, R4, R5, R6, R7, R8, and R9 are independent.

## Recommended resolution

**S1.** Change: add `pointerId` and `orientation` to `DragState`, both set in `startDrag`. `pointermove`, `pointerup`, and `pointercancel` from another `pointerId` do nothing; `contextmenu` still ends the drag. In `onMove`, compare `readLayout().orientation` with `drag.orientation` before the delta; on a mismatch, end the drag through the `onUp` path (flush the last sizes, abort the listeners, fire `onResizeEnd(handleIndex)` once) and compute no delta. The pointer filter sits in the listener wrapper, so `onUp` can run with no event. Rows closed: R1, R2. Files: `components/resizable/use-resizable-panel.ts`, `__tests__/components/use-resizable-panel.test.ts` (the dispatches at `:520` and similar carry no `pointerId`; they need `pointerId: 1`, which `makePointerEvent` already defaults, `__tests__/helpers/make-event.ts:40`). Order: first; S2 edits the same file. Depends on: nothing. Gate: none (Q1 settled). Test seam: synchronous; `renderHook` with `orientation` as a prop, the rAF stub at `:99-105`, and `document.dispatchEvent(new PointerEvent(…, { pointerId }))`. R1: a move and an up from `pointerId: 2` leave the sizes and `dragging` unchanged, with no `onResizeEnd`. R2: rerender with `'vertical'` mid-drag, send one move; `onResizeEnd` fires once, `dragging` is `null`, and the sizes equal the last horizontal commit.

**S2.** Change: in `seedSizes`, after normalization, repeat a forward pass (`leftIndex` 0 → n−2) and a backward pass (n−2 → 0) of `clampPair` until no size changes (a small tolerance, at most n rounds). When the stable result still breaks a bound, do what Q2b decides. Keep `use-resizable-panel.test.ts:117-141`, including `[25, 35, 40]`. Rows closed: R3. Files: as S1. Order: after S1. Depends on: S1 (file order). Gate: Q2b. Test seam: synchronous; `renderPanel({ panelConfigs })` → `result.current.sizes`; add the R3 row (equal weights, `maxSize: 20` on panel 1, `minSize: 60` on panel 2), which expects [20, 20, 60] under Q2b (a).

**S3.** Change: let `ResizablePanel` read the group context without a throw (a context default or an optional reader), and use `defaultSize` outside a group. Rows closed: R4. Files: `components/resizable/resizable-panel.tsx`, `components/resizable/context.ts`, `__tests__/components/resizable.test.tsx`. Order: any. Depends on: nothing. Gate: none (settled). Test seam: synchronous render.

**S4.** Change: put the resolved id on the row element in both forms, and derive the display-form self-reference from it. Rows closed: R5. Files: `components/rating/rating.tsx`, `__tests__/components/rating.test.tsx`. Order: first of the Rating steps. Depends on: nothing. Gate: none. Test seam: synchronous render.

**S5.** Change: hold a press flag in a ref; the row's `onPointerDown` sets it, and the radio's `onClick` clears it at its end. `commit` clears `previewed` when the flag is not set, which covers an arrow-key change, a Space activation, and a keyboard clear through `handleClick`. A pointer commit keeps the preview, so the clearing recede (`:235`) still behaves as `rating.test.tsx:100-160` pins it, and the next `pointerenter` sets the preview again. Rows closed: R6. Files: `components/rating/rating.tsx`, `__tests__/components/rating.test.tsx`, optionally `__tests__/browser/geometry/rating-half-step.test.tsx`. Order: after S4. Depends on: S4 (file order). Gate: none (Q3 settled). Test seam: synchronous; `fireEvent.pointerEnter(label2, { pointerType: 'mouse' })`, then `fireEvent.click(radio3)` with no `pointerDown`; expect three full `rating-fill` widths and no clearing class. In the browser, hover star 2 and press `{ArrowRight}`, as `rating-half-step.test.tsx:61-79`.

**S6.** Change: in the display (dead) branch, render `<input type="hidden" ref={resetRef} />` with no `name` (it submits nothing), only while the rating is uncontrolled (`controlled` from `useFormValue`), so the controlled display rows that lists draw (`apps/places/.../place-summary.tsx:117`, `place-rating.tsx:31`, `docs/.../review-averages.tsx:22`) gain no element. At a live/dead switch the ref callback moves the form listener (`use-form-reset-sync.ts:33-56`). L6 stays a lead. Rows closed: R7. Files: `components/rating/rating.tsx`, `__tests__/components/rating.test.tsx`. Order: after S5. Depends on: S5 (file order). Gate: none (Q4 settled). Test seam: the rAF reset path that `rating.test.tsx:463-489` drives; uncontrolled `defaultValue={2}` in a native `<form>`, set 4, rerender `readOnly`, reset, flush; the readout is 2 and `onValueChange(2)` fires. A controlled display row renders no `input`.

**S7.** Change: stop a Radio in a RadioGroup from adopting the Field id, required state, and description; RadioGroup withholds the wrapper id from its radios, or Radio skips it inside a group. Rows closed: R8. Files: `components/radio/radio-group.tsx`, `components/radio/radio.tsx`, `components/radio/context.ts`, `__tests__/components/radio.test.tsx`. Order: before S8. Depends on: nothing. Gate: none (settled). Test seam: synchronous render.

**S8.** Change: after a canceled read-only click, bring React's value tracker of the previously checked radio back in sync, so a later click on it fires no `onChange`. Rows closed: R9. Files: `components/radio/radio.tsx`, `__tests__/browser/radio-read-only.test.tsx`. Order: after S7. Depends on: S7 (file order). Gate: none (settled). Test seam: the browser test (real activation behavior).

## Open questions

**Q1 (R2, S1).** The group's orientation flips while a pointer holds a handle. What does the drag do?

- (a) End the drag through the `onUp` path: `onResizeEnd` fires, and "Exactly one end follows each start" (`resizable-group.tsx:42-43`) holds. No rect read inside `onMove`. Recommended.
- (b) Re-measure and rebase `startPos` and `availableSize` on the new axis, and continue.

Either way, `DragState.rtl` (`:257`) has the same stale capture (lead L3); the answer can cover it too. No precedent in the package.

Answer (2026-10-15, the reader): "Proceed as recommended." (a): end the drag. The settle pass keeps L3 a lead, because the answer names only the orientation.

**Q2 (R3, S2).** How does the seed reach a feasible layout, and what does it return when none exists?

- (a) Forward then backward passes of `clampPair`, repeated until the sizes stop changing; an infeasible chain keeps the last result. Keeps every pinned row of `use-resizable-panel.test.ts:117-141`, because the neighbor pair satisfies them on the first pass. Recommended.
- (b) A global fill against min/max (water-fill). Exact, but replaces the neighbor-first rule that B08-Q3 settled, so the pinned rows need a check.

Answer (2026-10-15, the reader): "Proceed as recommended." (a). The settle pass traced (a) on the R3 input: the backward pass finds pair (1,2) infeasible (`feasibleMax` −6.7 < `feasibleMin` 0), falls back to [0, 20], and moves nothing, so 46.7/20/33.3 is already stable. A pairwise clamp cannot move slack from panel 0 to panel 2 past a middle panel pinned at its max. (a) alone does not close R3; see Q2b.

**Q2b (R3, S2), from the settle pass.** The stable pairwise result still breaks a bound. What then?

- (a) A global fallback that runs only then: clamp each panel into its own min/max, and share the remainder among the panels with slack, in proportion to their weights. Gives 20/20/60 for R3. It cannot touch the pinned rows, because they meet every bound after the first pass. Recommended.
- (b) Accept the pairwise result, and record R3 as known.

**Q3 (R6, S5).** Does the pointer preview stay over a keyboard commit?

- (a) No: clear the preview on a commit that is not a pointer action. `rating.tsx:100-101` scopes the preview to a click ("so that click previews its result like every other one does"). Recommended.
- (b) Yes: the preview "stands in for the value while the pointer is over the row" (`:198-199`); R6 is refuted.

Answer (2026-10-15, the reader): "Proceed as recommended." (a).

**Q4 (R7, S6).** Does a `readOnly` or `disabled` uncontrolled Rating follow a native reset?

- (a) Yes, as the TSDoc says (`:153-154`) and as Slider and Switch do while disabled. Recommended.
- (b) No: add Rating to the `COMPONENTS.md:22` exemption with a "while dead" note, and fix the TSDoc; R7 is refuted.

Answer (2026-10-15, the reader): "Proceed as recommended." (a).

**Settled from code in the overturn (no reader answer needed).**

- R1, a second pointer: filter by `pointerId`; a second finger grabs no handle, and the existing `isPrimaryPress` guard (`use-resizable-panel.ts:213`) stays, as `components/slider/range/use-range-pointer.ts:197-198` "A second finger grabs no thumb." The supersede by a second primary press stays, pinned by `use-resizable-panel.test.ts:598`.
- R4, a panel outside a group: supported, per `resizable-panel.tsx:34` and `context.ts:31-33`.
- R9, the documented extra `onChange`: a row, per `CONVENTIONS.md` §7.3 over the code comment (`CLAUDE.md` §3.5 ranks the repository rules first).
- R8, B05-C01 reopened: a row, under the standing rule (low, reach none).

## Ruled out

- **B01-C04** (`seedSizes` with weights summing to zero keeps zeros). `__tests__/components/use-resizable-panel.test.ts:528` `it('preserves panel defaults when their sum is zero', () => {`, `:531` "total=0 → the normalization branch returns `raw` untouched.", `:532` `expect(result.current.sizes).toEqual([0, 0])`. Deliberate and pinned. Negative weights are not judged (lead L2).

## Surfaced, not judged

- **L1 (verifier).** `use-resizable-panel.ts:213` `isPrimaryPress` refuses a second touch, which matches `use-range-pointer.ts:197`, but the startDrag comment `:236` describes "a second pointer landing on another handle". The comment overstates for touch.
- **L2 (verifier).** `seedSizes` with negative weights: `:118` keeps the raw weights; [−1, −1] traces to [0, −2].
- **L3 (verifier).** `DragState.rtl` is captured once (`:257`), the R2 shape for a `dir` flip.
- **L4 (verifier).** Rating uses the resolved id as the native radio `name` (`rating.tsx:379`); two Ratings that resolve one Field id share a native group. The R8 shape on Rating.
- **L5 (verifier).** Cross-component: Field-id consumers versus controls that put no element on that id (Rating, R5). A probe should check whether any Field, Form, or Message feature assumes an element with the Field id.
- **L6 (overturn).** A `readOnly` Rating in a native `<form>` renders no input (`rating.tsx:284`), so it submits no value; a read-only Radio "submits its value when it is checked" (`radio.tsx:14`), and Slider keeps its input. Related to R7 and Q4.
- **L7 (overturn).** Cross-component: `CheckboxGroup` opens no Control scope either (`checkbox/checkbox-group.tsx:25`), so bare Checkboxes in a CheckboxGroup inside a Field would show the R8 shape. Probe both groups with S7.
