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
| C06 | `use-date-picker-keyboard.ts` | `getInitialActiveDate` | CONFIRMED | medium | shipped | G1 | ◯ OPEN |
| C09 | `date-picker-content.tsx` | dialog focus reclaim | CONFIRMED | medium | shipped | G1 | ◯ OPEN |
| C01 | `use-floating-ui.ts` | `returnFocusTo` restore | CONFIRMED | low | shipped | — | ◯ OPEN |
| C03 | `date-picker-calendar-button.tsx` | `DatePickerCalendarButton` | NARROWED | low | shipped | — | ◯ OPEN |
| C07 | `use-calendar-focus.ts` | `handleHeaderKeyDown` / `handleFooterKeyDown` | CONFIRMED | low | docs-only | G1 | ◯ OPEN |

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

## Root-cause groups

- **G1 — keyboard grid entry (C06, C07, C09).** The day grid has three entry rules: the Calendar's header and footer handlers take the first or last button and fire even when a parent steers; the picker's no-highlight arrows take the anchor; only the picker's header and footer zones take `getEntryDate`.
- **Independent:** C01, C03.

## Recommended resolution

### S1 — one entry rule in the Calendar's header and footer handlers

- **Change:** add an explicit steered signal to `useCalendarFocus` (for example a `steered` option that `calendar.tsx` passes from `active !== undefined`). When steered, header ArrowDown and footer ArrowUp do nothing and do not call `preventDefault`. When not steered, focus the item that matches `activeSelector`, else the first item (ArrowDown) or the last item (ArrowUp). `dayGrid === undefined` is not the signal: the month/year picker passes no `dayGrid` and is not steered (`use-calendar-picker.tsx:119-126`).
- **Rows closed:** C07, C09(a).
- **Files:** `components/calendar/use-calendar-focus.ts`, `components/calendar/calendar.tsx`, `__tests__/components/use-calendar-focus.test.ts`; re-check `components/calendar/use-calendar-picker.tsx`.
- **Order:** first.
- **Depends on:** none.
- **Gate:** Q4 (the month picker's header ArrowDown moves to the selected month).
- **Test seam:** `renderHook(useCalendarFocus)` with DOM refs and a synthetic keydown; assert the focused button, and `defaultPrevented` false when steered.

### S2 — the picker enters the grid in the shown month

- **Change:** route the no-highlight arrow entry, and an arrow from a DOM-focused header or footer control, to `getViewEntryDate`.
- **Rows closed:** C06, C09(b).
- **Files:** `components/date-picker/use-date-picker-keyboard.ts`, possibly `components/date-picker/date-picker-content.tsx`, `__tests__/components/use-date-picker-keyboard.test.ts`; re-check `components/date-picker/use-date-picker-range-state.ts`.
- **Order:** after S1.
- **Depends on:** S1.
- **Gate:** Q1, Q2.
- **Test seam:** `use-date-picker-keyboard.test.ts` injects `getViewEntryDate` and `entryDate` (`:16`, `:279-289`).

### S3 — the focus return lands on the input

- **Change:** in input mode, return focus to the editable input.
- **Rows closed:** C01.
- **Files:** shared option, `hooks/use-floating-ui.ts` and `__tests__/hooks/use-floating-ui.test.ts`; local option, `components/date-picker/use-date-picker-floating.ts` and `components/date-picker/date-picker.tsx`.
- **Order:** independent.
- **Depends on:** none.
- **Gate:** Q3.
- **Test seam:** none synchronous unless the target choice becomes a pure function (`restoreTarget(trigger)`); otherwise a browser test.

### S4 — the calendar button keeps focus on the input

- **Change:** add `onMouseDown={(event) => event.preventDefault()}` to `DatePickerCalendarButton`, as `date-input.tsx:436` does.
- **Rows closed:** C03.
- **Files:** `components/date-picker/date-picker-calendar-button.tsx`, `__tests__/components/date-picker.test.tsx`.
- **Order:** independent.
- **Depends on:** none.
- **Gate:** none.
- **Test seam:** render the button alone; assert `fireEvent.mouseDown(button)` returns `false`.

## Open questions

### Q1 — where does the first arrow with no highlight enter?

Axes: the value's day (`use-date-picker-keyboard.ts:71-73`, its test) or the shown month's entry day (`calendar.tsx:59-61`). Value's day: C06 is ruled out as deliberate, and S2 shrinks to the Tab-focused case. Shown month: the internal TSDoc and the test change; no public export changes.

### Q2 — does a Tab-focused header or footer button act as the model's header or footer zone?

Axes: yes, the dialog maps the target to a zone before the model runs; or no, an arrow from a focused control always starts the grid at the entry day.

### Q3 — fix the focus return in the shared hook or in DatePicker?

Axes: shared, the `returnFocusTo` TSDoc of an exported type changes and every wrapper-reference consumer changes (none holds a text input today); local, an internal option on `useDatePickerFloating`, no public change.

### Q4 — may S1 move the month picker's header ArrowDown to the selected month?

Axes: yes, it agrees with `focusPickerGrid` (`use-calendar-picker.tsx:128-134`); or no, S1 keeps the month picker on the first cell.

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
