# Providers

> **Quick-glance index of `ui/providers/*`.** Providers configure the **client** tier. They give ambient state — appearance, density, glass, locale, motion, and link/portal integration — to descendant client components through React context. A provider is here only when many unrelated components read it. A provider that serves one unit stays with that unit: `ToastProvider` is in `ui/toast`, and `ChatEmbedProvider` is in `ui/chat`. Density also crosses to static components as a `data-density` attribute. A static (server-renderable) component reads no context; see [`../REFERENCE.md`](../REFERENCE.md) §2 for the server/client boundary.

```ts
import { AppearanceProvider } from 'ui/providers/appearance'
import { DensityProvider } from 'ui/providers/density'
import { UIProvider } from 'ui/providers/ui'
```

## `ui/providers/ui` — app-root integration

The integration points an app mounts once at its root: `UIDocument` in the root layout, and `UIProvider` in the client providers.

| Export | Summary |
|---|---|
| `UIProvider` | App-root integration point: the framework link, the default portal container, and the current `pathname`. It mounts the hosts of `useConfirm` and `useToast`. Put `LocaleProvider` above it. |
| `UIProviderProps` *(type)* | Props for `UIProvider`. |
| `UIDocument` | The `<html>`, `<head>`, and `<body>` of an app, with `AppearanceScript` and `AppearanceProvider` in place. A server layout can render it. |
| `UIDocumentProps` *(type)* | Props for `UIDocument`: `lang`, the classes of `<html>` and `<body>`, and more `head` content. |
| `PathMatch` *(type)* | How an item `href` matches the `pathname`: `exact`, or `prefix` to also match each path under the `href`. |
| `useLink` | Reads the app-registered framework link component from `<UIProvider>`. |
| `usePortalContainer` | Resolves a portal's container: explicit per-call value, then ambient `<UIProvider>` value, then `null`. |
| `PortalContainer` *(type)* | DOM node to teleport portaled UI into, or `null` to defer to each portal's own fallback. |

## `ui/providers/appearance`

An app mounts `AppearanceProvider` once at its root. The stylesheet of the app must key its `dark` variant on the `.dark` class.

| Export | Summary |
|---|---|
| `AppearanceProvider` | App-root owner of the theme, density, motion, and sidebar preferences. It keeps them in `localStorage` and writes them as classes on the root element. It loads the latin face of the font, and `ui/tailwind.css` holds the other faces. |
| `AppearanceProviderProps` *(type)* | Props for `AppearanceProvider`. |
| `AppearanceSettings` | Settings icon button that opens the appearance, density, motion, and sidebar pickers. ⌘B or Ctrl+B toggles the sidebar. Under a `LocaleProvider` with `locales`, it adds the Language picker. `children` adds more fields. |
| `AppearanceSettingsProps` *(type)* | Props for `AppearanceSettings`: more fields for the dialog. |
| `AppearanceScript` | Inline head script that applies the stored preferences before the first paint. `UIDocument` renders it. |
| `useAppearance` | Reads the theme, the density, the motion, the sidebar, and their setters from the nearest `AppearanceProvider`; throws outside one. |
| `AppearanceContextValue` *(type)* | The value that `useAppearance` returns. |
| `ThemeMode` *(type)* | Theme preference: `light`, `dark`, or `system`. |
| `themeModes` | Selectable theme modes with display labels, for theme pickers. |
| `MotionMode` *(type)* | Motion preference: `system` follows the platform `prefers-reduced-motion` setting, and `reduced` reduces motion on each platform. |
| `motionModes` | Selectable motion modes with display labels, for motion pickers. |
| `SidebarMode` *(type)* | Sidebar preference: `locked` keeps the sidebar of a `SidebarLayout` in its panel where the layout is inline. `offcanvas` hides it at the start edge, and a pointer near the edge opens it. |
| `sidebarModes` | Selectable sidebar modes with display labels, for sidebar pickers. |

## `ui/providers/density`

Opens a density scope for a region, and maps the friendly density levels to density steps.

| Export | Summary |
|---|---|
| `DensityProvider` | Opens a density scope for a region at a friendly level (`compact` / `snug` / `loose`). |
| `DensityProviderProps` *(type)* | Props for `DensityProvider`. |
| `DensityLevel` *(type)* | Friendly density level: the stored density setting and the `density` prop of `DensityProvider`; `'snug'` is the baseline. |
| `densityLevels` | Selectable density levels with display labels, ordered loose → compact, for density pickers. |
| `levelToStep` | Maps each friendly density level to its density step (loose→lg, snug→md, compact→sm). |

## `ui/providers/glass`

Sets the ambient glass flag so glass-aware chrome switches to its glass variant.

| Export | Summary |
|---|---|
| `GlassProvider` | Sets the ambient glass flag for the subtree. An RSC tree can host it. |
| `GlassProviderProps` *(type)* | Props for `GlassProvider`. |
| `useGlass` | Reads the ambient glass flag; `false` outside a `<GlassProvider>`. |
| `useResolvedSurface` | Resolves a chrome panel's `surface` variant. A set `glass` prop wins, so `false` opts out inside a `<GlassProvider>`; with no prop, the ambient flag decides. |

## `ui/providers/headless`

Escape hatch that strips chrome from headless-aware descendants so they render the bare semantic element.

| Export | Summary |
|---|---|
| `HeadlessProvider` | Escape-hatch provider that strips chrome from headless-aware descendants so they render the bare semantic element. |
| `HeadlessProviderProps` *(type)* | Props for `HeadlessProvider`. |
| `useHeadless` | Reads the ambient headless flag; `false` outside a `<HeadlessProvider>`. |

## `ui/providers/locale`

A formatting provider, not a translation layer: it holds no string catalog.

| Export | Summary |
|---|---|
| `LocaleProvider` | Broadcasts `Intl` formatting defaults; explicit component props still win. Its `dir` opens a direction scope that crosses portals. Its `locales` lets the reader choose the locale, and stores the choice. On a page that renders on a server, set its `locale`. |
| `LocaleProviderProps` *(type)* | Props for `LocaleProvider`: the `LocaleConfig` fields, the optional `locales` that the reader can choose from, and an optional `dir`. |
| `LocaleConfig` *(type)* | Ambient `Intl` defaults: `locale`, `currency`, `numberFormat`, `dateFormat`, and `timeZone`. |
| `useLocale` | Reads the ambient `LocaleConfig` from the nearest `<LocaleProvider>`; returns `{}` outside one. |
| `useFormat` | Resolves a `FormatSpec` to a memoized `(value) => string` formatter, folding in the ambient locale / currency / number-format defaults. |
| `useDateFormat` | Resolves `Intl.DateTimeFormat` options to a memoized formatter in the locale of the provider. To render a date, use `DateTime` from `ui/date-time`. |
| `FormatSpec` *(type)* | What `useFormat` formats a value as: a numeric `Intl` format (`number`/`integer`/`currency`/`percent`/`compact`) or a prefixed `id` (`INV-42`). |

---

**See also:** [`COMPONENTS.md`](COMPONENTS.md) · [`HOOKS.md`](HOOKS.md) · [`PRIMITIVES.md`](PRIMITIVES.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
