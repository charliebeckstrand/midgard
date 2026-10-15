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

> A `clearable` `input`, `search-input`, `date-input`, `listbox`, `combobox`, or `date-picker` shows a clear button while it holds a value.

> An uncontrolled control follows a native form reset. A `Form` cancels the native reset and resets its bound fields. Either reset drops a partial entry, such as typed text that the control did not commit. A control that puts no value in a native form does not follow the native reset: `RangeSlider`, `Listbox`, `Calendar`, the `DatePicker` family, `ColorPicker`, and `SignaturePad`.

> `CheckboxGroup` and `RadioGroup` require their own name: give `aria-label` or `aria-labelledby`. The `<legend>` of an enclosing `<fieldset>` does not name the group.

> A `RadioGroup` in a `Field` takes the description of the `Field`. A bare `Radio` in the group does not take the id of the `Field`. Wrap each `Radio` in a `RadioField` to give it an id and a `Label`.

> A `readOnly` or `disabled` `rating` renders one image. Its name is the name of the consumer or the `Field` label.

> The floating pickers `Listbox`, `Combobox`, `DatePicker`, and `ColorPicker` take a `FloatingPlacement` ([`HOOKS.md`](HOOKS.md)). An explicit placement keeps its alignment.

> A `required` `tag-input` needs at least one tag. An enclosing `Control` can also make it required. A native form submit stops while the list is empty, and the typed draft does not count as a tag.

> `checkbox`, `switch`, `RadioGroup`, and `ColorPicker` take `readOnly` from their own prop or from an enclosing `Control`.

## Form structure

`form` · `fieldset` · `control`

> `Form` turns off native validation (`noValidate`). Give each native constraint a validator, or pass `noValidate={false}`. `Control` broadcasts the state of a `Field` to one control-aware descendant.

## Buttons & actions

`button` · `copy-button` · `hold-button` · `toggle-icon-button`

> For a copy control with a text label, use `useCopyButtonState` from `copy-button`.

## Navigation

`nav` · `sidebar` · `breadcrumb` · `menu` · `context-menu` · `tabs` · `toolbar` · `stepper` · `link` · `command-palette`

## Overlays

`dialog` · `drawer` · `sheet` · `popover` · `tooltip` · `confirm` · `alert` · `banner` · `toast` · `lightbox`

> `useConfirm()` asks a question in the one `Confirm` that `UIProvider` mounts. Use `Confirm` for a message with custom children.

> `UIProvider` mounts one `ToastProvider` and its viewport, so `useToast()` works anywhere under it with no setup.

> `dialog`, `drawer`, and `sheet` have the root-and-parts shape of `popover`: a root such as `Dialog`, a `DialogTrigger`, and a `DialogPanel`.

## Data display

`table` · `pivot-table` · `list` · `listbox` · `tree` · `kanban` · `json-tree` · `pagination` · `description-list` · `timeline` · `stat` · `sparkline` · `odometer` · `date-time` · `time-ago` · `status` · `swatch` · `badge` · `avatar` · `kbd` · `code`

> `date-time` uses the `timeZone` of the provider for the server render and the hydration render. The render after hydration uses the zone of the reader.

> A `list` loads its drag code only when it has `onReorder`. The `bare` variant has no row padding and no dividers, for rows of form controls.

> `CodeBlock` highlights with Shiki in a module worker. A Vite app must set `worker.format` to `'es'`.

## Layout & surfaces

`group` · `card` · `divider` · `aspect-ratio` · `scroll-area` · `resizable` · `collapse` · `accordion` · `segment` · `placeholder`

> In a flex row or a grid track, a `Card` is at least as wide as its widest word. A `Stat` value in it stays on one line. Give the card `min-w-0` to let it become narrower.

## Typography

`heading` · `text` · `shiny-text` · `icon` · `markdown`

## Feedback

`loading` · `progress`

## Domain & specialized

`pdf-viewer` · `filters`

> `filters` composes its regions: `FiltersPrefix`, a `FiltersBar` holding a `FiltersRow` of `FiltersField`s beside a `FiltersClear`, and `FiltersSuffix`. `FiltersSkeleton` stands in for the row while the fields load.

## Loading skeletons

A unit that can load late exports a `<Name>Skeleton` from its own entry point. The skeleton is a static leaf, so a Suspense fallback or a `loading.tsx` can render it on the server. It has the box of the real component and takes the same `size`, `level`, or `orientation`. `ColorPanelSkeleton` also takes the `alpha` and the `swatches` of its panel.

`AccordionSkeleton` · `AvatarSkeleton` · `BadgeSkeleton` · `BreadcrumbSkeleton` · `ButtonSkeleton` · `CalendarSkeleton` · `CheckboxSkeleton` · `ColorPanelSkeleton` · `ColorPickerSkeleton` · `ControlSkeleton` · `DatePickerSkeleton` · `DescriptionListSkeleton` · `FiltersSkeleton` · `HeadingSkeleton` · `KanbanCardSkeleton` · `ListSkeleton` · `NavSkeleton` · `PaginationSkeleton` · `ProgressBarSkeleton` · `ProgressGaugeSkeleton` · `RadioSkeleton` · `RatingSkeleton` · `SegmentSkeleton` · `ShinyTextSkeleton` · `SidebarSkeleton` · `SliderSkeleton` · `SparklineSkeleton` · `StatDeltaSkeleton` · `StatDescriptionSkeleton` · `StatLabelSkeleton` · `StatSkeleton` · `StatValueSkeleton` · `StepperSkeleton` · `SwitchSkeleton` · `TabListSkeleton` · `TextareaSkeleton` · `TextSkeleton` · `TimelineSkeleton` · `ToggleIconButtonSkeleton` · `TreeSkeleton`

> `ControlSkeleton` stands in for each control in a `ControlFrame`, such as `input`, `select`, and `combobox`. Pair a skeleton with `ReadyReveal` ([`PRIMITIVES.md`](PRIMITIVES.md)). The `chart`, `chat`, and `map` modules export `ChartSkeleton`, `ChatTranscriptSkeleton`, and `MapSkeleton` ([`MODULES.md`](MODULES.md)).

---

**See also:** [`HOOKS.md`](HOOKS.md) · [`PRIMITIVES.md`](PRIMITIVES.md) · [`PROVIDERS.md`](PROVIDERS.md) · [`RECIPES.md`](RECIPES.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
