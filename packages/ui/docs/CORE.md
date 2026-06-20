# Core

> **Quick-glance index of `ui/core`.** The small, framework-level toolkit every component leans on — class composition, typed context creation, slot factories, the invalid-state attribute pair, slot queries, accessible-name resolution, and the imperative screen-reader announcer. The recipe **engine** also lives under `core/recipe/` but is internal and reached only by the recipe layer — see [`RECIPES.md`](RECIPES.md).

```ts
import { cn, createContext, createSlot, announce } from 'ui/core'
```

| Export | Summary |
|---|---|
| `cn` | Class composer: `clsx` plus `tailwind-merge` extended with the project's named spacing scale. |
| `createContext` | Creates a typed React 19 context and its consumer hook; throws, defaults, or custom-errors outside a provider. |
| `createSlot` | Builds a thin slot component rendering an intrinsic element with `data-slot`, composed classes, and prop spread. |
| `querySlot` | Finds the `data-slot` / `data-<attr>=id` element within a container, scoped to avoid cross-instance matches. |
| `invalidAttrs` | Returns the `data-invalid` / `aria-invalid` pair when invalid, else `undefined` (spread-safe no-op). |
| `dataAttr` | Coerces a boolean flag to `''` / `undefined` for a spread-safe `data-*` presence attribute. |
| `ariaAttr` | Coerces a boolean flag to `true` / `undefined` for a spread-safe ARIA boolean attribute. |
| `composeEventHandlers` | Composes a caller's forwarded handler with the library's; theirs first, then ours unless they prevented default. |
| `accessibleName` | Best-effort accessible name of an element: `aria-label`, `aria-labelledby` target text, else own text. |
| `announce` | Imperative screen-reader announcement via a shared visually-hidden `aria-live` region on `document.body`. |
| `AnnounceOptions` *(type)* | Options for `announce` (politeness level). |
| `ComposeEventHandlersOptions` *(type)* | Options for `composeEventHandlers` (`checkForDefaultPrevented`). |

> For declarative announcements that track a changing value, prefer `useA11yAnnouncements` ([`HOOKS.md`](HOOKS.md)) over calling `announce` directly.

---

**See also:** [`UTILITIES.md`](UTILITIES.md) · [`RECIPES.md`](RECIPES.md) · [`HOOKS.md`](HOOKS.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
