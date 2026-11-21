# Modules

> **Quick-glance index of every `ui` module**: the complex, multi-part compositions that bundle their own sub-components, hooks, types, and docs. Per-symbol behavior, props, and defaults live in each module's TSDoc and the docs site (`pnpm --filter ui dev`). For the atomic components a module composes from, see [`COMPONENTS.md`](COMPONENTS.md).

A module is larger than a component. It owns a family of sub-components and hooks behind one entry point, ships its own demo, and earns its own surface entry here. A module builds on the atomic `ui` components and primitives; it does not sit beside them.

Each module is its own entry point under `ui/modules/*`. The bare `ui/<name>` shorthand resolves to the same barrel. It is an exact key in `package.json` `exports`, as for [structure](STRUCTURE.md). `package-exports-boundary.test.ts` holds a key for each module and holds the names apart from the components. Both specifiers work, and canonical docs and snippets use the nested path:

```ts
import { MapPlat } from 'ui/modules/map' // or the 'ui/map' shorthand
```

## Modules

`chart` · `chat` · `dashboard` · `events` · `form` · `grid` · `kanban` · `map` · `query`

> `chart` holds the charts on one engine: `BarChart`, `LineChart`, `AreaChart`, `ComboChart`, `PieChart`, `DonutChart`, `ScatterChart`, `BubbleChart`, `HeatmapChart`, `ChoroplethChart`, and `SeatChart`. `SeatChart` draws the seats of a chamber on the arcs of a hemicycle. The groups take the seats in order from the start. A group can be hollow, with a framed legend key. A dashed line down an aisle can mark the majority, with one clear space to the seats on each side and at each end. A simple majority puts the line down the middle. A label such as "218 to win" can sit above the line where it has the space. Content can sit in the hole. Content too large for the hole scales down to fit it. Its legend is a key with no switches. Each pick handler, such as `onCategoryClick`, `onCellClick`, `onPointClick`, and the map's `onRegionClick`, gets a `ChartPress` as its last argument. It names the input and counts the quick presses of a run, so a handler can wait for a double tap.

> A chart shows no placeholder in its plot. Before it measures its width, it paints the shell of its frame with no SVG. Then the axes and the marks draw, and a chart that animates plays its reveal. A `SeatChart` with no majority label and no content in its hole is the exception. Its fit needs no measure, so its first paint draws the seats where the measured frame draws them. In a box with a header slot, a chart puts its View data and menu buttons in the slot after the mount. A `ChartHeaderActionsFallback` in the slot draws them in the server render, with the rules of the chart menu and of its data.

> `seriesColor` gives the color that a cartesian or scatter chart draws a series in: its own `color`, else its slot in the palette order. An app can then color an annotation, such as a reference line, like the series that it names.

> The `reference` prop of a cartesian chart takes a line at a value (`ChartReferenceValue`) or a line at a category (`ChartReferenceCategory`). A line at a category marks an event, such as a release, across the value axis. It sits at the leading edge of the slot on a chart with bars, and at the center of the band on other charts. Its label stands on the line in the most open space, from the top of the plot down. Its label and its `description` join the readout of its category, which the keyboard cursor speaks. It takes no keyboard stop.

> A standing reference label sits on its line, and the line breaks for it. A line also breaks for each other standing label that it crosses, and around each point marker that sits on it. With `labels.references`, a line at a value shows its `label` and then its value, so the `label` holds the name alone, such as `'Target'`. The value takes the color of the line, and `valueColor` gives it its own. With `valueDisplay: 'hover'`, a line shows its `label` alone, and its tooltip reads the value on hover and from the keyboard. Where the `label` already holds the value, such as `'Good 5%'`, set `labels: { references: { value: false } }` to show the `label` alone. The label sits at the right end of the line, else at the left end. It keeps off the lines and point markers of the data first, and then off the other lines. Of the spots left, it prefers a spot with 8 px of room. The room is from the data, the other lines, the other labels, and the top and bottom of the plot. A label too wide for the space between two lines is cut 8 px short of the next line, with an ellipsis. Its tooltip shows the whole label on hover. A line at a value with a standing label takes no legend chip.

> The pointer reads each line of the data and each reference line within 16 px of it. A line stays in reach 2 px farther out, so a pointer that shakes on the edge does not flip the readout. The lines in reach stay lit, and each other mark and line recedes, on the plot and in the tooltip. The tooltip reads the category under the pointer, with a row for each reference line in reach. On lines at a value alone, the tooltip of the first line reads each of them.

