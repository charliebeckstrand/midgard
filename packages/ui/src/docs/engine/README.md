# docs engine

ui's documentation engine — the machinery behind ui's docs site. It renders a
site over a component library, with a path and a prerendered page for each demo: the library supplies its demos and a
thin Vite config (`vite.docs.config.ts`), the engine supplies everything else.
Still parameterized by `packageName`, so it stays library-agnostic even though
it now lives inside `ui` rather than as a standalone package.

## What lives here

| Layer | Path | Role |
|---|---|---|
| Demo-authoring kit | [`index.ts`](index.ts) | `Example`, `Axes`, the listbox/labeled/stepper controls, `code`, format helpers — the surface a library's demos import. |
| App shell | [`app.tsx`](app.tsx), [`../app`](../app) | The site chrome (`App`, sidebar, settings) and the React Router app of ui: the routes, the root layout, and the entries. |
| API reference engine | [`api-reference`](api-reference) | ts-morph extraction of props, defaults, and TSDoc from a library's source. |
| Code derivation | [`derive-code`](derive-code) | Walks a demo's React tree into a copy-pasteable snippet, merging in build-time source facts (authored prop expressions, render-prop children, referenced hook/helper declarations) extracted per `Example` by [`plugins/source-facts.ts`](plugins/source-facts.ts). |
| Build plugin | [`plugins`](plugins), [`vite`](vite) | The Vite plugin + `defineDocsConfig` wired into `vite.docs.config.ts`. |
| Debug tools | [`debug`](debug) | The Debug section of the settings: a switch for each tool in [`registry.ts`](debug/registry.ts). A tool that is on loads before the first paint, and it puts its button in the header. The event log logs the events of each tap, for touch bugs that occur only on a device. |

## Example width

`Example` puts each child in its own instance box. The box acts as a column of
24rem on a page. It widens to fit wider content, up to the frame, and it
narrows with a narrow frame. In the box, a child takes the width that it takes
in the flow of a page. A component with a width of its own, such as a button
with `w-fit`, keeps that width at the start. A block, such as an input, a
progress bar, or a chart, fills the box. The playground, the axis examples, and
the custom examples use the same box, so a component shows at one width on its
page.

A frame with a width of its own, from `width` or `resize`, is the column. Each
box then fills the frame. A demo of a surface of a page, such as a map or a PDF
viewer, uses a sized frame. `Axes` takes the same sizes in `frame`, so its
examples match the custom examples of the page.

A demo sets no width on the component that it shows.
`demo-width-boundary.test.ts` records each width in a demo, such as the mock
page that holds a `Sidebar`.

## Example flow

An example puts its instances in a row when the root of each instance is
phrasing content: an element that HTML lets sit in a line of text, such as a
`span`, a `button`, an `a`, a `kbd`, or an `svg`. Thus avatars, badges, and
buttons show side by side, and the row wraps in a narrow frame. When the root
of an instance is a block, such as a `div`, the example stacks its instances,
one to a line. Thus alerts, calendars, and inputs stack. A box in a row takes
the width of its instance.

The `phrasing` variant in [`app.css`](app.css) holds the rule. It is CSS, so a
prerendered page shows the row before it hydrates. The rule reads the tag, not
the CSS `display`: a calendar with `inline-flex` stacks, and an icon button
with `flex` shows in a row. A row centers its instances on one line. When the
instances have captions, the captions align at the top, and each instance
centers on one line below them. A caption and its instance center on one
another.

A demo does not wrap its instances in a `Flex` to put them in a row. It gives
each instance as a child of `Example`.

## Generated axes

A demo does not list the values of a styling axis by hand. `<Axes>` reads the
extracted API of the barrel, and generates the examples from it:

```tsx
<Axes of="Button" render={(props, label) => <Button {...props}>{label}</Button>} />
```

