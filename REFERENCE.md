# REFERENCE.md

A map of what already exists in this repo. Read it before building. Rules for *how* to write code are in [CONVENTIONS.md](CONVENTIONS.md); conduct in [CLAUDE.md](CLAUDE.md).

## 1. The UI library is the default toolbox

`ui` (`packages/ui`) is an extensive, production-grade component library: **104 components, 19 primitives, 24 hooks**, a layered design-token/recipe system, and a live demo site. It is the first place to look for any piece of interface.

Rules of engagement:

- **Compose from it.** A button, dialog, table, form field, combobox, menu — anything in §3 — comes from `ui`. Do not hand-roll with raw Tailwind what the library already provides.
- **Check the inventory first** (§3). With 100+ components the one you need usually exists, sometimes under a name you wouldn't guess — `dl`, `stat`, `segment`, `odometer`, `frame`, `glass`, `time-ago`.
- **Missing but reusable → recommend composing it.** If a feature needs a component that doesn't exist *and it would serve other features too*, propose it for the library, then scaffold it following §6. Don't bury a reusable widget inside a feature folder.
- **Missing and genuinely one-off → keep it app-local** (§7), composed from library primitives.

The bar: a feature should read as composition of existing `ui` parts. A bare `<div className="…">` where a component already exists is a smell.

## 2. Import surface

Components resolve per-directory through the package `exports` map — there is no root barrel. Import the specific entry:

| Entry | Path | Example |
|---|---|---|
| Component | `ui/<name>` | `import { Button } from 'ui/button'` |
| Core utilities | `ui/core` | `import { cn } from 'ui/core'` |
| Hooks | `ui/hooks` | `import { useControllable } from 'ui/hooks'` |
| Primitive | `ui/primitives/<name>` | `import { Panel } from 'ui/primitives/panel'` |
| Provider | `ui/providers/<name>` | `import { ToastProvider } from 'ui/providers/toast'` |
| Layouts | `ui/layouts` | |
| Shared types | `ui/types` | |

Each component's public API is its `index.ts` barrel: named exports (no defaults), a `*Props` type, and a `*Variants` type where it has variants.

## 3. Component inventory

All 104, grouped. Names are the import path (`ui/<name>`).

**Inputs & form fields** — `input` · `textarea` · `select` · `combobox` · `checkbox` · `radio` · `switch` · `slider` · `number-input` · `currency-input` · `credit-card-input` · `phone-input` · `zipcode-input` · `address-input` · `mask-input` · `date-picker` · `calendar` · `file-upload` · `search-input` · `tag-input` · `signature-pad` · `password-input` · `password-confirm` · `password-strength` · `toggle-icon-button`

**Form structure** — `form` · `fieldset` · `control` · `submit-button`

**Buttons & actions** — `button` · `copy-button` · `hold-button`

**Navigation** — `navbar` · `nav` · `sidebar` · `bottom-nav` · `breadcrumb` · `menu` · `tabs` · `toolbar` · `stepper` · `link` · `command-palette`

**Overlays** — `dialog` · `drawer` · `sheet` · `popover` · `tooltip` · `confirm` · `alert` · `banner` · `toast`

**Data display** — `data-table` · `table` · `editable-grid` · `pivot-table` · `query-builder` · `list` · `listbox` · `tree` · `kanban` · `json-tree` · `pagination` · `dl` · `timeline` · `stat` · `odometer` · `time-ago` · `status` · `badge` · `avatar` · `kbd` · `code`

**Layout & surfaces** — `box` · `flex` · `grid` · `stack` · `group` · `split` · `container` · `card` · `frame` · `glass` · `divider` · `spacer` · `aspect-ratio` · `scroll-area` · `resizable` · `collapse` · `accordion` · `segment` · `placeholder`

**Typography** — `heading` · `text` · `icon`

**Feedback** — `spinner` · `progress`

**Domain & specialized** — `map` · `pdf-viewer` · `chat-message` · `chat-prompt` · `filters`

**Escape hatches** — `headless` · `option`

The authoritative, runnable catalog is the demo site (§11) — each component has a `*.tsx` demo under `packages/ui/src/docs/demos/`.

## 4. Hooks, primitives, providers

**Hooks** (`ui/hooks`, 24) — reuse these before writing an effect:

- *State* — `useControllable` (controlled/uncontrolled value), `useDeferredToggle`, `useSelectableValueChange`
- *Floating & overlays* — `useFloatingUI`, `useFloatingPanel`, `useFloatingDisclosure`, `useOffcanvas`, `useDismissable`, `useScrollLock`
- *Interaction* — `useKeybindings`, `useKeyboardSettled`, `useRoving` (roving tabindex), `useRipple`, `useHasHover`, `useMaskedInput`
- *Measurement & layout* — `useResizeObserver`, `useMediaQuery`, `useMinWidth`, `useIsTruncated`, `useScrollWithin`, `useIdScope`
- *Drag & drop* (dnd-kit) — `useSortableItem`, `useSortableList`, `useSortableSensors`

**Primitives** (`ui/primitives/<name>`, 19) — low-level building blocks the components are made from; reach for these only when composing a new component, not in features: `panel`, `overlay`, `popover`, `floating-surface`, `offcanvas`, `control`, `density`, `polymorphic`, `touch-target`, `reduced-motion`, `ready-reveal`, `active-indicator`, `affix`, `current`, `join`, `link`, `option`, `toggle`, `virtual-options`.

**Providers** (`ui/providers/<name>`, 6) — `density`, `link`, `locale`, `motion`, `skeleton`, `toast`. An app wires the ones it needs in its `app/providers.tsx`.

## 5. Design system (recipes)

