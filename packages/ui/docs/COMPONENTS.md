# Components

> **Quick-glance index of every `ui` component**, grouped by domain. This is a flat inventory for orientation. Per-component behavior, props, and defaults live in each component's TSDoc — the `<Name>` doccomment and its `<Name>Props` type — and in the docs site (`pnpm --filter ui dev`). For structure, hooks, primitives, providers, the recipe layer, core, and utilities, see the sibling docs.

Each component is its own entry point — there is no root barrel:

```ts
import { Button } from 'ui/button'
import { Dialog } from 'ui/dialog'
```

Components split into a **static** (server-renderable) tier and a **client** tier; the boundary contract is in [`../REFERENCE.md`](../REFERENCE.md) §2.

## Inputs & form fields

`input` · `textarea` · `select` · `combobox` · `checkbox` · `radio` · `switch` · `slider` · `rating` · `number-input` · `currency-input` · `credit-card-input` · `address-input` · `mask-input` · `date-input` · `date-picker` · `calendar` · `color` · `file-upload` · `search-input` · `tag-input` · `signature-pad` · `password-input` · `password-confirm` · `password-strength`

For phone numbers and postal codes, give `mask-input` the `phoneMask` or `zipcodeMask` preset.

> A `clearable` `input` shows a clear button while it holds a value. The button comes before the `suffix`, empties the value through a native `input` event, and keeps the focus in the input. A disabled or read-only `input` shows no clear button. `clearLabel` gives the button its accessible name, `Clear` by default. `search-input` and `date-input` render this button, with the names `Clear search` and `Clear date`. `listbox`, `combobox`, and `date-picker` take the same `clearable` prop.

> `CheckboxGroup` and `RadioGroup` require their own name: give `aria-label` or `aria-labelledby`. The `<legend>` of an enclosing `<fieldset>` does not name the group.

> A `readOnly` or `disabled` `rating` renders one image. Its name is the consumer's name or the `Field` label, then the score readout. The image keeps the consumer's `aria-describedby` and the `Field` description and error message. A touch shows no preview, because a touch has no hover. A `rating` with `step={0.5}` has two radios for each star. The start half sets the half score, and the halves mirror in a right-to-left row.

> The floating pickers `Listbox`, `Combobox`, `DatePicker`, and `ColorPicker` take a `FloatingPlacement` ([`HOOKS.md`](HOOKS.md)). A `<side>-auto` value, such as `'bottom-auto'`, aligns the panel to the edge of the trigger that is nearer to the edge of the viewport. An explicit placement keeps its alignment.

> A `readOnly` `ColorPicker` does not open its panel. It takes `readOnly` from its own prop or from an enclosing `Control`. Its trigger stays focusable and keeps its tab stop, so a keyboard or a screen reader can read the color. The trigger is a button, and a button does not take `aria-readonly`, so it sets `aria-disabled` while the panel is closed. Only `disabled` sets the native `disabled` attribute.

> A `readOnly` `checkbox` or `switch` keeps its state. A click or a Space press does not change it, and `onChange` does not fire. It keeps the focus, submits its value, and sets `aria-readonly`. It takes `readOnly` from its own prop or from an enclosing `Control`. Its `className`, `style`, and `hidden` go to the visible box.

> A `readOnly` `RadioGroup` keeps its selection. A click, a Space press, or an arrow key does not check a `radio`, and `onChange` does not fire. The arrow keys still move the focus, and the checked `radio` submits its value. The group sets `aria-readonly`, and a `radio` does not, because ARIA defines the attribute on the group. The group takes `readOnly` from its own prop or from an enclosing `Control`. A `radio` takes it from its own prop, from its `Control`, or from its group.

## Form structure

`form` · `fieldset` · `control`

> `Form` turns off native validation (`noValidate`), so its validators run on each submit and every field shows its own message. Give each native constraint, such as `type="url"` or `required`, a validator, or pass `noValidate={false}`. `fieldset` provides the `Field` / `Label` / `Description` / `Message` / `Legend` family. `Field` takes `severity` (`error` / `warning` / `success`) and broadcasts it to the nested control. Nest a `<Message>` to render the feedback; bind it to a form field through its own `name`. An unbound `Message` with no `severity` takes the tone of its `Field`. An `error` or `warning` `Message` joins the `aria-describedby` of the control, and a `success` `Message` does not. `control` provides `Control`, the context that broadcasts the same field state to one control-aware descendant. Nest one `Control` for each field to group fields. A press on a `Label` keeps the focus on a control that has it. The `click` focuses a control that does not have it, as on a native label. Set `as="span"` on a `Label` when no labelable element has the control id. Examples are a `Rating` and a `SignaturePad`. The `span` has the style of a label and names the control through `aria-labelledby`, but it is not a native `<label>`.

## Buttons & actions

`button` · `copy-button` · `hold-button` · `toggle-icon-button`

> `CopyButton` is an icon button. For a copy control with a text label, use `useCopyButtonState` from `copy-button`. It gives `copied` and `copy`, with the same clipboard write, announcement, and revert timing as `CopyButton`. A call to `copy` during a write or in the copied window does nothing.

