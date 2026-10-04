# C Components Audit — 2026-10-04

**Lens:** correctness defects in the components whose names start with C: Calendar, Card, Checkbox, Code, Collapse, Color, Combobox, CommandPalette, Confirm, ContextMenu, Control, CopyButton, CreditCardInput, and CurrencyInput. The modules `chart` and `chat` and the structure `container` are out of scope.

**Method:** seven read-only sweeps, scopes C1 to C7, one for each group of components and the kata that the group reads. Each sweep read every line of its scope and returned claims with a trigger, a wrong result, and the contract that the claim breaks. A Chromium probe ran 19 of the claims and reproduced 16. Node 22 with ICU 77.1 checked the locale data of three CurrencyInput claims.

**State:** paused at the request of the owner. The blind verification pass started and was stopped before it returned. Read the **Check** cell of each row:

- **Chromium** or **ICU**: the probe reproduced the claim.
- **Not reproduced**: the probe did not show the wrong result. The note gives the case that the probe ran.
- **—**: a sweep claim that still needs a verdict.

**Severity** is the guess of the sweep: H (high), M (medium), L (low), or a pair such as LM.

**Status:** each fixed row cites the pull request that closes it (CONVENTIONS.md §12.4).

## To resume

1. Run the blind verification again, one `bug-verifier` for each scope, on the rows with **—**.
2. Ask the owner for the decisions in the open questions below.
3. Fix in groups for each component, with a test that fails first. The Chromium rows are the first candidates.

## Open questions

- C7-C22, C7-C23, and C7-C24 change the values that CurrencyInput emits in some locales. A fix takes the separators and the minus sign from one formatter.
- C1-C07 changes the Tab order of Calendar from one stop for each day to one stop for each zone. `calendar-picker-trap.test.tsx` depends on the current order.
- C6-C08 removes the clip of an open Collapse panel at rest. A child that overflows the panel then shows.
- C4-C04, C4-C14, and C2-C12 have roots in shared hooks (see the leads), so a fix reaches other components too.

## C1. Calendar

| ID | Where | Finding | Proposed change | Sev | Check | Status |
|---|---|---|---|---|---|---|
| C1-C01 | `calendar/calendar-range.tsx` (CalendarRange) | With `hoverDate` wired and no `rangeStart`, the hovered day renders as a selected endpoint: solid fill and `aria-selected`. | Treat `hoverDate` as an endpoint only when `rangeStart` is set. | L | — | Open |
| C1-C02 | `calendar/calendar-skeleton.tsx` | In an `xs` scope, the skeleton rows take the `xs` button height (22px). Calendar snaps to `sm` (30px), so the swap shifts the layout by about 56px. | A row ramp whose `xs` value equals `sm` in `kiso/kokkaku/calendar.ts`. | LM | — | Open |
| C1-C03 | `calendar/calendar-utilities.ts` (`fromCalendarDate`) | It reads `getLocalTimeZone()` of `@internationalized/date`, which caches the zone and which `setLocalTimeZone` overrides. The other readers use the runtime zone. With a UTC override in New York, the grid shows the wrong month and "Next month" does nothing. | Build the `Date` in the runtime zone: `new Date(y, m - 1, d)`. | M | — | Open |
| C1-C04 | `calendar/calendar.tsx` (density) | Server render with a stored root step of `xs`: the server and the hydration render open no scope, so the rows paint at `xs`. The client then opens `sm`, and the layout shifts after the first paint. | Snap in CSS for the root case, with cell ramps whose `xs` value equals `sm`. | LM | — | Open |
| C1-C05 | `calendar/calendar.tsx` (locale) | With no `locale` and no `LocaleProvider`, a server in `en-US` and a browser in `de-DE` render different weekday rows and month labels. Hydration reports a mismatch. | Render a fixed tag until hydration when no locale is set. | M | — | Open |
| C1-C06 | `calendar/calendar.tsx` | A bound Calendar, or one with `value={null}`, ignores `defaultValue` for the selection. But the view still opens on the month of `defaultValue`. | Give `defaultValue` to the month hook only when the Calendar is uncontrolled and unbound. | L | — | Open |
| C1-C07 | `calendar/use-calendar-focus.ts` | The roving hook runs with no `manageTabIndex`, so each day and each picker option is a Tab stop. | `manageTabIndex: true` for the header and the grid, with an active selector for the selected or current day. | M | Chromium: 34 Tab presses cross one calendar | Open |
| C1-C08 | `calendar/use-calendar-focus.ts` (grid keys) | The arrow keys wrap inside the month: ArrowRight on June 30 goes to June 1. The month does not change, and `onMonthChange` does not fire. | Step the month at the edge, then focus the matching day. | M | Chromium | Open |
| C1-C09 | `calendar/use-calendar-focus.ts` | PageUp, PageDown, and Shift+PageDown do nothing. | Handle them through the month steppers; Shift steps a year. | L | — | Open |
| C1-C10 | `calendar/use-calendar-focus.ts` | Home and End go to the first and the last day of the month, not of the week row. | Map Home and End to the bounds of the row. | L | — | Open |
| C1-C11 | `calendar/use-calendar-month.ts` | A seed `Date` at UTC midnight from a server reads as the day before in a browser west of UTC. The month and the selection do not match at hydration. | Gate the seeded month and the selection on hydration, or document a local-midnight seed. | M | — | Open |
| C1-C12 | `calendar/use-calendar-month.ts` (`active`) | `active.date` compares by identity. A parent that builds a new `Date` on each render snaps the view back after each chevron press. | Compare by day, or document the identity rule on `active`. | L | — | Open |
| C1-C13 | `calendar/use-calendar-picker.tsx` | Under `ar-EG`, the year and decade labels use Latin digits, and the rest of the calendar uses Arabic-Indic digits. | Give the picker the locale tag, and format years with `Intl.NumberFormat(locale, { useGrouping: false })`. | L | — | Open |
| C1-C14 | `recipes/kata/calendar.ts` (`day.range`) | The range edges use the physical `rounded-r-none` and `rounded-l-none`. In RTL, the endpoints square the wrong corners and come off the band. | `rounded-e-none` and `rounded-s-none`, with start and end names. | M | Chromium: the RTL start keeps its band-side corners round | Open |

