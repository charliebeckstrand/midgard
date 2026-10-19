# REFERENCE.md

> **Scope:** the hub for the `ui` package surface. The per-category inventories live as curated, quick-glance docs under [`docs/`](docs). This file maps to them and keeps the cross-cutting architecture that no single category owns: the server/client boundary, and how to compose a new component. Authoring conventions live in [`../../CONVENTIONS.md`](../../CONVENTIONS.md).

## 1. Surface map

| Surface | Doc | Contents |
|---|---|---|
| Components | [`docs/COMPONENTS.md`](docs/COMPONENTS.md) | Every component, grouped by domain (inputs, overlays, data display, surfaces, …). |
| Modules | [`docs/MODULES.md`](docs/MODULES.md) | `ui/modules/*`, each also at its bare `ui/<name>` path — complex, multi-part compositions that own their sub-components, hooks, and docs. |
| Structure | [`docs/STRUCTURE.md`](docs/STRUCTURE.md) | `ui/structure/*`, each also at its bare `ui/<name>` path — box, columns, container, flex, spacer, split, stack: the static units that arrange other elements. |
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

The boundary rule: ambient styling state crosses the server/client boundary through the DOM, never through React context. Context cannot reach a server-rendered child passed through a client parent; data attributes and CSS can.

### Projections

A host styles its descendants through recipe projections: data attributes and CSS selectors.

- Hosts size their slot indicators with recipe projections. Button, Sidebar, Nav, and the menu and option rows use the stepped `shaku.icon.slot.base`, and CommandPalette uses the fixed `shaku.icon.slot.md`. A fixed projection owns its slot; an explicit `size` on a slot icon or spinner does not override it. A control slot has no projection, because it is a density scope (see Density). Badge is a density host. Icon and LoadingSpinner follow the same scope, so they take the step of the badge. An explicit `size` on them wins. Badge projects `shaku.icon.slot.base` only for a bare icon element with no size of its own.
- AvatarGroup projects descendant avatar and status-dot sizes. Table projects outline and stripes onto descendant cells; DescriptionList projects orientation layout onto its `dt`/`dd` children. Direct-child and exact-depth selectors keep nested instances independent.

### Density

Density crosses the boundary as a `data-density` attribute. An element with the attribute is a density scope. An element takes the step of its nearest scope, itself included.

The root element is the scope of the app. `AppearanceScript` writes the stored step on it before the first paint, and `AppearanceProvider` keeps it in sync. The apps prerender one shell for each route, so the server cannot know the step of the reader. A cookie would make each route dynamic. Thus the markup is the same at each step, and CSS selects the step. The `:root` base rule sets the weights of `md`, so at `md` the root has no mark. For each other step, the root holds a class, for example `density-root-sm`, not `data-density` (`rootDensityClasses` in `src/core/density/steps.ts`). The root class has the specificity of `:root` and a class, so it wins over the `:root` default. Each scope under the root wins over the root, because it sets its own weights.

The `DensityProvider` wrapper writes a nested scope. A static host with an explicit `size` opens one through the `density` prop of PolymorphicStatic or Box. A leaf with no children (Icon, LoadingSpinner) writes the attribute alone.

A kata writes the value of each step in one stepped utility of [`tailwind.css`](tailwind.css), for example `density-p-[1,2,3,4,5]`. Five values give the steps from `xs` to `xl`, and each ramp of `ui` has five values. The utility also reads three values for a consumer. Three values give `sm`, `md`, and `lg`, and each outer step takes the value of its neighbor. `density-text` sets the line height to the text size plus 8 px. Thus the text, the line, and the icon step 2 px at each step. `src/core/density/geometry.ts` gives the formula of each ramp that they set, for example the icon, the button, the control, the badge, and the row. `density-set-[1,2,3,4,5]/[--name]` sets the custom property `--name` to a list of spacing stops, and a stop can be negative. The element that sets the property computes its length at its own step. A plain utility on the element or on a descendant reads that length, for example `space-x-(--name)`.

A padding, a gap, a radius, or a width keeps its values at `sm`, `md`, and `lg`. `spacingSteps` gives its values at `xs` and `xl`. The controls offer each step from `xs` to `xl`. In a scope at a step that a scale does not hold, a component takes the nearest step of its scale. A component reads the steps of its `size` from its ramps. `defineScale` makes its size scale, and `ScaleStep` types the prop. Thus the prop offers only the steps that render with a look of their own (CONVENTIONS §5.5).

The Tailwind plugin `src/core/density/utilities.ts` writes the stepped utilities and the base rules of the scopes from `densitySteps`, `rootDensityClasses`, and `slotStep`. Each scope sets inherited custom properties that hold its step, from `--ui-dxs` to `--ui-dxl`. The weight of its step is 1, and each other weight is 0. A scope with a step also sets a host copy of the weights, from `--ui-hxs` to `--ui-hxl`. The names have the prefix `--ui-`, because the weights inherit into each consumer element. A consumer property with the name of a weight changes the density with no error.