## Navigation

`nav` · `sidebar` · `breadcrumb` · `menu` · `context-menu` · `tabs` · `toolbar` · `stepper` · `link` · `command-palette`

> A `breadcrumb` trail wraps by default. With `collapse`, it stays on one line. The crumbs give way from the left, and each one becomes a `…` mark that the reader can still pick. The current page clips last. The fit is measured. A server-rendered trail carries a pre-paint step that measures the row before the first paint, so the first paint holds the fit. Give the `Breadcrumb` the full width of its line. Put an action that shares the line in the `<nav>`, after the list.

## Overlays

`dialog` · `drawer` · `sheet` · `popover` · `tooltip` · `confirm` · `alert` · `banner` · `toast`

> An `interactive` `tooltip` with a tabbable control in its content is a non-modal `role="dialog"`. The trigger names it and carries `aria-haspopup="dialog"`, `aria-expanded`, and `aria-controls`. Tab goes from the trigger into the panel controls and then on to the element after the trigger. Focus does not stay in the panel, and the page stays visible to assistive tech. Other tooltips are `role="tooltip"` and describe the trigger.

> `TooltipContent` loads its panel module, with Motion and the floating surface, in idle time after the hydration. The first hover or focus of a trigger starts the load sooner. The panel opens when the module is there. A page with no tooltip does not load Motion for it, and a page with a tooltip does not load Motion before it hydrates.

> `confirm` exports `Confirm` and `useConfirm`. `Confirm` is the controlled alertdialog. `useConfirm()` gives a function that asks a question in the one `Confirm` that `UIProvider` mounts. The provider loads the dialog in idle time after the hydration, or on the first question when that comes first. The function returns a promise that resolves `true` on a confirm and `false` on a cancel or a dismissal. An optional `action` keeps the dialog open, with the confirm button pending, until the work is done. Use `Confirm` for a message with custom children.

> `toast` holds the full toast unit. `ToastProvider` keeps the queue and the timers. `useToast()` adds and removes toasts, and the `Toast` viewport shows the queue in a portal. `UIProvider` mounts one `ToastProvider` and its viewport, so `useToast()` works anywhere under it with no setup. The viewport loads in idle time after the hydration, or on the first toast when that comes first. Its `toast` prop sets the `position`, `duration`, and `maxToasts`. Use `ToastProvider` and `Toast` for a queue of their own in one part of the page.

> `dialog`, `drawer`, and `sheet` have the root-and-parts shape of `popover`. The root (`Dialog`, `Drawer`, `Sheet`) holds the open state, controlled or uncontrolled, and renders no element. The trigger part (`DialogTrigger`, `DrawerTrigger`, `SheetTrigger`) opens the panel. The panel part (`DialogPanel`, `DrawerPanel`, `SheetPanel`) is the surface, and takes the props that style it or place it.

## Data display

`table` · `pivot-table` · `list` · `listbox` · `tree` · `kanban` · `json-tree` · `pagination` · `description-list` · `timeline` · `stat` · `sparkline` · `odometer` · `date-time` · `time-ago` · `status` · `swatch` · `badge` · `avatar` · `kbd` · `code`

> `date-time` shows an absolute date or time in a `<time>` element, in the locale of the nearest `LocaleProvider`. The server render and the hydration render use the `timeZone` of the provider, and a format with a time adds the name of the zone. The render after hydration uses the zone of the reader. A `timeZone` in `format` fixes the zone for all renders, as a calendar day needs. A server component can render it.

> A `TreeItem` row is one control, so its `prefix` and `suffix` hold no control. For a checkbox tree, give each item `checked` (or `defaultChecked`) and `onCheckedChange`. The row carries `aria-checked` and draws the box, Space toggles the check, and Enter toggles a branch. ArrowRight opens a closed branch, and on an open branch moves to its first child. ArrowLeft closes an open branch, and on a closed branch or a leaf moves to its parent. The caller computes the `'mixed'` state of a branch.

> `kanban` composes a `KanbanColumn` of a `KanbanColumnHeader` and a `KanbanColumnBody` of `KanbanCard`s. Put a `KanbanCardHandle` in each card. The handle is the only part of the card that starts a drag, and it is the keyboard stop that takes the keyboard lift. The rest of the card scrolls under a finger. The card centers the handle on its start edge. The other children of the card align with each other beside the handle. A read-only board, with no `onReorder`, shows no handle.

> A `list` auto-inserts a `ListHandle` in each `ListItem` only when it has `onReorder`. A read-only list shows no handle, and a disabled list shows a muted one. A reorderable list drags over Motion's `Reorder`, so a `List` loads no `@dnd-kit`. `Reorder` loads in a chunk of its own after a reorderable list mounts, so a read-only list does not load it. The `bare` variant has no row padding and no dividers. It is for rows of form controls, such as a reorderable list of inputs in a `Field`.

