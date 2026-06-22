# Components

> **Quick-glance index of every `ui` component**, grouped by domain. This is a flat inventory for orientation — per-component behavior, props, and defaults live in each component's TSDoc (the `<Name>` doccomment and its `<Name>Props` type) and in the docs site (`pnpm docs`). For hooks, primitives, providers, the recipe layer, core, and utilities, see the sibling docs.

Each component is its own entry point — there is no root barrel:

```ts
import { Button } from 'ui/button'
import { Dialog } from 'ui/dialog'
```

Components split into a **static** (server-renderable) tier and a **client** tier; the boundary contract is in [`../REFERENCE.md`](../REFERENCE.md) §2.

## Inputs & form fields

`input` · `textarea` · `select` · `combobox` · `checkbox` · `radio` · `switch` · `slider` · `number-input` · `currency-input` · `credit-card-input` · `phone-input` · `zipcode-input` · `address-input` · `mask-input` · `date-input` · `date-picker` · `calendar` · `color` · `file-upload` · `search-input` · `tag-input` · `signature-pad` · `password-input` · `password-confirm` · `password-strength`

## Form structure

`form` · `fieldset` · `control` · `submit-button`

> `control` provides the `Field` / `Label` / `Description` / `Message` family; `Field` takes `severity` (`error` / `warning` / `success`) + `message` (or a form-bound `name`) to broadcast validation state to the nested control and auto-render the matching `Message`. `fieldset` provides `Legend`.

## Buttons & actions

`button` · `copy-button` · `hold-button` · `toggle-icon-button`

## Navigation

`nav` · `sidebar` · `breadcrumb` · `menu` · `tabs` · `toolbar` · `stepper` · `link` · `command-palette`

## Overlays

`dialog` · `drawer` · `sheet` · `popover` · `tooltip` · `confirm` · `alert` · `banner` · `toast`

## Data display

`data-table` · `table` · `editable-grid` · `pivot-table` · `query-builder` · `list` · `listbox` · `tree` · `kanban` · `json-tree` · `pagination` · `dl` · `timeline` · `stat` · `odometer` · `time-ago` · `status` · `badge` · `avatar` · `kbd` · `code`

## Layout & surfaces

`box` · `flex` · `grid` · `stack` · `group` · `split` · `container` · `card` · `divider` · `spacer` · `aspect-ratio` · `scroll-area` · `resizable` · `collapse` · `accordion` · `segment` · `placeholder`

## Typography

`heading` · `text` · `shiny-text` · `icon` · `markdown`

## Feedback

`loading` · `progress`

## Domain & specialized

`map` · `pdf-viewer` · `chat-message` · `chat-prompt` · `filters`

---

**See also:** [`HOOKS.md`](HOOKS.md) · [`PRIMITIVES.md`](PRIMITIVES.md) · [`PROVIDERS.md`](PROVIDERS.md) · [`RECIPES.md`](RECIPES.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