## C2. Combobox

| ID | Where | Finding | Proposed change | Sev | Check | Status |
|---|---|---|---|---|---|---|
| C2-C01 | `combobox/combobox-create-option.tsx` | The create row takes its value from the deferred query. Enter before the deferred render commits creates the lagging text, such as "Berli". | Commit the live trimmed query; keep the deferred text for the render. | LM | — | Open |
| C2-C02 | `combobox/combobox-input.tsx` | The native `required` checks the query text, not the selection. A form submits with no selection when the input holds text. | Set the validity from the selection with `setCustomValidity`. | LM | — | Open |
| C2-C03 | `combobox/combobox-input.tsx` | `capitalize` also rewrites the text of `summarize`: "iOS devices: 2" shows as "IOS devices: 2". | Capitalize only the result of `displayValue`. | L | — | Open |
| C2-C04 | `combobox/combobox-panel.tsx` | A press on the panel padding, a gap, or the "No results" text moves DOM focus into the panel. Typing stops, and Escape or Enter leaves focus on `<body>`. | Cancel `mousedown` on the floating wrapper, except on a focusable control. | M | — | Open |
| C2-C05 | `combobox/combobox-panel.tsx` | An inline ref callback runs `scrollToSelected` on each render when the compiler is off. The panel scrolls back to the first selected option. | `useCallback`, or scroll once for each open. | ML | — | Open |
| C2-C06 | `combobox/combobox-utilities.ts` (`resolveInputTitle`) | A `multiple` Combobox with no `displayValue` has no `title` on hover, although the TSDoc of `summarize` promises one. | Fall back to `String(v)`, or narrow the TSDoc. | L | — | Open |
| C2-C07 | `combobox/combobox.tsx` | In a `<fieldset disabled>`, the chevron opens the panel and an option click commits a value. | Lock the Combobox when the input matches `:disabled`. | ML | — | Open |
| C2-C08 | `combobox/combobox.tsx` (`reanchorOnOptionSwap`) | With `VirtualOptions`, a scroll or async rows seed row 0 when nothing is active (index -1). The list snaps to the top, and a later Enter selects row 0. | Re-anchor only when the active index is past the end of the source. | M | — | Open |
| C2-C09 | `combobox/combobox.tsx` (`reanchorOnOptionSwap`) | Async options that are not virtual get no highlight when they mount after the query change. A create row that renders first keeps the highlight when the matches arrive. | Re-seed when options appear with no active id for the current query, or above the active row. | ML | — | Open |
| C2-C10 | `combobox/combobox.tsx` | With `VirtualOptions`, the arrow keys cannot reach a create row while a match exists. | Let the source count the trailing DOM options. | ML | — | Open |
| C2-C11 | `combobox/combobox.tsx` | An outside press closes the panel through `setOpen(false)`, not `close()`. The input keeps the query in the editing state. | Close through `close()`. | LM | — | Open |
| C2-C12 | `combobox/combobox.tsx` | Escape that cancels an IME composition closes the panel. | Skip a composing event in `useEscapeLayer` (see the leads). | LM | — | Open |
| C2-C13 | `combobox/combobox.tsx` (`seatOnArrowOpen`) | An arrow-key open seats index 0 of a virtual source even when `isDisabled(0)` is true. | Seat the first index that is not disabled. | L | — | Open |
| C2-C14 | `combobox/combobox.tsx` | The input takes `aria-labelledby` over `aria-label`, against the TSDoc ("`aria-label` wins over it"). | Leave out `aria-labelledby` on the input when `aria-label` is set. | L | — | Open |
| C2-C15 | `combobox/combobox.tsx` | `clearable` shows no clear button when a `suffix` is set. | Render the clear button beside the suffix, or document the rule. | L | — | Open |
| C2-C16 | `combobox/combobox.tsx` | The default `autoComplete="off"` wins over the `autoComplete` of a Control. | `autoComplete ?? control?.autoComplete ?? 'off'`. | L | — | Open |
| C2-C17 | `combobox/combobox.tsx` | `nullable` reads the current controlled value, so a controlled Combobox never clears on a click of the selected option. | Take the default from the channel at mount. | L | — | Open |
| C2-C18 | `combobox/combobox.tsx` | A `readOnly` Combobox still runs `onPaste`, so the documented paste recipe commits values. | Skip `onPaste` while the Combobox is locked. | L | — | Open |
| C2-C19 | `combobox/use-combobox-input.ts` | Claim: in a Dialog, one Escape closes the panel and the Dialog. | Cancel the Escape event before `close()`. | MH | Not reproduced: in Chromium, Escape closed only the panel | Open |
| C2-C20 | `combobox/use-combobox-input.ts` | Enter in the 150 ms close animation clicks the closing list again. It can clear the value or commit a dismissed option. | Run the Enter branch and the roving keys only while the panel is open. | M | — | Open |
| C2-C21 | `combobox/use-combobox-input.ts` | On an uncontrolled single Combobox, Enter on the selected option clears it. | Enter on the selected option closes the panel and keeps the value. | ML | — | Open |
| C2-C22 | `combobox/use-combobox-input.ts` | `onOpenChange` fires with `true` on each keystroke while the panel is open, and twice with `false` for one close. | Report only a change of state. | L | — | Open |
| C2-C23 | `combobox/use-combobox-input.ts` | On touch, a pending open runs after the input lost focus, and the panel stays open. | Open only when the input still has focus. | L | — | Open |
| C2-C24 | `combobox/use-combobox-input.ts` | `clearOnEmpty` does nothing under `multiple`. | Clear to `[]`, or document single mode. | L | — | Open |
| C2-C25 | `combobox/use-combobox-state.ts` (`select`) | After a pick in a `multiple` Combobox, the next keystroke adds to the display ("Appleu"). It does not replace it. | Select the text after the commit. | M | Chromium | Open |
| C2-C26 | `combobox/use-combobox-state.ts` | With a controlled `open` held true, the menu query and the selection stay frozen after a blur or a pick. | Freeze only when the close takes effect. | ML | — | Open |
| C2-C27 | `combobox/use-combobox-state.ts` (`setQuery`) | `onQueryChange` gets `''` on each close, blur, and pick, also when the query is already empty. | Report only a change. | L | — | Open |

