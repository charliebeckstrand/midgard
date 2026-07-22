# API Consistency Audit — one vocabulary across the `ui` surface

**Date:** 2026-07-22 · **Scope:** the public prop API of every `ui` component, module, layout, primitive, and provider, examined for cross-surface consistency and idiom — naming, controlled/uncontrolled contracts, enum vocabularies, callback shapes, passthrough policy, and type exports. Superfluous-prop pruning was out of scope (a separate audit covers it). **Method:** eight parallel source-read sweeps, one per surface bucket (text/value controls, selection controls, overlays, layout/display, navigation/structure, chart+map, grid+query, chat/providers/vocabulary), each tracing prop definitions to source; headline claims re-verified against source at synthesis. **Living record — resolve rows in place with the commit.**

## Executive summary

The architecture is in good shape where it is centralized: polymorphism runs through one `Polymorphic`/`PolymorphicStatic` pair with no hand-rolled bypass, `createContext`/`createSlot`/`createPanel` naming is uniform, the grid's `value`/`defaultValue`/`onValueChange` bindings with `manual` flags are a model of consistency, `onOpenChange` payloads are uniformly `(open: boolean)`, and the glass→surface translation is applied identically across every panel. The inconsistencies live at the edges, and they cluster: the word `size` names five different scales; the §7.3 `null`/`undefined` contract is implemented by half the controls and contradicted by the other half; controlled/uncontrolled triads are missing arms on a dozen surfaces; `onValueChange` is twice used as something other than a state echo; and near-identical unions are re-declared under private names in at least eight places. Each cluster resolves with one rule applied mechanically, which is how the findings below are organized: ten cross-cutting themes, each a decision, then the per-surface rows that instantiate them.

## Cross-cutting themes — one decision each

**T1 — `size` must mean one thing: the component scale step.** The recipe census counts 35 `size` axes; the overwhelming majority are the `Step` scale (`sm|md|lg`). The outliers: Dialog/Sheet/CommandPalette use `size` for a *max-width* scale (`xs`–`7xl`|`full` — `recipes/kiso/shaku/panel.ts:9-22`), so `size="lg"` widens a Sheet but densifies a Drawer (`drawer.tsx:28`); ScrollArea's `size` is a viewport-dimension preset (`sm`–`2xl`|`dvh`|`dvw`, `recipes/kiso/shaku/scroll-area.ts:13-22`); ProgressGauge takes `sm`–`xl` while sibling ProgressBar takes `Step` (`recipes/kata/progress.ts:59-64` vs `progress-bar.tsx:23`); Loading/Swatch/StatusDot run `xs`–`xl`; Button/Badge/Icon run `xs`–`lg`. Decision: `size` always means the component's scale step; rename the panel width axis to `width` (Dialog, Sheet, CommandPalette) and ScrollArea's to `extent`; align ProgressGauge onto ProgressBar's set. The nested scales themselves (`Step ⊂ Size ⊂ Ma`) are deliberate and stay; what goes is same-word-different-axis. Alternative considered and rejected: reserving `size` for width and renaming the density knob to `density` — it loses to the 35-axis majority and would collide with the `density: DensityLevel` vocabulary on Table/Grid.

**T2 — Finish implementing §7.3.** `undefined` = uncontrolled, `null` = controlled-with-no-value is the written contract, and `useControllable`/`useFormValue` implement it — but `useInputValue` is presence-based (`'value' in props`, `use-input-value.ts:47-49`), so `value={undefined}` means "controlled, empty" on Input/Textarea and "uncontrolled" everywhere else; the single-select family types `value?: T` without `| null` and emits `undefined` on clear (Listbox `listbox.tsx:89`, Combobox, DatePicker), so a controlled consumer echoing the cleared value back silently flips to uncontrolled; the `current` cascade (Tabs/Nav) cannot express controlled-empty at all while Accordion can; Calendar accepts `Date | null` in but its callback can only emit `Date` (`calendar.tsx:72-74`). Decision: §7.3 wins everywhere — key `useInputValue` on `value !== undefined`, widen every controlled value channel to `T | null`, and make every clear path emit `null`.

