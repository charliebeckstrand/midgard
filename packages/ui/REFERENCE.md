# REFERENCE.md

> **Scope:** the hub for the `ui` package surface. The per-category inventories live as curated, quick-glance docs under [`docs/`](docs). This file maps to them and keeps the cross-cutting architecture that no single category owns: the server/client boundary, and how to compose a new component. Authoring conventions live in [`../../CONVENTIONS.md`](../../CONVENTIONS.md).

## 1. Surface map

| Surface | Doc | Contents |
|---|---|---|
| Components | [`docs/COMPONENTS.md`](docs/COMPONENTS.md) | Every component, grouped by domain (inputs, overlays, data display, surfaces, …). |
| Modules | [`docs/MODULES.md`](docs/MODULES.md) | `ui/modules/*`, each also at its bare `ui/<name>` path — complex, multi-part compositions that own their sub-components, hooks, and docs. |
| Structure | [`docs/STRUCTURE.md`](docs/STRUCTURE.md) | `ui/structure/*`, each also at its bare `ui/<name>` path — box, container, flex, spacer, split, stack: the static units that arrange other elements. |
| Layouts | [`docs/LAYOUTS.md`](docs/LAYOUTS.md) | `ui/layouts` — page scaffolds and app shells (auth, stacked, dashboard, sidebar). |
| Hooks | [`docs/HOOKS.md`](docs/HOOKS.md) | `ui/hooks` — state, floating, interaction, a11y, measurement, drag-and-drop, formatted input. |
| Primitives | [`docs/PRIMITIVES.md`](docs/PRIMITIVES.md) | `ui/primitives/*` — floating/overlay shells, polymorphism, the styling-context cascades. |
| Providers | [`docs/PROVIDERS.md`](docs/PROVIDERS.md) | `ui/providers/*` — appearance, density, glass, headless, locale, and the app-root `UIProvider`. |
| Recipes | [`docs/RECIPES.md`](docs/RECIPES.md) | The design layer — Kiso tokens → Katakana bridge → Kata, plus the recipe engine. |
| Core | [`docs/CORE.md`](docs/CORE.md) | `ui/core` — `cn`, `createContext`, `createSlot`, `announce`, and friends. |
| Utilities | [`docs/UTILITIES.md`](docs/UTILITIES.md) | Internal pure helpers (numeric, color contrast, caret, dismiss-layers, keyboard navigation). |

Per-symbol behavior, props, and defaults live in each symbol's TSDoc. The docs site (`pnpm --filter ui dev`) renders them beside live examples through the [docs plugin](src/docs/plugin). Keep these docs current per [`../../CONVENTIONS.md`](../../CONVENTIONS.md) §12.

## 2. Server and client boundaries

The library splits into two tiers. **Static components** carry no `'use client'` directive and read no context, so they render in React Server Components. Their size and spacing come from explicit props, or from the nearest density scope through CSS. **Client components** keep `'use client'` in their own file (per [CONVENTIONS.md](../../CONVENTIONS.md) §2.2) and can read context freely.

The boundary rule: ambient styling state crosses the server/client boundary through the DOM, never through React context. Context cannot reach a server-rendered child passed through a client parent; data attributes and CSS can. Concretely:

