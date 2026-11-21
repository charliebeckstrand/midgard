# Components

> **Quick-glance index of every `ui` component**, grouped by domain. This is a flat inventory for orientation. Per-component behavior, props, and defaults live in each component's TSDoc (the `<Name>` doccomment and its `<Name>Props` type) and in the docs site (`pnpm --filter ui dev`). For structure, hooks, primitives, providers, the recipe layer, core, and utilities, see the sibling docs.

Each component is its own entry point. There is no root barrel:

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

> `Checkbox`, `Radio`, and `Switch` floor their hit area with `TouchTarget` ([`PRIMITIVES.md`](PRIMITIVES.md)). A container that puts bare controls closer than the floor sets `--touch-target-gap-x` or `--touch-target-gap-y` to its gap, or uses a `touch-gap-*` utility for the two. A toggle group sets them already. Controls that touch in a grid go in a container with the `touch-pitch` utility. On a coarse pointer, each control keeps its size in a cell of at least 44px. Its hit area fills the cell, as in the month picker of `Calendar`. The days of `Calendar` fill square cells of 40, 44, or 48 px at `sm`, `md`, and `lg`. The `sm` cell is under the floor.

> A `RadioGroup` in a `Field` takes the description of the `Field`. A bare `Radio` in the group does not take the id of the `Field`. Wrap each `Radio` in a `RadioField` to give it an id and a `Label`.

> A `readOnly` or `disabled` `rating` renders one image. Its name is the name of the consumer or the `Field` label.

> The floating pickers `Listbox`, `Combobox`, `DatePicker`, and `ColorPicker` take a `FloatingPlacement` ([`HOOKS.md`](HOOKS.md)). An explicit placement keeps its alignment.

> On a phone (`PHONE_QUERY`, [`UTILITIES.md`](UTILITIES.md)), a dropdown `Menu` and a `DatePicker` open as a bottom sheet in place of the popover. Set `sheet={false}` to keep the popover.

> The date text of `Intl` in `calendar` and `date-picker` waits for hydration, as in `date-time`. The server render and the hydration render show a skeleton of the month label, of the weekday row, and of the value in the trigger. The skeleton holds English text, without `Intl`, so it has about the size of the label. A `date-picker` with a pinned `format` writes its value without `Intl`, so it shows the value in the server render.

> A `required` `tag-input` needs at least one tag. An enclosing `Control` can also make it required. A native form submit stops while the list is empty, and the typed draft does not count as a tag.

> The tags of a `tag-input` stay on one row and scroll on the inline axis. With `wrap`, they wrap onto more rows, and the add button stays at the end of the first row. The affixes of each other input stay on one row with the input.

> `checkbox`, `switch`, `RadioGroup`, and `ColorPicker` take `readOnly` from their own prop or from an enclosing `Control`.

> A read-only control shows the default cursor, not the pointer: on the control, on its `Field` label, and on the affix of a picker trigger. A control that is also disabled shows `not-allowed`. The shared `hannou.cursor` reads `aria-readonly="true"`, `data-readonly`, or the native `readonly` on the element or a descendant.

## Form structure

`fieldset` · `control`

> `Control` broadcasts the state of a `Field` to one control-aware descendant. Its `variant` sets the surface of that control, also of a `Listbox`, `Combobox`, `DatePicker`, or `ColorPicker` trigger. A `soft` control has no border and a translucent wash, so it reads on a glass panel. A `bare` control draws no frame and no focus ring, for a host that draws them, such as a `Grid` cell around its editor. `Form` and its filter bar are parts of the `form` module ([`MODULES.md`](MODULES.md)).

## Buttons & actions

`button` · `copy-button` · `hold-button` · `toggle-icon-button`

> For a copy control with a text label, use `useCopyButtonState` from `copy-button`.