An axis is a prop whose type is a finite set of literals, such as `variant`,
`color`, `size`, or a `boolean`. `<Axes>` renders a playground with one picker
for each axis. The shared styling axes come first, in one order on each page:
`variant`, then `color` or `tone`, then `size`, then `radius`, `rounded`, or
`shape`. Each other axis follows in the order of the props. The values of a
`size`, or of any other union of density steps, show from `xs` to `xl`. Then it renders one example for each axis, which shows every
value of that axis, in a row or one to a line ([Example flow](#example-flow)). The other axes of that example take the values of the
playground. A new value in the source of a component thus shows on the page
with no change to the demo. `omit` removes a prop from the axes. On a page with more than one
`<Axes>`, each `<Axes>` after the first gives a `title`, so that no two examples share a
title. The first one can have no title, so that its examples do not repeat the name of the page.
A playground without a title shows only its pickers above the instance.

Each instance in an axis example has a caption with the label of its value,
so that a reader sees which value it shows. When `render` shows `label` itself,
such as the text of a button, give `captions={false}`. The page smoke test
checks that each instance shows its label one time, in the caption or in the
content.

A picker starts at the default of its prop. The extractor reads a default
from the destructured parameter, then from a `@defaultValue` tag, then from the
`defaults` of the recipe that the component calls. An axis with no default
offers an unset option, so the component takes its own fallback.

An axis shows each value of the type of its prop, in source order. `<Axes>`
does not read the DOM, so the HTML of a page is the page after it hydrates,
and a test run gives the same examples as the browser. The `size` of a
component admits only the steps that render distinctly (`defineScale`), so its
axis needs no trim.

An axis that changes only the accessibility tree has nothing to show, such as
the heading level of a title, or an `aria-*` attribute that no class styles,
such as `multiselectable` of `Calendar`. Give such a prop in `omit`. The API
reference still lists the prop.

A value can render as its neighbor in the composition of one demo. For
example, an input has no `xs` step, so a `Group` of inputs at `xs` shows the
inputs at `sm`. Give the values to show in `values`, such as
`values={{ size: ['sm', 'md', 'lg'] }}`.

`valueLabel` writes each value for a reader: `xs` reads `Extra small`, `true`
reads `On`, and `separated` reads `Separated`. `humanize` writes a prop name as
the title of its example. A hand-written demo can use both helpers.

The `render` function runs in the render of `<Axes>`, so it must not call a
hook. Give the component the props that it requires in `render`, and spread
the axis props onto it. A compound component spreads them onto its root. A panel, such as `Dialog`,
`Drawer`, or `Sheet`, shares no state with its trigger. Wrap the trigger and
the panel in `Opener`, which keeps the open state for them.

Write a hand-authored `Example` only for what an axis cannot show: a
composition, an adornment such as `prefix`, or a flow with state.
The gate `demo-examples.test.ts` fails an example that one `<Axes>` covers,
an example that repeats an earlier example, and an example of a component
with a playground whose title is `Default`. The text of an element does not
count, so an example that differs only in its words fails.

`DemoPage` gives `<Axes>` the API data through `DemoApiContext`. The docs
plugin serves no API data in a test run. Therefore the page gates
(`__tests__/helpers/demo-api.ts`) extract the barrel of each page that uses
`<Axes>`, and give the data to the same context.

## How ui wires it

```ts
// packages/ui/vite.docs.config.ts
import { defineDocsConfig } from './src/docs/engine/vite'

export default defineDocsConfig({ packageName: 'ui' })
```

The site is a React Router app in framework mode, with no server at run time
(`ssr: false`). [`react-router.config.ts`](../react-router.config.ts) gives a
path to each demo, and to each tab of a page that has `PageTabs`. The build
renders each path to its own HTML file, and the browser hydrates it. A link of
the chrome or of a ui component goes through the router, because the root
gives `UIProvider` a `link` that renders the `Link` of React Router.

[`demo-id.ts`](demo-id.ts) gives the path of each page. A component page is at
its id (`/card`). A page in a namespace folder is in that folder of the path
(`/structure/box`). A tab adds one part (`/progress/gauge`), and its value has
only lowercase letters, digits, and hyphens. A path from before nested paths
(`/structure-box`) has no HTML file, so the host sends the fallback document,
and the app moves to the current path.

Use `react-router build src/docs --config vite.docs.config.ts`, not
`vite build`. The `vite build` command does not stop after the prerender.

The entry of the server ([`entry.server.tsx`](../app/entry.server.tsx))
renders each page in full, with no streamed Suspense boundaries. Thus the
first layout has the full height of the page.

After the prerender, [`inline-styles.ts`](vite/inline-styles.ts) puts the
styles of each page in a `<style>` in its HTML. Tailwind compiles the entry
stylesheet for the classes of that page only. The full stylesheet then loads
without a block on the first paint.

The chrome renders with ui's own components (imported relatively from
`src/components`, `src/core`, …). That dogfooding is why the engine lives inside
`ui`: keeping it a separate package made `ui` depend on it (for its docs site)
while it depended on `ui` (for its chrome) — a cycle collocation removes.
