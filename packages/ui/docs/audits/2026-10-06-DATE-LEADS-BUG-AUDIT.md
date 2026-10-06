# Bug audit — 2026-10-06 (date-entry leads)

This audit judges the eleven leads that the batch 1 bug audit of the D components (DateInput and DatePicker, #2014) surfaced and did not judge. One scope, 11 files, 3,125 lines, 11 claims. Five findings stay open (four confirmed, one narrowed); six claims are ruled out.

## Scope

The area is the file of each lead, plus `use-calendar-month.ts`, which L8 names beside the toolbar. It leaves out the tests, the benchmarks, and the demo tree; the verifier reads the demos as a consumer root. The claims came from the lead list, not from a sweep, so no file needed a fresh read.

| Scope | Theme | Files | Lines | Claims |
| --- | --- | --- | --- | --- |
| B01 | Date entry: grid entry, focus return, field commit | 11 | 3,125 | 11 |

Files: `hooks/use-floating-ui.ts` (668), `components/calendar/use-calendar-focus.ts` (483), `components/calendar/calendar.tsx` (438), `components/calendar/calendar-range.tsx` (203), `components/calendar/calendar-toolbar.tsx` (63), `components/calendar/use-calendar-month.ts` (141), `components/date-picker/date-picker-calendar-button.tsx` (41), `components/date-picker/date-picker-content.tsx` (193), `components/date-picker/date-picker-relative-utilities.ts` (374), `components/date-picker/use-date-picker-keyboard.ts` (448), `components/date-input/use-date-input-override.ts` (73). All paths are under `packages/ui/src`.

Intent sources: `CONVENTIONS.md` §3.6, §3.9, §7.2, §7.3, §11.3; `packages/ui/REFERENCE.md` §2; the TSDoc, comments, and tests. Consumer roots: `apps/admin`, `apps/places`, `packages/ui/src/docs/pages`, `packages/ui/src/modules`, `packages/ui/src/layouts`, the shipped defaults; `packages/ui/src/__tests__` as a weaker root.

## Method

The caller turned each lead into a claim record and stripped the evidence block with code. One blind `bug-verifier` pass judged all eleven claims, then an overturn pass re-read them with the evidence, the open audits, the surface docs, and the browser tests. With one scope, the merge pass had nothing to join. Coverage: 11 of 11 files opened; no claim UNLOCATED. The prior-art digest was empty for behavior: the four open audits (2026-09-28 CHART, CLEANUP, DOCS-SITE; 2026-09-30 IOS-TOUCH-HOLD-SELECTION) touch date-picker only for density and demo text.

| Pass | In | Out |
| --- | --- | --- |
| Frame | 11 leads | 11 claims, 1 scope |
| Blind verify | 11 stripped claims | 4 CONFIRMED, 1 NARROWED, 6 REFUTED |
| Overturn | sheet + evidence | 11 UPHELD; S1 corrected; C04 guard amended |

## Findings

By severity: medium 2 (C06, C09), low 3 (C01, C03, C07). By reach: shipped 4, docs-only 1 (C07).

Status: `◯ OPEN` → `◐ FIXED` on a branch → `✅ RESOLVED ([#NNN](…))`.

| Row | File | Symbol | Verdict | Severity | Reach | Group | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C06 | `use-date-picker-keyboard.ts` | `getInitialActiveDate` | CONFIRMED | medium | shipped | G1 | ◐ FIXED |
| C09 | `date-picker-content.tsx` | dialog focus reclaim | CONFIRMED | medium | shipped | G1 | ◯ OPEN |
| C01 | `use-floating-ui.ts` | `returnFocusTo` restore | CONFIRMED | low | shipped | — | ◐ FIXED |
| C03 | `date-picker-calendar-button.tsx` | `DatePickerCalendarButton` | NARROWED | low | shipped | — | ◐ FIXED |
| C07 | `use-calendar-focus.ts` | `handleHeaderKeyDown` / `handleFooterKeyDown` | CONFIRMED | low | docs-only | G1 | ◯ OPEN |
| C12 | `use-calendar-focus.ts` | `handleGridKeyDown` (steered) | NARROWED | low | shipped | G1 | ◯ OPEN |

## Mechanisms

### C06 — the first arrow with no highlight enters in the value's month

- **File:** `packages/ui/src/components/date-picker/use-date-picker-keyboard.ts`
- **Mechanism:** `:89-92` `const getInitialActiveDate = useCallback(() => clampDate(anchor ?? new Date(), min, max), …)`; `:200-203` `if (isArrowKey(event.key)) { … ctx.setActive({ zone: 'grid', date: ctx.getInitialActiveDate() })`. A click on Next month moves only the Calendar's view (`use-calendar-month.ts:96-98` `setViewDate((prev) => stepMonth(prev, 1))`), focus stays (`date-picker-content.tsx:180` `onMouseDown={(event) => event.preventDefault()}`), and `active` stays `null`. The new grid date re-anchors the view (`use-calendar-month.ts:114` `const gridMoved = activeGridDate !== anchors.activeGridDate`; `:122-124` `reanchor(activeGridDate, viewDate) … if (next) setViewDate(next)`).
- **Trigger:** a DatePicker with a value in month M; click Next month (or Tab to Next and press Enter); press an arrow. The view snaps back to M.
- **Documented intent:** in conflict. Internal: `use-date-picker-keyboard.ts:71-73` "`getInitialActiveDate` starts the arrows on `anchor`, else on today, and `min` and `max` bound it.", pinned by `use-date-picker-keyboard.test.ts:163-168`. Public: `calendar.tsx:59-61`, a parent reads `getEntryDate` "because the month buttons, the month picker, and the Page keys can move the shown month away from the value". Q1 decides.
- **Reach:** shipped. `apps/places/src/components/place-form-drawer/place-form-drawer.tsx:284`, `packages/ui/src/modules/query/query-builder/query-builder-rule-value.tsx:192`, and the date-picker docs pages.
- **Severity:** medium, if Q1 answers "shown month". If Q1 answers "value's day", the row is ruled out as deliberate.
- **Prior art:** none.

### C09 — an arrow from a Tab-focused header or footer button

- **File:** `packages/ui/src/components/date-picker/date-picker-content.tsx`
- **Mechanism:** the Calendar wires its header handler even when a parent steers it (`calendar.tsx:403` `onHeaderKeyDown={handleHeaderKeyDown}`); the handler calls `preventDefault` and focuses a day (`use-calendar-focus.ts:428-430`). The dialog then reclaims focus (`date-picker-content.tsx:147-148` `if (ARROW_KEYS.has(event.key) && event.target !== event.currentTarget) { event.currentTarget.focus() }`). (a) Input mode: `date-picker.tsx:339-341` `composeEventHandlers(onDialogKeyDown, onTriggerKeyDown)` and `compose-event-handlers.ts:41` `if (!checkForDefaultPrevented || !event.defaultPrevented) ours(event)`. The model never sees the key, focus ends on the dialog container, and the highlight does not move. (b) Button mode: the model runs, but with `active === null` it enters on the anchor (C06), and with a stale grid `active` it steps ±7 from the old highlight (`use-date-picker-keyboard.ts:224-228`, `:243`). Only `active.zone === 'header' | 'footer'` reaches `getViewEntryDate` (`:282`, `:335`); Tab never sets `active`.
- **Trigger:** open the picker, Tab to a header (or footer) button (`date-picker.test.tsx:1228-1230`, `:1250-1252`), press ArrowDown (ArrowUp).
- **Documented intent:** `date-picker-content.tsx:142-143` "Navigation keys belong to the virtual model even when the user has Tabbed onto a control inside."; `use-date-picker-keyboard.ts:256-257` "Down enters the grid in the shown month"; `date-picker.tsx:239` "A keyboard user therefore never loses the field."
- **Reach:** shipped, every calendar DatePicker (sites of C06); input mode adds the sites of C01.
- **Severity:** medium.
- **Prior art:** none.

### C01 — the focus return of an input-mode picker lands on a button

- **File:** `packages/ui/src/hooks/use-floating-ui.ts`
- **Mechanism:** `:383` `if (prevOpenRef.current && !open && reason !== 'outside-press' && reason !== 'focus-out') {`; `:389-390` `if (trigger && !trigger.contains(document.activeElement))` / `(trigger.querySelector<HTMLElement>('button, [tabindex]') ?? trigger).focus()`. In input mode `returnFocusTo` is the wrapper div (`use-date-picker-floating.ts:41` `returnFocusTo: triggerRef,`; `date-picker.tsx:383-385` `<div data-slot="control" ref={setReference}`). The `<input>` has no `tabindex`, so the first match is the Clear button, else the calendar button (`date-input.tsx:448-452` `{clear}{suffix}`). `closeCalendar` passes no reason (`use-date-picker-state.ts:129-130`).
- **Trigger:** Tab into the dialog, press Escape; or Tab to Today or Clear and press Enter.
- **Documented intent:** `date-picker.tsx:44` "Opening keeps focus on the input."; `:239` "A keyboard user therefore never loses the field." The hook's generic rule (`use-floating-ui.ts:273-274` "A non-focusable wrapper hands focus to its first `button`/`[tabindex]` descendant instead.") is not a DatePicker choice; `:277-279` covers only focus already inside the wrapper.
- **Reach:** shipped. `date-picker-relative.tsx:171`, `:186` via `apps/places/src/components/place-filters/place-filters.tsx:151`; docs `typed-input.tsx:8`, `editor-types.tsx:54`. The other `returnFocusTo` consumers (listbox `listbox.tsx:275`, color `use-color-picker-state.ts:132`, `use-floating-disclosure.ts:136`; menu-sub opts out at `:313`; Combobox has none) hold no text input in the reference.
- **Severity:** low. Focus lands one Shift+Tab from the field.
- **Prior art:** none.

### C03 — a mouse click on the calendar button blurs a partial entry

- **File:** `packages/ui/src/components/date-picker/date-picker-calendar-button.tsx`
- **Mechanism:** `:29-37` `<Button type="button" … onClick={onActivate}>`, with no `onMouseDown`. Compare `date-input.tsx:434-436` "Keep focus on the input: a blur here would run the field's commit-on-blur over a partial entry before the clear lands." / `onMouseDown={(event) => event.preventDefault()}`. The blur handler (`date-input.tsx:326-338`) runs `settle(undefined, true)` on a partial entry and `setTouched()`.
- **Trigger:** type a partial date in an input-mode picker, click the calendar button.
- **Documented intent:** `date-picker.tsx:44` "Opening keeps focus on the input."
- **Reach:** shipped, the sites of C01.
- **Severity:** low. A spurious invalid message and an early touched mark.
- **Prior art:** none.

### C07 — header ArrowDown in a standalone Calendar enters on the first day

- **File:** `packages/ui/src/components/calendar/use-calendar-focus.ts`
- **Mechanism:** `:427-430` `if (event.key === 'ArrowDown') { preventAndStop(event, stopPropagation) firstButton(gridRef.current)?.focus()`; `:465-468` `if (event.key === 'ArrowUp') { … lastButton(gridRef.current)?.focus()`. Both ignore `DAY_TAB_STOP` (`:40-41`) and `dayTabStop` (`:56-67`).
- **Trigger:** standalone Calendar with a selected day mid-month; focus a header button; press ArrowDown. The footer half is reached only inside the picker (`calendar.tsx:139-141`), under C09.
- **Documented intent:** `calendar.tsx:54-56` "The day where the focus enters the day grid … It is the day that holds the Tab stop of the grid." The test `use-calendar-focus.test.ts:52` pins first-button entry on a fixture with no selected day, so it pins the fallback only.
- **Reach:** docs-only (`docs/pages/components/calendar/playground.tsx:4`, `min-and-max.tsx:5`, `locale.tsx:4`, `controlled.tsx:10`, `range.tsx:28`).
- **Severity:** low.
- **Prior art:** none.

### C12 — an arrow from a Tab-focused day in a steered grid

- **File:** `packages/ui/src/components/calendar/use-calendar-focus.ts`
- **Mechanism:** steered turns off only the day-grid model (`calendar.tsx:318-320` `() => (steered ? undefined : { days, min, max, navigateTo }),`); the header and footer handlers bail (`use-calendar-focus.ts:454` `if (steered) return`), but `handleGridKeyDown` has no guard: `:475-477` `const handled = dayGrid ? moveDay(...) : crossZoneEdge(event, headerRef.current, gridRef.current, footerRef?.current ?? null, cols)`, `:479-480` `if (handled) { preventAndStop(event, stopPropagation)`, `:485` `gridRoving(event)`. The grid keeps a roving Tab stop (`calendar.tsx:323-329` passes no `gridMounted`; default `use-calendar-focus.ts:435` `gridMounted = true,`), so Tab inside the modal trap reaches a day. In input mode `compose-event-handlers.ts:41` `if (!checkForDefaultPrevented || !event.defaultPrevented) ours(event)` then skips the model, and the reclaim moves focus to the input: the arrow is lost.
- **Trigger:** an input-mode DatePicker is open; Tab through the header to the day Tab stop; press an arrow (or ArrowUp on the top row, ArrowDown on the bottom row).
- **Documented intent:** `date-picker-content.tsx:144-145` "Navigation keys belong to the virtual model even when the user has Tabbed onto a control inside."
- **Reach:** shipped, the input-mode sites of C01. Button mode is not reached: the model steps once from its own state (`date-picker.test.tsx:781`).
- **Severity:** low. One lost key per Tab into the grid.
- **Prior art:** C09(a) and S1 cover the same seam for the header and footer only.

Raised by the caller from the `simplify` review; judged by a blind verify pass. Dropped parts: "the highlight moves twice" (the DOM move and the reclaim are one dispatch, and the visible highlight is the model's `active`); the mouse-press trigger (`date-picker-content.tsx:184` `onMouseDown={(event) => event.preventDefault()}`); Page keys (roving does not handle them).

## Root-cause groups

- **G1 — keyboard grid entry (C06, C07, C09, C12).** The day grid has three entry rules: the Calendar's header and footer handlers take the first or last button and fire even when a parent steers; the picker's no-highlight arrows take the anchor; only the picker's header and footer zones take `getEntryDate`.
- **Independent:** C01, C03.

## Recommended resolution

### S1 — one entry rule in the Calendar's header and footer handlers

- **Change:** add `steered?: boolean` to `CalendarFocusOptions` in `use-calendar-focus.ts`; `calendar.tsx` passes its `const steered = active !== undefined` into `useCalendarFocus`. The month/year picker (`use-calendar-picker.tsx:119-126`) passes nothing and stays unsteered. When steered, the header and footer handlers leave every key to the parent: no focus move and no `preventDefault`. This covers ArrowDown and ArrowUp, and also Left and Right, which today go through `headerRoving` and `focusAdjacentFooterButton` → `preventAndStop` (`use-calendar-focus.ts:378`, `:435`) and so block the composed input-mode handler the same way (caller's extension of C09(a), per Q2). When not steered, header ArrowDown focuses `buttonsOf(gridRef.current).find((b) => b.matches(activeSelector)) ?? firstButton(gridRef.current)`; footer ArrowUp does the same with `lastButton`. Under Q4 the month picker's header ArrowDown then lands on the selected month (`SELECTED_CELL`, `use-calendar-picker.tsx:21`). Update the internal TSDoc of `useCalendarFocus` and the Calendar TSDoc that a standalone header ArrowDown now enters on the Tab-stop day (CLAUDE.md §3.4).
- **Rows closed:** C07; part of C09(a) (C09 closes with S2).
- **Files:** `components/calendar/use-calendar-focus.ts`, `components/calendar/calendar.tsx`, `__tests__/components/use-calendar-focus.test.ts`, `__tests__/components/use-calendar-picker.test.ts`, `__tests__/components/calendar.test.tsx`.
- **Order:** first.
- **Depends on:** none.
- **Gate:** none (Q4 settled).
- **Test seam:** `renderHook(useCalendarFocus)` with attached DOM refs. Steered: header ArrowDown/Left/Right and footer ArrowUp/Left/Right leave `preventDefault` uncalled and focus unchanged. Unsteered: header ArrowDown and footer ArrowUp focus the `aria-selected` button; `:52` and `:136` stay as the no-match fallbacks. Picker: focus "Previous year" in `OpenPickerGrid`, ArrowDown focuses the selected month. Calendar: standalone with a value mid-month, Next month + ArrowDown focuses the selected day.

### S2 — the picker enters the grid in the shown month

- **Change:** in `use-date-picker-keyboard.ts`, the `handleNoActiveKey` arrow branch (`:200-206`) enters on `ctx.getViewEntryDate()`, with the Q5 answer for `null`. Enter/Space with no highlight keeps `getInitialActiveDate()` (`:219`, pinned by `use-date-picker-state.test.ts:281-303`); Page keys keep their anchor seed (Surfaced 2). Under Q2, add `zoneOfTarget(event)` in the keyboard hook: when `event.target` is not `event.currentTarget` and sits in `[data-slot="calendar-header"]` or `[data-slot="calendar-footer"]`, it gives `{ zone, index }` by the target's index among that toolbar's buttons. Call it after `handleOpenGlobalKey` and before the `active === null` branch, `setActive(mapped)`, and dispatch on `mapped ?? active`. `CalendarToolbar` (internal) takes an optional slot and `CalendarHeader` passes `"calendar-header"`. In `date-picker-content.tsx`, the arrow reclaim focuses `focusRef.current ?? event.currentTarget` (`:121` `const focusRef = initialFocusRef ?? dialogRef`), so input mode returns focus to the input. Rewrite the internal TSDoc of the seeds (`:32-37`, `:71-78`, `:184-194`). Range shares the hook and its `getViewEntryDate` and needs no edit; relative runs its custom fields through `use-date-picker-state.ts` and needs no edit.
- **Rows closed:** C06, C09.
- **Files:** `components/date-picker/use-date-picker-keyboard.ts`, `components/date-picker/date-picker-content.tsx`, `components/calendar/calendar-toolbar.tsx`, `components/calendar/calendar-header.tsx`, `__tests__/components/use-date-picker-keyboard.test.ts`, `__tests__/components/use-date-picker-state.test.ts`, `__tests__/components/use-date-picker-range-state.test.ts`, `__tests__/components/date-picker.test.tsx`.
- **Order:** after S1.
- **Depends on:** S1 (input mode reaches the model from a header button only once S1 stops the `preventDefault`).
- **Gate:** Q5.
- **Test seam:** `use-date-picker-keyboard.test.ts` (rewrite `:163-173`; add the `null` case and the mapping cases with an attached dialog that holds the two slots); the `entering(...)` helper of the state and range tests; one input-mode integration case in `date-picker.test.tsx` (Tab to Next month, ArrowDown, highlight in the shown month, focus on the input).

### S3 — the focus return lands on the input

- **Change:** add `returnFocusTo?: RefObject<HTMLElement | null>` to `DatePickerFloatingOptions` and pass `returnFocusTo: returnFocusTo ?? triggerRef` (`use-date-picker-floating.ts:41`). `use-date-picker-state.ts` owns `inputRef`, passes `returnFocusTo: input ? inputRef : undefined`, and returns it; `date-picker.tsx` drops its local ref and uses the returned one (`:325`, `:357`, `:390`). `useFloatingUI` already focuses a ref with no descendants as itself (`use-floating-ui.ts:389-390`), Escape while typing still skips (focus is inside), and the outside-press and focus-out reasons still skip (`:383`). No public export changes; the shared hook and its test stay.
- **Rows closed:** C01.
- **Files:** `components/date-picker/use-date-picker-floating.ts`, `components/date-picker/use-date-picker-state.ts`, `components/date-picker/date-picker.tsx`, `__tests__/components/use-date-picker-state.test.ts`, `__tests__/components/date-picker.test.tsx`.
- **Order:** independent.
- **Depends on:** none.
- **Gate:** none (Q3 settled).
- **Test seam:** `renderHook(useDatePickerState({ input: true }))` with an input on `inputRef` inside a wrapper on `triggerRef` that holds a button; open, then `onOpenChange(false)`; the input has focus. Integration: Tab to Today, Escape, the input has focus.

### S4 — the calendar button keeps focus on the input

- **Change:** add `onMouseDown={(event) => event.preventDefault()}` to `DatePickerCalendarButton`, as `date-input.tsx:436` does.
- **Rows closed:** C03.
- **Files:** `components/date-picker/date-picker-calendar-button.tsx`, `__tests__/components/date-picker.test.tsx`.
- **Order:** independent.
- **Depends on:** none.
- **Gate:** none.
- **Test seam:** render the button alone; assert `fireEvent.mouseDown(button)` returns `false`.

### S5 — the entry key follows the grid's roving stop

- **Change:** in `use-calendar-focus.ts`, unsteered header ArrowDown and footer ArrowUp enter on the grid's `tabIndex=0` item while roving manages the Tab stop, else on the `activeSelector` match, else on the first or last item. Tab and the arrow then enter on the same day after a rove (Q9). The month picker keeps its Q4 result.
- **Rows closed:** C07.
- **Files:** `components/calendar/use-calendar-focus.ts`, `__tests__/components/use-calendar-focus.test.ts`, `__tests__/components/calendar.test.tsx`.
- **Order:** after S1–S4 and the `refactor(ui)` commits.
- **Depends on:** S1.
- **Gate:** none (Q9 settled).
- **Test seam:** `renderHook(useCalendarFocus)` with a roved `tabIndex=0` day that differs from the selected day.

### S6 — map only the keys that the dialog hands over

- **Change:** in `use-date-picker-keyboard.ts`, run `zoneOfTarget` only for arrow keys, the set that `date-picker-content.tsx` reclaims for (Q10).
- **Rows closed:** C09.
- **Files:** `components/date-picker/use-date-picker-keyboard.ts`, `__tests__/components/use-date-picker-keyboard.test.ts`.
- **Order:** after S5.
- **Depends on:** S2.
- **Gate:** none (Q10 settled).
- **Test seam:** Tab from a focused header button sets no zone.

### S7 — a focused day in a steered grid hands its keys to the model

- **Change:** `handleGridKeyDown` returns at once when steered (no focus move, no `preventDefault`), as S1 does for the header and footer. The picker maps a focused day button to `{ zone: 'grid', date }` before the model runs, as Q2 does for toolbar buttons, so an arrow steps from the focused day (Q8). Extend the `steered` TSDoc to name the grid handler. The test `date-picker.test.tsx:781` ("Materialize on the 15th…") changes its expectation.
- **Rows closed:** C12.
- **Files:** `components/calendar/use-calendar-focus.ts`, `components/date-picker/use-date-picker-keyboard.ts`, the day cell if it needs a date attribute (`components/calendar/calendar-day-cell.tsx`), `__tests__/components/use-calendar-focus.test.ts`, `__tests__/components/use-date-picker-keyboard.test.ts`, `__tests__/components/date-picker.test.tsx`.
- **Order:** after S6.
- **Depends on:** S1, S2.
- **Gate:** none (Q8 settled).
- **Test seam:** `renderHook(useCalendarFocus({ steered: true, … }))`, a focused day, ArrowRight: no `preventDefault`, focus unchanged. Integration: input-mode picker, `act(() => day.focus())`, ArrowRight, the highlight is the next day and focus is on the input.

## Open questions

### Q1 — where does the first arrow with no highlight enter?

Axes: the value's day (`use-date-picker-keyboard.ts:71-73`, its test) or the shown month's entry day (`calendar.tsx:59-61`). Value's day: C06 is ruled out as deliberate, and S2 shrinks to the Tab-focused case. Shown month: the internal TSDoc and the test change; no public export changes.

**Answer:** "Shown month". Enter on Calendar's `getEntryDate` for the shown month.

### Q2 — does a Tab-focused header or footer button act as the model's header or footer zone?

Axes: yes, the dialog maps the target to a zone before the model runs; or no, an arrow from a focused control always starts the grid at the entry day.

**Answer:** "Yes, map to zone". The dialog maps the focused button to the header or footer zone before the model runs.

### Q3 — fix the focus return in the shared hook or in DatePicker?

Axes: shared, the `returnFocusTo` TSDoc of an exported type changes and every wrapper-reference consumer changes (none holds a text input today); local, an internal option on `useDatePickerFloating`, no public change.

**Answer:** "Local in DatePicker". An internal return target on `useDatePickerFloating`; the shared hook and its test stay.

### Q4 — may S1 move the month picker's header ArrowDown to the selected month?

Axes: yes, it agrees with `focusPickerGrid` (`use-calendar-picker.tsx:128-134`); or no, S1 keeps the month picker on the first cell.

**Answer:** "Yes". One rule for both grids.

### Q5 — what does a no-highlight arrow do when the shown month has no enabled day?

Raised by the settle pass. `getEntryDate` returns `null` when the shown month has no enabled day (`calendar.tsx:63`). The view seeds from `monthOf(value ?? new Date())` unclamped (`use-calendar-month.ts:82`), so a shipped shape reaches it: the relative End field passes `min={state.custom.start ?? props.min}` (`date-picker-relative.tsx:189-193`). Axes: fall back to `getInitialActiveDate()`, so the view re-anchors to the clamped anchor as today; or do nothing, as header Down and footer Up do (C08). Only the `null` term of S2 and one test change.

**Answer:** "Fall back to anchor". Enter at `getInitialActiveDate()`, and the view re-anchors there.

### Q6 — what happens to `CalendarHandle.footerKeyDown` once a steered Calendar ignores its footer keys?

Raised by the S1 resolver. After S1 the member does nothing whenever the parent steers, and only steered parents call it (`use-date-picker-state.ts:305`, `use-date-picker-range-state.ts:286`). Axes: keep it, fix its TSDoc, and stop the internal pickers from calling it; remove it (a breaking change); or exempt it from `steered`, which conflicts with Q2.

**Answer:** "Keep, fix its TSDoc". S2 stops the internal calls and states in the TSDoc that the member does nothing while the parent steers.

### Q7 — may a calendar-button close move focus to the input?

Raised by the S3 resolver (Surfaced 1 and 7). After S3 the close from the calendar button carries no reason, so the restore moves focus from the button to the input. Axes: keep it and pin it with a test; or pass a reason so focus stays on the button.

**Answer:** "Keep, pin with a test". S2 adds the test.

### Q8 — what does a Tab-focused day in a steered grid do?

Raised by the C12 verify pass. Axes: map the focused day to the grid zone at its date; leave keys to the parent only (the model ignores the focused day, Home and End go dead); or take the steered grid out of the Tab order.

**Answer:** "Map day to zone". One rule for all three zones.

### Q9 — does header ArrowDown follow the roving stop or the `activeSelector` match?

Raised by the `simplify` review. After a rove off the selected day, Tab enters on the roved day and S1's ArrowDown on the selected day. Axes: follow the roving stop; or keep `activeSelector` and fix the TSDoc.

**Answer:** "Follow the rove stop".

### Q10 — does the zone mapping run for every key or only for arrows?

Raised by the `simplify` review. The dialog reclaims focus only for arrows, but S2 maps every key, so Tab from a header button may paint the highlight on the button it leaves. Axes: arrows only; or every key.

**Answer:** "Arrows only".

## Ruled out

- **C02** (Calendar's backward edge at year 1): `use-calendar-focus.ts:313-314` "A step back before year 1 stays at the limit too." / `if (!isYearInRange(date.getFullYear())) return true`. The library flips the era before it clamps (`@internationalized/date` `GregorianCalendar.ts:144-148`, `manipulation.ts:70-72`), so the step gives year 0 and the guard holds.
- **C04** (override echo after a refused commit): the documented rule, `use-date-input-override.ts:36-38` "A change is from outside unless it falls on the day that the field committed after the last change that it saw." A parsed commit on day X shows the same text as a parent value on X (`date-input.tsx:177`, `:202`). The overturn pass found an empty-commit variant (see Surfaced), with no reach.
- **C05** (`addDays` / `addMonths` year clamp): `now` is the clock (`use-date-picker-relative-state.ts:128`, `:144`), the presets step backward only, and a step back past year 1 flips the era rather than clamping.
- **C08** (toolbar paging past `min`/`max`): deliberate. `calendar.test.tsx:1070-1083` "gives null when the shown month holds no enabled day"; `calendar.tsx:63` "@returns The day, or `null` when the shown month holds no enabled day."; `use-date-picker-keyboard.ts:255-258` "When the shown month holds no enabled day, Down does nothing." The header buttons call the same stepper as the ref (`calendar.tsx:414-415`, `:343-344`). C08 changes neither C06 nor C09: both fail inside the range.
- **C10** (`getEntryDate` calls `getDayProps` outside render): `calendar.tsx:134` "Per-cell decorator invoked for every day" makes no render-only promise, and no root builds a `getDayProps` with side effects.
- **C11** (hover preview as entry day): documented. `calendar-range.tsx:38-40`, `:127-131` mark the preview end selected; `calendar.tsx:57-59` picks the earliest selected day, so the stated trigger enters on `rangeStart`.
- **C03, dropped parts:** "the full text commits on blur" (it commits on the keystroke, `date-input.tsx:319`); "focus leaves the input" as an end state (`date-picker.tsx:357` `initialFocusRef={input ? inputRef : undefined}`).

## Surfaced, not judged

1. A click on the calendar button that closes an input-mode picker leaves focus on the button: the restore skips it because it sits inside the wrapper (`use-floating-ui.ts:389`). Verifier.
2. Page keys with no highlight also seed from the anchor (`use-date-picker-state.ts:116` `const base = active?.zone === 'grid' ? active.date : getInitialActiveDate()`). Adjacent to Q1. Verifier.
3. The `stepDate` comment `date-picker-utilities.ts:68-69` ("a step back from 1 January 0001 goes to December 0001") does not match the library path (BC era, then year 0). Verifier.
4. A `useFloatingDisclosure` consumer whose trigger wraps a text input would hit the C01 selector. Not probed. Verifier.
5. CalendarRange marks the hover-preview day selected, so it may carry `aria-selected` during hover. Verifier.
6. Empty-commit echo: `commit` records `undefined` for a partial entry (`date-input.tsx:265-266`) and `isSameDay(undefined, undefined)` is true (`date-input-utilities.ts:321-323`). A controlled parent that ignores `undefined`, then clears from outside, leaves the partial text. No shipped root builds it. Overturn pass.
7. After S3, a close from the calendar button carries no reason, so the restore moves focus from the button to the input. This changes item 1. Settle pass.