> A `Button` in a locked Control scope, such as a `Form` while a submit runs, is `aria-disabled` and cancels its click. It stays in the tab order. A `HoldButton` there starts no hold, and a lock that comes during a hold cancels it. Pass `lockable={false}` to keep either live. A library button that writes no field, such as a `Tab`, a `CopyButton`, or a `ToggleIconButton`, stays live. A `Tab` or a `SegmentItem` that writes a value, such as the AND/OR segment of a query group, takes `lockable` and locks. So does the standard close button of an overlay, and the Cancel button of `Confirm`, also when the overlay opens from inside a locked `Form`. A field in the overlay locks with the form.

## Navigation

`nav` · `sidebar` · `breadcrumb` · `menu` · `context-menu` · `tabs` · `toolbar` · `stepper` · `link` · `command-palette`

## Overlays

`dialog` · `drawer` · `sheet` · `popover` · `tooltip` · `confirm` · `alert` · `banner` · `toast` · `lightbox`

> `useConfirm()` asks a question in the one `Confirm` that `UIProvider` mounts. Use `Confirm` for a message with custom children.

> `UIProvider` mounts one `ToastProvider` and its viewport, so `useToast()` works anywhere under it with no setup.

> While a toast shows, the `Toast` viewport is a `region` landmark with the name "Notifications". F8 moves focus to the newest toast, and that focus pauses auto-dismiss.

> `dialog`, `drawer`, and `sheet` have the root-and-parts shape of `popover`: a root such as `Dialog`, a `DialogTrigger`, and a `DialogPanel`.

> A `DialogPanel`, a `DrawerPanel`, or a `SheetPanel` has no `glass` prop. It follows the Surfaces setting of the reader: flat by default, glass when the reader picks Glass in `AppearanceSettings`. A `<GlassProvider>` does not change it. `CommandPalette`, `Confirm`, and the phone sheet of a `Menu` follow the same setting.

> A `closable` `DialogHeader`, `DrawerHeader`, or `SheetHeader` puts an X close at the end of the line of the title. The X has the label "Close" in the language of the reader. An app does not build the X by hand (`panel-close-boundary.test.ts`). A panel with the X usually takes `footer={null}`, so it shows no second Close.

> A `DialogPanel` or a `DrawerPanel` with `height="fit"` travels to each new height of its content. On the bottom edge, it goes up to the top edge of the screen when its content asks for that much. The default `auto` changes the height in one step and stops at 85% of the screen.

## Data display

`table` · `pivot-table` · `list` · `listbox` · `tree` · `json-tree` · `pagination` · `description-list` · `timeline` · `stat` · `sparkline` · `odometer` · `date-time` · `time-ago` · `status` · `swatch` · `badge` · `avatar` · `kbd` · `code`

> `date-time` uses the `timeZone` of its `format`, else of the provider, else the zone of the reader. It shows a skeleton until hydration, also with a set zone. The date data of the server and of the browser give different text for some formats. The skeleton holds the date in UTC in the shape of English text, without `Intl`, so it has about the size of the date. A page that must paint a date in its first frame writes it on the server with `formatDateText` from `ui/server`. The `DateText` is then the `value` of `date-time`.

> A `list` loads its drag code only when it has `onReorder`. The `bare` variant has no row padding and no dividers, for rows of form controls. A horizontal `list` stays on one row, which scrolls when it is wider than its parent.

> `CodeBlock` highlights with Shiki in a module worker. A Vite app must set `worker.format` to `'es'`.

## Layout & surfaces

`group` · `card` · `divider` · `aspect-ratio` · `resizable` · `collapse` · `accordion` · `segment` · `placeholder`

> For a custom trigger or panel in an `AccordionItem`, use `useAccordionItem` from `accordion`. It gives the open state, `toggle`, and the ARIA props of the trigger and the panel. A custom trigger that spreads `triggerProps` takes part in the arrow keys of the accordion.

> A `Card` sets the default text color, so its content reads the same in the muted body of a dialog or a drawer. A `Card` that is a link takes the focus ring of a control. In a flex row or a grid track, a `Card` is at least as wide as its widest word. A `Stat` value in it stays on one line. Give the card `min-w-0` to let it become narrower.

## Typography

