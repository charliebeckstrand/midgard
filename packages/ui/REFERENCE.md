# REFERENCE.md

> **Scope:** the hub for the `ui` package surface. The per-category inventories live as curated, quick-glance docs under [`docs/`](docs). This file maps to them and keeps the cross-cutting architecture that no single category owns: the server/client boundary, and how to compose a new component. Authoring conventions live in [`../../CONVENTIONS.md`](../../CONVENTIONS.md).

## 1. Surface map

| Surface | Doc | Contents |
|---|---|---|
| Components | [`docs/COMPONENTS.md`](docs/COMPONENTS.md) | Every component, grouped by domain (inputs, overlays, data display, surfaces, …). |
| Modules | [`docs/MODULES.md`](docs/MODULES.md) | `ui/modules/*` (or the `ui/*` shorthand) — complex, multi-part compositions that own their sub-components, hooks, and docs. |
| Structure | [`docs/STRUCTURE.md`](docs/STRUCTURE.md) | `ui/structure/*` — box, container, flex, spacer, split, stack: the static units that arrange other elements. |
| Layouts | [`docs/LAYOUTS.md`](docs/LAYOUTS.md) | `ui/layouts` — page scaffolds and app shells (auth, stacked, dashboard, sidebar). |
| Hooks | [`docs/HOOKS.md`](docs/HOOKS.md) | `ui/hooks` — state, floating, interaction, a11y, measurement, drag-and-drop, formatted input. |
| Primitives | [`docs/PRIMITIVES.md`](docs/PRIMITIVES.md) | `ui/primitives/*` — floating/overlay shells, polymorphism, the styling-context cascades. |
| Providers | [`docs/PROVIDERS.md`](docs/PROVIDERS.md) | `ui/providers/*` — appearance, density, glass, headless, locale, toast, and the app-root `UIProvider`. |
| Recipes | [`docs/RECIPES.md`](docs/RECIPES.md) | The design layer — Kiso tokens → Katakana bridge → Kata, plus the recipe engine. |
| Core | [`docs/CORE.md`](docs/CORE.md) | `ui/core` — `cn`, `createContext`, `createSlot`, `announce`, and friends. |
| Utilities | [`docs/UTILITIES.md`](docs/UTILITIES.md) | Internal pure helpers (numeric, color contrast, caret, dismiss-layers, keyboard navigation). |

Per-symbol behavior, props, and defaults live in each symbol's TSDoc. The docs site (`pnpm docs`) renders them beside live demos through the [docs engine](src/docs/engine). Keep these docs current per [`../../CONVENTIONS.md`](../../CONVENTIONS.md) §12.

## 2. Server and client boundaries

The library splits into two tiers. **Static components** carry no `'use client'` directive and read no context, so they render in React Server Components. Their size and spacing are explicit props, with `md` recipe defaults. **Client components** keep `'use client'` in their own file (per [CONVENTIONS.md](../../CONVENTIONS.md) §2.2) and can read context freely.

The boundary rule: ambient styling state crosses the server/client boundary through the DOM, never through React context. Context cannot reach a server-rendered child passed through a client parent; data attributes and CSS can. Concretely:

