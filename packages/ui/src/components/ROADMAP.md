# Components roadmap

> **Goal: components that bind, announce, and fit the apps with no local copy in an app.** Each item comes from a need of an app, a gap against a peer library, or drift from [`CONVENTIONS.md`](../../../../CONVENTIONS.md).

## Status

The components live in one directory for each unit, and [`docs/COMPONENTS.md`](../../docs/COMPONENTS.md) indexes them by domain. Each component takes its styling from a recipe in [`recipes/`](../recipes), and the static tier and the client tier split as [`REFERENCE.md`](../../REFERENCE.md) §2 says.

Gates hold the shared contracts. [`static-component-boundary.test.ts`](../__tests__/boundary/static-component-boundary.test.ts) holds the static tier. [`props-base-boundary.test.ts`](../__tests__/boundary/props-base-boundary.test.ts) holds the native base of each props type. [`tsdoc-coverage-boundary.test.ts`](../__tests__/boundary/tsdoc-coverage-boundary.test.ts) and [`default-value-boundary.test.ts`](../__tests__/boundary/default-value-boundary.test.ts) hold the TSDoc and its defaults.

The shared corpus in [`__tests__/a11y/cases`](../__tests__/a11y/cases) gives each subject to the axe baseline and to the focus sweeps. A component with no subject gets no axe scan, and no gate requires a subject today.

The apps copy parts of the kit by hand in several places: a focus outline, a fold of search text, and the last content of an overlay through its exit. The items below move each copy into the kit. This file covers the units of `components/`, and [`../../ROADMAP.md`](../../ROADMAP.md) covers the layers below them.

## Features

1. **Toast: a live id replaces its toast (*P1*).** `toast()` in `toast-provider.tsx` appends a second entry when a caller gives the `id` of a live toast. The viewport in `toast.tsx` then renders two children with the same `key`, and `use-toast-timer.ts` keeps one countdown for the two.

   Make a call with a live id replace that toast in place and arm its timer again, as Sonner does. An app can then give a fixed id to a toast that repeats, such as the "Link copied" toast of `apps/numbers/src/components/game-board/game-board-share.tsx`. A loading toast can also turn into its result. Update the TSDoc of `ToastInput.id`, which now puts uniqueness on the caller. Proof: a case in `toast.test.tsx` for a repeated id, and a docs example under `src/docs/pages/components/toast`.

2. **RadioGroup: a bound value (*P2*).** A `RadioGroup` takes no `name`, `value`, `defaultValue`, or `onValueChange`, so a set of radios cannot bind a `Form` field or a `FormFilters` slot. `modules/form/form-filters/form-filters-field.tsx` tells the consumer to use a render function for a radio for this reason. Radix, React Aria, and Mantine each put the value on the group. Add the value triad and `name` to `radio/radio-group.tsx` through `useFormValue`, and put the bound group in the corpus. Each `Radio` of the group then takes its `checked` and its native `name` from `radio/context.ts`, and a `Radio` outside a group stays as it is. Prove it in `radio.test.tsx` with a submit, a `Form` reset, and a native reset.

3. **DatePicker: unavailable days (*P2*).** `Calendar` takes `isDayDisabled`, and Elections uses it in `apps/elections/src/components/level-view/level-view.tsx`, but `DatePicker` does not give it to its calendar. React Aria (`isDateUnavailable`), MUI (`shouldDisableDate`), and Mantine (`excludeDate`) each take the rule on the picker. Add the prop to `DatePickerBaseProps` in `date-picker/date-picker.tsx`, and pass it to the calendar of the single, the range, and the relative variants. In `input` mode, the typed `DateInput` must refuse a disabled day, as it refuses a day outside `min` and `max`. The open question is a range that spans a disabled day, which React Aria refuses unless `allowsNonContiguousRanges` is set. Prove it in `date-picker.test.tsx`.

4. **Combobox: option groups (*P2*).** A `Combobox` has no part that groups its options under a heading, and neither has `Select`, which is a `Listbox`. Radix (`Select.Group`), React Aria (`ListBoxSection`), and MUI (`groupBy`) each have one. Extend the pattern of `MenuSection` and `MenuHeading` in `menu/slots.tsx` to a `ComboboxSection` and a `ComboboxHeading`. The section is a `role="group"` that its heading names, as the WAI-ARIA APG listbox shows. The roving and the type-ahead must skip a heading, and `Listbox` must take the same part, so `Select` gets it too. Prove it in `combobox.test.tsx` and with a grouped case in the corpus.

