# Components

> **Quick-glance index of every `ui` component**, grouped by domain. This is a flat inventory for orientation. Per-component behavior, props, and defaults live in each component's TSDoc — the `<Name>` doccomment and its `<Name>Props` type — and in the docs site (`pnpm docs`). For structure, hooks, primitives, providers, the recipe layer, core, and utilities, see the sibling docs.

Each component is its own entry point — there is no root barrel:

```ts
import { Button } from 'ui/button'
import { Dialog } from 'ui/dialog'
```

Components split into a **static** (server-renderable) tier and a **client** tier; the boundary contract is in [`../REFERENCE.md`](../REFERENCE.md) §2.

## Inputs & form fields

`input` · `textarea` · `select` · `combobox` · `checkbox` · `radio` · `switch` · `slider` · `rating` · `number-input` · `currency-input` · `credit-card-input` · `address-input` · `mask-input` · `date-input` · `date-picker` · `calendar` · `color` · `file-upload` · `search-input` · `tag-input` · `signature-pad` · `password-input` · `password-confirm` · `password-strength`

For phone numbers and postal codes, give `mask-input` the `phoneMask` or `zipcodeMask` preset.

> A `readOnly` or `disabled` `rating` renders one image. Its name is the consumer's name or the `Field` label, then the score readout. The image keeps the consumer's `aria-describedby` and the `Field` description and error message. A touch shows no preview, because a touch has no hover.

## Form structure

`form` · `fieldset` · `control`

> `Form` turns off native validation (`noValidate`), so its validators run on each submit and every field shows its own message. Give each native constraint, such as `type="url"` or `required`, a validator, or pass `noValidate={false}`. `fieldset` provides the `Field` / `Label` / `Description` / `Message` / `Legend` family. `Field` takes `severity` (`error` / `warning` / `success`) and broadcasts it to the nested control. Nest a `<Message>` to render the feedback; bind it to a form field through its own `name`. `control` provides `Control`, the context that broadcasts the same field state to one control-aware descendant. Nest one `Control` for each field to group fields. A press on a `Label` keeps the focus on a control that has it, and the `click` focuses a control that does not, as on a native label.

## Buttons & actions

`button` · `copy-button` · `hold-button` · `toggle-icon-button`

## Navigation

`nav` · `sidebar` · `breadcrumb` · `menu` · `context-menu` · `tabs` · `toolbar` · `stepper` · `link` · `command-palette`

## Overlays

`dialog` · `drawer` · `sheet` · `popover` · `tooltip` · `confirm` · `alert` · `banner` · `toast`

> `drawer` also exports `DrawerStatic`: an open drawer as static, in-place markup, for the server paint of a page that loads with its drawer open. The overlay itself portals, and a portal has no server output.

## Data display

`table` · `pivot-table` · `list` · `listbox` · `tree` · `kanban` · `json-tree` · `pagination` · `description-list` · `timeline` · `stat` · `sparkline` · `odometer` · `time-ago` · `status` · `swatch` · `badge` · `avatar` · `kbd` · `code`

## Layout & surfaces

`group` · `card` · `divider` · `aspect-ratio` · `scroll-area` · `resizable` · `collapse` · `accordion` · `segment` · `placeholder`

## Typography

`heading` · `text` · `shiny-text` · `icon` · `markdown`

## Feedback

`loading` · `progress`

## Domain & specialized

`pdf-viewer` · `filters`

> `filters` composes its regions: `FiltersPrefix`, a `FiltersBar` holding a `FiltersRow` of `FiltersField`s beside a `FiltersClear`, and `FiltersSuffix`. `FiltersSkeleton` stands in for the row while the fields load.

## Loading skeletons

A unit that can load late exports a `<Name>Skeleton` from its own entry point. The skeleton is a static leaf, so a Suspense fallback or a `loading.tsx` can render it on the server. It has the box of the real component and takes the same `size`, `level`, or `orientation`.

`AccordionSkeleton` · `AvatarSkeleton` · `BadgeSkeleton` · `BreadcrumbSkeleton` · `ButtonSkeleton` · `CalendarSkeleton` · `CheckboxSkeleton` · `ColorPanelSkeleton` · `ControlSkeleton` · `DescriptionListSkeleton` · `FiltersSkeleton` · `HeadingSkeleton` · `ListSkeleton` · `NavSkeleton` · `PaginationSkeleton` · `ProgressBarSkeleton` · `ProgressGaugeSkeleton` · `RadioSkeleton` · `RatingSkeleton` · `SegmentSkeleton` · `ShinyTextSkeleton` · `SidebarSkeleton` · `SliderSkeleton` · `SparklineSkeleton` · `StatDeltaSkeleton` · `StatDescriptionSkeleton` · `StatLabelSkeleton` · `StatSkeleton` · `StatValueSkeleton` · `StepperSkeleton` · `SwitchSkeleton` · `TabListSkeleton` · `TextareaSkeleton` · `TextSkeleton` · `TimelineSkeleton` · `ToggleIconButtonSkeleton`

> `ControlSkeleton` stands in for each control in a `ControlFrame`, such as `input`, `select`, `combobox`, and `date-picker`. Put `<HeadingSkeleton inline />` in a real `CardTitle` when only the title text loads. Pair a skeleton with `ReadyReveal`, which swaps it for the content and marks the region busy ([`PRIMITIVES.md`](PRIMITIVES.md)). When several leaves load together, give each leaf its own `ReadyReveal` with one shared `ready` value, and put `loadingLabel` on one of them only. The `chart`, `chat`, and `map` modules export `ChartSkeleton`, `ChatTranscriptSkeleton`, and `MapSkeleton` ([`MODULES.md`](MODULES.md)).

---

**See also:** [`HOOKS.md`](HOOKS.md) · [`PRIMITIVES.md`](PRIMITIVES.md) · [`PROVIDERS.md`](PROVIDERS.md) · [`RECIPES.md`](RECIPES.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
