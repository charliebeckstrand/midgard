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
| Tests of density in Firefox and WebKit (Playwright must have both) | `DENSITY_ENGINES=1 pnpm --filter ui test:browser --project density-firefox --project density-webkit` |
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
| `src/modules/<name>/` | Multi-part compositions that own their sub-components, hooks, and docs. |
| `src/structure/<name>/` | Static units that arrange other elements. |
| `src/hooks/` | Shared hooks. |
| `src/providers/<name>/` | Context providers. |
| `src/core/` | Recipe engine, `cn()`, density, and the other `ui/core` exports. |
| `src/recipes/` | Layered variant system. |
| `src/layouts/` | Page scaffolds and app shells. |
| `src/utilities/` | Package-internal pure helpers. |
| `src/types/` | Package-internal shared types. |
| `src/fonts/` | The generated font files and `fonts.css`. |
| `src/__tests__/` | Component, primitive, and boundary tests. |
| `src/__benchmarks__/` | Benchmarks. |
| `src/docs/` | The docs site: a React Router app that prerenders each page. `pages/` holds the examples, and `plugin/` gives the API data, the page list, and the highlighted code. |

## 4. Further reading

- [`REFERENCE.md`](REFERENCE.md): the package hub, with the surface map, the server/client boundary, and how to compose a new component.
- [`docs/`](docs): curated, quick-glance surface indices (components, modules, structure, layouts, hooks, primitives, providers, recipes, core, utilities), audits, and plans.
- [`src/recipes/README.md`](src/recipes/README.md): recipe-layer architecture.

---

**See also:** [`../../README.md`](../../README.md), [`../../CONVENTIONS.md`](../../CONVENTIONS.md), [REFERENCE.md](REFERENCE.md).