5. **CopyButton: a failure state (*P2*).** The TSDoc of `copy-button/copy-button.tsx` says that the rest glyph means both "not copied yet" and "copy failed". No app gives `onCopyError`, so a refused write on the two-step page of Admin (`apps/admin/app/(signed-in)/account/two-step.tsx`) tells the reader nothing. Give `useCopyButtonState` a `failed` state that holds for `timeout`, as `copied` does. In it, `CopyButton` shows the `X` glyph in red, and the shared announcer speaks a new catalog message, such as "Copy failed". `onCopyError` still fires. Change the case of `copy-button.test.tsx` that holds the idle state after a rejection, and add a case for the announcement.

6. **Tooltip: a trigger that follows the device (*P2*).** `trigger` takes `'hover'` or `'click'`. `IncumbentMark` in `apps/elections/src/components/race-summary/reporting-row.tsx` selects one with `useHasHover`, so a mouse hovers and a touch screen taps. Add a third value of `trigger` in `use-tooltip-state.ts` that reads the same media query. The server render keeps the markup of `'hover'`, as the app gets today. Proof: a case in `browser/floating-ui/tooltip-touch.test.tsx` that taps on a coarse pointer, and a docs example.

7. **Tooltip: no open delay right after a close (*P2*).** Each hover tooltip waits its `delay`. It waits also when the pointer moves along a `Toolbar` or a `mini` `Sidebar`, and the reader reads each tooltip in turn. Radix (`skipDelayDuration`), React Aria, and the `FloatingDelayGroup` of Floating UI open the next tooltip at once in a short window after a close. Keep the time of the last close in module scope in `use-tooltip-state.ts`, so no provider is necessary, and skip the open delay inside the window. Proof: a jsdom case with the `clock` fixture in `tooltip.test.tsx`, and a browser case that hovers across a toolbar.

8. **Card: a card that is one button (*P2*).** With `href`, `Card` renders a link with the focus ring of a control. It has no button form. `CardButton` in `apps/elections/src/components/card-button/card-button.tsx` wraps a `Card` in a `<button>` for the race card and the office card. It writes its own focus outline, which goes around `sen.focus` and its forced-colors fallback (CONVENTIONS §5.10).

   Add the button form to `Card` through Box, as `href` adds the link form, with the ring inside the edge that a scroll box needs. Peer: the `CardActionArea` of MUI. Proof: a `card.test.tsx` case for the role and the click, a corpus subject, and a docs example.

9. **Collapse: an open indicator (*P2*).** `AccordionTrigger` draws a chevron that turns while its item is open (the `indicator` slot of `recipes/kata/accordion.ts`). `CollapseTrigger` has no indicator. `CollapseCaret` in `apps/elections/src/components/collapse-caret/collapse-caret.tsx` thus reads `useCollapseContext` and turns an `Icon` with classes of its own. Export a `CollapseIndicator` that reads the open state and takes the indicator classes of the accordion, so the two disclosures turn one chevron. Proof: a `collapse.test.tsx` case for the state of the indicator, and the uncalled table of Elections on the new part.

10. **Breadcrumb: a crumb with a menu (*P2*).** `MenuCrumb` in `apps/elections/src/components/menu-crumb/menu-crumb.tsx` puts a `Menu` on a crumb. The reader can then go to a sibling of the crumb, such as another office. It writes its own focus outline and an English `aria-label` that the catalog does not hold. Ant Design gives the same part through the `menu` of a breadcrumb item.

    Add a `BreadcrumbMenu` part that renders the crumb and a chevron `MenuTrigger`. It must keep the fit of a collapsing trail and name the trigger through `primitives/intl`. Proof: a `breadcrumb.test.tsx` case, and a menu crumb in `browser/breadcrumb-collapse.test.tsx`.