> `code` exports `CodeBlock`, which highlights with Shiki in a module worker. The page loads no grammar and no regex engine. `loadShiki` starts the worker and loads a grammar before the first block needs it. `primeCodeBlock` stores markup that was highlighted elsewhere, and a block then paints it on its first render. It also takes the `bg` and the `type` that Shiki's `getTheme` gives for the theme. A Vite app must set `worker.format` to `'es'`, or Vite puts each grammar into the worker file. A block announces a refused copy as "Copy failed", in the live region where its CopyButton announces "Copied". A block that overflows is a region. With no `label`, its name comes from `lang`, such as "TypeScript code", else it is "Code".

> The root `<div>` of a `CodeBlock` takes the `<div>` attributes, such as `id`, `data-*`, and `aria-*`. The `lang` prop names the grammar, so the block does not take the HTML `lang` attribute. The block removes the blank lines before `code` and the whitespace after it. The first line keeps its indentation.

> The padding, the gap, and the code text of a `CodeBlock` take the step of the nearest density scope. An explicit `size` opens a scope on the block, with the steps of the ramps of the block. At `md` the block is `p-4` with `text-sm` code, and its CopyButton keeps the `sm` size at each step.

> The frame of a `CodeBlock` paints the background of its `theme`, as Shiki gives it. Before the markup arrives, the frame paints the background of the default theme. The CopyButton of the block takes colors that read on the background in each color mode. The type of the theme in Shiki selects them.

## Layout & surfaces

`group` · `card` · `divider` · `aspect-ratio` · `scroll-area` · `resizable` · `collapse` · `accordion` · `segment` · `placeholder`

## Typography

`heading` · `text` · `shiny-text` · `icon` · `markdown`

> `markdown` exports `Markdown`, which lexes its source with `marked`. The first lex on a page is slow, because the regular expressions of `marked` compile then. `primeMarkdown` lexes a source before a block renders it, such as in idle time, and the block then renders from the stored tokens. With `breaks`, each line break in a paragraph renders as a `<br>`, and `primeMarkdown` takes the same option.

## Feedback

`loading` · `progress`

## Domain & specialized

`pdf-viewer` · `filters`

> `filters` composes its regions: `FiltersPrefix`, a `FiltersBar` holding a `FiltersRow` of `FiltersField`s beside a `FiltersClear`, and `FiltersSuffix`. `FiltersSkeleton` stands in for the row while the fields load.

## Loading skeletons

A unit that can load late exports a `<Name>Skeleton` from its own entry point. The skeleton is a static leaf, so a Suspense fallback or a `loading.tsx` can render it on the server. It has the box of the real component and takes the same `size`, `level`, or `orientation`. `ColorPanelSkeleton` also takes the `alpha` and the `swatches` of its panel.

`AccordionSkeleton` · `AvatarSkeleton` · `BadgeSkeleton` · `BreadcrumbSkeleton` · `ButtonSkeleton` · `CalendarSkeleton` · `CheckboxSkeleton` · `ColorPanelSkeleton` · `ColorPickerSkeleton` · `ControlSkeleton` · `DatePickerSkeleton` · `DescriptionListSkeleton` · `FiltersSkeleton` · `HeadingSkeleton` · `KanbanCardSkeleton` · `ListSkeleton` · `NavSkeleton` · `PaginationSkeleton` · `ProgressBarSkeleton` · `ProgressGaugeSkeleton` · `RadioSkeleton` · `RatingSkeleton` · `SegmentSkeleton` · `ShinyTextSkeleton` · `SidebarSkeleton` · `SliderSkeleton` · `SparklineSkeleton` · `StatDeltaSkeleton` · `StatDescriptionSkeleton` · `StatLabelSkeleton` · `StatSkeleton` · `StatValueSkeleton` · `StepperSkeleton` · `SwitchSkeleton` · `TabListSkeleton` · `TextareaSkeleton` · `TextSkeleton` · `TimelineSkeleton` · `ToggleIconButtonSkeleton` · `TreeSkeleton`

> `ControlSkeleton` stands in for each control in a `ControlFrame`, such as `input`, `select`, and `combobox`. The triggers of `color` and `date-picker` are as wide as their content, so `ColorPickerSkeleton` and `DatePickerSkeleton` stand in for them. Put `<HeadingSkeleton inline />` in a real `CardTitle` when only the title text loads. In the same way, put `<TextSkeleton />` in a real `KanbanColumnTitle`, and `KanbanCardSkeleton` in a real `KanbanColumnBody`. Pair a skeleton with `ReadyReveal`, which swaps it for the content and marks the region busy ([`PRIMITIVES.md`](PRIMITIVES.md)). When several leaves load together, give each leaf its own `ReadyReveal` with one shared `ready` value, and put `loadingLabel` on one of them only. The `chart`, `chat`, and `map` modules export `ChartSkeleton`, `ChatTranscriptSkeleton`, and `MapSkeleton` ([`MODULES.md`](MODULES.md)).

---

**See also:** [`HOOKS.md`](HOOKS.md) · [`PRIMITIVES.md`](PRIMITIVES.md) · [`PROVIDERS.md`](PROVIDERS.md) · [`RECIPES.md`](RECIPES.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