**T3 — Every stateful control ships the full triad, or documents why not.** Missing arms found: Popover has no `defaultOpen` (`popover.tsx:14-15`) while Menu has the full triad; Nav has no `defaultValue` and bypasses `useCurrentState` (`nav.tsx:7-17`); Stepper is controlled-only (`stepper.tsx:14-15`); ToggleIconButton requires `pressed` with no `defaultPressed`/`onPressedChange` (`toggle-icon-button.tsx:15-16`); ChatPrompt requires `value` with no `defaultValue` (`chat-prompt.tsx:15-17`); DatePicker exposes neither `open`/`onOpenChange` nor `readOnly` though its trigger siblings do (`date-picker.tsx:112-155`); SearchInput is the only value wrapper without `onValueChange` (`search-input.tsx:18-34`); RangeSlider drops the `name` binding, `ref`, and rest that Slider carries (`range-slider.tsx:13-41`). Decision: fill the arms; where controlled-only is deliberate (Tooltip's `forceOpen` hover contract), the TSDoc states it as a contract.

**T4 — Callback grammar: `on<State>Change` echoes bound state; verbs name events; pairs are symmetric.** Violations: Kanban's `onValueChange` is a reorder sink with no value triad (`kanban.tsx:26` — List spells the same thing `onReorder`, `list.tsx:47`); `GridEditableConfig.onValueChange` is a commit sink for `CellChange[]` while the module's fourteen other bindings use the name as a state echo (`grid-editing-types.ts:96`); ContextMenu spells the choose-and-close event `onSelect` where Menu and CommandPalette spell it `onAction`; FileUpload pairs noun `onFiles` with verb `onReject` (`file-upload.tsx:37-39`); HoldButton prefixes two of three lifecycle callbacks (`onHoldStart`/`onHoldCancel`/bare `onComplete`, `hold-button.tsx:22-26`); chat splits one lifecycle across `onSubmit`/`onSent`; `useToast().dismiss({ id })` takes an object where `toast()` returns the bare id (`providers/toast/context.ts:7-8`). Decision: rename to `onReorder`, `onCommit`, `onAction`, `onAccept`/`onReject`, `onHoldComplete`, keep `onSubmit` for the gesture, and flatten `dismiss(id)`.

**T5 — One name per concept, table of record.** `orientation` (`horizontal|vertical`) is the house axis; Flex/Stack `direction` stays as the documented CSS-mirroring exception (it needs `-reverse`), and ShinyText's unrelated `direction: 'left'|'right'` renames (`sweep`). `placement` is reserved for anchored floating geometry (Popover/Tooltip/Menu); Dialog's `'center'|'top'` renames to `align` and ContextMenu's ordering `position` renames to `insert`; Sheet `side` and Toast `position` name genuinely different geometries and stand. Full-width is `full` (Flex), not `block` (Alert). Corner radius is `radius` with tokens (Box), not `rounded` (Badge tokens, ScrollArea boolean). Suppression polarity is `disabled` (Tooltip's `enabled` inverts). `label` means accessible name everywhere (Icon/Swatch/StatusDot/Loading); ProgressGauge's visible center readout renames (`centerLabel`). Sticky pinning is boolean `sticky` (Banner's `position: 'static'|'sticky'`, SidebarLayout's `stickyHeader` converge). `clearable` defaults `false` across the select family (DatePicker's `true` contradicts its own parity TSDoc, `date-picker.tsx:134-139`). `value` is reserved for controlled state — CopyButton's clipboard payload renames to `text` (`copy-button.tsx:14-15`).

**T6 — One severity vocabulary, one speaker vocabulary.** The canonical feedback quartet is Alert's `info|success|warning|error` (it drives ARIA roles). ToastSeverity's `default|secondary` are style words in a severity axis — `default` maps to the slot Alert calls `info`, `secondary` collides with button-variant vocabulary (`providers/toast/types.ts:3`, `toast-alert.tsx:27-33`); align on the quartet plus `neutral`. Text's `severity` (`default|primary|…|muted`) is an emphasis ladder, not a severity — rename the axis to `tone` (`recipes/kata/text.ts:18-25`). The validation-severity trio (`error|warning|success`, `core/validation-attrs.ts:4`) is a distinct, coherent axis; `MessageSeverity` should alias it instead of re-spelling it. Chat's speaker axis is spelled `role: 'user'|'agent'` in data but `type: 'user'|'assistant'|'system'` in the component and recipe — the only `type` axis in the recipe layer — with a hand-written mapping between them (`chat-transcript.tsx:40`); standardize on `role` with `user|assistant|system`.

**T7 — Passthrough policy: open by default, resolved wiring wins.** Roots spread native props and accept a React-19 `ref` unless a collision forces an `Omit`; today eight structure roots are closed bags (Accordion, Collapse, Timeline, Stepper, Toolbar, Tree, List, Kanban) while six near-identical siblings spread, with no principle; TagInput and AddressInput enumerate a closed set while every input sibling extends `InputProps`; most static layout leaves take no `ref` (Flex, Stack, Split, Container, Text, Heading, Badge) while Box/Group do. Rest-spread ordering must protect resolved wiring: Switch spreads rest first so the cascade wins (`switch.tsx:114-118`); Checkbox/Radio spread rest last, letting a stray `checked`/`onChange` clobber the form binding (`checkbox.tsx:100`, `radio.tsx:59`). `className` targets what the name implies: `Overlay.className` styles the backdrop and silently no-ops when `backdrop={false}` — rename `backdropClassName` (`overlay.tsx:30-35`); `Menu.className` lands on a `display: contents` wrapper.