## C3. Color

| ID | Where | Finding | Proposed change | Sev | Check | Status |
|---|---|---|---|---|---|---|
| C3-C01 | `color/use-color-picker-state.ts` | ColorPicker never marks its field touched, so a Form validator never runs before the first submit. | Call `setTouched` when the popover closes, as DatePicker does. | M | — | Open |
| C3-C02 | `color/color-utilities.ts` (`equalHsva`) | The compare rounds HSV to integers. `#fefefe` checks the `#ffffff` chip, and a press on that chip does nothing. | Compare in RGBA. | M | Chromium | Open |
| C3-C03 | `color/color-utilities.ts` (`sameColorValue`) | Echo detection uses render equality. An `hsva` value that changes only the hue at `s = 0` is dropped. | Compare the channels after rounding. | LM | — | Open |
| C3-C04 | `color/color-utilities.ts` (`serializeColor`) | The `hsva` format rounds `s` and `v`. Typed `7f7f7f` emits `#808080`, and the stored value differs from the color in the panel. | Emit `s`, `v`, and `a` at more precision. | LM | — | Open |
| C3-C05 | `color/use-color-field.ts` | A focused field keeps its draft when the color changes from outside, such as the eyedropper. On blur, a shorthand draft commits over the picked color. | Clear the draft when the derived value changes from outside. | LM | — | Open |
| C3-C06 | `recipes/kata/color-picker.ts` (`swatch.base`) | The inset ring of the trigger swatch paints under the child fill, so a white or black swatch has no edge. | Paint the ring on an overlay or on the inner span. | LM | — | Open |
| C3-C07 | `color/color-utilities.ts` (`equalHsva`) | Hue 360 and hue 0 compare as different, so End on the hue slider unchecks the chip. | Normalize `h % 360`. | L | — | Open |
| C3-C08 | `color/use-color-state.ts` | With alpha off, the seed and the reconcile keep `a < 1`, so the matching chip stays unchecked. | Pin alpha to 1 in the seed and the reconcile. | L | — | Open |
| C3-C09 | `color/color-picker.tsx` | The picker reseeds from hex on reopen, so the hue and the saturation of a black or gray color are lost. | Keep the full HSVA of the panel in the picker. | L | — | Open |
| C3-C10 | `color/types.ts` | `value` has no `\| null`, although the component treats `null` as controlled and empty (§7.3). | Add `\| null`. | L | — | Open |
| C3-C11 | `color/color-picker-trigger.tsx` | In RTL, the trigger label reads "FF0000#". | `dir="ltr"` on the value span. | L | — | Open |
| C3-C12 | `color/color-hex-input.tsx` | In RTL, the `#` prefix renders right of the digits. | Wrap the field in an LTR box. | L | — | Open |
| C3-C13 | `color/use-color-drag.ts` | `focus()` without `preventScroll` scrolls the page, and the first drag position is off by the scroll distance. | `focus({ preventScroll: true })`. | L | — | Open |
| C3-C14 | `color/use-color-drag.ts` | In a `<fieldset disabled>`, a drag on the area or a track still changes the color. | Stop when the fieldset is disabled. | L | — | Open |
| C3-C15 | `color/use-color-picker-state.ts` | ColorPicker ignores the `readOnly` of a Control. | Block the open and the writes. | L | — | Open |
| C3-C16 | `color/color-panel-skeleton.tsx` | The skeleton height fits only the default configuration; `alpha` or another swatch count changes it. | A hand-written skeleton with `alpha` and `swatches` props (§3.7). | L | — | Open |
| C3-C17 | `color/color-swatches.tsx` | A swatch that is not hex, such as `'red'`, paints but never selects. | Parse CSS colors, or warn in development. | L | — | Open |
| C3-C18 | `color/color-swatches.tsx` | The swatch radios add an entry keyed by a React `useId` to the FormData of a form. | `form=""` on the radios. | L | — | Open |