11. **Dialog, Drawer, Sheet: content that stays through the exit (*P2*).** A panel that opens on a value closes when the value becomes `null`. Its body must show the last value while the exit plays. `ResultDrawer` in `apps/elections/src/components/result-drawer/result-drawer.tsx` and `SummaryDrawer` in `apps/places/src/components/summary-drawer/summary-drawer.tsx` each keep the last value in state by hand.

    `hooks/use-frozen-on-close.ts` holds the same mechanism for `useDeferredToggle` and `Combobox` as an internal hook. Extend it to a public hook in `ui/hooks` that gives the last value of an overlay through its exit. Link the hook from the TSDoc of `Dialog`, `Drawer`, and `Sheet`. Proof: a hook test with an exit that a reopen interrupts, and a Drawer docs example that swaps its content.

12. **Kbd: a `$mod` shortcut for each platform (*P2*).** `ShortcutHint` in `src/docs/kit/shortcut-hint.tsx` shows ⌘ on an Apple platform and ⌃ elsewhere. It writes the two texts in one grid cell, so the key keeps its size across hydration (CONVENTIONS §3.13). `ui` has no such part, so `Kbd` and `MenuShortcut` show fixed text. The palettes of Places and Elections bind ⌘K and Ctrl+K, and their TSDoc says that the page does not show the shortcut.

    Move the hint into `Kbd` as a prop that takes a binding in the syntax of `useKeybindings`, such as `'$mod+KeyK'`. Then render `ShortcutHint` from it. Proof: a `kbd.test.tsx` case for the server markup and the hydrated text, and the `modifier-glyphs.tsx` docs example on the new prop.

13. **Combobox: a loading state (*P3*).** A `Combobox` that waits for its options shows "No results" or nothing, because it has no `loading` prop. MUI (`loading`, `loadingText`) and React Aria (`loadingState`) show a busy panel. `AddressInput` builds a spinner suffix itself in `address-input/address-input.tsx`, and it holds the panel closed until its first results arrive. Add `loading` to the `Combobox`, with a `LoadingSpinner` suffix and a loading status in place of "No results", and move `AddressInput` onto it. The open question is a panel that shows stale options while a new query loads.

14. **NumberInput: a held stepper repeats (*P3*).** The steppers of `number-input/number-input.tsx` step once for each click. React Aria (`NumberField`) and Mantine (`stepHoldDelay`, `stepHoldInterval`) repeat the step while the reader holds a stepper. Start the repeat on a primary press (`isPrimaryPress`), stop it on the release, the cancel, and the leave, and announce only the last value. The keyboard keeps the native arrow keys of `type="number"`. Prove it in `number-input.test.tsx` with the `clock` fixture.

15. **FileUpload: object URLs for a preview (*P3*).** Places shows a thumbnail of each new photo, and its `usePhotoSources` (`apps/places/src/components/place-form-drawer/place-photos-field.tsx`) makes an object URL for each new file. It revokes the URL when the file leaves or the field unmounts. Ark UI has `FileUpload.ItemPreview` for this. Move the lifecycle into `file-upload` as a hook that gives a URL for each file. The URL must keep its identity while its file stays, so a reorder loads no image again. Prove the revoke in `file-upload.test.tsx`.

16. **Textarea: a text edit that keeps the undo history (*P3*).** The review field of Places (`apps/places/src/components/place-form-drawer/place-review-field.tsx`) writes Markdown marks into a `Textarea` through `setValue` of the form. A browser can drop its undo history when a script replaces the value, so Ctrl+Z cannot undo a Bold. A helper beside `textarea/textarea.tsx` that inserts text with `execCommand('insertText')` keeps the history. First write a browser test that shows the loss. Add the helper only if the test fails on the current approach.

17. **Tabs: automatic activation (*P3*).** A `Tab` takes the selection on a click, Enter, or Space. The arrow keys only move the focus (`tab.tsx`, `tab-list.tsx`). The APG tabs pattern recommends activation on focus when a panel shows at once. Radix (`activationMode`) and React Aria (`keyboardActivation`) offer the two modes.

    Add an opt-in prop on `Tabs`, and keep manual activation as the default. A `Segment` that writes an address on each pick, as `OfficeSwitch` in Elections does, must keep manual activation. Open question: the name of the prop, and whether `Segment` takes it. Proof: `tabs.test.tsx` cases for the two modes.

18. **Menu: checkable items (*P3*).** `MenuItem` acts and closes, and no part of `ui` has the role `menuitemcheckbox` or `menuitemradio`. Radix (`CheckboxItem`, `RadioGroup`) and React Aria (`selectionMode`) give these items, for a menu that turns a view setting on or off.

    Add a checkbox item and a radio group to `components/menu`, with `aria-checked`, a check glyph, and `closeOnSelect`. Add the same kinds to `ContextMenuEntry`. Open question: no app asks for them yet. Proof: `menu.test.tsx` cases for the roles and the state, and the menu subject of the corpus.

