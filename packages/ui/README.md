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
| Build (tsup + types) | `pnpm --filter ui build` |
| Docs site (dev) | `pnpm --filter ui docs` |
| Docs site (build) | `pnpm --filter ui docs:build` |
| Tests | `pnpm --filter ui test` |
| Tests (scoped) | `pnpm --filter ui test:related` / `pnpm --filter ui test:changed` |
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
| `src/layouts/` | Layout primitives and their variants. |
| `src/__tests__/` | Component, primitive, and boundary tests. |
| `src/docs/` | The docs-site entry — demos, host, and Vite config wiring the shared [`docs`](../docs) engine to ui's source. |

## 4. Further reading

- [`REFERENCE.md`](REFERENCE.md) — the package hub: surface map, the server/client boundary, and how to compose a new component.
- [`docs/`](docs) — curated, quick-glance surface indices (components, layouts, hooks, primitives, providers, recipes, core, utilities).
- [`src/recipes/README.md`](src/recipes/README.md) — recipe-layer architecture.

---

**See also:** [`../../README.md`](../../README.md), [`../../CONVENTIONS.md`](../../CONVENTIONS.md), [REFERENCE.md](REFERENCE.md).
