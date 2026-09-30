# docs engine

ui's documentation engine — the machinery behind ui's docs site. It renders a
hash-routed site over a component library: the library supplies its demos and a
thin Vite config (`vite.docs.config.ts`), the engine supplies everything else.
Still parameterized by `packageName`, so it stays library-agnostic even though
it now lives inside `ui` rather than as a standalone package.

## What lives here

| Layer | Path | Role |
|---|---|---|
| Demo-authoring kit | [`index.ts`](index.ts) | `Example`, `Axes`, the listbox/labeled/stepper controls, `code`, format helpers — the surface a library's demos import. |
| App shell | [`host.tsx`](host.tsx), [`app.tsx`](app.tsx) | The hash-routed site chrome (`App`, sidebar, settings) plus `mount`. |
| API reference engine | [`api-reference`](api-reference) | ts-morph extraction of props, defaults, and TSDoc from a library's source. |
| Code derivation | [`derive-code`](derive-code) | Walks a demo's React tree into a copy-pasteable snippet, merging in build-time source facts (authored prop expressions, render-prop children, referenced hook/helper declarations) extracted per `Example` by [`plugins/source-facts.ts`](plugins/source-facts.ts). |
| Build plugin | [`plugins`](plugins), [`vite`](vite) | The Vite plugin + `defineDocsConfig` wired into `vite.docs.config.ts`. |

## Generated axes

A demo does not list the values of a styling axis by hand. `<Axes>` reads the
extracted API of the barrel, and generates the examples from it:

```tsx
<Axes of="Button" render={(props, label) => <Button {...props}>{label}</Button>} />
```

An axis is a prop whose type is a finite set of literals, such as `variant`,
`color`, `size`, or a `boolean`. `<Axes>` renders a playground with one picker
for each axis. Then it renders one example for each axis, which shows every
value of that axis. The other axes of that example take the values of the
playground. A new value in the source of a component thus shows on the page
with no change to the demo. `omit` removes a prop from the axes. A page with more than one
`<Axes>` gives each a `title`, so that no two examples share a title.

A picker starts at the default of its prop. The extractor reads a default
from the destructured parameter, then from a `@defaultValue` tag, then from the
`defaults` of the recipe that the component calls. An axis with no default
offers an unset option, so the component takes its own fallback.

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

```ts
// packages/ui/src/docs/main.tsx
import { mount } from './engine/host'

mount(import.meta.glob(['./demos/components/*.tsx', './demos/providers/*.tsx'], { import: 'Demo' }))
```

```html
<!-- packages/ui/src/docs/index.html -->
<link rel="stylesheet" href="./app.css" />
```

`index.html` links the stylesheet; `main.tsx` does not import it. An ES module
evaluates only after its full static graph loads. A CSS import in `main.tsx`
therefore delays the styles until the last module arrives, and the page paints
unstyled until then. The browser requests a `<link>` in parallel with the
modules, so the first paint has the correct theme. The dev server keeps
`app.css` warm ([`vite/index.ts`](vite/index.ts)) because the link makes it
block the paint.

The gain applies to the dev server only. The production build extracts the CSS
to a `<link>` in `<head>` from either form, so the built HTML is the same.

Knip reads only the `<script>` tags in `index.html`. Therefore
[`knip.json`](../../../../../knip.json) names `src/docs/app.css` as a second
entry of this site.

The chrome renders with ui's own components (imported relatively from
`src/components`, `src/core`, …). That dogfooding is why the engine lives inside
`ui`: keeping it a separate package made `ui` depend on it (for its docs site)
while it depended on `ui` (for its chrome) — a cycle collocation removes.