19. **AvatarGroup: an overflow count (*P3*).** The TSDoc of `AvatarGroup` tells the consumer to append `<Avatar initials="+N" alt="N more" />` by hand. That name is outside the catalog of `primitives/intl`, and each consumer counts the rest again. MUI gives the count through `max` and `total`. Add a `max` prop that renders the first avatars and one count avatar, with its name from the catalog. Proof: an `avatar.test.tsx` case, and the count avatar in `browser/avatar-group-overlap.test.tsx`.

20. **PdfViewer: a text layer (*P3*).** The search reads only the OCR `data` of the consumer. Each page is an image whose name is its label. Thus a screen reader gets no text of a page, and the reader cannot select text (WCAG 1.1.1). pdf.js gives the text of a page through `getTextContent`, and the PDF.js viewer and react-pdf draw it as a clear layer over the page.

    The TSDoc of `PdfViewer` says that a text layer needs the page surface in a component of its own first. Make that split, then draw the layer, and let the search read it when `data` is absent. Open question: the cost of the layer on a long document, which `__benchmarks__/browser/pdf-viewer-open.bench.tsx` must measure. Proof: a browser case that selects text on a page.

## Pattern cleanup

1. **Nested ternaries: a gate for §8.4 (*P1*).** CONVENTIONS.md §8.4 tells the author to split a nested ternary into named steps, but no gate holds the rule. Biome's `style/noNestedTernary` finds the sites. In this area, they are in `date-picker/use-date-picker-state.ts`, `date-picker/use-date-picker-range-state.ts`, `date-picker/date-picker-trigger.tsx`, `date-input/date-input-utilities.ts`, `credit-card-input/credit-card-input-utilities.ts`, `calendar/calendar-day-cell.tsx`, `address-input/address-input.tsx`, and `switch/switch-choice.tsx`. The rule also finds sites in the other components, the modules, and the hooks. Split each site, then set the rule to `error` in the `ui` source beside `noExcessiveCognitiveComplexity` in `biome.json` (§4.8).

2. **JsonTree, PdfViewer: one home for the fold of search text (*P2*).** `use-pdf-viewer-search.ts` folds a query and the text to lower case with no accents. `matchesSearch` in `json-tree-utilities.ts` only lowers the case, so "cafe" does not find "café" in a JSON tree. The same fold is written again in `apps/places/src/utilities/places-palette.ts`, `apps/elections/src/utilities/results.ts`, and `src/docs/app/search-match.ts`. A behavior that many components share has one home (CONVENTIONS §3.10).

   Put one `foldText` in `utilities/`, use it in the two components, and export it to the apps through `ui/core`. A Biome plugin that finds `.normalize('NFD')` outside the home can hold the rule. The change crosses packages, so surface the approach first (CLAUDE.md §3.1).

3. **CollapsePanel: the element that takes `className` (*P2*).** `AccordionPanel` puts `className` on an inner body, so a padding stays out of the height that animates. `CollapsePanel` puts `className` on the animated element itself. There a padding gives the panel a height of its own at the start and at the end of the motion. `UncalledTable` in Elections thus wraps its content in a `<div className="pt-4">`.

   Give `CollapsePanel` the rule of `AccordionPanel`: the animated element takes the other props, and an inner body takes `className`. Proof: a `collapse.test.tsx` case that finds the class on the body, and a padding case in `browser/collapse-nested.test.tsx`.

4. **FileUpload: props beside their components (*P3*).** `file-upload/types.ts` holds `FileUploadDropProps`, `FileUploadInputProps`, and `FileUploadButtonProps`, and each has one component. CONVENTIONS.md §4.5 puts props beside the component that takes them, and each other component of this area does so. Move each props type into the file of its component. `FileUploadSharedProps` stays in `types.ts`, because the three types share it.