Styling variants are not ad-hoc Tailwind. They funnel through a layered recipe system under `packages/ui/src/recipes/` (Japanese-named layers, all internal): **Kiso** (substrate tokens) → **Genkei** (archetype fragments) → **Katakana** (applicators) → **Kata** (per-component recipe). A component reads exactly one curated surface, `recipes/kata/<name>`, and exposes the result as props.

For app work you never touch this — consume variants through component props (`<Button variant="soft" color="zinc" size="sm">`). For library work, author variants in `recipes/kata/<name>` only; cross-layer value imports are forbidden and pinned by boundary tests. Details: [`packages/ui/src/recipes/README.md`](packages/ui/src/recipes/README.md).

## 6. Composing a new library component

A new library component follows this shape:

```
packages/ui/src/components/<name>/
  <name>.tsx            main component — matches the folder name
  <name>-<part>.tsx     sub-components — always prefixed
  use-<name>-<hook>.ts  hooks — folder name in every hook filename
  context.ts            React context (.tsx only if it exports JSX)
  types.ts              extracted prop/data types
  variants.ts           recipe config, when extracted
  index.ts              barrel — re-exports only
```

Conventions enforced by tests (`packages/ui/src/__tests__/.../boundary/`): every file exports a symbol whose PascalCase / `useCamelCase` form matches the filename; components import variant values only via `recipes/kata/<name>`; the package `exports` map never lists `./recipes`. Add a demo and a test that renders via `renderUI()` and asserts on `data-slot`.

## 7. App vs. library boundary

Apps live under `apps/*` — each its own workspace, consuming the packages in §9. The patterns below hold for any app; substitute its name for `<app>` in the paths.

| | Lives in `ui` | Lives in `apps/<app>/src/components/` |
|---|---|---|
| Knows the domain (carriers, accounts, loads)? | No | Yes |
| Fetches app endpoints? | No | Yes |
| Reusable across features/apps? | Yes | Not necessarily |
| Example | `combobox`, `data-table`, `sheet` | `account-picker`, `carrier-combobox` |

`carrier-combobox` is the canonical app-local component: it composes the library `Combobox` + `Spinner`, adds carrier domain knowledge (`CARRIER_MODES`), and self-sources via `useCarriers()`. `account-picker` does the same over the library `Sheet`/`Input`/`Tooltip` with `useAccountHierarchy()`. Both are shared app-wide and imported as `@/components/<name>`. When the domain falls away and only the reusable shell remains, that shell is what gets promoted to the library.

## 8. App data & API

**Server modules** — `apps/<app>/src/api/*`, marked `'use server'`:

| Module | Role |
|---|---|
| `config.ts` | `getApiOrigin()` — gateway origin from `NEXT_PUBLIC_AI_SERVICES_URL` |
| `helpers.ts` | `getAccessToken()` — bearer token from the session |
| `auth.ts` | auth client |
| `tracking-loads.ts`, `potential-lates.ts`, `chat-history.ts` | feature data access — fetch the gateway with `Authorization: Bearer`, `cache: 'no-store'` |

**Client fetches** hit the same-origin proxy `/api/*`, handled by the catch-all route `apps/<app>/app/api/[...path]`, which attaches auth and forwards to the gateway. Client code never holds a token.

**Shared client data hooks** follow the module-cache + deduped-in-flight-promise pattern (CONVENTIONS 6.4): `use-account-hierarchy.ts`, `use-carriers.ts`. Per-feature hooks (e.g. `use-dashboard-run.ts`) re-run on a serialized filter key.

**Shared app components** — `apps/<app>/src/components/`: `account-picker`, `carrier-combobox`, `grid`, `impersonation-panel`. Global providers compose at `app/providers.tsx` (session, reauth, chat list, sidebar mode, density, settings).

## 9. Workspace packages

| Package | Path | What |
|---|---|---|
| `ui` | `packages/ui` | The component library — §1 |
| `auth` | `packages/auth` | Authentication — session, proxy, and user helpers (`auth/config`, `auth/proxy`, `auth/user`) |
| `shared` | `packages/shared` | Cross-cutting shared code — auth helpers, chat UI, fonts, and theme/global CSS (`shared/auth`, `shared/chat`, `shared/theme.css`, `shared/globals.css`) |

## 10. Environment variables

From an app's `.env.example` (`apps/<app>/.env.example`). `NEXT_PUBLIC_*` is client-exposed; the rest is server-only.

| Variable | Use |
|---|---|
| `AUTH_URL`, `AUTH_SECRET` | NextAuth (server-only) |
| `NEXT_PUBLIC_API_URL` | API endpoint |
| `NEXT_PUBLIC_AI_SERVICES_URL` | Gateway origin used by `getApiOrigin()` |
| `NEXT_PUBLIC_TMS_URL` | TMS app URL |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Maps |
| `NEXT_PUBLIC_AG_GRID_LICENSE_KEY` | AG Grid Enterprise license |

## 11. Commands

| Goal | Where | Command |
|---|---|---|
| Run the app | `apps/<app>` | `pnpm dev` (Next + Turbopack) |
| Build everything | root | `turbo run build` |
| Typecheck | root | `turbo run check-types` |
| Format + lint | root | `biome check .` (add `--write` to fix) |
| App tests | `apps/<app>` | `pnpm test` (Vitest) |
| Library tests (scoped) | `packages/ui` | `pnpm test:related` / `pnpm test:changed` |
| Browse components | `packages/ui` | `pnpm docs` (live demo site) |

Don't run the full library suite inside the editing loop — run a scoped subset and let the Lefthook pre-commit hook gate the rest (CONVENTIONS 11.4).

## 12. Where to look

- **Recipe system** — [`packages/ui/src/recipes/README.md`](packages/ui/src/recipes/README.md)
- **Component demos** — `packages/ui/src/docs/demos/*.tsx`, served by `pnpm docs`
