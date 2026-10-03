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

## Generated axes

A demo does not list the values of a styling axis by hand. `<Axes>` reads the
extracted API of the barrel, and generates the examples from it:

```tsx
<Axes of="Button" render={(props, label) => <Button {...props}>{label}</Button>} />
```

An axis is a prop whose type is a finite set of literals, such as `variant`,
`color`, `size`, or a `boolean`. `<Axes>` renders a playground with one picker
for each axis. Then it renders one example for each axis, which shows every
value of that axis, one to a line. The other axes of that example take the values of the
playground. A new value in the source of a component thus shows on the page
with no change to the demo. `omit` removes a prop from the axes. A page with more than one
`<Axes>` gives each a `title`, so that no two examples share a title.

Each instance in an axis example has a caption with the label of its value,
so that a reader sees which value it shows. When `render` shows `label` itself,
such as the text of a button, give `captions={false}`. The page smoke test
checks that each instance shows its label one time, in the caption or in the
content.

A picker starts at the default of its prop. The extractor reads a default
from the destructured parameter, then from a `@defaultValue` tag, then from the
`defaults` of the recipe that the component calls. An axis with no default
offers an unset option, so the component takes its own fallback.

An axis of density steps shows only the steps that render distinctly. A
stepped class of three values, such as `density-h-[2,3,4]`, gives `xs` the
value of `sm` and `xl` the value of `lg`. The type of `size` still admits each
step, because the step also sets the scope of the children. On the first
commit, and after a change to another axis, `<Axes>` reads each instance of
the axis ([`step-signature.ts`](step-signature.ts)). It resolves each class at the step
of the nearest `data-density` scope, as the rungs of `core/density` do. Then
it drops each value whose classes and attributes match those of its neighbor.
The run keeps the value nearest the default, so `xs` and `sm` keep `sm`. The
picker of the playground offers the same values.

The read takes the DOM and no layout, so a test run gives the same answer as
the browser. A text difference does not count, because the content can show
the label. An inline `style` does not count either, because it carries the
state of the run, such as a fill that springs to its value. The step that an
instance shows does not count, so a Calendar at
`xs`, which opens a scope at `sm`, matches the Calendar at `sm`. A value stays
when no element of its instance opens a density scope, for example a panel in a
portal.

The other axes can make an axis inert. For example, the `segment` variant of
`Tabs` is always horizontal, so its `orientation` has no effect. After each
change to a picker, `<Axes>` reads each other axis
([`formSignature`](step-signature.ts)). When the instances of an axis differ at
the defaults and render alike at the current values, the example of that axis
hides. Its picker keeps each value. An axis whose instances render alike at
the defaults stays, because its effect shows only in a later state, such as
the panel of a closed dialog or the clear button of an empty input. An
example with one value also hides.

An axis that changes only the accessibility tree has nothing to show, such as
the heading level of a title or an `aria-*` attribute that no class styles,
such as `multiselectable` of `Calendar`. On the first read, `<Axes>` compares
the look of its instances ([`lookSignature`](step-signature.ts)): the form
with each heading level and each unstyled `aria-*` attribute removed. When the
forms differ and the looks match, the example and the picker of the axis hide.
The API reference still lists the prop.

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