> A busy chart can name its reference lines in the legend in place of their labels. Set `legend: { references: true }` on the chart, or `legend: true` on one line. Each line that the legend names takes a dashed chip there, and no label on the plot. A line at a category takes a chip too, and its category readout still shows its label. A chip toggles its line. The legend shows when it names a line, as for two or more series. A line with `legend: false` keeps its label on the plot.

> A legend above or below the plot puts the reference lines under the chart, out of its aspect box. They take no height from the plot. Their row of chips wraps to as many lines as it needs, with no `+N` chip, and it is a toolbar of its own. A side panel shows the lines in a section with a heading.

> `ChartLegendReferenceConfig` is the object form of `legend.references`. A chip shows the label and then the value or the category of its line. Its swatch runs in the direction of the line. With `value: false`, a chip shows the label alone, for a label that already holds the value.

> With `variant: 'notes'`, each line is a note with its value and its `description`. A note toggles its line, as a chip does. Under the chart, the notes are a toolbar of their own, and the arrow keys move between them. In a side panel, the arrow keys move from the series to the notes.

> A function-form `contextMenu.items` gets the mark under the pointer as a `ChartContextMenuTarget`. Its `index` points into the data. Its `label` is the text that the band axis and the tooltip title write for the mark. An item can then name the mark, such as a date category, with no second formatter.

> A `chat` reply can cite a phrase of its prose. A `citations` entry on a `text` part gives the offsets of the phrase in the source, its `quote`, a `target` view, and a `selector`. `ChatCitationProvider` registers the views by `target`, holds the active citation as a controlled `cited`, and calls `onCite` on a press. The app derives the selection prop of each view from `cited`. `toCategorySelection` reads the selector `{ categories }` for `selectedCategories` of a chart. `toRegionSelection` reads `{ regions }` for `selectedRegions` of a map. `toStopSelection` reads `{ stops }`, the keys of rows of the app, for `selectedOverlays`. The app gives the id of the `MapPoints` set. It also gives a function that finds the index of a key in the points of the set. In a dashboard, a citation marks and does not filter. The board shows one selection at a time: a citation clears the cross-filter selections, and a pick in a tile clears the citation. In the reverse direction, `isMarked` tells if the selection of a view matches a citation. Each piece of a matched citation then takes a solid underline, and its description says that the selection matches it. A citation is one toggle button, named by its phrase. A citation whose `target` is not registered has no control. In a reply, it is a soft pill, which Markdown cannot make, so the text of an agent cannot look like a citation. In the user bubble, it is bold. A pressed citation takes an inset ring and no fill, so the prose keeps its contrast on each bubble. A user message can hold citations too, such as a dataset that scopes the question. `useChatDraft` holds the citations of the draft beside its text, and `ChatPrompt` moves them across each change of the text. A change that touches a citation dissolves it into prose, and no typed or pasted text makes one. `send` and `edit` take the citations, and the user message holds them on its text part. The transport gets them in the parts of its third argument. `ChatPrompt` takes `sources`, and a trigger character such as `@` or `/` opens a picker over a source. A choice puts a citation in the draft. An undo takes the choice back, and a redo brings the citation back with its text. A source with `at: 'start'` is a command, and the `onSubmit` of the app decides what it runs.

> A `query` rule can read a set of values. `setOperators` holds `in` ("is any of") and `notIn` ("is none of"). A row matches `in` when its value is one member of the set. A cell that is a list matches when one of its items is a member. No field type offers the set operators by default, because no built-in value input writes a set. A field adds them to its `operators`. `QueryField.formatValue` gives the display text of a value, such as the name of the record that a key refers to. The summary, the chips, and the names of the rules read it, and a set reads as one list. `QueryField.editor` is the key of a custom value editor, such as a picker of related records. `QueryValueEditorProvider` maps each key to a `QueryValueEditor` component, and each `QueryBuilder` below it renders that component as the value input of the rule. The editor gets the field, the operator, the value, a name, `disabled`, and the lock of the nearest lock scope as `readOnly`. It writes a key or a set of keys, and not an object. A key that no provider holds falls back to the input of the field type. A set operator with no editor edits its set with a `TagInput`. A change of operator to another shape of value resets the value to the blank value of that shape.

> `events` records the events of a page, and files a bug with the trail of the events before it. `startEvents` takes an optional `sendReport` port, which sends a report to the issue tracker of the app. The port gets an `EventReportExport`: the title, the Markdown text that Copy writes, and a copy of the report. With the port, the view of a report shows Send after Copy and Delete, with the loading, "Sent", and "Send failed" states. A report that the tracker holds does not go again in the same page load. The adapter of the tracker lives in the app, so `ui` has no dependency on a tracker.