- Hosts size their slot indicators with recipe projections. Button, Sidebar, Nav, and the menu and option rows use the stepped `shaku.icon.slot.base`, and CommandPalette uses the fixed `shaku.icon.slot.md`. A fixed projection owns its slot; an explicit `size` on a slot icon or spinner does not override it. A control slot has no projection, because it is a density scope (see below). Badge is a density host. Icon and LoadingSpinner follow the same scope, so they take the step of the badge. An explicit `size` on them wins. Badge projects `shaku.icon.slot.base` only for a bare icon element with no size of its own.
- AvatarGroup projects descendant avatar and status-dot sizes. Table projects outline and stripes onto descendant cells; DescriptionList projects orientation layout onto its `dt`/`dd` children. Direct-child and exact-depth selectors keep nested instances independent.
- Density crosses the boundary as a `data-density` attribute. An element with the attribute is a density scope. The root element is the scope of the app. `AppearanceScript` writes the stored step on it before the first paint, and `AppearanceProvider` keeps it in sync. `md` is the base of each stepped class and reads no ancestor, so at `md` the root has no mark. For each other step, the root holds a class, for example `density-root-sm`, not `data-density` (`rootDensityClasses` in `src/core/density/steps.ts`). Chromium's ancestor filter reads class names and attribute names but not attribute values. So it can reject a nested rung when no scope is above the element, and a root rung when the root holds another step. The root ranks below each other scope and takes no ranked depth. The `DensityProvider` wrapper writes a nested scope. A static host with an explicit `size` opens one through the `density` prop of PolymorphicStatic or Box. A leaf with no children (Icon, LoadingSpinner) writes the attribute alone. A kata writes the value of each step in one stepped utility of [`tailwind.css`](tailwind.css), for example `density-p-[2,3,4]`. Three values give `sm`, `md`, and `lg`, and each outer step takes the value of its neighbor. Five values give the steps from `xs` to `xl`. A control stops at `lg`. The Button family offers the steps from `xs` to `lg`. Each other control offers `sm`, `md`, and `lg`, because its affix slot is a scope one step below it, and no step is below `xs`. In an `xs` or an `xl` scope, a control takes the nearest step of its scale. A component reads the steps of its `size` from its ramps. `defineScale` makes its size scale, and `ScaleStep` types the prop. Thus the prop offers only the steps that render with a look of their own (CONVENTIONS §5.5). A class that has no stepped utility goes under a variant, for example `density-sm:shadow-sm`. The Tailwind plugins `src/core/density/utilities.ts` and `src/core/density/variants.ts` define the utilities and the variants from `densitySteps`. The element takes the step of its nearest scope, itself included. Each match sits in a nested cascade layer ranked by depth, so the nearest scope wins. The layers rank two depths (`maxDepth` in `src/core/density/rungs.ts`), and the CSS grows with the square of that number. A scope below the second depth can lose to the scope above it. So the smoke test of the docs pages (`src/docs/__tests__/page-smoke.tsx`) fails when a page nests more than two scopes. A consumer `className` wins over each step. A default that a step must replace uses `density-any`, which ranks below each step. `density-native-boundary.test.ts` holds that no recipe has a `size` or a `density` axis, so each component with a `size` follows density. A stepped class and a plain class of one property merge in `cn`, so the later class stays. A control slot is a scope one step below its host. Each host of a slot stops at `lg`. So in an `xl` scope the slot takes `md`, as it does in an `lg` scope (`slotStep` in `src/core/density/steps.ts`). The Input and select affixes, the Textarea action row, the SidebarItem and NavItem slots, and the ChatListItem actions write `data-density="slot"`. The rungs match the slot one step below the scope above it, with no step in JS. The slot is its own nearest scope, so a stepped class on the slot element gives the value for a host one step above. The slot opens no context, so a panel that a slot opens, such as a tooltip, takes the step of the host. A Badge, an Icon, a LoadingSpinner, or a Button in the slot therefore steps down with no `size`. The affix compensation constants of `kiso/control/affix` assume the stepped-down chip.
- A scope also opens the density context, one `DensityStep`. A client reader that needs the step as a JS value reads it: `Portal`, Calendar, and Grid. The context does not hold the root. Outside each other scope, `useDensityStep` reads the root element, which the server cannot read. So a JS value takes the stored step one render after hydration. A class through the variants is correct at the first paint. A scope is the `density` prop of the host primitive: PolymorphicStatic, Box, ControlFrame, PopoverPanel, or FloatingSurface. The prop writes the attribute and opens the context in one place, so the two channels agree. Button and Drawer write both channels by hand, because their elements are a link and a `motion.div`. `density-native-boundary.test.ts` lists the files that are permitted to do this. A portal takes a panel out of the DOM subtree of its scope. So `Portal` writes the step of its context as `data-density` on a `display: contents` host, and the direction of the nearest direction scope as `dir`. Thus a panel in a portal follows the place that opened it. A static host can *open* a context scope without reading one. The prop renders the `Density` client component around the children, and the host stays directive-free and server-renderable. The static tier must not read the context (`useDensityStep` and friends). `density-native-boundary.test.ts` holds the files that are permitted to read it.
- A caller composes loading UI explicitly from the `<Name>Skeleton` variants ([CONVENTIONS.md](../../CONVENTIONS.md) §3.7); the variants are themselves static. A skeleton follows density as its component does. With no `size`, it takes the step of its nearest scope through stepped classes, and an explicit `size` writes `data-density`. The skeleton of an inline component (Badge, Avatar) is an inline-block `<span>`, from the `inline` key of its recipe. Thus it can sit in a line of text.
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