5. **Stepper, Tree: the `onKeyDown` of the consumer (*P3*).** `TabList`, `Toolbar`, `Sidebar`, and `AccordionTrigger` compose the consumer `onKeyDown` with their roving handler (CONVENTIONS §3.9). `StepperProps` and `TreeProps` omit `onKeyDown` from their base, and `TreeProps` also omits `onFocus`. Thus a consumer cannot add a key, such as Delete on a tree item. Take the keys back into the props, and compose them through `composeEventHandlers` with `checkForDefaultPrevented: false`, as `tab-list.tsx` does. Proof: a case in `stepper.test.tsx` and in `tree.test.tsx` where the consumer handler runs and roving still moves the focus.

6. **Breadcrumb: one copy of the order rule (*P3*).** A collapsing `Breadcrumb` renders a `<style>` element with `BREADCRUMB_ORDER_RULE` (`breadcrumb-order.ts`) beside each trail. The rule is the same for each trail, so a page with more than one trail sends it again and parses it again. Give the element an `href` and a `precedence`, so that React renders one copy in the head for the page. Proof: a `breadcrumb.test.tsx` case that renders two collapsing trails and finds one `<style>`, and `browser/breadcrumb-collapse.test.tsx` for the fit.

7. **StepperPanels: an inert slot by hand (*P3*).** `StepperPanels` (`stepper-panels.tsx`) renders an element with its recipe class and the spread, and nothing more. CONVENTIONS §3.6 gives such a slot to `createSlot`, as `StepperDescription` in the same unit uses it. Rewrite it with `createSlot`. A search for this shape finds no other hand-written inert slot in `components/`. Thus a Biome plugin for the shape can hold the rule with no debt.

## Performance

1. **DatePicker, ColorPicker, Combobox: the cost of a closed picker (*P2*).** A form can hold a closed picker in each row. The stops field of Places (`apps/places/src/components/place-form-drawer/trip-stops-field.tsx`) renders a `DatePicker` and an `AddressInput` for each stop. The browser suite measures the closed shell of a menu (`menu-mount.bench.tsx`) and of a popover (`popover-mount.bench.tsx`), but not of a picker. `combobox.bench.tsx` measures a closed `Combobox` only under jsdom. Add a browser bench for a closed picker on the shape of `popover-mount.bench.tsx`, with a rung for each picker. Record its findings in a dated section of `__benchmarks__/browser/README.md`, and gate the costly parts of a closed picker, as the menu work did.

2. **Markdown: the lex of a streamed source (*P2*).** `Markdown` lexes its whole source each time the source changes (`markdown-lex.ts`). A chat reply streams as cumulative snapshots, so the streaming bubble lexes each snapshot from the start. The total cost grows with the square of the reply. Each snapshot also takes an entry in the token cache, which holds `MARKDOWN_CACHE_SIZE` sources. A long reply thus pushes out the tokens of the settled messages, and a windowed row that mounts again must lex again.

   Lex only the tail. When the new source extends the old one, keep the tokens before the last block, and lex from that block. Do not cache a snapshot that a longer source replaces. Open question: a link reference that a source defines late changes earlier tokens. Measure with a new Markdown bench that streams a long reply in small chunks, beside the stream scenario of `chat-render.bench.tsx`.

3. **SignaturePad: the encode at each stroke end (*P3*).** `signature-pad/use-signature-pad-drawing.ts` calls `canvas.toDataURL()` at the end of each stroke. The encode is synchronous at the pixel ratio of the device, so a large pad on a dense screen can make a long task. No bench measures it. Add a browser bench that times a stroke end on a pad at a device pixel ratio of 3. Change the emit only if the bench shows a task of more than 50 ms.

## Accessibility and testing

1. **Tooltip: content that the pointer can hover (*P1*).** A tooltip that is not `interactive` sets `pointer-events: none` on its panel (`tooltip-body.tsx`). It takes no `safePolygon` (`use-tooltip-state.ts`). It closes when the pointer leaves the trigger, so the pointer cannot move onto the text. WCAG 2.2 SC 1.4.13 (AA) requires that the pointer can move over such content and the content stays, for example under a screen magnifier. Radix makes tooltip content hoverable by default.

   Give each hover tooltip `safePolygon` and a panel that takes the pointer, with no focus trap. Keep `interactive` for the `role="dialog"` form only. Proof: update the `pointer-events` case in `tooltip.test.tsx`. Add a browser case that moves the pointer from the trigger onto the panel and waits past the close delay.