- Hosts size their slot indicators with recipe projections: `shaku.icon` rows on Button/Sidebar. A projection owns its slot; an explicit `size` on a slot icon or spinner does not override it. A control slot has no projection, because it is a density scope (see below). Badge is a density host. Icon and LoadingSpinner follow the same scope, so they take the step of the badge. An explicit `size` on them wins. Badge projects `shaku.iconSlotRamp` only for a bare icon element with no size of its own.
- AvatarGroup projects descendant avatar and status-dot sizes. Table projects outline and stripes onto descendant cells; DescriptionList projects orientation layout onto its `dt`/`dd` children. Direct-child and exact-depth selectors keep nested instances independent.
- Density crosses the boundary as a `data-density` attribute. An element with the attribute is a density scope. The `DensityProvider` wrapper writes one. A static host with an explicit `size` opens one through the `density` prop of PolymorphicStatic or Box. A leaf with no children (Icon, LoadingSpinner) writes the attribute alone. A kata writes the value of each step in one stepped utility of [`tailwind.css`](tailwind.css), for example `density-p-[2,3,4]`. Three values give `sm`, `md`, and `lg`, and each outer step takes the value of its neighbor. Five values give the steps from `xs` to `xl`. A class that has no stepped utility goes under a variant, for example `density-sm:shadow-sm`. The Tailwind plugins `src/core/density/utilities.ts` and `src/core/density/variants.ts` define the utilities and the variants from `densitySteps`. The element takes the step of its nearest scope, itself included. Each match sits in a nested cascade layer ranked by depth, so the nearest scope wins. A consumer `className` wins over each step. A default that a step must replace uses `density-any`, which ranks below each step. Badge, Card and its title, Table, Icon, LoadingSpinner, Label, Description, Message, Option, the panel titles, List rows, and Menu rows use the stepped utilities. A stepped class and a plain class of one property merge in `cn`, so the later class stays. Other static atoms ignore density; pass `size`/`space`/`gap` explicitly. A control slot is a scope one step below its host (`stepDown` in `ui/core`). The control slots are the Input and select affixes, the Textarea action row, and the Nav and Sidebar item slots. A Badge, an Icon, a LoadingSpinner, or a Button in the slot therefore steps down with no `size`. The affix compensation constants of `kiso/control/affix` assume the stepped-down chip.
- A scope also opens the density context, one `DensityStep`, for client components that need the step as a JS value (Input, Button, Tabs, Menu, …). The `density` prop of PolymorphicStatic, Box, and PopoverPanel writes the attribute and opens the context in one place, so the two channels agree. Each other scope writes `data-density` on its own element beside `<Density step>`, and `density-native-boundary.test.ts` holds that parity. A portal takes a panel out of the DOM subtree of its scope. So the root of Overlay and of FloatingSurface writes the step of its context as `data-density`. Thus a panel in a portal follows the place that opened it. A static host can *open* a context scope without reading one. The prop renders the `Density` client component around the children, and the host stays directive-free and server-renderable. The static tier must not read the cascade (`useDensityStep` and friends). `density-native-boundary.test.ts` lists the components that take their step from the variants alone.
- A caller composes loading UI explicitly from the `<Name>Skeleton` variants ([CONVENTIONS.md](../../CONVENTIONS.md) §3.7); the variants are themselves static.
- Static leaves that link route through `PolymorphicStatic`: `href` renders a plain anchor, `render={<Link />}` composes the app router link per call site. Client components keep `Polymorphic`, which resolves the `<UIProvider>`-registered link from context.

`static-component-boundary.test.ts` pins the contract: it scans every listed source file (the list lives in that test) for directives, hook calls, and ambient imports. The scan is source-level only; a transitive client-only pull through a new dependency surfaces at the consuming app's `next build`, not here.

Two follow-up candidates still read ambient context for styling or formatting only. `locale` needs an API decision — explicit props or app wrappers — because formats cannot move to CSS. `glass` can move once a static surface grows a glass variant; today every reader is a client component by necessity.

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

When the folder name is plural, the singular stem prefixes its sub-files (`tabs/` → `tab.tsx`, `tab-list.tsx`). A namespace directory that ships only a family of parts has no `<name>.tsx` main; its barrel re-exports the parts directly (`dl`, `progress`, `resizable`, `status`). `component-filename-boundary.test.ts` pins both shapes, the bare-file allowlist, and the filename-matches-export rule.

Enforced by boundary tests (`packages/ui/src/__tests__/boundary/`). Add a demo and a test that renders via `renderUI()` and asserts on `data-slot`. Document the new public exports and add the component to [`docs/COMPONENTS.md`](docs/COMPONENTS.md) in the same change ([CONVENTIONS.md](../../CONVENTIONS.md) §12).

## 4. Commands

| Goal | Where | Command |
|---|---|---|
| Build | root | `turbo run build` |
| Typecheck | root | `turbo run check-types` |
| Lint | root | `biome check .` |
| Tests for the change you edit | `packages/ui` | `pnpm test:related <file>` / `pnpm test:changed` |
| Layout, computed style, or color ([CONVENTIONS.md](../../CONVENTIONS.md) §10.5) | `packages/ui` | `pnpm test:browser` |
| Code under the React Compiler ([CONVENTIONS.md](../../CONVENTIONS.md) §10.7) | `packages/ui` | `pnpm test:compiler` |
| The rule documents, the Biome plugins, or the apps | `packages/ui` | `pnpm test:workspace` |
| The accessibility corpus and its sweeps | `packages/ui` | `pnpm test:a11y` |
| Benchmarks | `packages/ui` | `pnpm bench` / `pnpm bench:browser` |
| Dev (docs site) | `packages/ui` | `pnpm docs` |

`test:changed` also runs the whole `boundary` project, so each gate runs before a push. CI runs each suite except the benchmarks.

## 5. Where to look

| Goal | Path |
|---|---|
| Components | `packages/ui/src/components/<name>/*` |
| Modules | `packages/ui/src/modules/<name>/*` |
| Component demos | `packages/ui/src/docs/demos/*` |
| Docs rendering engine | [`src/docs/engine`](src/docs/engine) |
| Recipe system | [`src/recipes/README.md`](src/recipes/README.md) |
| Curated surface docs | [`docs/`](docs) |
| Point-in-time audits | [`docs/audits/`](docs/audits) |

---

**See also:** [README.md](README.md), [`docs/`](docs), [`src/recipes/README.md`](src/recipes/README.md).