## C4. CommandPalette, Confirm, ContextMenu

| ID | Where | Finding | Proposed change | Sev | Check | Status |
|---|---|---|---|---|---|---|
| C4-C01 | `command-palette/command-palette-item.tsx` | A press on a disabled item, or on one with `closeOnAction={false}`, moves DOM focus from the input to the option. | Cancel `mousedown` on the option. | M | Chromium | Open |
| C4-C02 | `command-palette/command-palette-item.tsx` | A double click runs `onAction` twice, because the exiting palette still takes presses. | Make the exiting overlay inert (see the leads). | M | — | Open |
| C4-C03 | `command-palette/command-palette-item.tsx` | A consumer `type` replaces `type="button"` (§3.9). | Write `type="button"` after the spread. | L | — | Open |
| C4-C04 | `command-palette/command-palette.tsx` | The live `<output>` is `display: none` until the list empties, so "No results" is not announced. | Keep the output in the tree, and write its text when the list empties. | M | — | Open |
| C4-C05 | `command-palette/command-palette.tsx` | With zero matches, `aria-expanded` stays true for a hidden listbox. | Derive it from the option count. | L | — | Open |
| C4-C06 | `command-palette/command-palette.tsx` | A held ⌘K toggles the palette at the repeat rate. | Ignore `event.repeat`, as MenuTrigger does. | L | — | Open |
| C4-C07 | `command-palette/command-palette.tsx` | "No results" and the name "Command palette" are fixed English strings. | Props with these defaults. | L | — | Open |
| C4-C08 | `command-palette/use-command-palette-state.ts` | The virtual seed lands on a disabled first item. | Seed the first item that is not disabled. | LM | — | Open |
| C4-C09 | `command-palette/use-command-palette-state.ts` | Async results that arrive after the query commits get no seed; `aria-activedescendant` points at a removed row. | Re-seed when the active row leaves the list. | M | — | Open |
| C4-C10 | `command-palette/use-command-palette-state.ts` | Enter before the deferred render commits runs the top result of an older query. | Ignore Enter while the query and the deferred query differ. | L | — | Open |
| C4-C11 | `command-palette/use-command-palette-state.ts` | The seeded row stays out of view after a scroll. | Scroll the seeded row into view. | L | — | Open |
| C4-C12 | `command-palette/use-command-palette-state.ts` | Escape that cancels an IME composition closes the palette. | Skip a composing event in `useEscapeLayer`. | M | — | Open |
| C4-C13 | `command-palette/use-command-palette-state.ts` | ⌘/Ctrl/Shift+Enter on a link option loses the modifier. | Send the click with the modifiers of the key. | L | — | Open |
| C4-C14 | `recipes/kata/command-palette.ts` (`item`) | In forced colors, the roved row has no visible highlight. | `forced-colors:data-active:` Highlight colors. | M | — | Open |
| C4-C15 | `recipes/kata/command-palette.ts` (`item`) | In a glass Dialog, the roved wash is fainter than the glass hover wash. | A glass step for `data-active`. | ML | — | Open |
| C4-C16 | `recipes/kata/command-palette.ts` (`shortcut`) | The shortcut uses `ml-auto`, so in RTL it sits next to the label. | `ms-auto`. | L | — | Open |
| C4-C17 | `confirm/confirm.tsx` | `onConfirm` goes to the button directly, so it gets the click event as an argument. | `onClick={() => onConfirm()}`. | L | — | Open |
| C4-C18 | `confirm/confirm.tsx` | A double press runs `onConfirm` twice, because the exiting dialog still takes presses. | Make the exiting overlay inert, or guard the press. | M | — | Open |
| C4-C19 | `confirm/confirm.tsx` | `ConfirmAction` has no `loading`. A natively disabled confirm button drops focus to `<body>`. | Forward `loading` to the Button. | L | — | Open |
| C4-C20 | `confirm/confirm.tsx` | A long message does not scroll. On a desktop viewport the actions go below the screen. | Put the message in `DialogBody`. | M | Chromium: at 1280×720 the confirm button is at 2048px, with no scroll container | Open |
| C4-C21 | `confirm/confirm.tsx` | With no title, the alertdialog has no name, and Confirm takes no `aria-label`. | Accept and forward `aria-label`. | L | — | Open |
| C4-C22 | `confirm/confirm.tsx` | An empty `description` (`null`, `false`, `""`) puts the children outside `ConfirmBody`, so there is no `aria-describedby`. | Use one test in both places. | L | — | Open |
| C4-C23 | `context-menu/context-menu.tsx` | A change of `disabled`, or of the entry count across zero, mounts the children again, and their state resets. | Render the same wrapper in both branches. | M | — | Open |
| C4-C24 | `context-menu/context-menu.tsx` | After Escape or a pick, focus falls to `<body>`. It does not return to the element that had it. | Record the focused element on open and restore it on close. | M | — | Open |
| C4-C25 | `context-menu/context-menu.tsx` | `className` is dropped while the menu is inactive, and lands on a `display: contents` box while it is active. | Put it on one element in both branches. | L | — | Open |
| C4-C26 | `context-menu/context-menu-merge.ts` | A group with only a separator, or one that starts or ends with one, opens the menu on a doubled or an edge rule. | Treat a group with no action as empty, and collapse edge rules. | L | — | Open |

