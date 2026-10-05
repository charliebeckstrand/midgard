# ui

Headless components, primitives, hooks, providers, and a layered recipe system.

## 0. Prerequisites

- React 19
- Tailwind v4

## 1. Quick start

Consumers import per-component:

```ts
import { Button } from 'ui/button'
import { Dialog } from 'ui/dialog'
```

No root barrel; the `exports` map exposes each component path.

## 2. Commands

| Goal | Command |
|---|---|
| Build `dist` (tsup; no app reads it) | `pnpm --filter ui build:dist` |
| Docs site (dev) | `pnpm --filter ui dev` |
| Docs site (build) | `pnpm --filter ui docs:build` |
| Docs site (serve the build) | `pnpm --filter ui docs:preview` |
| Font files from the source font in `fonts/` | `pnpm --filter ui fonts` |
| Tests | `pnpm --filter ui test` |
| Tests (scoped) | `pnpm --filter ui test:related` / `pnpm --filter ui test:changed` |
| Tests of geometry, in Node and in Chromium | `pnpm --filter ui test:geometry` |
| Tests with the React Compiler on | `pnpm --filter ui test:compiler` |
| Tests that read files outside `ui` (rule documents, Biome plugins, apps) | `pnpm --filter ui test:workspace` |
| Benchmarks | `pnpm --filter ui bench` |
| Typecheck | `pnpm --filter ui check-types` |
| Lint | `pnpm --filter ui lint` |

## 3. Layout

| Path | Contents |
|---|---|
| `src/components/<name>/` | Components, one directory per unit. |
| `src/primitives/<name>/` | Composable building blocks. |
| `src/hooks/` | Shared hooks. |
| `src/providers/<name>/` | Context providers. |
| `src/core/` | Recipe engine, `cn()`, utilities. |
| `src/recipes/` | Layered variant system. |
| `src/layouts/` | Layout primitives. |
| `src/__tests__/` | Component, primitive, and boundary tests. |
| `src/docs/` | The docs site: a React Router app that prerenders each page. `pages/` holds the examples, and `plugin/` gives the API data, the page list, and the highlighted code. |

## 4. Further reading

- [`REFERENCE.md`](REFERENCE.md) — the package hub: surface map, the server/client boundary, and how to compose a new component.
- [`docs/`](docs) — curated, quick-glance surface indices (components, layouts, hooks, primitives, providers, recipes, core, utilities).
- [`src/recipes/README.md`](src/recipes/README.md) — recipe-layer architecture.

---

**See also:** [`../../README.md`](../../README.md), [`../../CONVENTIONS.md`](../../CONVENTIONS.md), [REFERENCE.md](REFERENCE.md).