2. **DatePicker: the range and relative panels in the corpus (*P2*).** The corpus case of `DatePicker` in `a11y/cases/interactive.tsx` opens a single-date picker only. The range calendar and the relative presets, chips, and custom range get no axe scan and no focus checks. Places uses both in its trip form and its filter bar. Add a corpus case that opens a `range` picker and one that opens a `relative` picker with `multiple`. Each case gives its subject to the baseline and focus sweeps.

3. **HoldButton: an instruction and a path for assistive technology (*P2*).** The name of a `HoldButton` does not tell the reader to hold it. WCAG 2.2 SC 3.3.2 asks for an instruction where a control needs input. Also, a screen reader in browse mode can send a click with no press before it, and the button then does nothing. Give the button a description from the catalog, such as "Press and hold", through `aria-describedby`. For a click that no press started, ask with `useConfirm()` and run `onHoldComplete` on a yes. The open question is the text of that confirm, so prove the description first in `hold-button.test.tsx`.

4. **Button: a warning for an icon-only button with no name (*P2*).** `button/button.tsx` knows when a button has no text label (`hasLabel`). It does not warn when such a button also has no `aria-label`, no `aria-labelledby`, and no visually hidden child. React Aria warns in this case. The axe sweep finds such a button only in the corpus, and not in an app. Add a `useDevWarning` for that case. Prove it in `button.test.tsx`.

5. **Corpus: a subject for each barreled component (*P2*).** The shared corpus (`__tests__/a11y/cases`) has no subject for `ContextMenu`, `Swatch`, `DateTime`, `CodeBlock`, `AvatarGroup`, `TableEmpty`, or `TableLoading`. The axe gate of `a11y/baseline.test.tsx` and the sweeps of `sweeps/capabilities.test.tsx` thus never render them. `Swatch` takes `role="img"` with a name, and `TableLoading` sets `aria-busy` (CONVENTIONS §3.7), so each has a contract that axe can read.

   Add the subjects, with the context menu among the overlays and opened by a right-click. Then add a gate in the form of `disclosure-state-boundary.test.ts`. It finds each barreled component of `components/` with no subject, and its exemption list gives a reason for each exemption. Proof: the gate fails on a new component that has no subject.

## Not planned

- A segmented one-time-code field, as in Mantine `PinInput`. Both two-step forms (`packages/shared/src/auth/second-step.tsx` and the Admin two-step page) use one `Input` with `autoComplete="one-time-code"` and `inputMode="numeric"`. One field takes a paste and the autofill of the platform, and a screen reader reads one field, not one for each digit.

- A built-in filter on `Combobox`. The consumer filters with `useComboboxDeferredQuery`, so the app owns the match rule, such as the accent fold of the region filter in Places.

- Locale-formatted text in `NumberInput`, such as group marks and units. `CurrencyInput` owns the formatted-text path. `NumberInput` keeps `type="number"`, which gives the native spinbutton and the numeric keypad on a phone.

- A time field. No app enters a time of day, and `DatePicker` keeps the time of day of its value. Add a time field on `useFormattedInput` when an app needs one.

- An array value on `CheckboxGroup`. Each `Checkbox` binds its own boolean field, as the checkbox demo of the form module does. An array value adds a second binding for the same set.

- A native `disabled` on a `Button` in a locked scope. The lock makes the button `aria-disabled`, so it keeps the focus. Chromium moves the focus of a control that becomes disabled to the body.

- Sorting, selection, and pagination in `Table`. `Table` is a static-tier component for a table that the server renders, and `Grid` is the interactive table.

- A promise helper on `Toast`, as in Sonner. When a live id replaces its toast (the first feature), a call with the same id moves a loading toast to its result. A second API adds nothing.

- Raw HTML in `Markdown`. The renderer drops each `html` token, because a chat transcript renders text that the reader does not control.

- A rename of `dismissOnBackdrop` to a `closeOn*` name. It is one name across `Dialog`, `Drawer`, `Sheet`, `CommandPalette`, `Lightbox`, and the panel primitive. A rename breaks each consumer and adds no behavior (CLAUDE.md §1.5).

- Separate keys for the open state and the photo of `Lightbox`. `index` holds the two, and `null` is the closed state. Two keys can disagree, as in an open viewer with no photo.

---

**See also:** [`docs/COMPONENTS.md`](../../docs/COMPONENTS.md) · [`../../ROADMAP.md`](../../ROADMAP.md) · [`CONVENTIONS.md`](../../../../CONVENTIONS.md).
