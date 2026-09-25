# CONVENTIONS.md

> Toolchain defaults: [Turborepo](https://turborepo.dev/docs), [Next.js](https://nextjs.org/docs/app), [Biome](https://biomejs.dev), [TypeScript](https://www.typescriptlang.org/tsconfig), [Vitest](https://vitest.dev).

## 1. Workspace

1.1 Turborepo, using the [recommended layout](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository).

1.2 Reach another workspace only through its public entry, never across package boundaries (§9).

## 2. Routing

2.1 App Router **only**.

2.2 Keep `'use client'` on the interactive leaf, not on a layout or a page that can stay on the server. The `no-client-directive-in-route-file` Biome plugin gates it ([Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)).

2.3 When a server page hands data to an interactive subtree, split `page.tsx` (server) + `client.tsx` (client).

2.4 [`params` and `searchParams` are async](https://nextjs.org/docs/app/api-reference/file-conventions/page). Type them with the generated `PageProps` helper.

## 3. Components

See [`packages/ui/REFERENCE.md`](packages/ui/REFERENCE.md).

3.1 Compose from the design system (`ui`).

3.2 App-local components (`apps/<app>/src/components/<name>/`) hold feature logic (e.g. `<feature>-picker`, `<feature>-combobox`). Reusable presentation belongs in `ui`.

3.3 One directory per unit: `<name>.tsx`, `<name>-<part>.tsx` (sub-components), `use-<name>-<hook>.ts` (hooks), `context.ts`, `slots.ts`, `types.ts`, `variants.ts`, and `index.ts` (the barrel, re-exports only). [`packages/ui/REFERENCE.md`](packages/ui/REFERENCE.md) §3 shows the full layout. `component-filename-boundary.test.ts` and `module-filename-boundary.test.ts` gate the names in `ui`.

3.4 Named exports only. Each file's PascalCase / `useCamelCase` export matches its filename. Biome's `noDefaultExport` pins the first rule outside the Next.js route files and the tool config files, whose loaders read a default export.

3.5 The barrel is the public surface. External consumers (apps, other packages) import the directory, never its internal files (§9).

Within `ui`, a sibling can import the leaf modules of another component: its `context.ts`, a `use-*` hook, or a `*-utilities` or `variants` helper. So a shared cascade such as `useControl` or `useGlass` travels without the full surface of its component. A sibling never imports the main `<name>.tsx` of another component. `component-boundary.test.ts` gates all of this.

3.6 Composition is compound components over context. The root owns state and provides it through `context.ts`; behavior-bearing sub-components consume it (`useTabsContext`, `useCollapseContext`). An inert slot, whose whole body is an element, recipe classes, and a prop spread, uses `createSlot` (`core/create-slot.ts`). The panel surfaces (Dialog, Sheet, Drawer) build their shared slot family with `createPanel` (`primitives/panel`). `children` is plain `ReactNode` everywhere: state reaches descendants through context (`useComboboxQuery`), never through render-function children on a root. Reserve render functions for per-item callbacks where a parent passes data back (a list's item renderer, `VirtualOptions`).

Context composition is for client components; static-tier components style descendants through DOM projections instead (§3.8).

3.7 Skeleton state is explicit. A skeleton-aware component exports `<Name>Skeleton` variants from its barrel. `createSkeleton` builds a variant whose silhouette follows one size or base axis. A variant whose silhouette follows another axis, such as a heading level or an item count, is written by hand. Compose the variants where the real components will render: a Suspense fallback, `loading.tsx`, or a `ReadyReveal` placeholder.

A skeleton variant is a static leaf ([`packages/ui/REFERENCE.md`](packages/ui/REFERENCE.md) §2). It reads no context, and it mirrors the explicit props of the real component. It adds no `data-slot` of its own; `placeholder` is the family anchor. Fixed silhouette dimensions live in the `kokkaku` layer (`recipes/kiso/kokkaku/<name>.ts`), and the kata wires them in as `skeleton:`. Inline display leaves and data-heavy compositions have no skeleton; `table` ships `TableLoading` instead. The skeleton sweep in `sweeps/capabilities.test.tsx` holds each variant to its silhouette.

3.8 Components in `ui` split into static and client tiers; ambient styling crosses the boundary through the DOM, never through React context ([`packages/ui/REFERENCE.md`](packages/ui/REFERENCE.md) §2). `static-component-boundary.test.ts` gates the static tier.

3.9 Spread order decides what a consumer can override. The load-bearing structural attributes come after `{...props}`: `role`, `tabIndex`, `type`, widget ARIA state, and the resolved wiring of the §7.2 cascade. Then a stray prop cannot drop a row out of roving, turn a button into a form submit, or clobber a bound field. `switch.tsx` is the example for the cascade. Presentational attributes stay open to override, and `className` merges through `cn`.

A `data-slot` anchor binds by who reads it. The library selects some anchors itself, through a roving `itemSelector` or a kata `has-[]` rule. A leaf writes such an anchor after the spread and locks it, as `accordion-trigger.tsx` does. Every other leaf writes its anchor before the spread, so a wrapper can re-anchor the leaf it renders.

A key that holds a handler or an object needs both sides, and a spread position keeps only one. So the component destructures the key and resolves it. A handler composes through `composeEventHandlers`: the consumer's handler runs first, and its `preventDefault()` cancels the component's handler. A `style` object merges: `props.style` spreads in first, then the keys that carry the behaviour of the component. `menu-item-utilities.ts` is the example for a handler, and `slider.tsx` for a `style` object.

Pass `checkForDefaultPrevented: false` in three cases only. The first is the activation that the component exists to perform. The second is a roving keyboard model, which no consumer switches off. The third is the wiring that keeps the state of the component true. Examples are the touched mark and the value of a form field, the end of a gesture, and an event the browser cannot cancel. React's synthetic `preventDefault()` marks even an event that cannot be cancelled, so the default would let a consumer switch that wiring off.

Side behaviour, such as a preload or a pause on hover, keeps the default. [`2026-09-25-HANDLER-COMPOSITION-PLAN.md`](packages/ui/docs/plans/2026-09-25-HANDLER-COMPOSITION-PLAN.md) records the sweep that found the third case.

`spread-order-boundary.test.ts` gates the position rules. It computes the read set, and its allowlist holds the known backlog. The `no-hand-composed-handler` Biome plugin gates a handler composed by hand inside JSX. No gate holds the rest of the rule for composed keys yet.

## 4. TypeScript

4.1 In place of `any`, use `unknown` with narrowing, generics, or a precise type. Type external responses at the fetch boundary.

4.2 Use `type` aliases for props and data shapes; never `interface`. Co-locate small ones, extract to `types.ts` once shared or large.

4.3 `ComponentProps<'tag'>` is the only native-prop base. It carries `ref`, so a props type never declares a `ref` beside it. A component that does not forward the ref omits it (`Omit<ComponentProps<'div'>, 'ref'>`). A component that renders more than one element keeps an element-agnostic base, because the arms are not mutually assignable. An imperative handle declares `ref?: Ref<<Name>Handle>` after that omit. A component takes `ref` as a prop, never through `forwardRef`.

`props-base-boundary.test.ts` and Biome's `noReactForwardRef` gate the rule.

4.4 A variant axis reaches props from the recipe that declares it: `size?: ButtonVariants['size']`, `SkeletonProps<NonNullable<ButtonVariants['size']>>`. A scale with no kata of its own is named where it is defined (`Step` in `kiso/sun`, `IconSize` in `kiso/shaku`) and aliased from there. Never repeat an axis union in a second place; the `no-respelled-orientation` Biome plugin pins the orientation axis.

4.5 Props live beside the component that takes them. A barrel reaches a type at the module that declares it, never through a component that re-exports it. Every barrelled component ships its `<Name>Props`.

4.6 A barrel names each symbol that it re-exports, once for each source module. A type rides the statement of its module with the inline `type` modifier (`export { Button, type ButtonProps } from './button'`). A module that exports only types takes `export type { … } from`. Never `export *`: a wildcard re-exports whatever the module gains next, and the barrel tests cannot read through it. `barrel-export-boundary.test.ts` and Biome's `noReExportAll` gate the rule.

4.7 Module constants: `UPPER_SNAKE_CASE` for magic values, `camelCase` for keyed lookup/config objects.

## 5. Styling

5.1 Tailwind v4 utilities, composed with `cn()` via `ui/core` (clsx + tailwind-merge).

5.2 Visual variants come from a component's recipe, consumed through its props.

5.3 Spacing, sizing, and color use the named scale and palette tokens, not magic pixel or hex values.

## 6. State & data

6.1 No global state library. Cross-cutting state is React Context at `apps/<app>/app/providers.tsx`. Biome's `noRestrictedImports` keeps the common ones out of `apps`.

6.2 Server data is fetched in Server Components or `'use server'`. They attach the bearer token and resolve the gateway origin server-side.

6.3 Client fetches hit same-origin `/api/*` or `/auth/*` paths. They never call the gateway or handle tokens directly. In an app wrapped in `withAuth`, both prefixes rewrite to the gateway. The `proxy.ts` of the app gates `/api/*` by session and leaves `/auth/*` open, because sign-in and register run before a session exists. An app without `withAuth` serves `/api/*` from its own route handlers.

The `no-client-gateway-access` Biome plugin gates the rule. It also keeps a runtime `auth` import out of a `'use client'` module.

6.4 Shared client fetches use the data-hook pattern. A module-scoped cache and a deduped in-flight promise, keyed by a serialized input, sit behind `use<Thing>()`, which returns `{ data, loading, error }`. An `active` flag guards `setState`.

## 7. Forms

7.1 Forms compose `ui/form`, which owns form state via `useSyncExternalStore` and accepts optional schema resolvers for validation.

7.2 Bindable controls take `name` to bind their value to the enclosing form field. Resolution order on every control: an explicit `value`/`checked` prop wins, then the bound field, then internal (uncontrolled) state. Consumer change handlers fire in every mode. A bound field ignores the control's `defaultValue`/`defaultChecked`; `Form.defaultValues` is the single source of truth. The cascade lives in `useFormValue` (value-typed controls), `useInputValue` (Input, Textarea), and `useFormToggle` (Checkbox, Switch): new bindable controls compose one of these, never a bespoke branch.

7.3 In value props, `undefined` leaves the control uncontrolled; `null` keeps it controlled with no current value.

## 8. Naming

8.1 kebab-case files/directories; PascalCase components; `useCamelCase` hooks (`use-*.ts`); PascalCase types with a contextual suffix (`<Component>Props`, `<Thing>Option`, `<Feature>State`). Biome's `useFilenamingConvention` pins the file names.

8.2 Feature folders mirror their route segment. Co-located helpers carry intent-revealing suffixes: `<feature>-api.ts`, `types.ts`, `constants.ts`, `utilities.ts`.

## 9. Imports

9.1 In apps, the `@/*` alias maps to the source root: `src` in `places`, and `app` in `admin`. Use the alias in place of a deep relative chain, that is, three or more `../` segments.

From `packages/ui`, import per-component entries (`ui/button`, `ui/dialog`) plus `ui/core`, `ui/hooks`, `ui/layouts`, `ui/modules/*` (or the `ui/<module>` shorthand), `ui/primitives/*`, and `ui/providers/*`. No root barrel. `src/types`, `src/recipes`, and `src/utilities` stay package-internal, reached by relative import; `internal-barrel-boundary.test.ts` holds `./types` off the `exports` map.

9.2 Import order is handled by [Biome's organize-imports](https://biomejs.dev/assist/actions/organize-imports/).

## 10. Testing

10.1 Test locations:

| Scope | Location |
|---|---|
| App | `apps/<app>/src/__tests__/**/*.test.ts` |
| `ui` component | `packages/ui/src/__tests__/` |
| `ui` docs engine | `packages/ui/src/docs/engine/__tests__/` |
| `auth` | Beside the source (`packages/auth/src/*.test.ts`), under `node --test` |

10.2 Component tests render through the library's test renderer and query by `data-slot`. New components expose stable `data-slot` anchors and a filename-matched export.

10.3 **Don't drive third-party async lifecycles** (fetch, virtualization, floating-ui, pdfjs) in tests. They flake on CI. Test the synchronous seam (a reducer, a callback, a typed harness), or skip with a stated reason.

10.4 While you edit, run a scoped subset (`test:changed` or `test:related`), as [CLAUDE.md](CLAUDE.md) §3.4 requires.

10.5 A guarantee that holds for every component of a kind goes in the shared corpus (`a11y/cases`), and a sweep gate asserts it. One new corpus entry then buys every gate. Behaviour specific to one component goes in its own test file.

An assertion that reads the DOM tree runs under jsdom: roles, attributes, events, and focus order. An assertion that reads layout, computed style, or colour runs in the browser suite (`test:browser`): contrast, target size, geometry, and focus traps. A test that reads no DOM at all opens with `// @vitest-environment node` and runs with no window. `node-environment-boundary.test.ts` holds the docblock and the DOM use of the file in step.

10.6 A browser test starts at the viewport that `vitest.browser.config.ts` declares. Vitest resets the page to it before each file, so a file inherits no size from the file before it. A file whose geometry needs another size states it once, as `beforeAll(() => page.viewport(w, h))`. `test-isolation-boundary.test.ts` holds that placement. A call inside an `it` reaches the later cases of the file, and nothing restores the size there.

10.7 The grid tests also run with the React Compiler on (`test:compiler`, `vitest.compiler.config.ts`), and CI runs them in the gate job. The compiler caches a value on the identity of its inputs, so render code must not read a mutable object. The TanStack table is such an object. `use-grid-table.ts` is the engine boundary: the one grid module with `'use no memo'`, and the only one that reads the table during render. It gives the grid values and actions, never the engine; its header states the contract.

A dependency list names what its value reads, never an extra key to force a recompute. Force a layout flush with a call such as `getBoundingClientRect()`, never with a bare property read. The compiler removes a read whose value goes unused.

## 11. Environment

11.1 [`NEXT_PUBLIC_*`](https://nextjs.org/docs/pages/guides/environment-variables) is client, else server-only. Confine raw `process.env` reads to a config edge. Today the only reader is `env.ts` in the `auth` package (`BIFROST_URL`), and apps reach env through `auth`. Biome's `noProcessEnv` pins it in `apps`, `auth`, and `shared`; `ui` keeps its `NODE_ENV` checks for development warnings.

11.2 New variables get an `.env.example` entry and a typed declaration in the env config.

11.3 The supported browser floor is [`.browserslistrc`](.browserslistrc), and the stylesheet sets it: Tailwind 4 needs Chrome 111, Firefox 128, and Safari 16.4. That floor also covers the ES2023 change-by-copy array methods. A build target does not enforce it: esbuild and SWC downlevel syntax, never instance methods, so a method the floor doesn't cover ships and throws. Reaching below the floor costs a polyfill, not a config change. `lib: ["ES2023"]` stops a newer ECMAScript built-in at type-check; the [`no-api-above-browser-floor`](.biome/plugins/no-api-above-browser-floor.grit) Biome plugin stops a call that the type-check passes, such as a DOM API.

## 12. Documentation

12.1 Public-surface symbols carry TSDoc. Each symbol that a barrel re-exports opens with a doccomment in the house voice ([CLAUDE.md](CLAUDE.md) §2). That covers a component and its `*Props`, each hook, primitive, and provider, and each `ui/core` export. The first sentence states what the symbol is. Add `@param` and `@returns` where the signature is not self-evident. Add `@defaultValue` on a defaulted optional field, `@remarks` for caveats, and `@see {@link …}` for cross-links.

Do not restate the type or document a self-evident field. Mark a documented helper that no barrel re-exports with `@internal`; the tag and a barrel entry exclude each other. `tsdoc-coverage-boundary.test.ts` and `internal-barrel-boundary.test.ts` gate the rule. Standard: [TSDoc](https://tsdoc.org).

12.2 The curated docs in [`packages/ui/docs/`](packages/ui/docs) are the quick-glance index of the `ui` surface. `COMPONENTS`, `MODULES`, `LAYOUTS`, `HOOKS`, `PRIMITIVES`, `PROVIDERS`, and `CORE` index the public surface. `RECIPES` and `UTILITIES` index the package-internal layers (§9.1).

A change that adds, removes, or renames an export updates the matching doc in the same commit. A new component goes in `COMPONENTS.md` under its domain bucket; any other new export gets a one-line summary in its doc. `surface-index.test.ts` checks every doc except `RECIPES` for a missing entry. [`packages/ui/REFERENCE.md`](packages/ui/REFERENCE.md) is the hub, so keep its surface map and its §2 boundary current.

12.3 Audits under [`packages/ui/docs/audits/`](packages/ui/docs/audits) are point-in-time, single-lens sweeps named `{date}-{LENS}-AUDIT.md`; a documentation sweep is a `{date}-DOC-AUDIT.md`.

12.4 An audit is a living record while it holds an open finding: resolve each row in place, against the pull request that closed it. Cite the pull request, not a branch commit, because a squash merge discards the branch. Delete the file once every finding is resolved, because the pull requests it names hold the history. Never name an audit from code, or from a document that outlives it; the reference dangles when the audit goes.

---

**See also:** [CLAUDE.md](CLAUDE.md), [REFERENCE.md](REFERENCE.md), [STE.md](STE.md).