## C5. Card, Code, CopyButton

| ID | Where | Finding | Proposed change | Sev | Check | Status |
|---|---|---|---|---|---|---|
| C5-C01 | `card/card.tsx`, `recipes/kata/card.ts` | The card is `overflow-hidden`, and the footer does not wrap. Wide actions and long tokens are clipped. | Remove the clip or keep it for media; `flex-wrap` on the footer. | L | Chromium: 385px of actions in a 236px footer | Open |
| C5-C02 | `code/code-block.tsx` | On a cache hit, the effect returns with no `setResult`. After 200 newer entries evict the snippet, a render falls back to plain text, and no pass runs again. | Latch the cached entry in state on a hit. | M | — | Open |
| C5-C03 | `code/code-block.tsx` | A key cached between the render and the effect, such as by `primeCodeBlock` in a parent layout effect, leaves the block plain. | The same latch. | LM | — | Open |
| C5-C04 | `code/code-block.tsx` | A change between two cached snippets with the same line count does not measure the scroll region again. | `key` on the markup wrapper, or a measure keyed on the HTML. | LM | — | Open |
| C5-C05 | `code/code-block.tsx` (`theme`) | A theme with a background other than `#0d1117` paints a two-tone block. | Narrow `theme`, or set the frame from the theme. | ML | — | Open |
| C5-C06 | `code/code-block.tsx` (`cacheSet`) | A write of a key that the cache holds already evicts the oldest entry. | Skip the eviction when the key is present. | L | — | Open |
| C5-C07 | `code/code-block.tsx` | CodeBlock gives its CopyButton no `onCopyError`, so a failed copy is silent. | Forward `onCopyError` and `onCopiedChange`. | L | — | Open |
| C5-C08 | `code/code-block.tsx` (`label`) | Two blocks that overflow make two region landmarks with the same name "Code". | Accept `labelledBy`, or name each block apart. | L | — | Open |
| C5-C09 | `code/code-block.tsx` | CodeBlock drops `data-*` and `aria-*` props. | Spread the rest on the root (§3.9). | L | — | Open |
| C5-C10 | `code/code-shiki-highlighter.ts` | The tokenizer has no limit, so one very long line holds the shared worker and the other blocks stay plain. | A line length limit or a time limit for each request. | LM | — | Open |
| C5-C11 | `code/code.tsx` | `size` writes `data-density` but opens no density context (REFERENCE.md §2). | Render through `PolymorphicStatic` with `density`. | L | — | Open |
| C5-C12 | `copy-button/copy-button.tsx` | Two activations before the first write settles run two writes. | A guard for the write in flight. | L | — | Open |
| C5-C13 | `copy-button/copy-button.tsx` | The `copy-button` anchor is locked after the spread, and no selector reads it (§3.9). | Write the anchor before the spread. | L | — | Open |
| C5-C14 | `copy-button/use-copy-button-state.ts` | An unmount inside the timeout never reports `onCopiedChange(false)`. | Report `false` in the cleanup. | LM | — | Open |
| C5-C15 | `copy-button/use-copy-button-state.ts` | `timeout={Infinity}` reverts at once. | Skip the timer for a value that is not finite. | L | — | Open |
| C5-C16 | `recipes/kata/card.ts` | A header as the last child, or a footer as the first, doubles the padding on that edge. | `not-last:` and `not-first:` on the section padding. | L | — | Open |
| C5-C17 | `recipes/kata/card.ts` | A header and a footer with no body leave a gap of two steps. | Drop the footer padding after a header. | L | — | Open |
| C5-C18 | `recipes/kata/card.ts` (`description`) | The description stays at `text-sm` at each step. | `dan.text.small`. | L | — | Open |
| C5-C19 | `recipes/kata/code.ts` (`block.copy`) | The light-mode override gates on `aria-pressed`, which CopyButton never writes. The glyph turns near-black on hover over the dark canvas. | Gate on a copied-state data attribute. | M | Chromium: hover color `oklch(0.141 …)` | Open |
| C5-C20 | `recipes/kata/code.ts` (`CodeBlockVariants`) | The type advertises a `size` that CodeBlock does not take. | Remove the alias, or give CodeBlock a `size`. | L | — | Open |