When the folder name is plural, the singular stem prefixes its sub-files (`tabs/` → `tab.tsx`, `tab-list.tsx`). A namespace directory that ships only a family of parts has no `<name>.tsx` main; its barrel re-exports the parts directly (`progress`, `resizable`, `status`). `component-filename-boundary.test.ts` pins both shapes, the bare-file allowlist, and the filename-matches-export rule.

Enforced by boundary tests (`packages/ui/src/__tests__/boundary/`). Add a page under `src/docs/pages/components/<name>/` and a test that renders via `renderUI()` and asserts on `data-slot`. `page-coverage.test.ts` fails a component with no page. `page-smoke.test.tsx` renders each page and each tab, and fails on a throw, a console error or warning, or an axe violation. `check-types` type-checks each example of a page (`src/docs/tsconfig.json`). A page sets no width on the component that it shows, because the `Example` box sets that width. `demo-width-boundary.test.ts` records each permitted width. Document the new public exports and add the component to [`docs/COMPONENTS.md`](docs/COMPONENTS.md) in the same change ([CONVENTIONS.md](../../CONVENTIONS.md) §12).

## 4. Commands

| Goal | Where | Command |
|---|---|---|
| Build | root | `turbo run build` |
| Typecheck | root | `turbo run check-types` |
| Lint | root | `biome check .` |
| Tests for the change you edit | `packages/ui` | `pnpm test:related <file>` / `pnpm test:changed` |
| Layout, computed style, or color ([CONVENTIONS.md](../../CONVENTIONS.md) §10.5) | `packages/ui` | `pnpm test:browser` |
| Geometry: layout boxes and pure calculations on coordinates, boxes, and shapes ([CONVENTIONS.md](../../CONVENTIONS.md) §10.5) | `packages/ui` | `pnpm test:geometry` |
| Code under the React Compiler ([CONVENTIONS.md](../../CONVENTIONS.md) §10.7) | `packages/ui` | `pnpm test:compiler` |
| The rule documents, the Biome plugins, or the apps | `packages/ui` | `pnpm test:workspace` |
| The accessibility corpus and its sweeps | `packages/ui` | `pnpm test:a11y` |
| Benchmarks | `packages/ui` | `pnpm bench` / `pnpm bench:browser` |
| Percy snapshots of the fixture sheets in `src/docs/fixtures` (needs `PERCY_TOKEN`) | `packages/ui` | `pnpm visual [sheet ids] [--density=<levels>]` |
| The font files and `src/fonts/fonts.css`, after a change to the source font in `fonts/` or to `scripts/fonts.ts` (`fonts-boundary.test.ts` fails when they do not agree) | `packages/ui` | `pnpm fonts` |
| Load time of the docs app | `packages/ui` | `pnpm docs:bench` |
| Dev (docs site) | `packages/ui` | `pnpm dev` |

`test:changed` also runs the whole `boundary` and `workspace` projects, so each gate runs before a push. CI runs each suite except the benchmarks and the Percy snapshots. The `build` job builds the apps. The `browser` job also runs `docs:hydration`, which fails when a prerendered page of the docs app reports a hydration error. It also fails when a page whose HTML names a removed chunk does not reload one time and hydrate. The same job runs `bundle:budget` on the docs build. The `Visual` workflow runs the Percy snapshots each Thursday, and on demand from the Actions tab. A Thursday on which `packages/ui` and the lockfile did not change takes no snapshots. No pull request or push starts it.

## 5. Where to look

| Goal | Path |
|---|---|
| Components | `packages/ui/src/components/<name>/*` |
| Modules | `packages/ui/src/modules/<name>/*` |
| Component examples | `packages/ui/src/docs/pages/*` |
| Docs plugin | [`src/docs/plugin`](src/docs/plugin) |
| Recipe system | [`src/recipes/README.md`](src/recipes/README.md) |
| Curated surface docs | [`docs/`](docs) |
| Point-in-time audits | [`docs/audits/`](docs/audits) |

---

**See also:** [README.md](README.md), [`docs/`](docs), [`src/recipes/README.md`](src/recipes/README.md).