> The trail writes `***` for the value of a secret field and for each character that a key types into it. A password field is a secret field. So is an input with the `autocomplete` token `cc-number`, `cc-exp`, `cc-csc`, or `one-time-code`. So is each field in an element with `data-events-mask`: an `input`, a `textarea`, a `select`, a `contenteditable` element, or a `Select`. The mask reaches the panel of a `Select` in its portal, through the `aria-controls` of the trigger. The rule does not find a secret by its content. Thus put `data-events-mask` on each other field that holds a secret, or on its form.

> `postReport(url)` is a ready `sendReport`. It posts the report as JSON to an endpoint of the app, and rejects on a response that is not 2xx. The endpoint reads the report with `readReportExport` from `ui/server` ([`SERVER.md`](SERVER.md)), and files it with a token that stays on the server. Thus no token of the tracker goes to the browser. The body is the claim of a client. Put the endpoint behind the auth or the rate limit of the app. A tracker limits the size of an issue, and GitHub takes a body of 65,536 characters at most. Thus the route cuts a long text, such as the text of a long capture:

```ts
// instrumentation-client.ts
import { postReport, startEvents } from 'ui/events'

void startEvents({ sendReport: postReport('/api/report') })
```

```ts
// app/api/report/route.ts
import { ReportExportError, readReportExport } from 'ui/server'
// The env module of the app reads `GITHUB_TOKEN` (CONVENTIONS §11.1).
import { githubToken } from '@/server/env'

/** The longest issue body that GitHub takes, in characters. */
const BODY_LIMIT = 65_536

const CUT_NOTE = '\n… (cut to the GitHub limit)'

export async function POST(request: Request) {
	try {
		const { title, text } = await readReportExport(request)

		// The trail is at the end of the text, so a cut keeps the table and the stacks.
		const body =
			text.length > BODY_LIMIT ? text.slice(0, BODY_LIMIT - CUT_NOTE.length) + CUT_NOTE : text

		const response = await fetch('https://api.github.com/repos/OWNER/REPO/issues', {
			method: 'POST',
			headers: { authorization: `Bearer ${githubToken}` },
			body: JSON.stringify({ title, body, labels: ['bug'] }),
		})

		return new Response(null, { status: response.ok ? 204 : 502 })
	} catch (error) {
		if (error instanceof ReportExportError) return new Response(error.message, { status: error.status })

		throw error
	}
}
```

> `map` holds `MapPlat` and the marks that draw over it. A region category can take a soft tone, a lighter step of its color. It can also take stripes of a second color. The legend and the tooltip show the same tone and stripes. `projection="identity"` draws an atlas that is already projected, such as `us-atlas` `states-albers-10m`, with no spherical math. A side legend stands beside the map from the map's own `@lg`, and under the map it is the centered row. `isRegionDisabled` disables a region that opens nothing on a clickable map: it takes no click, no pointer cursor, and no click hover. A tap picks a region or a mark, as a click does. `selectedRegions` and `selectedOverlays` take a set of picks, in the shape of the `selectedCategories` of a chart. Each picked region takes a ring, each picked mark takes a halo, and the row of each pick in the hidden table says "selected". The map holds no selection state, so a click, a dashboard cross-filter, or a chat citation owns the set. A pick can open a Dialog or a Drawer over the map. Its ring or halo then shows once the backdrop of the panel is up, and does not blink under the fade.

> `form` holds `Form` and its parts. `FormSubmit` shows the loading state while a submit runs. `FormReset` is `aria-disabled` while the form is clean or a submit runs. `FormErrorSummary` lists the errors after a failed submit and takes the focus. Each row names its field with the text of its `Label`, and links to the control of its field, with or without a `Message`. `FormFilters` is a filter bar over a value record: `FormFiltersPrefix`, a `FormFiltersBar` that holds a `FormFiltersRow` of `FormFiltersField`s beside a `FormFiltersClear`, and `FormFiltersSuffix`. `FormFiltersClear` shows only while a field holds a value that the default does not. `FormFiltersSkeleton` stands in for the row while the fields load.

> `Form` turns off native validation (`noValidate`). Give each native constraint a validator, or pass `noValidate={false}`. While a submit runs, the form locks its parts: each field is read-only, each `Button` is inert, and a bound write does nothing. A native field that the `<form>` owns, such as a bare `<input>` or `<select>`, refuses each edit. Nothing is disabled, so the focus stays where it is. A `Button` that must stay live, such as Cancel, takes `lockable={false}`. The form also announces the submit politely. The bindable controls read the form through the internal `primitives/form` contract ([`PRIMITIVES.md`](PRIMITIVES.md)), so no component imports the module.

---

**See also:** [`COMPONENTS.md`](COMPONENTS.md) · [`PRIMITIVES.md`](PRIMITIVES.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
