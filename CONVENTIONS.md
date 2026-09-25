# CONVENTIONS.md

> Toolchain defaults: [Turborepo](https://turborepo.dev/docs), [Next.js](https://nextjs.org/docs/app), [Biome](https://biomejs.dev), [TypeScript](https://www.typescriptlang.org/tsconfig), [Vitest](https://vitest.dev).

## 1. Workspace

1.1 Turborepo, using the [recommended layout](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository).

1.2 Reach another workspace only through its public entry, never across package boundaries (§9).

## 2. Routing

2.1 App Router **only**.

2.2 For [Server/Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components), keep `'use client'` on the interactive leaf; never promote it onto a layout or page that could stay server-rendered. Pinned by the `no-client-directive-in-route-file` Biome plugin, which leaves out `error.tsx` and `global-error.tsx` because Next.js requires the directive there.

2.3 When a server page hands data to an interactive subtree, split `page.tsx` (server) + `client.tsx` (client).

2.4 [`params` / `searchParams` are async](https://nextjs.org/docs/app/api-reference/file-conventions/page) — prefer the generated `PageProps` helper for typing.

## 3. Components

See [REFERENCE.md](REFERENCE.md).

3.1 Compose from the design system (`ui`).

3.2 App-local components (`apps/<app>/src/components/<name>/`) hold feature logic (e.g. `<feature>-picker`, `<feature>-combobox`). Reusable presentation belongs in `ui`.

3.3 One directory per unit: `<name>.tsx`, `<name>-<part>.tsx` (sub-components), `use-<name>-<hook>.ts` (hooks), `context.ts`, `types.ts`, `index.ts` (barrel, re-exports only).

3.4 Named exports only. Each file's PascalCase / `useCamelCase` export matches its filename. Biome's `noDefaultExport` pins the first rule outside the Next.js route files and the tool config files, whose loaders read a default export.

3.5 The barrel is the public surface. External consumers (apps, other packages) import the directory, never its internal files (§9).

Within `ui`, a sibling component may reach past the barrel for a foundation's leaf module: its `context.ts`, a `use-*` hook, or a `*-utilities` or `variants` helper. That's how shared cascades like `useControl` and `useGlass` travel without pulling in the component's full surface. What a sibling must never import is another component's main `<name>.tsx`. All of this is enforced by `component-boundary.test.ts`.

3.6 Composition is compound components over context. The root owns state and provides it through `context.ts`; behavior-bearing sub-components consume it (`useTabsContext`, `useCollapseContext`). Inert slots, whose whole body is element + recipe classes + prop spread, use `createSlot` (`core/create-slot.ts`); the panel surfaces (Dialog, Sheet, Drawer) build their shared slot family with `createPanel` (`primitives/panel`). `children` is plain `ReactNode` everywhere: state reaches descendants through context (`useComboboxQuery`), never through render-function children on a root. Reserve render functions for per-item callbacks where a parent passes data back (a list's item renderer, `VirtualOptions`). Context composition is for client components; static-tier components style descendants through DOM projections instead (§3.8).

3.7 Skeleton state is explicit. A skeleton-aware leaf exports a dedicated `<Name>Skeleton` from its barrel: size- or base-keyed leaves build it with `createSkeleton(k.skeleton, '<Name>Skeleton')` (`button`, `badge`, `checkbox`, `radio`, `switch`, `text`, `slider`, `segment`, `calendar`, `progress`, `toggle-icon-button`); leaves whose silhouette keys off another axis hand-write it (`heading` by level, `textarea` by rows, `tabs`/`pagination`/`stepper`/`breadcrumb` by item count). Loading trees compose the variants where the real components will render: a Suspense fallback, `loading.tsx`, or a `ReadyReveal` placeholder. Skeleton variants are static leaves ([REFERENCE.md](packages/ui/REFERENCE.md) §2): they read no context and mirror the real component's explicit props (`ControlSkeleton` stands in for the control family). A skeleton adds no `data-slot` of its own; `placeholder` is the family anchor. Silhouette dimensions live in the `kokkaku` skeleton-form layer (`recipes/kiso/kokkaku/<name>.ts`), wired into the kata as `skeleton:`. Inline display leaves (`icon`, `kbd`, `code`, `status`, `time-ago`, `odometer`, `link`) and data-heavy compositions (`grid`) deliberately have none for now; `table` ships `TableLoading`.

3.8 Components in `ui` split into static and client tiers; ambient styling crosses the boundary through the DOM, never through React context ([REFERENCE.md](packages/ui/REFERENCE.md) §2).

3.9 Spread order decides what a consumer may override. Load-bearing structural attributes — `role`, `tabIndex`, `type`, widget ARIA state, and the resolved wiring of the §7.2 binding cascade — are written *after* `{...props}`, so a stray prop can't drop a row out of roving, turn a button into a form submit, or clobber a bound field; `menu-item.tsx` is the composite precedent and `switch.tsx` the cascade one. A `data-slot` anchor binds by who reads it: a leaf whose anchor the library itself selects on — a roving `itemSelector`, or a kata `has-[]` rule — writes it *after* the spread and locks it, as `accordion-trigger.tsx` does for Accordion's roving; every other leaf writes it *before* the spread, so a wrapper can re-anchor the leaf it renders. Presentational attributes stay overridable: `className` merges through `cn`. A key that holds a handler or an object takes the same shape, because position drops one side of it. The component destructures the key and resolves it. A handler composes through `composeEventHandlers`: the consumer's handler runs first, and `preventDefault()` cancels the component's. Pass `checkForDefaultPrevented: false` only for three cases. The first is the activation a component exists to perform. The second is a roving keyboard model, which no consumer switches off. The third is the wiring that keeps the component's own state true: a form field's touched mark and value, the end of a gesture the component started, and state that tracks an event the browser cannot cancel. React's synthetic `preventDefault()` marks even a non-cancellable event, so the default would let a consumer switch that wiring off. Side behaviour, such as a preload or a pause on hover, keeps the default. [`2026-09-25-HANDLER-COMPOSITION-PLAN.md`](packages/ui/docs/plans/2026-09-25-HANDLER-COMPOSITION-PLAN.md) records the sweep that found the third case. A `style` object merges: `props.style` spreads in first, then the keys that carry the component's behaviour. `menu-item-utilities.ts` is the handler precedent and `slider.tsx` the style one. The position rules are enforced by `spread-order-boundary.test.ts`, which computes the read set rather than listing it, and carries the known backlog as an allowlist. The `no-hand-composed-handler` Biome plugin gates a handler composed by hand inside JSX. The rest of the composed-key rule is not gated yet.

## 4. TypeScript

4.1 In place of `any`, use `unknown` with narrowing, generics, or a precise type. Type external responses at the fetch boundary.

4.2 Use `type` aliases for props and data shapes; never `interface`. Co-locate small ones, extract to `types.ts` once shared or large.

4.3 `ComponentProps<'tag'>` is the only native-prop base. It carries `ref`, so a props type never declares a `ref` beside it. A component that does not forward the ref omits it (`Omit<ComponentProps<'div'>, 'ref'>`); one that renders more than one element keeps an element-agnostic base, because the arms are not mutually assignable. An imperative handle declares `ref?: Ref<<Name>Handle>` after that omit. A component takes `ref` as a prop, never through `forwardRef`. Pinned by `props-base-boundary.test.ts` and Biome's `noReactForwardRef`.

4.4 A variant axis reaches props from the recipe that declares it — `size?: ButtonVariants['size']`, `SkeletonProps<NonNullable<ButtonVariants['size']>>`. A scale with no kata of its own is named where it is defined (`Step` in `kiso/sun`, `IconSize` in `kiso/shaku`) and aliased from there. Never repeat an axis union in a second place; the `no-respelled-orientation` Biome plugin pins the orientation axis.

4.5 Props live beside the component that takes them, and a barrel reaches a type at the module that declares it — never through a component that re-exports it. Every barrelled component ships its `<Name>Props`.

4.6 A barrel names every symbol it re-exports, once per source module: a type rides its module's statement with the inline `type` modifier (`export { Button, type ButtonProps } from './button'`), and a module that exports types alone takes `export type { … } from`. Never `export *` — a wildcard re-exports whatever the module gains next, and the barrel tests cannot read through it. Pinned by `barrel-export-boundary.test.ts`, and by Biome's `noReExportAll` across the workspace.

4.7 Module constants: `UPPER_SNAKE_CASE` for magic values, `camelCase` for keyed lookup/config objects.

## 5. Styling

5.1 Tailwind v4 utilities, composed with `cn()` via `ui/core` (clsx + tailwind-merge).

5.2 Visual variants come from a component's recipe, consumed through its props.

5.3 Spacing, sizing, and color use the named scale and palette tokens, not magic pixel or hex values.

## 6. State & data

6.1 No global state library. Cross-cutting state is React Context at `apps/<app>/app/providers.tsx`. Biome's `noRestrictedImports` keeps the common ones out of `apps`.

6.2 Server data is fetched in Server Components or `'use server'`. They attach the bearer token and resolve the gateway origin server-side.

6.3 Client fetches hit same-origin `/api/*` or `/auth/*` paths. They never call the gateway or handle tokens directly. In an app wrapped in `withAuth`, both prefixes rewrite to the gateway; the app's `proxy.ts` gates `/api/*` by session and leaves `/auth/*` open, because sign-in and register run before a session exists. An app without `withAuth` serves `/api/*` from its own route handlers. Pinned by the `no-client-gateway-access` Biome plugin, which also keeps a runtime `auth` import out of a `'use client'` module.

6.4 Shared client fetches use the data-hook pattern: a module-scoped cache and a deduped in-flight promise, exposed as `use<Thing>()` → `{ data, loading, error }`, keyed by a serialized input; `setState` is guarded by an `active` flag.

## 7. Forms

7.1 Forms compose `ui/form`, which owns form state via `useSyncExternalStore` and accepts optional schema resolvers for validation.

7.2 Bindable controls take `name` to bind their value to the enclosing form field. Resolution order on every control: an explicit `value`/`checked` prop wins, then the bound field, then internal (uncontrolled) state. Consumer change handlers fire in every mode. A bound field ignores the control's `defaultValue`/`defaultChecked`; `Form.defaultValues` is the single source of truth. The cascade lives in `useFormValue` (value-typed controls), `useInputValue` (Input, Textarea), and `useFormToggle` (Checkbox, Switch): new bindable controls compose one of these, never a bespoke branch.

7.3 In value props, `undefined` leaves the control uncontrolled; `null` keeps it controlled with no current value.

## 8. Naming

8.1 kebab-case files/directories; PascalCase components; `useCamelCase` hooks (`use-*.ts`); PascalCase types with a contextual suffix (`<Component>Props`, `<Thing>Option`, `<Feature>State`). Biome's `useFilenamingConvention` pins the file names.

8.2 Feature folders mirror their route segment. Co-located helpers carry intent-revealing suffixes: `<feature>-api.ts`, `types.ts`, `constants.ts`, `utilities.ts`.

## 9. Imports

9.1 In apps, use the `@/*` alias (`@/components/…`, `@/api/…`); never deep relative chains.

From packages/ui, import per-component entries (`ui/button`, `ui/dialog`) plus `ui/core`, `ui/hooks`, `ui/layouts`, `ui/modules/*`, `ui/primitives/*`, `ui/providers/*`. No root barrel. `src/types`, `src/recipes`, and `src/utilities` stay package-internal, reached by relative import; `internal-barrel-boundary.test.ts` holds `./types` off the `exports` map.

9.2 Import order is handled by [Biome's organize-imports](https://biomejs.dev/assist/actions/organize-imports/).

## 10. Testing

10.1 Test locations:

| Scope | Location |
|---|---|
| App | `apps/<app>/src/__tests__/**/*.test.{ts,tsx}` |
| Component | `packages/ui/src/__tests__/` |

10.2 Component tests render through the library's test renderer and query by `data-slot`. New components expose stable `data-slot` anchors and a filename-matched export.

10.3 **Don't drive third-party async lifecycles** (fetch, virtualization, floating-ui, pdfjs) in tests — they flake on CI. Test the synchronous seam (a reducer, a callback, a typed harness) or skip with a stated reason.

10.4 While editing, run a scoped subset (`test:changed`, `test:related`). Prove changes pass before claiming done ([CLAUDE.md](CLAUDE.md) §3.4).

10.5 Placement: a guarantee that must hold for every component of a kind goes in the shared corpus (`a11y/cases`) and is asserted by a sweep gate, so adding a corpus entry buys every gate; behaviour specific to one component goes in its own test file. An assertion that reads the DOM tree (roles, attributes, events, focus order) runs under jsdom; one that reads layout, computed style, or colour (contrast, target size, geometry invariants, focus traps) runs in the browser suite (`test:browser`). A test that reads no DOM at all opens with `// @vitest-environment node` and runs with no window; `node-environment-boundary.test.ts` holds the docblock and the file's DOM use in step.

10.6 A browser test arrives at the viewport `vitest.browser.config.ts` declares, and Vitest resets the page to it before each file, so a file inherits no size from the file before it. A file whose geometry needs another size states it once, as `beforeAll(() => page.viewport(w, h))`; `test-isolation-boundary.test.ts` holds that placement, because a call inside an `it` reaches the file's later cases and nothing restores it there.

10.7 The grid tests also run with the React Compiler on (`test:compiler`, `vitest.compiler.config.ts`), and CI runs them in the gate job. The compiler caches a value on the identity of its inputs, so render code must not read a mutable object; the TanStack table is one. The engine boundary is `use-grid-table.ts`: the one grid module that opens with `'use no memo'`, and the only one that reads the table during render. It gives the grid values and actions, never an engine object. A value is immutable, and each change gives a new value. An action reads or writes the engine when it runs, from an event or an effect. A dependency list names what its value reads, never an extra key to force a recompute. Force a layout flush with a call such as `getBoundingClientRect()`, never a bare property read, because the compiler removes a read whose value goes unused.

## 11. Environment

11.1 [`NEXT_PUBLIC_*`](https://nextjs.org/docs/pages/guides/environment-variables) is client, else server-only. Confine raw `process.env` reads to a config edge — today the sole reader is the `auth` package's `env.ts` (`BIFROST_URL`); apps reach env through `auth`, not scattered through features. Biome's `noProcessEnv` pins it in `apps`, `auth`, and `shared`; `ui` keeps its `NODE_ENV` checks for development warnings.

11.2 New variables get an `.env.example` entry and a typed declaration in the env config.

11.3 The supported browser floor is [`.browserslistrc`](.browserslistrc), and the stylesheet sets it: Tailwind 4 needs Chrome 111, Firefox 128, and Safari 16.4. That floor also covers the ES2023 change-by-copy array methods. A build target does not enforce it: esbuild and SWC downlevel syntax, never instance methods, so a method the floor doesn't cover ships and throws. Reaching below the floor costs a polyfill, not a config change. `lib: ["ES2023"]` stops a newer ECMAScript built-in at type-check; the [`no-api-above-browser-floor`](.biome/plugins/no-api-above-browser-floor.grit) Biome plugin stops a call that the type-check passes, such as a DOM API.

## 12. Documentation

12.1 Public-surface symbols carry TSDoc. Every symbol a barrel re-exports (a component and its `*Props`, each hook, primitive, provider, and `ui/core` export) opens with a summary-first doccomment in the house voice ([CLAUDE.md](CLAUDE.md) §2): the first sentence states what it is, then `@param` / `@returns` where the signature isn't self-evident, `@defaultValue` on defaulted optional fields, `@remarks` for caveats, `@see {@link …}` to cross-link, and `@internal` on a documented helper that no barrel re-exports — the tag and a barrel entry are mutually exclusive, pinned by `internal-barrel-boundary.test.ts`. Don't restate the type or document self-evident fields. Standard: [TSDoc](https://tsdoc.org).

12.2 The curated surface docs in [`packages/ui/docs/`](packages/ui/docs) — `COMPONENTS` · `HOOKS` · `PRIMITIVES` · `PROVIDERS` · `RECIPES` · `CORE` · `UTILITIES` — are the quick-glance index of the public surface. Adding, removing, or renaming a public export updates the matching doc in the same change: a new component lands in `COMPONENTS.md` under its domain bucket; a new hook / primitive / provider / core / utility lands in its doc with a one-line summary. [`REFERENCE.md`](packages/ui/REFERENCE.md) is the hub — keep its surface map and the §2 boundary current.

12.3 Audits under [`packages/ui/docs/audits/`](packages/ui/docs/audits) are point-in-time, single-lens sweeps named `{date}-{LENS}-AUDIT.md`; a documentation sweep is a `{date}-DOC-AUDIT.md`.

12.4 An audit is a living record while it holds an open finding: resolve each row in place, against the pull request that closed it. Cite the pull request, not a branch commit, because a squash merge discards the branch. Delete the file once every finding is resolved, because the pull requests it names hold the history. Never name an audit from code, or from a document that outlives it; the reference dangles when the audit goes.

---

**See also:** [CLAUDE.md](CLAUDE.md), [REFERENCE.md](REFERENCE.md).
