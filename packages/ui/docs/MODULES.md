# Modules

> **Quick-glance index of every `ui` module**: the complex, multi-part compositions that bundle their own sub-components, hooks, types, and docs. Per-symbol behavior, props, and defaults live in each module's TSDoc and the docs site (`pnpm --filter ui dev`). For the atomic components a module composes from, see [`COMPONENTS.md`](COMPONENTS.md).

A module is larger than a component. It owns a family of sub-components and hooks behind one entry point, ships its own demo, and earns its own surface entry here. A module builds on the atomic `ui` components and primitives; it does not sit beside them.

Each module is its own entry point under `ui/modules/*`. The bare `ui/<name>` shorthand resolves to the same barrel. It is an exact key in `package.json` `exports`, as for [structure](STRUCTURE.md). `package-exports-boundary.test.ts` holds a key for each module and holds the names apart from the components. Both specifiers work, and canonical docs and snippets use the nested path:

```ts
import { MapPlat } from 'ui/modules/map' // or the 'ui/map' shorthand
```

## Modules

`chart` · `chat` · `dashboard` · `events` · `form` · `grid` · `kanban` · `map` · `query`

> `chart` holds the charts on one engine: `BarChart`, `LineChart`, `AreaChart`, `ComboChart`, `PieChart`, `DonutChart`, `ScatterChart`, `BubbleChart`, `HeatmapChart`, `ChoroplethChart`, and `SeatChart`. `SeatChart` draws the seats of a chamber on the arcs of a hemicycle. The groups take the seats in order from the start. A group can be hollow, with a framed legend key. A tick above the arcs can mark the majority. A label such as "218 to win" can sit beside the tick where it has the space. Content can sit in the hole. Content too large for the hole scales down to fit it. Its legend is a key with no switches. Each pick handler, such as `onCategoryClick`, `onCellClick`, `onPointClick`, and the map's `onRegionClick`, gets a `ChartPress` as its last argument. It names the input and counts the quick presses of a run, so a handler can wait for a double tap.

> A chart shows no placeholder in its plot. Before it measures its width, it paints the shell of its frame with no SVG. Then the axes and the marks draw, and a chart that animates plays its reveal. A `SeatChart` with no majority label is the exception. Its fit needs no measure, so its first paint draws the seats where the measured frame draws them.

> `map` holds `MapPlat` and the marks that draw over it. A region category can take a soft tone, a lighter step of its color. It can also take stripes of a second color. The legend and the tooltip show the same tone and stripes. `projection="identity"` draws an atlas that is already projected, such as `us-atlas` `states-albers-10m`, with no spherical math. A side legend stands beside the map from the map's own `@lg`, and under the map it is the centered row. `isRegionDisabled` disables a region that opens nothing on a clickable map: it takes no click, no pointer cursor, and no click hover. A tap picks a region or a mark, as a click does. A pick can open a Dialog or a Drawer over the map. Its ring or halo then shows once the backdrop of the panel is up, and does not blink under the fade.

> `form` holds `Form` and its parts. `FormSubmit` shows the loading state while a submit runs. `FormReset` is `aria-disabled` while the form is clean or a submit runs. `FormErrorSummary` lists the errors after a failed submit and takes the focus. Each row names its field with the text of its `Label`, and links to the control of its field, with or without a `Message`. `FormFilters` is a filter bar over a value record: `FormFiltersPrefix`, a `FormFiltersBar` that holds a `FormFiltersRow` of `FormFiltersField`s beside a `FormFiltersClear`, and `FormFiltersSuffix`. `FormFiltersClear` shows only while a field holds a value that the default does not. `FormFiltersSkeleton` stands in for the row while the fields load.

> `Form` turns off native validation (`noValidate`). Give each native constraint a validator, or pass `noValidate={false}`. While a submit runs, the form locks its parts: each field is read-only, each `Button` is inert, and a bound write does nothing. A native field that the `<form>` owns, such as a bare `<input>` or `<select>`, refuses each edit. Nothing is disabled, so the focus stays where it is. A `Button` that must stay live, such as Cancel, takes `lockable={false}`. The form also announces the submit politely. The bindable controls read the form through the internal `primitives/form` contract ([`PRIMITIVES.md`](PRIMITIVES.md)), so no component imports the module.

---

**See also:** [`COMPONENTS.md`](COMPONENTS.md) · [`PRIMITIVES.md`](PRIMITIVES.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
