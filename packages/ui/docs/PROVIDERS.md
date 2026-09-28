# Providers

> **Quick-glance index of `ui/providers/*`.** Providers configure the **client** tier. They give ambient state — appearance, density, glass, locale, motion, toasts, and link/portal integration — to descendant client components through React context. Density also crosses to static components as a `data-density` attribute. A static (server-renderable) component reads no context; see [`../REFERENCE.md`](../REFERENCE.md) §2 for the server/client boundary.

```ts
import { AppearanceProvider } from 'ui/providers/appearance'
import { DensityProvider } from 'ui/providers/density'
import { UIProvider } from 'ui/providers/ui'
```

## `ui/providers/ui` — app-root integration

The single integration point an app mounts once at its root.

| Export | Summary |
|---|---|
| `UIProvider` | App-root integration point registering the framework link component and default portal container. |
| `UIProviderProps` *(type)* | Props for `UIProvider`. |
| `useLink` | Reads the app-registered framework link component from `<UIProvider>`. |
| `usePortalContainer` | Resolves a portal's container: explicit per-call value, then ambient `<UIProvider>` value, then `null`. |
| `PortalContainer` *(type)* | DOM node to teleport portaled UI into, or `null` to defer to each portal's own fallback. |

## `ui/providers/appearance`

Holds the persisted theme and density of an app, and gives the settings button that edits them. An app mounts `AppearanceProvider` once at its root. The stylesheet of the app must key its `dark` variant on the `.dark` class.

| Export | Summary |
|---|---|
| `AppearanceProvider` | App-root owner of the theme and density preferences. It keeps both in `localStorage`, toggles the root `.dark` class, and writes the step of the density to `data-density` on the root element, the density scope of the app. |
| `AppearanceProviderProps` *(type)* | Props for `AppearanceProvider`. |
| `AppearanceSettings` | Settings icon button that opens a dialog with the appearance and density pickers. A selection applies immediately and persists. |
| `AppearanceScript` | Inline head script that applies the stored theme and density to the root element before the first paint. It has no `'use client'`, so a server layout can render it. |
| `useAppearance` | Reads the theme, the density, and their setters from the nearest `AppearanceProvider`; throws outside one. |
| `AppearanceContextValue` *(type)* | The value that `useAppearance` returns. |
| `ThemeMode` *(type)* | Theme preference: `light`, `dark`, or `system`. |
| `themeModes` | Selectable theme modes with display labels, for theme pickers. |

## `ui/providers/density`

Opens a density scope for a region, and maps the friendly density levels to density steps.

| Export | Summary |
|---|---|
| `DensityProvider` | Opens a density scope for a region at a friendly level (`compact` / `snug` / `loose`). Its wrapper writes the step of the level to `data-density`, which the stepped classes read, and it opens the `Density` context at the same step for the portal roots and the JS readers. |
| `DensityProviderProps` *(type)* | Props for `DensityProvider`. |
| `DensityLevel` *(type)* | Friendly density level: the stored density setting and the `density` prop of `DensityProvider`; `'snug'` is the baseline. |
| `densityLevels` | Selectable density levels with display labels, ordered loose → compact, for density pickers. |
| `levelToStep` | Maps each friendly density level to its density step (loose→lg, snug→md, compact→sm). |

## `ui/providers/glass`

Sets the ambient glass flag so glass-aware chrome switches to its glass variant.

| Export | Summary |
|---|---|
| `GlassProvider` | Sets the ambient glass flag for the subtree, switching every glass-aware descendant to its glass variant. It has no `'use client'`, so an RSC tree can host it; a client leaf writes the context. |
| `GlassProviderProps` *(type)* | Props for `GlassProvider`. |
| `GlassContext` | Ambient glass-mode context (default `false`); read via `useGlass()` at the leaf. |
| `useGlass` | Reads the ambient glass flag; `false` outside a `<GlassProvider>`. |
| `useResolvedSurface` | Resolves a chrome panel's `surface` variant, falling back to `'glass'` when the prop or ambient flag is set. |

## `ui/providers/headless`

Escape hatch that strips chrome from headless-aware descendants so they render the bare semantic element.

| Export | Summary |
|---|---|
| `HeadlessProvider` | Escape-hatch provider that strips chrome from headless-aware descendants so they render the bare semantic element. |
| `HeadlessProviderProps` *(type)* | Props for `HeadlessProvider`. |
| `HeadlessContext` | Ambient headless-mode context (default `false`); read via `useHeadless()` at the leaf. |
| `useHeadless` | Reads the ambient headless flag; `false` outside a `<HeadlessProvider>`. |

## `ui/providers/locale`

Broadcasts `Intl` formatting defaults; explicit component props still win. This is a formatting provider, not a translation layer. It holds no string catalog, so control strings stay hardcoded English. A catalog waits for a real second locale.

| Export | Summary |
|---|---|
| `LocaleProvider` | Broadcasts `Intl` formatting defaults (locale tag, currency, number and date options); explicit component props still win. The default number formats of charts, maps, PivotTable, grid aggregates, and Odometer take its `locale`. |
| `LocaleProviderProps` *(type)* | Props for `LocaleProvider`. |
| `LocaleConfig` *(type)* | Ambient `Intl` defaults a `<LocaleProvider>` broadcasts: `locale`, `currency`, `numberFormat`, `dateFormat`. Every field feeds an `Intl.*` formatter, and none holds strings. A nested provider folds over the enclosing config per field. |
| `useLocale` | Reads the ambient `LocaleConfig` from the nearest `<LocaleProvider>`; returns `{}` outside one. |
| `useFormat` | Resolves a `FormatSpec` to a memoized `(value) => string` formatter, folding in the ambient locale / currency / number-format defaults. |
| `FormatSpec` *(type)* | What `useFormat` formats a value as: a numeric `Intl` format (`number`/`integer`/`currency`/`percent`/`compact`) or a prefixed `id` (`INV-42`). |

## `ui/providers/toast`

App-root toast state; pairs with the `Toast` component which portals the queue.

| Export | Summary |
|---|---|
| `ToastProvider` | App-root toast state: manages queue, timers, and pause/resume; exposes `useToast()` to descendants. Each toast times out on its own `duration`, and a hover or focus on any toast pauses them all. |
| `ToastProviderProps` *(type)* | Props for `ToastProvider`. |
| `useToast` | Caller-facing toast API (`toast(data)` enqueues and returns id, `dismiss(id)` removes); throws outside a provider. |
| `ToastInput` *(type)* | A toast to enqueue via `useToast().toast(...)`: `title` plus optional `description` / `severity` / `actions` / `duration` / `id` / `closable` / `persist` / `onDismiss`. |
| `ToastDismissReason` *(type)* | Why a toast left the queue, handed to its `onDismiss`: `timeout` / `close` / `evicted` / `dismissed`. |
| `ToastSeverity` *(type)* | Severity of a toast, mapped to the underlying `Alert` tone: `info` / `neutral` / `success` / `warning` / `error`. |
| `ToastPosition` *(type)* | Viewport corner the toast stack anchors to. |

---

**See also:** [`COMPONENTS.md`](COMPONENTS.md) · [`HOOKS.md`](HOOKS.md) · [`PRIMITIVES.md`](PRIMITIVES.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
