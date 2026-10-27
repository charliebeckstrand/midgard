# Modules

> **Quick-glance index of every `ui` module**: the complex, multi-part compositions that bundle their own sub-components, hooks, types, and docs. Per-symbol behavior, props, and defaults live in each module's TSDoc and the docs site (`pnpm --filter ui dev`). For the atomic components a module composes from, see [`COMPONENTS.md`](COMPONENTS.md).

A module is larger than a component. It owns a family of sub-components and hooks behind one entry point, ships its own demo, and earns its own surface entry here. A module builds on the atomic `ui` components and primitives; it does not sit beside them.

Each module is its own entry point under `ui/modules/*`. The bare `ui/<name>` shorthand resolves to the same barrel. It is an exact key in `package.json` `exports`, as for [structure](STRUCTURE.md). `package-exports-boundary.test.ts` holds a key for each module and holds the names apart from the components. Both specifiers work, and canonical docs and snippets use the nested path:

```ts
import { MapPlat } from 'ui/modules/map' // or the 'ui/map' shorthand
```

## Modules

`chart` · `chat` · `dashboard` · `events` · `form` · `grid` · `kanban` · `map` · `query`

> `form` holds `Form` and its parts. `FormSubmit` shows the loading state while a submit runs. `FormReset` is `aria-disabled` while the form is clean or a submit runs. `FormErrorSummary` lists the errors after a failed submit and takes the focus. Each row links to the control of its field, with or without a `Message`. `FormFilters` is a filter bar over a value record: `FormFiltersPrefix`, a `FormFiltersBar` that holds a `FormFiltersRow` of `FormFiltersField`s beside a `FormFiltersClear`, and `FormFiltersSuffix`. `FormFiltersClear` shows only while a field holds a value that the default does not. `FormFiltersSkeleton` stands in for the row while the fields load.

> `Form` turns off native validation (`noValidate`). Give each native constraint a validator, or pass `noValidate={false}`. While a submit runs, the form locks its parts: each field is read-only, each `Button` is inert, and a bound write does nothing. Nothing is disabled, so the focus stays where it is. A `Button` that must stay live, such as Cancel, takes `lockable={false}`. The form also announces the submit politely. The bindable controls read the form through the internal `primitives/form` contract ([`PRIMITIVES.md`](PRIMITIVES.md)), so no component imports the module.

---

**See also:** [`COMPONENTS.md`](COMPONENTS.md) · [`PRIMITIVES.md`](PRIMITIVES.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
