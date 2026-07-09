# docs engine

ui's documentation engine — the machinery behind ui's docs site. It renders a
path-routed SPA over a component library: the library supplies its demos and a
thin Vite config (`vite.docs.config.ts`), the engine supplies everything else.
Still parameterized by `packageName`, so it stays library-agnostic even though
it now lives inside `ui` rather than as a standalone package.

## What lives here

| Layer | Path | Role |
|---|---|---|
| Demo-authoring kit | [`index.ts`](index.ts) | `Example`, `DemoTabs`/`DemoTab`/`DemoTabPanel`, the listbox/labeled/stepper controls, `code`, format helpers — the surface a library's demos import. |
| Route model + router | [`routes.ts`](routes.ts), [`router.ts`](router.ts) | The pure glob-key/pathname mapping, and its History-API binding (`usePathname`, `navigate`, `replaceHash`). |
| App shell | [`host.tsx`](host.tsx), [`app.tsx`](app.tsx) | The path-routed site chrome (`App`, sidebar, settings) plus `mount`. |
| API reference engine | [`api-reference`](api-reference) | ts-morph extraction of props, defaults, and TSDoc from a library's source. |
| Code derivation | [`derive-code`](derive-code) | Walks a demo's React tree into a copy-pasteable snippet. |
| Build plugin | [`plugins`](plugins), [`vite`](vite) | The Vite plugin + `defineDocsConfig` wired into `vite.docs.config.ts`. |

## Routing

Every demo page is a route: `demos/<category>/<demo>.tsx` serves at
`/<category>/<demo>`, and a demo folder's non-index pages are tab routes —
`demos/modules/grid/sorting.tsx` serves at `/modules/grid/sorting` as its own
lazy chunk. `layout.tsx` in a demo folder wraps every tab of that demo; it
places the tab bar (`DemoTabs`/`DemoTab`) and the routed page (`DemoTabPanel`),
so tab selection and navigation stay wired to the URL. A tabbed folder without
a layout gets a default tab bar. `_`-prefixed files and folders are shared
helpers, invisible to routing.

The URL hash addresses examples: a titled `Example` anchors itself at the slug
of its title (`#client-sorting`), the title is a hover-revealed anchor link,
and a deep link scrolls to its example under the sticky header on load. Legacy
hash routes (`/#modules-grid`) redirect to their path route at boot.

## How ui wires it

```ts
// packages/ui/vite.docs.config.ts
import { defineDocsConfig } from './src/docs/engine/vite'

export default defineDocsConfig({ packageName: 'ui' })
```

The entry hands `mount` two globs — the demo pages (everything but layouts and
`_`-helpers) and the layouts; see [`main.tsx`](../main.tsx) for the exact
patterns.

The chrome renders with ui's own components (imported relatively from
`src/components`, `src/core`, …). That dogfooding is why the engine lives inside
`ui`: keeping it a separate package made `ui` depend on it (for its docs site)
while it depended on `ui` (for its chrome) — a cycle collocation removes.