## C6. Checkbox, Collapse, Control

| ID | Where | Finding | Proposed change | Sev | Check | Status |
|---|---|---|---|---|---|---|
| C6-C01 | `checkbox/checkbox.tsx` | Checkbox ignores `readOnly`, from the Control cascade and as a prop, so a read-only box toggles. | Read `readOnly`, set `aria-readonly`, and cancel the activation. | M | — | Open |
| C6-C02 | `checkbox/checkbox.tsx` | `indeterminate` is not in the server HTML, so the box paints empty until hydration. | A `data-indeterminate` attribute that the kata also reads. | L | — | Open |
| C6-C03 | `checkbox/checkbox.tsx` | `style` and `hidden` go to the invisible native input, not to the visible box. | Apply them to the wrapper label. | L | — | Open |
| C6-C04 | `checkbox/checkbox.tsx` | Checkboxes that share a `name` bind one boolean, and `value` never reaches the form. | Bind by membership when `value` is set. | LM | — | Open |
| C6-C05 | `recipes/kata/checkbox.ts` | Claim: the box is wider than the 18px grid column at `md` and `lg`. | `grid-cols-[auto_1fr]` in `kiso/narabi/toggle.ts`. | LM | Not reproduced at `md`: the box fit the 18px column. `lg` not run | Open |
| C6-C06 | `recipes/kata/checkbox.ts` | Claim: a checked box takes the unchecked hover border. | Guard the surface hover rules with `not-has-checked`. | L | Not reproduced on a box hover in dark mode. Label hover not run | Open |
| C6-C07 | `recipes/kata/collapse.ts` (`trigger`) | `group-data-[open]/collapse:` matches any open ancestor, so a closed inner trigger shows the open color. | `aria-expanded:` on the trigger, as Accordion does. | L | Chromium | Open |
| C6-C08 | `recipes/kata/collapse.ts` (`panel`) | The panel is `overflow-hidden` at rest and with `animate={false}`, so focus rings at its edges are clipped. | Clip only while the height animates. | M | Chromium: `overflow: hidden` at rest | Open |
| C6-C09 | `collapse/collapse-trigger.tsx` | Under `mount="always"`, a closed panel is not in the server HTML, so `aria-controls` points at no element. | Set `aria-controls` after hydration for a closed panel. | L | — | Open |
| C6-C10 | `control/use-control-props.ts` | `disabled={false}` or `readOnly={false}` on a field turns on a control in a disabled Control. | OR the prop with the context. | ML | — | Open |
| C6-C11 | `control/use-control-props.ts` | An explicit `id` on the control breaks the `for` of the Label, so the control has no name. | Give the rendered id to the context, or warn in development. | ML | — | Open |
| C6-C12 | `control/control-skeleton.tsx` | In a vertical Group, the joined skeleton uses `flex-1` on the height axis and collapses. | A vertical join class with no `flex-1`. | L | — | Open |

## C7. CreditCardInput, CurrencyInput

