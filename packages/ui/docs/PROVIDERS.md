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
| `UIProvider` | App-root integration point registering the framework link component, the default portal container, and the current `pathname`. A `SidebarItem` or a `NavItem` with an `href` that matches the `pathname` is current. It also mounts the dialog that `useConfirm` from `ui/confirm` asks in. The outermost provider mounts the toast queue and viewport that `useToast` from `ui/toast` uses, and its `toast` prop sets them. The dialog loads on the first question, and the viewport on the first toast. Put `LocaleProvider` above it. |
| `UIProviderProps` *(type)* | Props for `UIProvider`. |
| `UIDocument` | The document of an app: `<html>`, `<head>`, and `<body>`. The head holds `AppearanceScript`, and the body wraps its children in `AppearanceProvider`, so the pre-paint step and its provider are always together. The `<html>` element has `suppressHydrationWarning`, because the script changes its classes before hydration. It has no `'use client'`, so a server layout can render it. |
| `UIDocumentProps` *(type)* | Props for `UIDocument`: `lang`, the classes of `<html>` and `<body>`, and more `head` content. |
| `PathMatch` *(type)* | How an item `href` matches the `pathname`: `exact`, or `prefix` to also match each path under the `href`. |
| `useLink` | Reads the app-registered framework link component from `<UIProvider>`. |
| `usePortalContainer` | Resolves a portal's container: explicit per-call value, then ambient `<UIProvider>` value, then `null`. |
| `PortalContainer` *(type)* | DOM node to teleport portaled UI into, or `null` to defer to each portal's own fallback. |

## `ui/providers/appearance`

Holds the persisted theme, density, motion, and sidebar of an app, and gives the settings button that edits them. An app mounts `AppearanceProvider` once at its root. The stylesheet of the app must key its `dark` variant on the `.dark` class.

| Export | Summary |
|---|---|
| `AppearanceProvider` | App-root owner of the theme, density, motion, and sidebar preferences. It keeps them in `localStorage` and toggles the root `.dark` class. While the motion is `reduced`, the root has the `reduced-motion` class. While the sidebar is `offcanvas`, the root has the `sidebar-offcanvas` class. The `sidebar-offcanvas` variant reads it, and `SidebarLayout` then shows its desktop sidebar as a floating sheet. The `motion-reduce` and `motion-safe` variants of `ui/tailwind.css` read the class, and `usePrefersReducedMotion` and `ReducedMotion` read the choice. It writes the step of the density as a class on the root element, the density scope of the app. At `md`, the default, the root has no density class. It renders the script that adds the latin subset of the font of ui before its children, so latin text never paints without the font. The other font faces come from `ui/tailwind.css`, which has no latin face. |
| `AppearanceProviderProps` *(type)* | Props for `AppearanceProvider`. |
| `AppearanceSettings` | Settings icon button that opens a dialog with the appearance, density, and motion pickers. Inside a `SidebarLayout`, the dialog also has the Sidebar picker (Locked or Offcanvas) with its ⌘B or Ctrl+B key, from `lg` up. A selection applies immediately and persists. `children` adds more fields below the pickers. The dialog module loads on the first pointer or focus on the button, and the dialog opens when it is there. |
| `AppearanceSettingsProps` *(type)* | Props for `AppearanceSettings`: more fields for the dialog. |
| `AppearanceScript` | Inline head script that applies the stored theme, density, motion, and sidebar to the root element before the first paint. It has no `'use client'`, so a server layout can render it. `UIDocument` renders it. |
| `useAppearance` | Reads the theme, the density, the motion, the sidebar, and their setters from the nearest `AppearanceProvider`; throws outside one. |
| `AppearanceContextValue` *(type)* | The value that `useAppearance` returns. |
| `ThemeMode` *(type)* | Theme preference: `light`, `dark`, or `system`. |
| `themeModes` | Selectable theme modes with display labels, for theme pickers. |
| `MotionMode` *(type)* | Motion preference: `system` follows the platform `prefers-reduced-motion` setting, and `reduced` reduces motion on each platform. |
| `motionModes` | Selectable motion modes with display labels, for motion pickers. |
| `SidebarMode` *(type)* | Sidebar preference: `locked` keeps the sidebar of a `SidebarLayout` inline from `lg` up. `offcanvas` hides it at the start edge, and a pointer near the edge opens it. |
| `sidebarModes` | Selectable sidebar modes with display labels, for sidebar pickers. |

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

Broadcasts `Intl` formatting defaults; explicit component props still win. This is a formatting provider, not a translation layer. It holds no string catalog, so control strings stay hardcoded English. A catalog waits for a real second locale.

| Export | Summary |
|---|---|
| `LocaleProvider` | Broadcasts `Intl` formatting defaults (locale tag, currency, number and date options, time zone); explicit component props still win. The default number formats of charts, maps, PivotTable, grid aggregates, and Odometer take its `locale`. Its `dir` writes the direction of a region on a `contents` wrapper and opens a direction scope. Thus dialogs, menus, and panels that the region opens keep the direction across their portals. On a page that renders on a server, set its `locale`. Without a locale, the server markup and the hydration render can use different runtime defaults. |
| `LocaleProviderProps` *(type)* | Props for `LocaleProvider`: the `LocaleConfig` fields and an optional `dir`. |
| `LocaleConfig` *(type)* | Ambient `Intl` defaults a `<LocaleProvider>` broadcasts: `locale`, `currency`, `numberFormat`, `dateFormat`, `timeZone`. Every field feeds an `Intl.*` formatter, and none holds strings. A nested provider folds over the enclosing config per field. |
| `useLocale` | Reads the ambient `LocaleConfig` from the nearest `<LocaleProvider>`; returns `{}` outside one. |
| `useFormat` | Resolves a `FormatSpec` to a memoized `(value) => string` formatter, folding in the ambient locale / currency / number-format defaults. |
| `useDateFormat` | Resolves `Intl.DateTimeFormat` options to a memoized formatter in the locale of the provider. The server render and the hydration render use the `timeZone` of the provider, `UTC` by default. A format with a time then adds the name of the zone. The render after hydration uses the zone of the reader. A `timeZone` in the options fixes the zone for all renders. `DateTime` in `ui/date-time` renders the result in a `<time>`. |
| `FormatSpec` *(type)* | What `useFormat` formats a value as: a numeric `Intl` format (`number`/`integer`/`currency`/`percent`/`compact`) or a prefixed `id` (`INV-42`). |

---

**See also:** [`COMPONENTS.md`](COMPONENTS.md) · [`HOOKS.md`](HOOKS.md) · [`PRIMITIVES.md`](PRIMITIVES.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