Each stepped class is one rule, and its value is a `calc()` of the weights, for example `padding: calc(var(--spacing) * (3 - 2 * var(--ui-dxs) - var(--ui-dsm) + var(--ui-dlg) + 2 * var(--ui-dxl)))`. Thus a stepped class takes the step of its nearest scope at each depth, with no limit of depth. A pseudo-element inherits the weights, so a stepped class after a pseudo-element variant takes the step of its element, for example `before:density-rounded-ring-[1,1.5,2,2.5,3]`. The rule names no scope, so a stepped class takes each other variant as a core utility does. `backdrop:` is the exception: before Chrome 122, `::backdrop` does not inherit from its element, so it reads no weights. `density-native-boundary.test.ts` forbids it.

Each stepped rule is in the nested layer `density` of `utilities`. A plain utility is in `utilities` itself, and it outranks each nested layer, so a consumer `className` wins over each stepped class. Of two stepped classes on one property, the later rule in the sheet wins. A default that a stepped class must replace uses `density-any` (`src/core/density/variants.ts`), which is in the same layer with no specificity. A stepped class and a plain class of one property merge in `cn`, so the later class stays. `density-native-boundary.test.ts` holds that no recipe has a `size` or a `density` axis, so each component with a `size` follows density.

A weighted sum takes only finite numbers and lengths. A value that is not finite, such as `full` as a radius, writes no CSS. A weight of 0 times infinity is not a number. A name that is not a key of the theme also writes no CSS, because one unknown `var()` makes the sum invalid at each step.

A stepped class cannot take a keyword, for example a value of `display`, `box-shadow`, or `flex-direction`. No variant selects one step. A step variant, such as `density-sm:shadow-sm`, has no plugin, so it writes no CSS and gives no error. `density-native-boundary.test.ts` forbids it in the source of `ui`, the apps, `shared`, and the root stylesheets of `ui`. For a numeric value, add a stepped entry to `src/core/density/utility-table.ts`. A shadow has a fixed form and numeric lengths, so it does not need a keyword. Set each length with `density-set`, and write one fixed `box-shadow` that reads the custom properties. At a step where each length is 0, the shadow is not visible. For a keyword, read the step in JS with `useDensityStep`, which paints `md` before hydration (see Density in JS).

The value of each step goes through one function, `pick` in `src/core/density/utilities.ts`. When each browser of the floor in [`.browserslistrc`](../../.browserslistrc) ships `if()`, `pick` can write `if(style(…))`. `pick` can then step keywords and values that are not finite. The TSDoc of `pick` gives the limits of container style queries, `@scope`, and `inherit()` for density. It also gives the browser versions of `if()` and container style queries.

A control slot is a scope one step below its host. No step is below `xs`, so the slot of an `xs` host takes `xs` too (`slotStep` in `src/core/density/steps.ts`). The slot sets each weight from the host copy of its host, and it sets no host copy. So a slot in a slot steps down once, and a scope in a slot wins over the slot. The Input and select affixes, the Textarea action row, the SidebarItem and NavItem slots, and the ChatListItem actions write `data-density="slot"`. The CSS gives the slot the step below the scope above it, with no step in JS. The slot is its own nearest scope, so a stepped class on the slot element gives the value for a host one step above. The slot opens no context, so a panel that a slot opens, such as a tooltip, takes the step of the host. A Badge, an Icon, a LoadingSpinner, or a Button in the slot therefore steps down with no `size`. The affix compensation constants of `kiso/control/affix` assume the stepped-down chip.

### Density in JS

A scope also opens the density context, one `DensityStep`. A client reader that needs the step as a JS value reads it: `Portal` and Grid. The context does not hold the root. Outside each other scope, `useDensityStep` reads the root element, which the server cannot read. So a JS value takes the stored step one render after hydration. A stepped class is correct at the first paint. In a control slot, `useDensityStep` gives the step of the host, but the CSS paints the slot one step below it. This is intentional: a slot opens no context, so a panel that the slot opens takes the step of the host. A client reader in a slot that must paint at the step of the slot needs a scope of its own. Its parent gives it a `density` prop or a `Density` scope at the lower step. The base rules of the scopes are in the critical CSS of each docs page, with no class of the page.

A scope is the `density` prop of the host primitive: PolymorphicStatic, Box, ControlFrame, PopoverPanel, or FloatingSurface. The prop writes the attribute and opens the context in one place, so the two channels agree. Button and Drawer write both channels by hand, because their elements are a link and a `motion.div`. `density-native-boundary.test.ts` lists the files that are permitted to do this.