**T8 — Feature-enable idiom: presence enables; default-on takes `| false`; `true` means defaults.** The grid alone uses five idioms (presence-of-object; `boolean | object`; flat default-on boolean; an `enabled` field inside `columnManager`; `Config | false` on `contextMenu`). Decision: presence of a config enables the feature; default-on features accept `| false`; `boolean | Config` unions read `true` as all-defaults; no `enabled` keys inside config objects (`columnManager={false}` replaces `columnManager.enabled`). Charts follow the complement for unsupported props: type-level `Omit` (pie's precedent, `types.ts:99`) over accept-and-ignore (heatmap discards `animate`/`texture`/`subtitle` at runtime, `heatmap-chart.tsx:672-675`; scatter documents that `texture` "is ignored here").

**T9 — Type-export hygiene.** Every barrel-exported component exports `<Name>Props` (missing: `SelectTriggerProps`, `DensityProviderProps`, `LocaleProviderProps`+`LocaleConfig`, `ToastProviderProps`+`ToastInput`+`ToastSeverity`+`ToastPosition`, `UIProviderProps`; hook options: `RovingOptions`, `DismissableOptions`, `FloatingUIOptions` are private while their hooks are public, under three competing naming schemes). No `@internal` symbol rides a public barrel (map `RangeArrow`/`RangeLegend`, hooks `useHoverAcrossScroll`/`usePlotFrame`). No renaming re-exports (`SelectOptionComponentProps` → `SelectOptionProps` per §8.1; query's `QueryGroup as QueryGroupNode` alias avoids no collision). Module state types carry the module prefix (`SortState` → `GridSortState`, `CellChange` → `GridCellChange`). Duplicated unions alias one definition: `ChartOrientation`/`RangeOrientation` → `Orientation`, `MapLegendPlacement` → `ChartLegendPlacement`, `ControlSize` = `Step` (one exported name), `TreeSize` = `Step`, `MessageSeverity` = `Severity`, `GridColumn.filterType` = `QueryFieldType`; chart prop generics uniformly default `<T = never>`.

**T10 — Compound vocabulary.** The value-matched swap region is "Panel" in four components and "Content" in two, and Tabs ships both spellings to encode manual-vs-auto wiring (`tab-panel.tsx` vs `tab-contents.tsx`) — pick one pairing rule. Grouping is Section+Heading composition (Menu), not a `title` prop (CommandPaletteGroup). `createPanel` mints Content for every surface but only Dialog exports it — export `SheetContent`/`DrawerContent`. Trigger contracts converge on the PopoverTrigger shape: `ReactNode` child, open state from context, automatic `aria-expanded` (PanelTrigger currently demands a lone `ReactElement` and hand-threaded `open`). Keyed compound children take `value` (Kanban's `columnId`/`cardId` are the outliers). Skeletons mirror the real component's props (`MapSkeleton.ratio` → `aspectRatio`, `BreadcrumbSkeleton.items` → `crumbs`, `ChartSkeleton` gains `aspectRatio`).

## Findings — text/value form controls

| # | Finding | Evidence | Fix | Status |
|---|---|---|---|---|
| F1 | `useInputValue` presence-based control contradicts §7.3 (T2) | `use-input-value.ts:47-49` vs `use-controllable.ts:31` | Key on `value !== undefined`; `null` = controlled-empty | ◯ OPEN |
| F2 | SearchInput lacks `onValueChange`; event-first outlier (T3) | `search-input.tsx:18-34` vs `mask-input.tsx:11` | Add `onValueChange`, keep `onChange` passthrough | ◯ OPEN |
| F3 | AddressInput missing `name`/`disabled`/`size`/`ref`/rest its base Combobox has; ColorPicker resolves Control context but has no `name` | `address-input.tsx:16-41` vs `combobox.tsx:54,60`; `color-picker.tsx:13-41` | Forward the surface; bind or document unbindable | ◯ OPEN |
| F4 | `Step` vs `ControlSize`: one axis, two exported names (T9) | `input.tsx:18` vs `control/context.ts:6` | `export type ControlSize = Step`; one public name | ◯ OPEN |
| F5 | `T \| null` acceptance inconsistent across wrappers (T2) | `number-input.tsx:18` (yes) vs `mask-input.tsx:8`, `tag-input.tsx:33` (no) | Widen all to `T \| null` | ◯ OPEN |
| F6 | TagInput/AddressInput closed prop bags, no rest (T7) | `tag-input.tsx:25-59` | Extend `Omit<InputProps, …>`, spread rest | ◯ OPEN |
| F7 | TagInput/AddressInput unconditional `aria-label` shadows a Field label | `tag-input.tsx:176`, `address-input.tsx:110` vs `date-input.tsx:187` | Adopt the `control?.labelledBy` yield | ◯ OPEN |
| F8 | Clear affordance split: `onClear` (SearchInput) vs `clearable` (DateInput) (T5) | `search-input.tsx:27,109-121` vs `date-input.tsx:57` | Both get `clearable`; `onValueChange(null)` is the clear signal | ◯ OPEN |
| F9 | `autoComplete` hard-Omitted on Phone/Zipcode, default-overridable on CreditCard/Date | `phone-input.tsx:17-20` vs `credit-card-input.tsx:71,91` | Default-then-overridable everywhere | ◯ OPEN |
| F10 | Affix override policy drifts; NumberInput bans `prefix` outright | `number-input.tsx:16` vs `currency-input.tsx:101-102`, `search-input.tsx:28-33` | Un-Omit `prefix`; rule: own chrome keeps its slot, caller content joins beside | ◯ OPEN |
| F11 | Inline `variant` unions and `MessageSeverity` re-spell exported aliases (T9) | `input.tsx:19`, `fieldset/message.tsx:13` vs `control/context.ts:9`, `validation-attrs.ts:4` | Reference `ControlVariant`; alias `MessageSeverity = Severity` | ◯ OPEN |
| F12 | `tag?: { color }` single-key config bag | `tag-input.tsx:31` | Flatten to `tagColor` | ◯ OPEN |
| F13 | Expiry/Cvv/PasswordConfirmInput missing or bespoke `data-slot` anchors | `credit-card-input-expiry.tsx:84-126`, `password-confirm-input.tsx:52` | Stamp proper `data-slot` values | ◯ OPEN |
| F14 | Cvv lacks the `invalidMessage` surface Expiry and DateInput share | `credit-card-input-cvv.tsx:22` vs `credit-card-input-expiry.tsx:31,131` | Add or document the omission | ◯ OPEN |
| F15 | CurrencyInput advertises inert native `min`/`max`/`step` | `currency-input.tsx:13-16` vs `number-input.tsx:22-28` | Omit or implement clamping | ◯ OPEN |
| F16 | Suppress-a-sub-element idiom: `toggleButton` (noun-as-boolean) vs `showRules` vs `clearable` | `password-input.tsx:13`, `password-strength.tsx:45`, `date-input.tsx:57` | Rename `toggleButton`; keep `X \| false` only where the prop carries data | ◯ OPEN |

## Findings — selection controls & buttons

| # | Finding | Evidence | Fix | Status |
|---|---|---|---|---|
| S1 | Single-select `value` lacks `\| null`; clear emits `undefined` (T2) | `listbox.tsx:89`, `combobox.tsx:113`, `date-picker.tsx:28` vs `use-form-value.ts:9` | Widen; emit `null` on clear | ◯ OPEN |
| S2 | `clearable` default drift: DatePicker `true` vs family `false`, contradicting its own TSDoc (T5) | `date-picker.tsx:134-139,227` vs `listbox.tsx:166` | DatePicker → `false` | ◯ OPEN |
| S3 | DatePicker missing `open`/`onOpenChange`/`readOnly` (T3) | `date-picker.tsx:112-155` vs `listbox.tsx:42,77-79` | Add all three | ◯ OPEN |
| S4 | Combobox missing `aria-labelledby`/`aria-describedby` Listbox has (its own doc asserts parity) | `combobox.tsx:52-108` vs `listbox.tsx:46,55-56` | Add via `useAriaIds` | ◯ OPEN |
| S5 | Calendar callback can't emit clear; `defaultValue` excludes `null` (T2) | `calendar.tsx:72-74` | `onValueChange(value: Date \| null)`; widen `defaultValue` | ◯ OPEN |
| S6 | `SelectOptionComponentProps` naming breaks §8.1 (T9) | `select-option.tsx:3-7` | `SelectOptionProps` / `SelectLabelProps` / `SelectDescriptionProps` | ◯ OPEN |
| S7 | Rest-spread ordering: Checkbox/Radio let rest clobber the form cascade (T7) | `checkbox.tsx:100`, `radio.tsx:59` vs `switch.tsx:114-118` | Adopt Switch's protected ordering | ◯ OPEN |
| S8 | `onHoldStart`/`onHoldCancel`/bare `onComplete` (T4) | `hold-button.tsx:22-26` | `onHoldComplete` | ◯ OPEN |
| S9 | `onFiles`/`onReject` asymmetric pair (T4) | `file-upload.tsx:37-39` | `onAccept`/`onReject` | ◯ OPEN |
| S10 | `SelectCapitalize` and `SelectTriggerProps` unreachable from barrels (T9) | `select-trigger/capitalize.ts:8`, `select-trigger/index.ts:1` | Export both | ◯ OPEN |
| S11 | Radio is the only toggle outside the §7.2 cascade — `name` binds on Checkbox/Switch, not Radio | `radio.tsx:17-22` vs `checkbox.tsx:47`, `switch.tsx:42` | Resolve the bound field in RadioGroup, or mirror the remark onto `RadioGroupProps` | ◯ OPEN |
| S12 | CopyButton overloads `value` for the clipboard payload (T5) | `copy-button.tsx:14-15` | Rename `text` | ◯ OPEN |
| S13 | ToggleIconButton controlled-only, no `onPressedChange`/`defaultPressed` (T3) | `toggle-icon-button.tsx:15-16` | Add both | ◯ OPEN |
| S14 | RangeSlider drops `name`/`ref`/rest that Slider carries (T3, T7) | `range-slider.tsx:13-41` vs `slider.tsx:12-29,70` | Add `name` via `useFormValue`, root `ref` | ◯ OPEN |

## Findings — overlays & floating surfaces

| # | Finding | Evidence | Fix | Status |
|---|---|---|---|---|
| O1 | `size` = width on Dialog/Sheet, density Step on Drawer/Popover/Tooltip/Menu (T1) | `recipes/kiso/shaku/panel.ts:9-22` vs `drawer.tsx:28` | Rename the width axis `width`; `size` stays the Step | ◯ OPEN |
| O2 | Placement fractured: Dialog `placement: 'center'\|'top'`, ContextMenu `position` = ordering (T5) | `dialog.tsx:22`, `context-menu/types.ts:42,65` | Dialog → `align`; ContextMenu → `insert`; `placement` reserved for anchored geometry | ◯ OPEN |
| O3 | `dismissOnBackdrop`/`modal`/`container` unevenly exposed across Dialog/Sheet/Drawer | `dialog.tsx:24` vs `sheet.tsx:31,46,54`; `overlay.tsx:28,44` | Expose the Overlay knobs uniformly | ◯ OPEN |
| O4 | `onSelect` (ContextMenu) vs `onAction` (Menu, CommandPalette) (T4) | `context-menu/types.ts:22` vs `menu-item.tsx:17` | `onAction` | ◯ OPEN |
| O5 | Tooltip `enabled` vs house `disabled` polarity (T5) | `tooltip.tsx:30` vs `context-menu.tsx:20` | `disabled`, inverted default | ◯ OPEN |
| O6 | Popover missing `defaultOpen` (T3) | `popover.tsx:14-15` vs `menu.tsx:11-13` | Add via `useFloatingDisclosure` | ◯ OPEN |
| O7 | `glass` opt-in on panels only; floating content parts are ambient-only though the primitive supports it | `dialog.tsx:26` vs `primitives/popover/popover.tsx:69` | Expose `glass` on Popover/Tooltip/Menu content | ◯ OPEN |
| O8 | PanelTrigger demands `ReactElement` + hand-threaded `open`; PopoverTrigger reads context (T10) | `panel-trigger.tsx:8,16` vs `popover-trigger.tsx:20` | Align on the PopoverTrigger contract | ◯ OPEN |
| O9 | `SheetContent`/`DrawerContent` unexported; CommandPalette groups by `title` prop vs Menu's Section+Heading (T10) | `panel.tsx:157-161`, `command-palette/slots.tsx:8` | Export the slots; add Section/Heading pair | ◯ OPEN |
| O10 | `Overlay.className` styles the backdrop and no-ops when `backdrop={false}`; `Menu.className` lands on `display: contents` (T7) | `overlay.tsx:30-35,139`, `menu.tsx:65` | `backdropClassName`; drop or document `Menu.className` | ◯ OPEN |
| O11 | ToastSeverity mixes style words into the severity axis (T6) | `providers/toast/types.ts:3`, `toast-alert.tsx:27-33` | `info`/`neutral` replace `default`/`secondary` | ◯ OPEN |
| O12 | Confirm can't distinguish Cancel from backdrop dismissal | `confirm.tsx:60,104,130` | Add `onCancel` fired only by the button | ◯ OPEN |
| O13 | `closeOnAction` on CommandPaletteItem but not MenuItem | `command-palette-item.tsx:16` vs `menu-item.tsx:49-54` | Add to MenuItem, same default | ◯ OPEN |
| O14 | `dismiss({ id })` object beside `toast() → string` (T4) | `providers/toast/context.ts:7-8` | `dismiss(id)` | ◯ OPEN |

## Findings — layout & display

| # | Finding | Evidence | Fix | Status |
|---|---|---|---|---|
| L1 | Tone axis: Alert `severity`, StatusDot/Avatar `status`, Text `severity`-as-tone (T6) | `alert.tsx:22`, `recipes/kata/status.ts:15`, `recipes/kata/text.ts:18-25` | Text axis → `tone`; `severity` reserved for the feedback quartet | ◯ OPEN |
| L2 | ProgressGauge `sm`–`xl` vs ProgressBar `Step`; ScrollArea `size` = dimension presets (T1) | `recipes/kata/progress.ts:59-64`, `recipes/kiso/shaku/scroll-area.ts:13-22` | Align Gauge; ScrollArea → `extent` | ◯ OPEN |
| L3 | `radius` (Box) vs `rounded` tokens (Badge) vs `rounded: boolean` (ScrollArea) (T5) | `box.tsx:34`, `recipes/kata/badge.ts:37`, `recipes/kata/scroll-area.ts:26-29` | `radius` + tokens everywhere | ◯ OPEN |
| L4 | `Responsive<T>` support is Flex/Stack-only; Split `orientation` is the sharpest gap | `flex.tsx:22-28` vs `split/split.tsx:19-31` | Extend to Split first, Box spacing second | ◯ OPEN |
| L5 | ShinyText `direction: 'left'\|'right'` collides with the layout axis (T5) | `shiny-text.tsx:49` | Rename (`sweep`) | ◯ OPEN |
| L6 | ProgressGauge `label` = visible content while five siblings use `label` = accessible name (T5) | `progress-gauge.tsx:28` vs `icon.tsx:22` | `centerLabel` | ◯ OPEN |
| L7 | `full` (Flex) vs `block` (Alert; Banner must Omit it) (T5) | `flex.tsx:36`, `alert.tsx:73` | `full` | ◯ OPEN |
| L8 | Box TSDoc promises `as` it doesn't expose; `as` re-added ad hoc on Text/ListItem | `box.tsx:51-52`, `polymorphic-static.tsx:25-33` | Add `as` to Box (and Heading) or fix the doc; state the rule | ◯ OPEN |
| L9 | `ref` parity arbitrary across static leaves (T7) | `box.tsx:45` (yes) vs `flex.tsx:40`, `container.tsx:27` (no) | React-19 `ref` on every static leaf | ◯ OPEN |
| L10 | Zero-spacing spelled `0` (Flex), `'none'` (Container), absent (Split/Box) | `flex/variants.ts:6`, `recipes/kata/container.ts:14`, `split/variants.ts:12` | One `0` stop on the Ma scale | ◯ OPEN |
| L11 | Sparkline `variant: 'line'\|'bar'` is mark geometry — Swatch calls that `shape` | `sparkline.tsx:30` vs `recipes/kata/swatch.ts:23-27` | `shape` | ◯ OPEN |
| L12 | Container `padding` duplicates Box `px` under a different name and silently different scale | `recipes/kata/container.ts:16` vs `recipes/kiso/ma/stops.ts:10-16` | Rename `px`, re-key onto Ma | ◯ OPEN |
| L13 | `data-orientation` stamped by Dl/List/Resizable, differently by Group, not at all by Divider/ScrollArea | `description-list.tsx:38`, `group.tsx:69`, `divider.tsx:23-25` | Stamp uniformly | ◯ OPEN |
| L14 | Layout slot surfaces drift: SidebarLayoutFooter takes no `className`, Body slots get `ref` while Header/Footer don't | `layouts/sidebar/sidebar.tsx:204` vs `stacked.tsx:56` | Uniform `className`/`ref` on slots; rule: wrapping regions compound, off-tree panels props | ◯ OPEN |
| L15 | Banner `position: 'static'\|'sticky'` vs SidebarLayout `stickyHeader: boolean` (T5) | `banner.tsx:10`, `layouts/sidebar/sidebar.tsx:42` | Boolean `sticky` both | ◯ OPEN |

## Findings — navigation & structure

| # | Finding | Evidence | Fix | Status |
|---|---|---|---|---|
| N1 | Kanban `onValueChange` is a reorder sink; List spells it `onReorder` (T4) | `kanban.tsx:26` vs `list.tsx:47` | `onReorder` | ◯ OPEN |
| N2 | Tabs/Nav `current` cascade can't express controlled-empty; Accordion can (T2) | `primitives/current/current.ts:36-37` vs `use-accordion-selection.ts:12-14` | Widen to `string \| null` | ◯ OPEN |
| N3 | Stepper and Nav are controlled-only; Nav bypasses `useCurrentState` (T3) | `stepper.tsx:14-15`, `nav.tsx:7-17` | Full triads via the shared primitive | ◯ OPEN |
| N4 | "Panel" (Accordion/Collapse/Stepper) vs "Content" (Tabs/Nav); Tabs ships both to encode wiring (T10) | `tab-panel.tsx:10,16` vs `tab-contents.tsx:13-14` | One pairing rule; fold or document | ◯ OPEN |
| N5 | TimelineItem emits `aria-current` bare `true` while Stepper emits `'step'` | `timeline-item.tsx:15,50` vs `stepper-step.tsx:130,148` | `aria-current="step"` | ◯ OPEN |
| N6 | Kanban keys parts with `columnId`/`cardId`; siblings use `value` (T10) | `kanban-column.tsx:18`, `kanban-card.tsx:12` vs `tab.tsx:22` | `value` | ◯ OPEN |
| N7 | `AccessibleName` on Toolbar/TabList/Tree/Filters vs loose `'aria-label'?` on Kanban/List | `toolbar.tsx:13` vs `kanban.tsx:31`, `list.tsx:33` | Intersect with `AccessibleName` | ◯ OPEN |
| N8 | Eight structure roots are closed prop bags; six siblings spread (T7) | `accordion.tsx:19-23` vs `tabs.tsx:11` | Default to native passthrough | ◯ OPEN |
| N9 | PivotTable narrows Table's `striped` axis and silently drops `hover`/`bleed` | `pivot-table.tsx:44` vs `table.tsx:25` | `TableVariants['striped']` | ◯ OPEN |
| N10 | NavList inline orientation union; `TreeSize` hand-written (T9) | `nav-list.tsx:15`, `recipes/kata/tree.ts:19` | Alias `Orientation` / `Step` | ◯ OPEN |
| N11 | Skeleton count props: `pages`/`steps`/`tabs` vs `BreadcrumbSkeleton.items` (T10) | `breadcrumb-skeleton.tsx:10` | `crumbs` | ◯ OPEN |
| N12 | Kanban's data-prop + compound-children hybrid requires the same ids twice, unenforced | `kanban.tsx:22`, `kanban-column.tsx:45` | Render-function modeling, or document + dev-warn | ◯ OPEN |

## Findings — chart & map modules

| # | Finding | Evidence | Fix | Status |
|---|---|---|---|---|
| C1 | Documented legend form `{ type: 'range' }` doesn't typecheck | TSDoc ×4 (`heatmap-chart-schema.ts:68` et al.) vs `chart-legend/range.ts:24-31` | Add `type?: 'range'` | ◯ OPEN |
| C2 | Choropleth→MapPlat seam renames five of six shared fields, both public | `choropleth-chart.tsx:30-42,240-247` vs `map-plat.tsx:74-126` | Align MapPlat on the chart spelling (`formatValue`, `colorDomain`, `colorName`) | ◯ OPEN |
| C3 | `tooltip` narrowed to bare `boolean` on Choropleth/MapPlat — click-pin unavailable on maps | `engine/types.ts:233` vs `choropleth-chart.tsx:126`, `map-plat.tsx:233` | Widen to the union | ◯ OPEN |
| C4 | Single-series modeled three ways: tuple (pie) vs array-ignore (heatmap) vs array-first (choropleth) | `sector-chart.tsx:66`, `heatmap-chart-schema.ts:62-63`, `choropleth-chart.tsx:68-69` | Tuple everywhere | ◯ OPEN |
| C5 | Unsupported base props accept-and-ignored instead of Omitted (T8) | `heatmap-chart.tsx:672-675`, `scatter-chart.tsx:554-555` vs `types.ts:99` | Extend the Omits | ◯ OPEN |
| C6 | Scatter/bubble series `color` slot-only; cartesian takes slot-or-raw | `types.ts:125` vs `types.ts:59` | Widen to `ChartSeriesColor` | ◯ OPEN |
| C7 | `binning` on choropleth/MapPlat, missing on heatmap despite claimed parity | `map-plat.tsx:120` vs `heatmap-chart-schema.ts:43-47,5-7` | Add | ◯ OPEN |
| C8 | `onCategoryClick` redeclared not shared; no click hook on scatter/heatmap/choropleth/map | `types.ts:325` + `sector-chart.tsx:89` | Shared handler type; add `onRegionClick`-shaped hooks | ◯ OPEN |
| C9 | Three private spellings of `Orientation`, two of legend placement (T9) | `chart-orientation.ts:22`, `map-range-legend.tsx:23`, `map/types.ts:85` | Alias the shared types | ◯ OPEN |
| C10 | `points` default `false` (Line/Area) vs `true` (Combo) | `line-chart.tsx:40-44` vs `combo-chart.tsx:51-54` | `false` everywhere | ◯ OPEN |
| C11 | Generic defaults: `<T = never>` on map-side only (T9) | `heatmap-chart-schema.ts:61` vs `bar-chart.tsx:37` | `= never` everywhere | ◯ OPEN |
| C12 | Map barrel exports `@internal` symbols; `RangeOrientation` referenced but unexported (T9) | `map-range-legend.tsx:25-133`, `map/index.ts:5-10` | De-internal + export, or unbarrel | ◯ OPEN |
| C13 | `MapSkeleton.ratio` vs `MapPlat.aspectRatio`; ChartSkeleton can't reserve the aspect box (T10) | `map-skeleton.tsx:17` vs `map-plat.tsx:195`; `chart-skeleton.tsx:6` | Rename; add `aspectRatio` | ◯ OPEN |

## Findings — grid & query modules

| # | Finding | Evidence | Fix | Status |
|---|---|---|---|---|
| G1 | Five feature-enable idioms on one root (T8) | `grid-data-types.ts:26,516,671,790,833,858,890` | Presence enables; default-on takes `\| false`; drop `columnManager.enabled` | ◯ OPEN |
| G2 | `GridEditableConfig.onValueChange` is a commit sink (T4) | `grid-editing-types.ts:96` vs fourteen echo bindings | `onCommit`; row set becomes the standard triad | ◯ OPEN |
| G3 | Column identity: `column` vs `id` vs `columnId`, `string` vs `string \| number` | `context.ts:7`, `types.ts:358,417` | `columnId: string \| number` in every payload | ◯ OPEN |
| G4 | `SortState`/`CellChange` unprefixed in the barrel (T9) | `index.ts:1,41` | `GridSortState`/`GridCellChange` + deprecated aliases | ◯ OPEN |
| G5 | Expansion state `value` (expandable) vs `expanded` (groupBy); `defaultExpanded: boolean \| Set` double duty | `grid-data-types.ts:340-347` vs `:239,280,286` | Split the union; document the named-triad rule | ◯ OPEN |
| G6 | "Group" names three axes: `groupBy`, `groups`, `rowGroups` | `grid-data-types.ts:317,692,761` | Column bands → `columnGroups` | ◯ OPEN |
| G7 | Server total: `rowCount` (pagination) vs `totalRows` (infiniteScroll); footer `rows`/`total` third vocabulary | `types.ts:311` vs `grid-data-types.ts:92,576,583` | `rowCount`; footer → `visibleRows`/`totalRows` | ◯ OPEN |
| G8 | Column has three row-property channels (`value`, `field`, id-fallback); `field` ignored by sort/filter | `accessor.ts:15-17`, `types.ts:113` | `field` primary; fallback `value ?? row[field] ?? row[id]` | ◯ OPEN |
| G9 | `width: string` (CSS) vs `minWidth`/`maxWidth: number`, and width is parsed as px anyway | `types.ts:198-221` | `width?: number \| string` | ◯ OPEN |
| G10 | `reorder` TSDoc references a nonexistent `enabled` key | `grid-data-types.ts:885` vs `:424-435` | Fix the doc | ◯ OPEN |
| G11 | `preferences` prop vs `onSavePreset` callback; snapshot field style and `hidden` array-vs-Set drift | `grid-data-types.ts:470-476,529-548,733` | One noun, one field style, one collection type | ◯ OPEN |
| G12 | Visibility state nested in `columnManager` while order/sizing/pinning are top-level bindings | `grid-data-types.ts:529-540` vs `:735,744,798` | Top-level `columnVisibility`; manager = dialog UI only | ◯ OPEN |
| G13 | `filterType`/`filterOptions` duplicate query's types verbatim; filter state untyped (T9) | `types.ts:63,70` = `engine/types.ts:26,52` | Alias `QueryFieldType`; type the filter value | ◯ OPEN |
| G14 | `GridSearch.filter: boolean` encodes two presentation modes | `types.ts:408` | `mode?: 'filter' \| 'highlight'` | ◯ OPEN |
| G15 | `groupTotalRow`/`grandTotalRow?: 'bottom'` single-valued enums | `grid-data-types.ts:702,713` | Boolean, or commit to `'top'` | ◯ OPEN |
| G16 | `selectable` (-able, means "is the selector column") beside nouns `dragHandle`/`expander`; `readOnly` where flags predict `editable: false` | `types.ts:80,92,102,120` | `selector?: boolean`; `editable?: boolean` default true | ◯ OPEN |
| G17 | QueryBuilder edits `value`, QuerySummary reads `root`; barrel renames `QueryGroup` → `QueryGroupNode` with no collision (T9) | `query-builder.tsx:17` vs `query-summary.tsx:11`; `index.ts:11-14` | `value` on the summary; export declared names | ◯ OPEN |
| G18 | `condensed` boolean overlaps the `density` axis it sits beside | `grid-data-types.ts:638,663` | Fourth density level, or explicit decomposition | ◯ OPEN |

## Findings — chat, providers, hooks

| # | Finding | Evidence | Fix | Status |
|---|---|---|---|---|
| P1 | Speaker axis: `role: 'user'\|'agent'` (data) vs `type: 'user'\|'assistant'\|'system'` (component/recipe), hand-mapped (T6) | `modules/chat/types.ts:13`, `chat-message.tsx:7`, `chat-transcript.tsx:40` | `role` with `user\|assistant\|system` throughout | ◯ OPEN |
| P2 | `Chat` is the package's only snake_case public type | `types.ts:4-6` | camelCase, or move the wire shape out of `ui` (§4.1) | ◯ OPEN |
| P3 | `sending` (hook) vs `streaming` (every component it feeds) | `use-chat-send.ts:45` vs `chat-prompt.tsx:27` | Rename hook field `streaming` | ◯ OPEN |
| P4 | Provider `*Props`/config types unexported: Density, Locale (`LocaleConfig`), Toast (`ToastInput`, `ToastSeverity`, `ToastPosition`), UI (T9) | barrels at `density/index.ts`, `locale/index.ts:1-3`, `toast/index.ts:1-2`, `ui/index.ts` | Export all | ◯ OPEN |
| P5 | Nested-provider semantics diverge: UIProvider per-binding, LocaleProvider full-replace, undocumented | `ui.tsx:39-46` vs `locale.tsx:23-27` | Fold ambient config in, or document | ◯ OPEN |
| P6 | `@internal` hooks in the public barrel (T9) | `use-hover-across-scroll.ts:34-36`, `use-plot-frame.ts:204-206` vs `hooks/index.ts:36,46-53` | Unbarrel or de-internal | ◯ OPEN |
| P7 | Hook option-type naming: three schemes, most unexported (T9) | `use-chat-draft.ts:6,14` vs `hooks/a11y/index.ts` vs `use-dismissable.ts:7` | One scheme; export options/results of every public hook | ◯ OPEN |
| P8 | ChatPrompt controlled-only (T3) | `chat-prompt.tsx:15-17` | Add `defaultValue`, or document the contract | ◯ OPEN |
| P9 | `onSubmit` vs `onSent` for one lifecycle (T4) | `use-chat-draft.ts:8` vs `use-chat-send.ts:35` | `onSubmit` = gesture; rename/document `onSent` | ◯ OPEN |
| P10 | chat-list-item recipe ships a `timestamp` slot no prop feeds (§5.2) | `recipes/kata/chat-list-item.ts:50-53` vs `chat-list-item.tsx:12-24` | Delete or restore the prop | ◯ OPEN |
| P11 | Density primitive doc names the wrong level labels | `primitives/density/density.tsx:25-26` | Fix the comment | ◯ OPEN |
| P12 | `useChatList(): boolean` reads as a state accessor, returns a nesting flag | `modules/chat/context.ts:10` | `useInChatList`, or unbarrel | ◯ OPEN |

## Verified consistent — recorded so the next audit doesn't relitigate

Polymorphism is fully centralized (`Polymorphic`/`PolymorphicStatic`; Text, ListItem, Badge, Button, Box, BreadcrumbLink, PaginationPage, Group all delegate). `createContext`/`createSlot`/`createPanel` naming is uniform. Core utilities (`cn`, `dataAttr`/`ariaAttr`, `composeEventHandlers`, `querySlot`) are idiomatic. All `onOpenChange` payloads are `(open: boolean)`. The grid's triad bindings, uniform `manual` flag, shared `getKey`, and `onXStart`/`onXEnd` pairs are the module's strengths, as is grid filtering converging on the query engine's single operator vocabulary. The `Step ⊂ Size ⊂ Ma` scale nesting is deliberate (though `Size` could derive from `Ma` to pin the relationship). Chart deliberate asymmetries verified: AreaChart's default crosshair, pie's square aspect, choropleth's `'16/9'` override, the `format`-in-axis vs `formatValue`-flat boundary (uniform, and composes with `useFormat`/`LocaleProvider`). Flex/Stack `direction` is a legitimate CSS-mirroring exception to the `orientation` rule and should be documented as such.

## Reliability appendix

Every row was traced to its prop-type definition in source by the bucket sweeps; cross-bucket claims (T1, T2, T4, T6) and a sample of per-row claims (O1, F1, S1, N1, O11, P1) were independently re-verified against source at synthesis. Usage counts were not collected — this audit judges API shape, not adoption. Deliberate architecture screened out before flagging: the §7.2 binding cascade, recipe variants (§5.2), static/client tier split, `data-slot` anchors, and the documented Tooltip hover contract.
