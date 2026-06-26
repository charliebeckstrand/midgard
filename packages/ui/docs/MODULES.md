# Modules

> **Quick-glance index of every `ui` module** — the complex, multi-part compositions that bundle their own sub-components, hooks, types, and docs. Per-symbol behavior, props, and defaults live in each module's TSDoc and the docs site (`pnpm docs`). For the atomic components a module composes from, see [`COMPONENTS.md`](COMPONENTS.md).

A module is larger than a component: it owns a family of sub-components and hooks behind one entry point, ships its own demo, and earns its own surface entry here. Modules build on the atomic `ui` components and primitives rather than living beside them.

Each module is its own entry point under `ui/modules/*`:

```ts
import { Map } from 'ui/modules/map'
```

## Modules

`grid` · `map` · `query`

---

**See also:** [`COMPONENTS.md`](COMPONENTS.md) · [`PRIMITIVES.md`](PRIMITIVES.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