A portal takes a panel out of the DOM subtree of its scope. So `Portal` writes the step of its context as `data-density` on a `display: contents` host, and the direction of the nearest direction scope as `dir`. Thus a panel in a portal follows the place that opened it.

A static host can *open* a context scope without reading one. The prop renders the `Density` client component around the children, and the host stays directive-free and server-renderable. The static tier must not read the context (`useDensityStep` and friends). `density-native-boundary.test.ts` holds the files that are permitted to read it.

### Skeletons and links

A caller composes loading UI explicitly from the `<Name>Skeleton` variants ([CONVENTIONS.md](../../CONVENTIONS.md) §3.7); the variants are themselves static. A skeleton follows density as its component does. With no `size`, it takes the step of its nearest scope through stepped classes, and an explicit `size` writes `data-density`. The skeleton of an inline component (Badge, Avatar) is an inline-block `<span>`, from the `inline` key of its recipe. Thus it can sit in a line of text.

Static leaves that link route through `PolymorphicStatic`: `href` renders a plain anchor, `render={<Link />}` composes the app router link per call site. Client components keep `Polymorphic`, which resolves the `<UIProvider>`-registered link from context.

### Gate and exceptions

`static-component-boundary.test.ts` pins the contract: it scans every listed source file (the list lives in that test) for directives, hook calls, and ambient imports. The scan is source-level only; a transitive client-only pull through a new dependency surfaces at the consuming app's `next build`, not here.

Two cascades still cross the boundary through context, `locale` and `glass`. A format cannot move to CSS, so `locale` stays in context. The messages of ui ride the `locale` cascade: `LocaleProvider` gives the intl of its locale, and a client control reads it through `useIntl` in `primitives/intl`. An app or a package reads the same intl through `ui/primitives/intl`, and gives the translations of its own messages to `LocaleProvider` as `catalogs`. A static leaf reads no context. It renders `IntlMessage` for its text, as `LoadingSpinner` does. For a translated attribute, it renders a client part, as `Breadcrumb` does for the name of its `<nav>`. Each reader of `glass` is a client component, so the static tier does not need it.

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

Enforced by boundary tests (`packages/ui/src/__tests__/boundary/`). Add a page under `src/docs/pages/components/<name>/` and a test that renders via `renderUI()` and asserts on `data-slot`. `page-coverage.test.ts` fails a component, a structure unit, a module, or a provider with no page. `page-smoke.test.tsx` renders each page and each tab. It fails on a throw, a console error or warning, or an axe violation. It also fails on an id that two elements have, and on a state that shows no example. `check-types` type-checks each example of a page (`src/docs/tsconfig.json`). A page sets no width on the component that it shows, because the `Example` box sets that width. `demo-width-boundary.test.ts` records each permitted width. An example takes its reset button from the docs kit (`ResetButton` and `resetButtonProps` in `src/docs/kit/reset-button.tsx`) and writes no "Reset" label of its own. `demo-reset-boundary.test.ts` holds that rule. Write the text of a page per [CONVENTIONS.md](../../CONVENTIONS.md) §13. Document the new public exports and add the component to [`docs/COMPONENTS.md`](docs/COMPONENTS.md) in the same change ([CONVENTIONS.md](../../CONVENTIONS.md) §12).

## 4. Commands

| Goal | Where | Command |
|---|---|---|
| Build | root | `turbo run build` |
| Typecheck | root | `turbo run check-types` |
| Lint | root | `biome check .` |
| The pre-push gate: Biome, typecheck, the tests that the branch changes, and Knip | root | `pnpm check` |
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

`test:changed` also runs the whole `boundary` and `workspace` projects. `pnpm check` runs it only when the branch changes `ui` (`turbo --affected`). A branch that changes only an app or `shared` runs these gates first in CI. CI runs each suite except the benchmarks and the Percy snapshots. The `build` job builds the apps. The `docs` job runs `test:docs-build` on the docs build, in three shards. It fails when a prerendered page of the docs app reports a hydration error. It also fails when a page whose HTML names a removed chunk does not reload one time and hydrate. It fails when a page of a replaced build does not reload one time, at the start or on a return to the tab. It fails when the bundle goes over its budget. It fails on a WCAG 2.2 A or AA violation that axe finds in the light or the dark theme. It fails on a link to no page or to no element id. The `ci-ok` job needs each other job of CI. A merge requires `ci-ok` and the `commitlint` check of the `PR title` workflow. Thus a new CI job goes in the `needs` of `ci-ok`. The `Browser stress` workflow runs the browser suite under CPU load each week ([CONVENTIONS.md](../../CONVENTIONS.md) §10.11). The `Visual` workflow runs the Percy snapshots only on demand, from the Actions tab. No schedule, pull request, or push starts it.

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
