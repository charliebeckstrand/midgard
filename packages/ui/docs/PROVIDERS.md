# Providers

> **Quick-glance index of `ui/providers/*`.** Providers configure the **client** tier. They give ambient state — appearance, density, glass, locale, motion, and link/portal integration — to descendant client components through React context. A provider is here only when many unrelated components read it. A provider that serves one unit stays with that unit: `ToastProvider` is in `ui/toast`, and `ChatEmbedProvider` is in `ui/chat`. Density also crosses to static components as a `data-density` attribute. A static (server-renderable) component reads no context; see [`../REFERENCE.md`](../REFERENCE.md) §2 for the server/client boundary.

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
| `AppearanceProvider` | App-root owner of the theme and density preferences. It keeps both in `localStorage` and toggles the root `.dark` class. It writes the step of the density as a class on the root element, the density scope of the app. At `md`, the default, the root has no density class. |
| `AppearanceProviderProps` *(type)* | Props for `AppearanceProvider`. |
| `AppearanceSettings` | Settings icon button that opens a dialog with the appearance and density pickers. A selection applies immediately and persists. `children` adds more fields below the pickers. |
| `AppearanceSettingsProps` *(type)* | Props for `AppearanceSettings`: more fields for the dialog. |
| `AppearanceScript` | Inline head script that applies the stored theme and density to the root element before the first paint. It has no `'use client'`, so a server layout can render it. |
| `FontScript` | Head script that adds the latin subset of the font of ui before the first paint, so latin text never paints without the font. It is not `async`, and the browser keeps it in its cache. The browser downloads another subset only when a page has text in it. The font faces and their fallbacks come from `ui/tailwind.css`. It reads no context, so a server layout can render it. |
| `useAppearance` | Reads the theme, the density, and their setters from the nearest `AppearanceProvider`; throws outside one. |
| `AppearanceContextValue` *(type)* | The value that `useAppearance` returns. |
| `ThemeMode` *(type)* | Theme preference: `light`, `dark`, or `system`. |
| `themeModes` | Selectable theme modes with display labels, for theme pickers. |

## `ui/providers/density`

Opens a density scope for a region, and maps the friendly density levels to density steps.

| Export | Summary |
|---|---|
| `DensityProvider` | Opens a density scope for a region at a friendly level (`compact` / `snug` / `loose`). Its wrapper writes the step of the level to `data-density`, which the stepped classes read. The wrapper also opens the `Density` context at the same step for the portal roots and the JS readers. |
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
| `LocaleProvider` | Broadcasts `Intl` formatting defaults (locale tag, currency, number and date options); explicit component props still win. The default number formats of charts, maps, PivotTable, grid aggregates, and Odometer take its `locale`. Its `dir` writes the direction of a region on a `contents` wrapper and opens a direction scope. Thus dialogs, menus, and panels that the region opens keep the direction across their portals. |
| `LocaleProviderProps` *(type)* | Props for `LocaleProvider`: the `LocaleConfig` fields and an optional `dir`. |
| `LocaleConfig` *(type)* | Ambient `Intl` defaults a `<LocaleProvider>` broadcasts: `locale`, `currency`, `numberFormat`, `dateFormat`. Every field feeds an `Intl.*` formatter, and none holds strings. A nested provider folds over the enclosing config per field. |
| `useLocale` | Reads the ambient `LocaleConfig` from the nearest `<LocaleProvider>`; returns `{}` outside one. |
| `useFormat` | Resolves a `FormatSpec` to a memoized `(value) => string` formatter, folding in the ambient locale / currency / number-format defaults. |
| `FormatSpec` *(type)* | What `useFormat` formats a value as: a numeric `Intl` format (`number`/`integer`/`currency`/`percent`/`compact`) or a prefixed `id` (`INV-42`). |

---

**See also:** [`COMPONENTS.md`](COMPONENTS.md) · [`HOOKS.md`](HOOKS.md) · [`PRIMITIVES.md`](PRIMITIVES.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