| ID | Where | Finding | Proposed change | Sev | Check | Status |
|---|---|---|---|---|---|---|
| C7-C01 | `credit-card-input/credit-card-input-expiry.tsx` | Typing `4`, `/`, `2`, `7` gives "02/74", not "04/27". The month pad does not move the caret. | Count the inserted `0` in the caret, or put the caret after the slash. | H | Chromium | Open |
| C7-C02 | `credit-card-input/credit-card-input-expiry.tsx` | Backspace after "12" gives "01/", and the next Backspace stays at "01/" with the caret at 0. | Skip the pad on a deletion. | H | Chromium | Open |
| C7-C03 | `credit-card-input/credit-card-input-expiry.tsx` | A forward Delete before the slash removes the digit before it. | Branch on `inputType`. | L | — | Open |
| C7-C04 | `credit-card-input/credit-card-input-expiry.tsx` | The default `aria-label` wins over a native `<label for>`. | Skip the default when the input has a label. | LM | — | Open |
| C7-C05 | `credit-card-input/credit-card-input-expiry.tsx` | Outside a Control, the error message has no id and is not in `aria-describedby`. | A `useId` id, merged into `aria-describedby`. | LM | — | Open |
| C7-C06 | `credit-card-input/credit-card-input-expiry.tsx` | With a bound `<Message>`, two alerts share one id. | Give the internal message its own id. | L | — | Open |
| C7-C07 | `credit-card-input/credit-card-input-expiry.tsx` | A typed letter that the mask strips moves the caret one place. | A digits-only `meaningful`. | L | — | Open |
| C7-C08 | `credit-card-input/credit-card-input-expiry.tsx` | `type` and `inputMode` come before the spread (§3.9). | Write them after the spread. | L | — | Open |
| C7-C09 | `credit-card-input/credit-card-input-utilities.ts` (`formatExpiry`) | A pasted or autofilled four-digit year gives "12/20". | Keep the last two digits of a four-digit year; `maxLength={5}`. | M | — | Open |
| C7-C10 | `credit-card-input/credit-card-input-utilities.ts` (`validateCardExpiry`) | A complete "05/20" reports `isPotentiallyValid: true`. | A complete value has `isPotentiallyValid` equal to `isValid`. | L | — | Open |
| C7-C11 | `credit-card-input/credit-card-input-utilities.ts` (`validateCardNumber`) | A UnionPay number that fails Luhn is valid. | `luhnValidateUnionPay: true`, or correct the TSDoc. | LM | — | Open |
| C7-C12 | `credit-card-input/credit-card-input-utilities.ts` | Arabic-Indic and full-width digits are stripped (`/\D/g` with no `u` flag). | Map Unicode digits to ASCII first (see the leads). | LM | — | Open |
| C7-C13 | `credit-card-input/credit-card-input-cvv.tsx` | A controlled CVV that the brand shortens shows the short value but never reports it. | Compare against the raw controlled value. | M | — | Open |
| C7-C14 | `credit-card-input/credit-card-input-cvv.tsx` | Validity reads the raw value, not the masked one. | Validate the masked value. | L | — | Open |
| C7-C15 | `credit-card-input/credit-card-input-cvv.tsx` | A form default longer than the cap shows and submits as it is. | Refit when the value is longer than the cap. | L | — | Open |
| C7-C16 | `credit-card-input/credit-card-input-cvv.tsx` | The default `aria-label` wins over a native label. | Same as C7-C04. | LM | — | Open |
| C7-C17 | `credit-card-input/credit-card-input-cvv.tsx` | A stripped letter moves the caret. | A digits-only `meaningful`. | L | — | Open |
| C7-C18 | `credit-card-input/credit-card-input-cvv.tsx` | `type` and `inputMode` come before the spread. | Write them after the spread. | L | — | Open |
| C7-C19 | `credit-card-input/credit-card-input.tsx` | With no label, the name comes from the placeholder "1234 1234 1234 1234". | A default `aria-label` "Card number", as the siblings have. | LM | — | Open |
| C7-C20 | `credit-card-input/credit-card-input.tsx` | A stripped letter moves the caret. | A digits-only `meaningful`. | L | — | Open |
| C7-C21 | `credit-card-input/credit-card-input.tsx` | `type` and `inputMode` come before the spread. | Write them after the spread. | L | — | Open |
| C7-C22 | `currency-input/use-currency-input-formatting.ts` | A currency with no decimals (`precision={0}`, VND, CLP, ISK) in a locale whose group mark is "." gets "." as its decimal too. Typing "12345" gives "1". | Read the decimal mark from a plain number format, and ignore it when there are no decimals. | H | Chromium (de-DE, `precision={0}`) and ICU | Open |
| C7-C23 | `currency-input/use-currency-input-formatting.ts` | Parse and display use different separators in fr-CH (decimal) and de-AT (group). In fr-CH, Backspace on "1 234,50" gives 12345. | Take every mark from one format style. | H | Chromium (fr-CH) and ICU (fr-CH, de-AT) | Open |
| C7-C24 | `currency-input/currency-input-utilities.ts` (`formatEditing`) | sv-SE, fi-FI, and nb-NO show the minus sign U+2212, which the parser strips. A negative value turns positive on the next keystroke. | Map U+2212 to "-" before the parse. | MH | Chromium (sv-SE) and ICU | Open |
| C7-C25 | `currency-input/currency-input-utilities.ts` | Native digits (ar-EG, full-width) are stripped. | Map Unicode digits to ASCII first. | M | — | Open |
| C7-C26 | `currency-input/currency-input-utilities.ts` | In JPY, a stray "." drops the digits after it. | Strip the mark when there are no decimals. | LM | — | Open |
| C7-C27 | `currency-input/currency-input-utilities.ts` | The decimal keypad of a device in another region offers only the other mark, so cents cannot be typed. | Read the other mark as the decimal when it is the last one. | LM | — | Open |
| C7-C28 | `currency-input/currency-input-utilities.ts` (`isMeaningful`) | A "-" inside the number counts for the caret but is stripped. | Count "-" only at index 0. | L | — | Open |
| C7-C29 | `currency-input/currency-input-utilities.ts` (`parseEditing`) | "-0" emits -0 and shows "-0.00". | Normalize -0 to 0. | L | — | Open |
| C7-C30 | `currency-input/currency-input.tsx` | The spread comes last, so a stray `onChange` (such as `register()`) replaces the formatting (§3.9). | Write the spread before the wiring. | M | — | Open |
| C7-C31 | `currency-input/currency-input.tsx` | A parent that clamps to the same number leaves the typed buffer on screen until blur. | Check the buffer against the controlled value on each render. | ML | — | Open |
| C7-C32 | `currency-input/currency-input.tsx` | With no locale, the server and the browser defaults differ, and hydration does not match. | Ask for a locale in server renders, or defer the locale output. | M | — | Open |
| C7-C33 | `currency-input/currency-input.tsx` | The iOS decimal keypad has no "-" key, so a negative amount cannot be typed. | A sign toggle, or another `inputMode` for signed amounts. | L | — | Open |

