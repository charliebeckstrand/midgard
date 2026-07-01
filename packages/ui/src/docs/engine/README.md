# docs engine

ui's documentation engine — the machinery behind ui's docs site. It renders a
hash-routed site over a component library: the library supplies its demos and a
thin Vite config (`vite.docs.config.ts`), the engine supplies everything else.
Still parameterized by `packageName`, so it stays library-agnostic even though
it now lives inside `ui` rather than as a standalone package.

## What lives here

| Layer | Path | Role |
|---|---|---|
| Demo-authoring kit | [`index.ts`](index.ts) | `Example`, the listbox/labeled/stepper controls, `code`, format helpers — the surface a library's demos import. |
| App shell | [`host.tsx`](host.tsx), [`app.tsx`](app.tsx) | The hash-routed site chrome (`App`, sidebar, settings) plus `mount`. |
| API reference engine | [`api-reference`](api-reference) | ts-morph extraction of props, defaults, and TSDoc from a library's source. |
| Code derivation | [`derive-code`](derive-code) | Walks a demo's React tree into a copy-pasteable snippet. |
| Build plugin | [`plugins`](plugins), [`vite`](vite) | The Vite plugin + `defineDocsConfig` wired into `vite.docs.config.ts`. |

## How ui wires it

```ts
// packages/ui/vite.docs.config.ts
import { defineDocsConfig } from './src/docs/engine/vite'

export default defineDocsConfig({ packageName: 'ui' })
```

```ts
// packages/ui/src/docs/main.tsx
import { mount } from './engine/host'
import './app.css'

mount(import.meta.glob(['./demos/components/*.tsx', './demos/providers/*.tsx'], { import: 'Demo' }))
```

The chrome renders with ui's own components (imported relatively from
`src/components`, `src/core`, …). That dogfooding is why the engine lives inside
`ui`: keeping it a separate package made `ui` depend on it (for its docs site)
while it depended on `ui` (for its chrome) — a cycle collocation removes.
