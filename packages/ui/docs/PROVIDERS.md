# Providers

> **Quick-glance index of `ui/providers/*`.** Providers configure the **client** tier — they broadcast ambient state (density, glass, locale, motion, toasts, link/portal integration) through React context to descendant client components. Static (server-renderable) components ignore context and take explicit props; see [`../REFERENCE.md`](../REFERENCE.md) §2 for the server/client boundary.

```ts
import { DensityProvider } from 'ui/providers/density'
import { UIProvider } from 'ui/providers/ui'
```

## `ui/providers/ui` — app-root integration

The single integration point an app mounts once at its root.

| Export | Summary |
|---|---|
| `UIProvider` | App-root integration point registering the framework link component and default portal container. |
| `useLink` | Reads the app-registered framework link component from `<UIProvider>`. |
| `usePortalContainer` | Resolves a portal's container: explicit per-call value, then ambient `<UIProvider>` value, then `null`. |
| `PortalContainer` *(type)* | DOM node to teleport portalled UI into, or `null` to defer to each portal's own fallback. |

## `ui/providers/density`

Broadcasts ambient density to size-aware client components.

| Export | Summary |
|---|---|
| `DensityProvider` | Friendly t-shirt-named (`compact` / `snug` / `loose`) wrapper that broadcasts ambient density to size-aware client components. |
| `DensityLevel` *(type)* | Friendly density level a `<DensityProvider>` broadcasts; `'snug'` is the baseline. |
| `densityLevels` | Selectable density levels with display labels, ordered loose → compact, for density pickers. |
| `densityToSize` | Maps each friendly density level to the `Step` carried by the Density primitive (loose→lg, snug→md, compact→sm). |

## `ui/providers/glass`

Sets the ambient glass flag so glass-aware chrome switches to its glass variant.

| Export | Summary |
|---|---|
| `GlassProvider` | Sets the ambient glass flag for the subtree, switching every glass-aware descendant to its glass variant. |
| `GlassProviderProps` *(type)* | Props for `GlassProvider`. |
| `GlassContext` | Ambient glass-mode context (default `false`); read via `useGlass()` at the leaf. |
| `useGlass` | Reads the ambient glass flag; `false` outside a `<GlassProvider>`. |
| `useResolvedSurface` | Resolves a chrome panel's `surface` variant, falling back to `'glass'` when the prop or ambient flag is set. |

## `ui/providers/locale`

Broadcasts i18n defaults; explicit component props still win.

| Export | Summary |
|---|---|
| `LocaleProvider` | Broadcasts i18n defaults (locale, currency, number/date formatting, time zone); explicit component props still win. |
| `useLocale` | Reads the ambient `LocaleConfig` from the nearest `<LocaleProvider>`; returns `{}` outside one. |

## `ui/providers/motion`

| Export | Summary |
|---|---|
| `Motion` | App-root motion config broadcasting `prefers-reduced-motion` handling to descendant framer `motion.*` components. |

## `ui/providers/toast`

App-root toast state; pairs with the `Toast` component which portals the queue.

| Export | Summary |
|---|---|
| `ToastProvider` | App-root toast state: manages queue, timers, and pause/resume; exposes `useToast()` to descendants. |
| `useToast` | Caller-facing toast API (`toast(data)` enqueues and returns id, `dismiss({ id })` removes); throws outside a provider. |

---

**See also:** [`COMPONENTS.md`](COMPONENTS.md) · [`HOOKS.md`](HOOKS.md) · [`PRIMITIVES.md`](PRIMITIVES.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