## Leads outside the scopes

The sweeps found these in files outside their lists. Several are the root of a row above.

| Where | Finding | Rows |
|---|---|---|
| `hooks/use-escape-layer.ts` | Escape that cancels an IME composition dismisses the top layer, because the layer does not check `isComposing`. | C2-C12, C4-C12 |
| `hooks/a11y/use-a11y-roving.ts` | The virtual seed does not read `isDisabled` and does not scroll the seeded row. `handleActivationKey` drops the key modifiers. `clearVirtualActive` leaves `data-active` on rows that stay mounted while the panel exits. | C2-C13, C2-C20, C4-C08, C4-C11, C4-C13 |
| `primitives/overlay/overlay.tsx` | The exiting overlay takes input for its whole exit animation; FloatingSurface does not. | C4-C02, C4-C18 |
| `components/menu/use-menu-state.ts` | A context menu has no trigger ref, and `openAt` records no focus to restore. | C4-C24 |
| `components/menu/menu.tsx` | `className` lands on a `display: contents` root. | C4-C25 |
| `recipes/kiso/hannou/active.ts` | The `data-active` wash has no glass form and no forced-colors form. | C4-C14, C4-C15 |
| `hooks/observe-scroll-extent.ts` | It measures again only when the node or a direct child resizes, or when the node's children change. | C5-C04 |
| `hooks/use-scroll-overflow.ts` | It does not measure again when a late web font loads. | — |
| `hooks/use-scroll-region.ts` | `scrollsOn` has no 1px tolerance, so a box that fits can become a region. | — |
| `core/scroll/fade.ts` | The fade mask hides the inset focus ring of a scroll rail at its ends. | — |
| `recipes/kata/toggle-icon-button.ts` | `flex` wins over the `inline-flex` of Button, so CopyButton and ToggleIconButton break onto their own line in text. | — |
| `utilities/digits-only.ts` | `/\D/g` has no `u` flag, so it strips Unicode digits. | C7-C12, C7-C25 |
| `hooks/use-pending-caret.ts` | `setSelectionRange` throws on an input type with no selection, such as `number`. | C7-C08, C7-C18, C7-C21 |
| `components/mask-input/use-mask-input.ts` | The default `meaningful` counts letters that a digits-only format strips, and the hook has no `atEnd` option. | C7-C01, C7-C07, C7-C17, C7-C20 |
| `recipes/kiso/narabi/toggle.ts` | The first column is a fixed 18px, which is narrower than the stepped box at `lg`. | C6-C05 |
| `recipes/kiso/control/check.ts` | The surface hover rules outrank the checked border; the label hover also matches an outer toggle field. | C6-C06 |
| `components/switch/switch.tsx` | Switch ignores `readOnly`, and `style` and `hidden` go to the invisible input. | C6-C01, C6-C03 |
| `components/form/use-form-toggle.ts` | It binds one boolean by `name` and ignores `value`. | C6-C04 |
| `primitives/mount/mount.ts` | `mountsEveryPanel('always')` is true, but a hidden Activity is not in server HTML. | C6-C09 |
| `recipes/kiso/kokkaku/control.ts` | The `group` skeleton assumes a horizontal row. | C6-C12 |
| `recipes/kiso/kokkaku/calendar.ts` | The row ramp follows `xs`, which Calendar snaps to `sm`. | C1-C02 |
| `utilities/resolve-locale.ts` | With no locale, each side of a server render uses its own runtime default. | C1-C05, C7-C32 |
| `components/popover/popover-content.tsx` | The TSDoc says a named panel is not modal, but `modal` traps focus. | — |
| `components/listbox/listbox.tsx` | `nullable` reads the current controlled value, as in C2-C17. | C2-C17 |
| `components/tooltip/tooltip-trigger.tsx` | An explicit `undefined` child prop overwrites the tooltip's own `aria-describedby`. | — |
| `hooks/use-truncation.ts` | The Range fallback measures the children of an `<input>`, which has none. | — |

## Earlier leads

| Where | Finding | Source |
|---|---|---|
| `recipes/kata/collapse.ts` (`panel`) | In a box that sizes to its content, the width of a Collapse changes when it opens: 384px closed and 823px open in the docs example frame. Accordion fixed the same defect with `contain: inline-size`. | A pass, charliebeckstrand/midgard#1915 |
