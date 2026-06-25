# REFERENCE.md

> **Scope:** the hub for the `ui` package surface. The per-category inventories now live as curated, quick-glance docs under [`docs/`](docs); this file maps to them and keeps the cross-cutting architecture (the server/client boundary, how to compose a new component) that doesn't belong to a single category. Authoring conventions live in [`../../CONVENTIONS.md`](../../CONVENTIONS.md).

## 1. Surface map

| Surface | Doc | Contents |
|---|---|---|
| Components | [`docs/COMPONENTS.md`](docs/COMPONENTS.md) | Every component, grouped by domain (inputs, overlays, data display, layout, …). |
| Layouts | [`docs/LAYOUTS.md`](docs/LAYOUTS.md) | `ui/layouts` — page scaffolds and app shells (auth, stacked, dashboard, sidebar). |
| Hooks | [`docs/HOOKS.md`](docs/HOOKS.md) | `ui/hooks` — state, floating, interaction, a11y, measurement, drag-and-drop, formatted input. |
| Primitives | [`docs/PRIMITIVES.md`](docs/PRIMITIVES.md) | `ui/primitives/*` — floating/overlay shells, polymorphism, the styling-context cascades. |
| Providers | [`docs/PROVIDERS.md`](docs/PROVIDERS.md) | `ui/providers/*` — density, glass, headless, locale, motion, toast, and the app-root `UIProvider`. |
| Recipes | [`docs/RECIPES.md`](docs/RECIPES.md) | The design layer — Kiso tokens → Katakana bridge → Kata, plus the recipe engine. |
| Core | [`docs/CORE.md`](docs/CORE.md) | `ui/core` — `cn`, `createContext`, `createSlot`, `announce`, and friends. |
| Utilities | [`docs/UTILITIES.md`](docs/UTILITIES.md) | Internal pure helpers (numeric, caret, dismiss-layers, keyboard navigation). |

Per-symbol behavior, props, and defaults live in each symbol's TSDoc; the docs site (`pnpm docs`) renders them alongside live demos via the shared [`docs`](../docs) engine. Keep these docs current per [`../../CONVENTIONS.md`](../../CONVENTIONS.md) §12.

## 2. Server and client boundaries

The library splits into two tiers. **Static components** carry no `'use client'` directive and read no context, so they render in React Server Components; size and spacing are explicit props with `md` recipe defaults. **Client components** keep `'use client'` in their own file (per [CONVENTIONS.md](../../CONVENTIONS.md) §2.2) and may read context freely.

The boundary rule: ambient styling state crosses the server/client boundary through the DOM, never through React context. Context cannot reach a server-rendered child passed through a client parent; data attributes and CSS can. Concretely:

- Hosts size their slot indicators with recipe projections: `shaku.icon` rows on Button/Badge/Sidebar, stepped-down icon and spinner rows on the control affix slots (`kiso/control/affix`). A projection owns its slot; an explicit `size` on a slot icon or spinner does not override it.
- Card projects non-md section padding onto direct `data-slot=card-*` children; AvatarGroup projects descendant avatar sizes; Table projects density, outline, and stripes onto descendant cells; DescriptionList projects orientation layout onto its `dt`/`dd` children. Direct-child and exact-depth selectors keep nested instances independent.
- `AffixContext` remains for client slot children (a Button inside an Input affix still steps down); static leaves never read it.
- `DensityProvider` reaches client components only (Input, Button, Tabs, Menu, …). Static atoms ignore it; pass `size`/`space`/`gap` explicitly. A Badge in a control affix slot takes `size` one step below the control: the affix compensation constants assume the stepped-down chip.
- A static host may *open* a density scope without reading one: an explicitly sized Card wraps its children in the `Density` client component, so client children inherit the step while the Card itself stays directive-free and server-renderable. This is client-to-client context — it never crosses the server/client boundary — and static children still ignore it. Reading the cascade (`useDensity` and friends) stays banned in the static tier.
- Loading UI is composed explicitly from the `<Name>Skeleton` variants ([CONVENTIONS.md](../../CONVENTIONS.md) §3.7); the variants are themselves static.
- Static leaves that link route through `PolymorphicStatic`: `href` renders a plain anchor, `render={<Link />}` composes the app router link per call site. Client components keep `Polymorphic`, which resolves the `<UIProvider>`-registered link from context.

`static-component-boundary.test.ts` pins the contract: it scans every listed source file (the list lives in that test) for directives, hook calls, and ambient imports. The scan is source-level only; a transitive client-only pull through a new dependency surfaces at the consuming app's `next build`, not here.

Follow-up candidates that still read ambient context for styling or formatting only: `locale` (an API decision: explicit props or app wrappers, since formats can't move to CSS) and `glass` (worth migrating once a static surface grows a glass variant; today every reader is client by necessity).

## 3. Composing a new component

```
packages/ui/src/components/<name>/
  Component             <name>.tsx
  Sub-components        <name>-<part>.tsx
  Slot parts            slots.ts (.tsx only if it exports JSX)
  Hooks                 use-<name>-<hook>.ts
  React context         context.ts (.tsx only if it exports JSX)
  Prop/data types       types.ts
  Recipe config         variants.ts
  Barrel                index.ts (re-exports only)
```

When the folder name is plural, the singular stem prefixes its sub-files (`tabs/` → `tab.tsx`, `tab-list.tsx`). A namespace directory that ships only a family of parts has no `<name>.tsx` main — its barrel re-exports the parts directly (`dl`, `progress`, `resizable`, `status`). Both shapes, the bare-file allowlist, and the filename-matches-export rule are pinned by `component-filename-boundary.test.ts`.

Enforced by boundary tests (`packages/ui/src/__tests__/.../boundary/`). Add a demo and a test that renders via `renderUI()` and asserts on `data-slot`. Document the new public exports and add the component to [`docs/COMPONENTS.md`](docs/COMPONENTS.md) in the same change ([CONVENTIONS.md](../../CONVENTIONS.md) §12).

## 4. Commands

| Goal | Where | Command |
|---|---|---|
| Build | root | `turbo run build` |
| Typecheck | root | `turbo run check-types` |
| Lint | root | `biome check .` |
| Tests (scoped) | `packages/ui` | `pnpm test:related` / `pnpm test:changed` |
| Dev (docs site) | `packages/ui` | `pnpm docs` |

## 5. Where to look

| Goal | Path |
|---|---|
| Components | `packages/ui/src/components/<name>/*` |
| Component demos | `packages/ui/src/docs/demos/*` |
| Docs rendering engine | [`packages/docs`](../docs) |
| Recipe system | [`src/recipes/README.md`](src/recipes/README.md) |
| Curated surface docs | [`docs/`](docs) |
| Point-in-time audits | [`docs/audits/`](docs/audits) |

---

**See also:** [README.md](README.md), [`docs/`](docs), [`src/recipes/README.md`](src/recipes/README.md).