`heading` · `text` · `shiny-text` · `icon` · `markdown`

> `Markdown` takes `ranges` and `renderRange` to draw a slot over a range of its source, such as an anchor on a phrase. A range gives two offsets into the source and the `quote` between them. It draws only while the quote matches, so a range stays correct while its text streams in. A range that crosses bold or a block boundary draws as more than one piece. A piece does not go into a link or a fenced code block. `useMarkdownRangeText` gives the text of all the pieces of a range. Call it in a component that `renderRange` draws. A control on piece 0 then takes the whole phrase as its name.

## Feedback

`loading` · `progress`

> A `ProgressBar` with `segments` draws parts of one whole, such as the seats of each party, from the inline start or the inline end. A bar of two or more segments is a `role="img"` with a description of each part. `marks` draw lines across the bar, such as a majority, with an optional label above the track.

## Domain & specialized

`pdf-viewer`

> `PdfViewer` gives pdf.js a URL for each file that pdf.js loads at run time: the wasm decoders, the standard fonts, and the CMaps. A new version of `pdfjs-dist` can add, remove, or rename such a file. [`pdf-viewer-binary-data-boundary.test.ts`](../src/__tests__/boundary/pdf-viewer-binary-data-boundary.test.ts) holds the map equal to the package.

> `PdfViewer` reserves a page of `pageSize`, in points, until it knows the size of the page. The default is US Letter. The server cannot read the size from the file. A consumer that knows the size of its documents gives it. The first paint then has the box of the opened document.

> `PdfViewer` searches the OCR text that `data` gives, as `PdfViewerTextItem` runs. The toolbar then has a Search control. `search` turns it off, or sets the color of the matches and the page turn, through `PdfViewerSearchOptions`.

## Loading skeletons

A unit that can load late exports a `<Name>Skeleton` from its own entry point. The skeleton is a static leaf, so a Suspense fallback or a `loading.tsx` can render it on the server. It has the box of the real component and takes the same `size`, `level`, or `orientation`. `ColorPanelSkeleton` also takes the `alpha` and the `swatches` of its panel.

`AccordionSkeleton` · `AvatarSkeleton` · `BadgeSkeleton` · `BreadcrumbSkeleton` · `ButtonSkeleton` · `CalendarSkeleton` · `CheckboxSkeleton` · `ColorPanelSkeleton` · `ColorPickerSkeleton` · `ControlSkeleton` · `DatePickerSkeleton` · `DescriptionListSkeleton` · `HeadingSkeleton` · `ListSkeleton` · `NavSkeleton` · `PaginationSkeleton` · `ProgressBarSkeleton` · `ProgressGaugeSkeleton` · `RadioSkeleton` · `RatingSkeleton` · `SegmentSkeleton` · `ShinyTextSkeleton` · `SidebarSkeleton` · `SliderSkeleton` · `SparklineSkeleton` · `StatDeltaSkeleton` · `StatDescriptionSkeleton` · `StatLabelSkeleton` · `StatSkeleton` · `StatValueSkeleton` · `StepperSkeleton` · `SwitchSkeleton` · `TabListSkeleton` · `TextareaSkeleton` · `TextSkeleton` · `TimelineSkeleton` · `ToggleIconButtonSkeleton` · `TreeSkeleton`

> `ControlSkeleton` stands in for each control in a `ControlFrame`, such as `input`, `select`, and `combobox`. Pair a skeleton with `ReadyReveal` ([`PRIMITIVES.md`](PRIMITIVES.md)). The `chart`, `chat`, `form`, `kanban`, and `map` modules export `ChartSkeleton`, `ChatTranscriptSkeleton`, `FormFiltersSkeleton`, `KanbanCardSkeleton`, and `MapSkeleton` ([`MODULES.md`](MODULES.md)).

---

**See also:** [`HOOKS.md`](HOOKS.md) · [`PRIMITIVES.md`](PRIMITIVES.md) · [`PROVIDERS.md`](PROVIDERS.md) · [`RECIPES.md`](RECIPES.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
