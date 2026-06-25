# docs

The shared documentation engine. One source of truth for rendering a docs site
over any component library in the workspace (`ui`, and the forthcoming `grid` /
`charts`). A library supplies its own demos and a thin Vite config; this package
supplies everything else.

## What lives here

| Layer | Path | Role |
|---|---|---|
| Demo-authoring kit | [`src/index.ts`](src/index.ts) | `Example`, the listbox/labeled/stepper controls, `code`, format helpers — the surface a library's demos import. |
| App shell | [`src/app`](src/app) | The hash-routed site chrome (`App`, sidebar, settings) plus `mount`. |
| API reference engine | [`src/api-reference`](src/api-reference) | ts-morph extraction of props, defaults, and TSDoc from a library's source. |
| Code derivation | [`src/derive-code`](src/derive-code) | Walks a demo's React tree into a copy-pasteable snippet. |
| Build plugin | [`src/plugins`](src/plugins), [`src/vite`](src/vite) | The Vite plugin + `defineDocsConfig` a consumer wires into its own `vite.docs.config.ts`. |

## Consuming it

A library's docs build points the engine at its own source and demos:

```ts
// packages/<lib>/vite.docs.config.ts
import { defineDocsConfig } from 'docs/vite'

export default defineDocsConfig({ root: 'src/docs', packageName: '<lib>' })
```

```ts
// packages/<lib>/src/docs/main.tsx
import { mount } from 'docs/app'
import 'docs/app.css'

mount(import.meta.glob(['./demos/*.tsx', './demos/pages/*.tsx', './demos/providers/*.tsx'], { import: 'Demo' }))
```

The chrome renders with `ui`, so a consuming library inherits `ui` as a
transitive dependency of its docs build.
