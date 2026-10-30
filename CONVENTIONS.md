# CONVENTIONS.md

> Toolchain defaults: [Turborepo](https://turborepo.dev/docs), [Next.js](https://nextjs.org/docs/app), [Biome](https://biomejs.dev), [TypeScript](https://www.typescriptlang.org/tsconfig), [Vitest](https://vitest.dev).

## 1. Workspace

1.1 Reach another workspace only through its public entry, never across package boundaries (§9).

1.2 Each Dockerfile at the repository root pins pnpm to the `packageManager` version of the root `package.json`. It pins `turbo` to the version in `pnpm-lock.yaml`. Renovate does not update the Dockerfiles. `dockerfile-pin-boundary.test.ts` fails when a pin is not equal to the version that the repository uses.

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

3.7 Skeleton state is explicit. A skeleton-aware component exports `<Name>Skeleton` variants from its barrel. `createSkeleton` builds a variant whose silhouette follows one size or base axis. A variant whose silhouette follows another axis, such as a heading level or an item count, is written by hand. Compose the variants where the real components will render: a Suspense fallback, `loading.tsx`, or a `ReadyReveal` placeholder. When the client swaps a skeleton for the real component, use `ReadyReveal`, not a conditional render. It crossfades the two layers and holds the box, so the swap has no hard cut and no layout shift. A skeleton that has the shape of the content, such as the outline of a map, then fades into the content in place.

A skeleton variant is a static leaf ([`packages/ui/REFERENCE.md`](packages/ui/REFERENCE.md) §2). It reads no context, and it mirrors the explicit props of the real component. It adds no `data-slot` of its own; `placeholder` is the family anchor. Fixed silhouette dimensions live in the `kokkaku` layer (`recipes/kiso/kokkaku/<name>.ts`), and the kata wires them in as `skeleton:`. Inline display leaves and data-heavy compositions have no skeleton; `table` ships `TableLoading` instead. The skeleton sweep in `sweeps/capabilities.test.tsx` holds each variant to its silhouette.

A skeleton is `aria-hidden`, so the container that swaps it owns the loading signal. `ReadyReveal` sets `aria-busy` on its root while it is not ready, and the shared polite announcer speaks its `loadingLabel` prop. `TableLoading` sets `aria-busy` on its body. A Suspense fallback or a `loading.tsx` outside a `ReadyReveal` must set `aria-busy` on a region of its own.

3.8 Components in `ui` split into static and client tiers; ambient styling crosses the boundary through the DOM, never through React context ([`packages/ui/REFERENCE.md`](packages/ui/REFERENCE.md) §2). `static-component-boundary.test.ts` gates the static tier.

3.9 Spread order decides what a consumer can override. The load-bearing structural attributes come after `{...props}`: `role`, `tabIndex`, `type`, widget ARIA state, and the resolved wiring of the §7.2 cascade. Then a stray prop cannot drop a row out of roving, turn a button into a form submit, or clobber a bound field. `switch.tsx` is the example for the cascade. Presentational attributes stay open to override, and `className` merges through `cn`.

A `data-slot` anchor binds by who reads it. The library selects some anchors itself, through a roving `itemSelector` or a kata `has-[]` rule. A leaf writes such an anchor after the spread and locks it, as `accordion-trigger.tsx` does. Every other leaf writes its anchor before the spread, so a wrapper can re-anchor the leaf it renders.

A key that holds a handler or an object needs both sides, and a spread position keeps only one. So the component destructures the key and resolves it. A handler composes through `composeEventHandlers`: the consumer's handler runs first, and its `preventDefault()` cancels the component's handler. A `style` object merges: `props.style` spreads in first, then the keys that carry the behavior of the component. `menu-item-utilities.ts` is the example for a handler, and `slider.tsx` for a `style` object.

A `ref` is such a key. The component destructures it and joins it to its own ref through the `useComposedRefs` of Motion (`motion/react`). Then the consumer ref and the internal ref both get the node, as in `tab-list.tsx`.

Pass `checkForDefaultPrevented: false` in three cases only. The first is the activation that the component exists to perform. The second is a roving keyboard model, which no consumer switches off. The third is the wiring that keeps the state of the component true. Examples are the touched mark and the value of a form field, the end of a gesture, and an event the browser cannot cancel. React's synthetic `preventDefault()` marks even an event that cannot be canceled, so the default would let a consumer switch that wiring off.

Side behavior, such as a preload or a pause on hover, keeps the default.

`spread-order-boundary.test.ts` gates the position rules and the internal `ref`. It computes the read set. Its allowlist is empty: a new entry is backlog, and it names the audit row that removes it. The `no-hand-composed-handler` Biome plugin gates a handler composed by hand inside JSX. No gate holds the rest of the rule for composed keys yet.

3.10 A behavior that many components share has one home in `ui`. A component calls the home and never writes its own copy. A gate holds each home:

| Behavior | Home | Gate |
|---|---|---|
| A horizontal arrow key that steps through the reading order, which swaps in RTL | `logicalArrowKey` in `hooks/a11y/logical-arrow.ts`; `useA11yRoving` applies it | `logical-arrow-boundary.test.ts` |
| The cursor for the span of a drag | `hooks/use-drag-cursor.ts` (`useDragCursor`, `useDragCursorHold`, `holdDragCursor`) | `drag-cursor-boundary.test.ts` |
| The grab cursors of a surface that the reader drags | `hannou.grab` in `recipes/kiso/hannou/cursor.ts` | `grab-cursor-boundary.test.ts` |
| A box that scrolls, with the fade on the edge that has more content behind it, on either axis | On the inline axis, `omote.rail` in `recipes/kiso/omote/rail.ts`. On the block axis, `fade.block` in `recipes/kiso/omote/fade.ts`, as the menu viewport uses it. The `scroll-fade-inline` and `scroll-fade-block` utilities in `core/scroll/fade.ts` draw the fade in CSS, with no script | `inline-scroll-boundary.test.ts` |
| A script with inline source, which runs before React hydrates | `InlineScript` in `primitives/inline-script/inline-script.tsx` | `inline-script-boundary.test.ts` |
| The reduced-motion setting of the reader | `usePrefersReducedMotion` in `ui/hooks` | `no-motion-reduced-motion-hook` |
| An element that Motion animates | `m` from `primitives/reduced-motion/reduced-motion-elements`, under a `ReducedMotion` root from `primitives/reduced-motion`, which loads the features of Motion in a chunk after it mounts. An HTML `m` element is `inert` while it exits under `AnimatePresence`, and `useA11yRoving` skips each item under an `inert` ancestor | `no-full-motion-component` |
| A boolean ARIA state or `data-*` attribute | `ariaAttr` and `dataAttr` in `ui/core` | `no-hand-written-bool-attr` |
| A value held inside a range | `clamp` in `src/utilities` | `no-hand-written-clamp` |
| A key press or a click that holds Ctrl, Meta, or Alt, which is for the browser | `hasBrowserModifier` in `utilities/modifier-keys.ts` | `browser-modifier-boundary.test.ts` |
| The text that a control shows or speaks, in the language of the reader | `primitives/intl`: a unit defines its messages with `defineMessages` and reads them through `useIntl`, or renders `IntlMessage` in a static leaf. Only `primitives/intl` imports FormatJS. `src/primitives/intl/lang/en.json` holds the English catalog, which `pnpm intl` writes, and each other file in that folder holds one translation. A number that a person reads or hears goes through `formatNumber`, or fills `{count, number}` in a message | `no-formatjs-import-outside-intl`, `intl-catalog-boundary.test.ts`, `intl-coverage-boundary.test.ts` |
| A primary press, which starts a gesture or acts as a plain click. On macOS a Ctrl-click with the primary button is the secondary click, so it is not a primary press | `isPrimaryPress` in `utilities/primary-press.ts` | `primary-press-boundary.test.ts` |

An arrow key on a physical axis, such as a slider track or a map cursor, stays physical. The logical-arrow gate lists each such file with its reason.

3.11 Each part that has an open state stamps a boolean `data-open` while it is open. Such parts are a trigger and the content that it opens. A part that can be disabled also stamps `data-disabled` while it is disabled. Use `dataAttr` from `ui/core` (§3.10). A consumer then styles the state of each disclosure with the same selector. A step state that has more than two values, such as the `data-state` of a Stepper step, is not an open state. Content that stays on screen for an exit animation drops `data-open` when the close starts. An `m` element of the library does this while it exits. A node that a parent holds at its last open props takes the attribute from an effect, as `FloatingSurface` does.

The disclosure sweep in `sweeps/capabilities.test.tsx` opens each `disclosure` subject of the corpus and reads the two attributes. `disclosure-state-boundary.test.ts` finds each barreled component whose props take `open`, `defaultOpen`, or `onOpenChange`. It fails when the corpus has no subject for such a component and the test does not exempt it with a reason.

## 4. TypeScript

4.1 In place of `any`, use `unknown` with narrowing, generics, or a precise type. Type external responses at the fetch boundary. Biome's `noExplicitAny` gates the first rule as an error.

4.2 Use `type` aliases for props and data shapes; never `interface`. Co-locate small ones, extract to `types.ts` once shared or large.

4.3 `ComponentProps<'tag'>` is the only native-prop base. It carries `ref`, so a props type never declares a `ref` beside it. A component that does not forward the ref omits it (`Omit<ComponentProps<'div'>, 'ref'>`). A component that renders more than one element keeps an element-agnostic base, because the arms are not mutually assignable. An imperative handle declares `ref?: Ref<<Name>Handle>` after that omit. A component takes `ref` as a prop, never through `forwardRef`.

A barreled props type whose component renders an element takes the `ComponentProps<'tag'>` of that element, so a consumer can pass `id`, `aria-*`, `data-*`, and `ref`. A skeleton mirrors the explicit props of its real component, so it takes no base (§3.7). A component that renders no element of its own, such as a root that only provides context, takes no base.

Do not declare a key again when the base gives it. `Omit<ComponentProps<'div'>, 'className'> & { className?: string }` gives the same type as the base alone. When you declare a key that the base gives, change its type or its optionality. Or give it a doccomment that says what the key does in this component.

`props-base-boundary.test.ts` and Biome's `noReactForwardRef` gate the rule. The boundary test lists each exemption with its reason, and each component with two elements that keeps an element-agnostic base.

4.4 A variant axis reaches props from the recipe that declares it: `size?: ButtonVariants['size']`, `SkeletonProps<NonNullable<ButtonVariants['size']>>`. A `size` prop takes `ScaleStep` with the scale that its kata exports (§5.5). Never repeat an axis union in a second place; the `no-respelled-orientation` Biome plugin pins the orientation axis.

4.5 Props live beside the component that takes them. A barrel reaches a type at the module that declares it, never through a component that re-exports it. Every barreled component ships its `<Name>Props`.

4.6 A barrel names each symbol that it re-exports, once for each source module. A type rides the statement of its module with the inline `type` modifier (`export { Button, type ButtonProps } from './button'`). A module that exports only types takes `export type { … } from`. Never `export *`: a wildcard re-exports whatever the module gains next, and the barrel tests cannot read through it. `barrel-export-boundary.test.ts` and Biome's `noReExportAll` gate the rule.

4.7 A module constant that holds a fixed string, number, or regex takes `UPPER_SNAKE_CASE`, as `STORAGE_KEY` and `MINUS_SIGNS` do. A fixed `Set` takes it too. A recipe part, a cache, and a value that changes take `camelCase`. An object or an array table follows the form of its file. The [`no-camel-case-fixed-constant`](.biome/plugins/no-camel-case-fixed-constant.grit) Biome plugin finds a fixed value with a `camelCase` name. The route segment config of Next.js keeps its names, as `instant` does.

4.8 Biome's `noExcessiveCognitiveComplexity` is an error in the source of `ui`, `apps`, `auth`, and `shared`. Tests and benchmarks are out of its reach. Split a function that breaks the rule. Do not suppress it.

4.9 A prop takes the name that the table gives for its idea. Use the name in each component that has the idea, and do not use the alias in the last column:

| Idea | Name | Not |
|---|---|---|
| The value of a control | `value`, `defaultValue`, `onValueChange` | `onChange` for a value callback |
| The open state of a disclosure | `open`, `defaultOpen`, `onOpenChange` | `isOpen` |
| A part that does not operate | `disabled` | `isDisabled` |
| A value that the reader cannot change | `readOnly` | `isReadOnly` |
| An action in progress | `loading` | `pending` |
| A close button on the part | `closable` | `dismissible` |
| The level of a heading | `level`, or `<part>Level` when the level belongs to a part, as the `titleLevel` of a Dashboard, with the type `HeadingLevel` | A union `1 \| 2 \| 3 \| 4 \| 5 \| 6` written by hand |
| The semantic kind of a message | `severity`, with the type `AlertSeverity`, a union that adds to it, or a part of it, such as the validation `Severity` | A union with another kind for the same idea, such as `danger` |
| The density step | `size` (§4.4) | |
| The style of the part | `variant` | |
| The palette color | `color` | |
| The element that takes focus when an overlay opens | `initialFocus` | |
| The element that takes focus when the part closes | `returnFocusTo` | `finalFocus` |

`prop-vocabulary-boundary.test.ts` reads each public props type with the checker. It holds the aliases, the heading level, and the severity rows. No gate holds the `onChange` row, because a native `onChange` is correct on an input.

## 5. Styling

5.1 Tailwind v4 utilities, composed with `cn()` via `ui/core` (clsx + tailwind-merge).

5.2 Visual variants come from a component's recipe, consumed through its props.

5.3 Spacing, sizing, and color use the named scale and palette tokens, not magic pixel or hex values. The ring-compensated formula `calc(--spacing(v)-1px)` has one home, the ring utilities in `core/density/utilities.ts`. A class reaches it through `p-ring-*` and its relatives. The [`no-inline-spacing-calc`](.biome/plugins/no-inline-spacing-calc.grit) Biome plugin holds the rule in `ui`.

5.4 An app renders a link with `Link` from `ui/link`, not with `next/link`. `UIProvider` registers `next/link` under it, so client navigation stays. Biome's `noRestrictedImports` holds the rule in `apps`. An app renders an image with `next/image`, not with `<img>`. Biome's `noImgElement` holds that rule outside `ui`.

5.5 In `ui`, a ramp is the one place that writes a value for each density step, for example `density-p-[1,2,3,4,5]`. A ramp has five values, one for each step from `xs` to `xl`, and it lives in `recipes/kiso/dan/`. `src/core/density/geometry.ts` gives the formula of each ramp, and `density-geometry.test.ts` holds each ramp to its formula. A padding, a gap, a radius, or a width gets its values at `xs` and `xl` from `spacingSteps`. A kata makes the size scale of its component from its ramps with `defineScale`, and exports it. The component types its `size` prop with `ScaleStep`. A skeleton takes the scale of its component. Thus the prop offers only the steps that render with a look of their own. A JS reader resolves its step with `useDensityStep`. It uses the step only to compare or to key, or to give a scope to a descendant. For a value at the step, it reads the ramp with `rampValue`, or `geometry.ts`. Each gives a value for each step. The ramp holds the clamp of an outer step. A JS reader does not choose a scope, because the CSS chooses it. Do not pick or clamp a step by hand. `size-scale-boundary.test.ts` holds the ramps and finds a step picked by hand. `browser/geometry/size-steps.test.tsx` renders each step of each `size` axis, and fails when two neighbor steps render the same.

5.6 An app, the docs app of `ui`, and `shared` write no `gap-*` or `space-*` class. A layout with a gap is a structure unit (Flex, Stack, Columns, or Split), and its `gap` prop steps with density. A class has the same length at each step. `app-gap-boundary.test.ts` holds the rule.

5.7 In Places, an icon-only `Button` uses `variant="bare"`, so each icon button of the app has the same look. The [`require-bare-icon-button`](.biome/plugins/require-bare-icon-button.grit) Biome plugin holds the rule.

In an app, an action such as Close or Remove is a `Button` with `variant="bare"` and an `Icon`, not a `ToggleIconButton`. A `ToggleIconButton` sets `aria-pressed`, so a screen reader reads the action as on or off. It also stays live while a `Form` submits, but a Remove writes a field. A `ToggleIconButton` in an app takes `pressed`, `defaultPressed`, or `onPressedChange`. The [`no-stateless-toggle-icon-button`](.biome/plugins/no-stateless-toggle-icon-button.grit) Biome plugin holds the rule.

5.8 In `ui`, a class on the inline axis uses a logical side: `ms-`, `pe-`, `start-`, `end-`, `border-s`, `rounded-e`, or `text-start`. A physical side (`ml-`, `pr-`, `left-`, `border-r`, `rounded-bl`, `text-left`) does not mirror in a right-to-left layout. A class string with an `rtl:` sibling states each direction itself. A site that is physical on purpose, such as a plot that keeps its physical axis, carries a suppression with its reason. The [`no-physical-side`](.biome/plugins/no-physical-side.grit) Biome plugin holds the rule.

5.9 In `ui`, a component whose layout changes at a viewport breakpoint takes that axis as a `Responsive<T>` prop, as the structure units do. The default value of the prop holds the change. It names size classes through `adaptive`, for example `adaptive({ compact: 'vertical', medium: 'horizontal' })`, and never a breakpoint. `SIZE_CLASSES` in `types/responsive.ts` is the one table that ties a size class to a breakpoint. In it, `compact` is the base, `medium` starts at `sm`, and `expanded` starts at `lg`. The kata writes the unprefixed classes of each value once, in a table. In a unit, the table is a responsive axis under `responsive`. A call with a map of values then puts the prefix of each breakpoint on the classes of each slot. Outside a unit, `resolveVariant` puts the prefix of each breakpoint on the classes of a table. Each value of a table writes the same properties on the same selectors, in the same layer. Thus a larger breakpoint replaces each property of a smaller one. The compound rules that read a responsive axis follow the same rule: the rules with the same other conditions write the same properties. A JS reader that must agree with the layout reads the same prop with `useResponsiveValue`. `responsive-variants.test.ts` reads the responsive axes and the compound rules of each unit and holds each table to the rule. It also makes sure that `ui/tailwind.css` lists each prefixed class. Each class in `ui` is mobile-first: the unprefixed class holds below the first breakpoint, and a min-width prefix changes it from there. Do not write a viewport `max-*:` prefix. A container query, such as `@max-sm/name:`, reads a container and stays legal. `mobile-first-boundary.test.ts` holds this rule and the rule on defaults.

5.10 In `ui`, a part that shows a state or an edge only with a background or a box-shadow keeps a paint under forced colors. Forced colors replace a background with a system color and remove a box-shadow, so the part disappears. Kiso owns each ring, and each kiso ring carries an outline that keeps it under forced colors. Thus a kata, a component, or a module writes no ring width with no gate. It takes an edge from `sen.ring` (`default`, `inset`, or `line[width]`) and a focus ring from `sen.focus`. A row whose control has the focus takes `sen.focus.within`. A gap around an element, such as the gap of an Avatar group, is an outline, not a ring. For a part that has no ring, use one entry of `sen.forced`. A fill or a bar that shows a value or a selection takes `mark`. A grip or a bar that the reader sees only as its background takes `shape`. A surface or a track takes `outline`. Tailwind reads only literal class names. Thus a ring behind another gate, such as `data-active`, writes the four outline classes behind that gate. A fallback writes `outline-solid`, not a bare `outline`, because an ungated `outline-none` removes the style that a bare `outline` reads. `forced-colors-boundary.test.ts` finds a ring width in a kata and a ring with no fallback behind its gate. It has no exemption list. Forced colors make red, amber, and green one color. Thus only an invalid ring keeps a mark: it takes the outline of `forced.invalid` behind its gate. A warning ring and a valid ring have no fallback. `recipes/forced-colors.test.ts` holds the parts that have no gate in their class, and `browser/forced-colors-indicators.test.tsx` examines each state in a real browser.

## 6. State & data

6.1 No global state library. Cross-cutting state is React Context at `apps/<app>/app/providers.tsx`. Biome's `noRestrictedImports` keeps the common ones out of `apps`.

6.2 Server data is fetched in Server Components or `'use server'`. They attach the bearer token and resolve the gateway origin server-side.

6.3 Client fetches hit same-origin `/api/*` or `/auth/*` paths. They never call the gateway or handle tokens directly. In an app wrapped in `withAuth`, both prefixes rewrite to the gateway. The rewrites are in the `fallback` phase, so a route handler of the app serves its own path first. The `proxy.ts` of the app gates `/api/*` by the session cookie and leaves `/auth/*` open, because sign-in and register run before a session exists. A file upload is the one fetch to another origin. The client gets a signed address from a service through `/api/*`, and sends the file to that address, not through the gateway.

The `no-client-gateway-access` Biome plugin gates the rule. It also keeps a runtime `auth` import out of a `'use client'` module.

6.4 A client request to `/api/*` goes through TanStack Query. A `<feature>-api.ts` file holds the requests, and a `<feature>-queries.ts` file holds the query keys and the `use<Thing>()` hooks. When a server page fetches the data first, wrap its read in `seed`, and spread `seededQuery` of it into the query (`shared/queries`). Do not give it as a plain `initialData`, which fills only an empty entry. A mutation writes its result into the cache with `setQueryData`.

## 7. Forms

7.1 Forms compose `ui/form`, which owns form state via `useSyncExternalStore` and accepts optional schema resolvers for validation. `form` is a module. Its filter bar, `FormFilters`, binds controls in the same way.

The bindable controls read a form through `primitives/form`, an internal contract below the components. `Form` and `FormFilters` each provide the contract, and the barrel of the module re-exports its public hooks. Thus a component never imports the module. While a `Form` submits, it locks its parts. It renders the lock scope of Control (`ControlLockContext`), which knows nothing about forms. The Control cascade (`useControlProps`, `useControlFieldContext`) makes each field read-only, and each `Button` is inert but keeps the focus. A `Button` that must stay live takes `lockable={false}`. The setter of `useFormField` also refuses a write. A part outside the module writes a field only through that setter, and `form-write-boundary.test.ts` holds the rule.

7.2 Bindable controls take `name` to bind their value to the enclosing form field. Resolution order on every control: an explicit `value`/`checked` prop wins, then the bound field, then internal (uncontrolled) state. Consumer change handlers fire in every mode. A bound field ignores the control's `defaultValue`/`defaultChecked`; `Form.defaultValues` is the single source of truth. The cascade lives in `useFormValue` (value-typed controls), `useInputValue` (Input, Textarea), and `useFormToggle` (Checkbox, Switch): new bindable controls compose one of these, never a bespoke branch. `useFormValue` and `useFormToggle` live in `primitives/form`.

7.3 In value props, `undefined` leaves the control uncontrolled; `null` keeps it controlled with no current value. A control on `useControllable` stays controlled after its first value, and a later `undefined` reads as `null`. Its change handler fires only for a change.

## 8. Naming

8.1 kebab-case files/directories; PascalCase components; `useCamelCase` hooks (`use-*.ts`); PascalCase types with a contextual suffix (`<Component>Props`, `<Thing>Option`, `<Feature>State`). Biome's `useFilenamingConvention` pins the file names.

8.2 Feature folders mirror their route segment. Co-located helpers carry intent-revealing suffixes: `<feature>-api.ts`, `types.ts`, `constants.ts`, `utilities.ts`.

8.3 A provider takes its name from what it holds. `<Unit>Provider` holds the full state of one unit, as `ToastProvider` does. `<Unit><Thing>Provider` registers one kind of thing for a unit, as `ChatEmbedProvider` and `DashboardWidgetProvider` do. A registry takes its props from a `<Unit><Thing>Registry` type in the `types.ts` of the unit. A provider that serves one unit stays in the directory of that unit. `ui/providers/*` holds only the providers that many unrelated components read.

8.4 A binding takes a full word, as short as its meaning allows. The repository has one form for each common binding. Use `event` for an event, `error` for a caught error, and `index` for a position in a list. Use `prev` and `next` for the values before and after a change. Use `el` for an element with no more specific role, and the role name where one exists (`trigger`, `row`). Use `i` and `j` only for a plain `for` counter, and `ctx` only for a canvas or test context.

A name does not repeat what its scope already says. In `use-scroll-lock.ts`, write `prevOverflow`, not `scrollLockPreviousOverflow`. A file-private function in `use-grid-fill-handle.ts` is `createHandle`, not `createGridFillHandle`. [`name-scope-boundary.test.ts`](packages/ui/src/__tests__/boundary/name-scope-boundary.test.ts) finds a file-private function that repeats two or more words of its file name. Drop `resolved`, `current`, and `internal` unless a sibling binding needs the word to tell two values apart. Name a binding for what it holds: a response envelope is `body`, not the name of a field in it.

A handler that fills an `onX` key by shorthand keeps the name `onX`. A handler that a prop takes by name is `handleX`, unless a name that says what it does is clearer, such as `closeOnLeave`.

Split a declaration that does more than one thing into named steps. A nested ternary is one such declaration, and a condition of three or more mixed clauses is another. Keep the order of evaluation.

The [`no-abbreviated-binding`](.biome/plugins/no-abbreviated-binding.grit) Biome plugin holds the clipped forms (`e`, `err`, `idx`, `cb`, and the rest of its list). Where a name follows a series or a payload key that the code does not own, suppress the diagnostic and give the reason.

8.5 A function name starts with a verb that tells what kind of work the function does:

- `get` reads or picks a value.
- `read` reads the DOM, a file, or raw input.
- `measure` reads the geometry of an element.
- `find` searches, and can find nothing.
- `resolve` gets the value that applies from options and defaults.
- `create` makes an object that keeps state, as a store or a registry does.
- `build` makes a structure.
- `format` makes text.
- `parse` splits raw input.
- `to` changes a value into a different form.
- `describe` names a DOM node.
- `is` and `has` give a boolean.
- `same` compares two values, as `sameDay` does.
- `in` tells if a node is inside a place, as `inGrid` does.

A test fixture starts with `make`, as `makeQueryTree` does.

Do not write `isSameDay`, `isInGrid`, or `valuesEqual`. The [`no-alternate-predicate-binding`](.biome/plugins/no-alternate-predicate-binding.grit) Biome plugin finds these forms.

A boolean value takes no `is` when its word is an adjective, as a prop does: `transposed`, `controlled`, `empty`. The bare word must be free in the scope. Keep `is` for a noun (`isArray`) and for a word that is taken (`isGlass` beside the `glass` prop). Keep a name that a library gives (`isDragging`). Do not make up a weaker word only to drop `is`. Rename a name only when the new name is clearer.

Do not end a name with `Of`, as `rowOf` does. That name does not tell if the function reads, searches, builds, or converts. A lookup table is not a function. Give it the name of its value and of its key, as `sectionByPath` does. A type also does not end with `Of`. A type does not get data, so it does not start with a verb. Give it the shortest noun for the type that it gives, as `Root` does.

Use the shortest name that still tells what the function does (§8.4). A name does not repeat what its file tells, so the column sizer reads its environment with `readEnv`, not `readSizerEnv`. An export keeps a word only when an importer needs that word to tell the export from a different name, as `resolveStackMode` and `resolveStackAxis` do. The [`no-of-suffixed-binding`](.biome/plugins/no-of-suffixed-binding.grit) Biome plugin finds an `Of` suffix on a value or a type in the apps and the packages.

## 9. Imports

9.1 In apps, the `@/*` alias maps to the source root: `src` in `places` and `picks`, and `app` in `admin`. Use the alias in place of a deep relative chain, that is, three or more `../` segments.

From `packages/ui`, import per-component entries (`ui/button`, `ui/dialog`) plus `ui/core`, `ui/hooks`, `ui/layouts`, `ui/modules/*` (or the `ui/<module>` shorthand), `ui/structure/*`, `ui/primitives/*`, and `ui/providers/*`. A structure unit also has a `ui/<name>` shorthand, such as `ui/stack`. No root barrel. `src/types`, `src/recipes`, and `src/utilities` stay package-internal, reached by relative import; `internal-barrel-boundary.test.ts` holds `./types` off the `exports` map.

## 10. Testing

10.1 Test locations:

| Scope | Location |
|---|---|
| App | `apps/<app>/src/__tests__/**/*.test.ts` |
| `ui` component | `packages/ui/src/__tests__/` |
| `ui` docs app | `packages/ui/src/docs/__tests__/` |
| `auth`, `shared` | `packages/<package>/src/__tests__/` |

10.2 Component tests render through the library's test renderer and query by `data-slot`. New components expose stable `data-slot` anchors and a filename-matched export.

10.3 **Don't drive third-party async lifecycles** (fetch, virtualization, floating-ui, pdfjs) in tests. They flake on CI. Test the synchronous seam (a reducer, a callback, a typed harness), or skip with a stated reason.

10.4 While you edit, run a scoped subset (`test:changed` or `test:related`), as [CLAUDE.md](CLAUDE.md) §3.3 requires.

10.5 A guarantee that holds for every component of a kind goes in the shared corpus (`a11y/cases`), and a sweep gate asserts it. One new corpus entry then buys every gate. Behavior specific to one component goes in its own test file.

An assertion that reads the DOM tree runs under jsdom: roles, attributes, events, and focus order. An assertion that reads layout, computed style, or color runs in the browser suite (`test:browser`): contrast, target size, geometry, and focus traps. A test that reads no DOM at all opens with `// @vitest-environment node` and runs with no window. `node-environment-boundary.test.ts` holds the docblock and the DOM use of the file in step.

A test whose subject is geometry goes in the geometry category, which `test:geometry` runs. A test that measures the boxes of a real layout goes in `browser/geometry/`, the `geometry` instance of the browser suite. A test of a pure calculation on coordinates, boxes, or shapes goes in `geometry/`, the `geometry` project, which runs in Node. State each tolerance with the geometry matchers (`toContainBox`, `toMatchBox`, `toBeNear`) and a named value: one from `helpers/geometry/tolerance.ts`, or a file constant that gives its reason. `geometry-tolerance-boundary.test.ts` stops `toBeCloseTo` and a comparison through `Math.abs` in the two geometry folders.

10.6 A browser test starts at the viewport that `vitest.browser.config.ts` declares. Vitest resets the page to it before each file, so a file inherits no size from the file before it. A file whose geometry needs another size states it once, as `beforeAll(() => page.viewport(w, h))`. `test-isolation-boundary.test.ts` holds that placement. A call inside an `it` reaches the later cases of the file, and nothing restores the size there.

10.7 The `ui` tests also run with the React Compiler on (`test:compiler`, `vitest.compiler.config.ts`), and CI runs them in a job of its own. The compiler caches a value on the identity of its inputs, so render code must not read a mutable object. TanStack Table v9 keeps one core table, and its rows and columns, for the life of a grid, and their reads are live. `use-grid-table.ts` is the engine boundary: the only grid module that reads the table during render. It reads the table object of the render, which `useTable` gives anew when its options or its state change, so no compiled read goes stale. The engine handle keeps one identity, so only an action or an effect reads it, and [`engine-handle-boundary.test.ts`](packages/ui/src/__tests__/boundary/engine-handle-boundary.test.ts) holds that rule. It gives the grid values and actions, never the engine; its header states the contract. The [`no-value-import-from-tanstack-table`](.biome/plugins/no-value-import-from-tanstack-table.grit) Biome plugin stops a value import from TanStack outside that module and its `engine` folder. It reads `@tanstack/react-table`, its subpath entries, and `@tanstack/table-core`.

The dependency list of a memo names what its value reads, never an extra key to force a recompute. When the content of a value decides, and not its identity, hold the value with `useStableValue` from `src/hooks/use-stable-value.ts`, and list the held value. An effect also lists only what it reads. When a change must run an effect again, make the effect use the changed value. Give the value to the function that the effect calls, or derive the condition of the effect from it. Another way is to compare it with the value that the last run saw. Do not suppress the lint with a `biome-ignore`, and do not read a value for nothing (`void key`). Force a style flush with `forceStyleFlush()` from `src/utilities`, never with a bare property read. The compiler removes a read whose value goes unused.

The `ui` package keeps its manual `useMemo` and `useCallback`. The jsdom suite, the docs site, and an app that does not compile run `ui` with the compiler off. There, the manual memo is the only memo. Remove it only when each of them compiles `ui`.

10.8 The compiler skips a function that breaks one of its rules, and that function loses its memoization. The `skips` project of `test:compiler` fails on each skip in `ui`. Fix a new skip. If you cannot, add a function-level `'use no memo'`, give the reason in its TSDoc, and add the function to the list in [`compiler-opt-out-boundary.test.ts`](packages/ui/src/__tests__/boundary/compiler-opt-out-boundary.test.ts).

Two causes are common, and each has a local fix. When a hook gives an object that holds a ref, the compiler reads each property of that object as a ref. Destructure the ref where you call the hook. When a `useCallback` or a `useMemo` calls an effect event, the compiler reads the event as a dependency. A new event comes on each render, so the list cannot name it. Use `useStableEvent` from `src/hooks/use-stable-event.ts` there. Its identity holds for the mount, so the list names it.

Use `useStableEvent` also for each other handler that keeps one identity for the mount and calls the newest props. Such a handler is one that a subscription holds, or one that an effect or a memo lists. Do not keep the newest handler in a ref that an effect writes. A child runs its layout effects first, so it can read the handler of the last commit. React writes the handler of a stable event before each effect of the commit. A caller in the render phase can reach the handler through a setter that another hook passes on. So run a conversion in the browser suite as well as under jsdom before it lands.

10.9 A case that runs longer than its time limit fails, but its body does not stop. JavaScript cannot cancel a pending promise, so the body continues at its next `await` while a later case runs. A write to shared state at that point changes the later case. Vitest aborts the `signal` of the test context before the next case starts. When a case writes shared state after an `await`, take `{ signal }` from the test context. Call `signal.throwIfAborted()` after the last `await` and before the write.

Shared state is the module registry, a global, the environment, and the clock. It is also the mock registry, a spy on a global or a prototype, and a module-scope `let`. A global includes a constructor or a namespace, such as `URL` or `Math`, because a static on it outlives the case. Web storage, the session history, and the attributes, classes, and style of the root and body elements are shared state too. So is the implementation of a mock that a module exports, because `clearMocks` keeps it. Another write to the DOM is out of scope, because `cleanup`, the residue guard, and the page reset of the browser suite undo it.

A helper that writes shared state counts as a write. That includes a helper in the same file and a helper that the file imports from a `__tests__` tree. It also includes a function of the source tree that resets module-scope state, such as `resetDocumentCache`. [`test-isolation-boundary.test.ts`](packages/ui/src/__tests__/boundary/test-isolation-boundary.test.ts) holds this rule.

A `finally` in the case does not run after a timeout while the body waits. Thus a stub that a `finally` restores stays on the shared window. Restore a stub in `onTestFinished`, which runs after a case that times out.

Each project except `integration` keeps one module registry for each worker (`isolate: false`). There, a module mock of one file (`vi.mock`) or a `vi.resetModules()` reaches the files that run after it. Put a global double in `setup/`. A suite that needs its own module mock goes in `boundary/` with no `-boundary` suffix. The `integration` project runs it in a fork. [`test-isolation-boundary.test.ts`](packages/ui/src/__tests__/boundary/test-isolation-boundary.test.ts) holds this rule.

10.10 Each Biome plugin in `.biome/plugins/` has fixtures in `biome-plugin-boundary.test.ts`. A fixture line that ends in `// flag` must get a diagnostic from its plugin, and each other line must get none. A new plugin adds fixtures that it reports and fixtures that it does not report. The gate proves the pattern of a plugin, not its `includes` in `biome.json`.

10.11 A browser test waits for a signal with a deadline, never for a fixed time. Machine speed can change when a test passes, but never whether it passes. A deadline goes through `budget()`, which scales on CI. A hold goes through `pause()` in `helpers/wall-clock.ts`, which gives its reason. A `budget()` wait stays below the time limit of its case. `browser-wait-boundary.test.ts` holds the rule. The `Browser stress` workflow (`browser-stress.yml`) runs the browser suite each week under CPU load, with fixed shuffle seeds. Replay a red run with `VITEST_SEED=<seed> CI=1 pnpm -F ui test:browser`.

10.12 Each case in `ui` makes at least one assertion at run time. A case that makes none fails, because its pass checks nothing. A type assertion (`expectTypeOf`) does not count: a type case goes in a `*.test-d.ts` file, which `check-types` reads. The `requireAssertions` option of `vitest.base.ts` holds the rule in the jsdom and browser suites.

10.13 A jsdom case that needs the whole fake clock takes the `clock` fixture of `helpers/fake-clock.ts`. The fixture moves the clock in `act`, so the React commits that follow are done. Where each case of a block depends on time, call `onFakeClock()` in the `describe` block, never at file level. A case that fakes only some clocks, such as `Date`, names them with `toFake`. The setups restore the spies, the stubs, the environment, and the clock after each case (`restoreTestState`), so a case does not restore them itself. A case stubs an accessor with `vi.spyOn(target, key, 'get')`, and does not save its descriptor to restore it. `stubClipboard` sets the clipboard, which jsdom does not have. [`test-isolation-boundary.test.ts`](packages/ui/src/__tests__/boundary/test-isolation-boundary.test.ts) holds these rules.

## 11. Environment

11.1 [`NEXT_PUBLIC_*`](https://nextjs.org/docs/pages/guides/environment-variables) is client, else server-only. Confine raw `process.env` reads to a config edge. Today the one reader is `env.ts` in the `auth` package (`BIFROST_URL`, `CLIENT_IP_SECRET`). Other code reaches env through them. Biome's `noProcessEnv` pins it in `apps`, `auth`, and `shared`; `ui` keeps its `NODE_ENV` checks for development warnings.

11.2 New variables get an `.env.example` entry and a typed declaration in the env config.

11.3 The supported browser floor is [`.browserslistrc`](.browserslistrc), and the stylesheet sets it: Tailwind 4 needs Chrome 111, Firefox 128, and Safari 16.4. That floor also covers the ES2023 change-by-copy array methods. A build target does not enforce it: esbuild and SWC downlevel syntax, never instance methods, so a method the floor doesn't cover ships and throws. Reaching below the floor costs a polyfill, not a config change. `lib: ["ES2023"]` stops a newer ECMAScript built-in at type-check; the [`no-api-above-browser-floor`](.biome/plugins/no-api-above-browser-floor.grit) Biome plugin stops a call that the type-check passes, such as a DOM API.

## 12. Documentation

12.1 Public-surface symbols carry TSDoc. Each symbol that a barrel re-exports opens with a doccomment in the house voice ([CLAUDE.md](CLAUDE.md) §2). That covers a component and its `*Props`, each hook, primitive, and provider, and each `ui/core` export. The first sentence states what the symbol is. Add `@param` and `@returns` where the signature is not self-evident. Add `@defaultValue` on a defaulted optional field, `@remarks` for caveats, and `@see {@link …}` for cross-links. Each optional prop whose type is a union of literals has a `@defaultValue` tag. A density step is the exception, because it takes the step of the scope. When the omitted prop is a value, the tag is that value as code, such as `'md'`. When a context can change that value, the tag is a sentence that starts with the value as code. An example is ``` `false`, or the state of the enclosing Control. ``` When the omitted prop is no value, the tag is a sentence that does not start with code. An Alert with no severity is an example. The docs playground reads the tag, and `default-tags.test.ts` holds the rule. Each tag equals the default that the component or its recipe applies, and `default-value-boundary.test.ts` holds that rule. A number prop that the component holds inside a range has a `@minimum` tag and a `@maximum` tag, and its prose gives the same range. The component clamps the value with `clamp`, and the docs playground holds its field to the tags. A default from the catalog gives its English text in the language of the reader. An example is ``` `'Clear'`, in the language of the reader. ``` A comment that names a test file, a benchmark file, or a `{@link}` target names something that exists in the package. `comment-reference-boundary.test.ts` holds both references. A comment, a TSDoc block, or a document gives no count that changes with the code, such as the number of files, callers, or tests. Give the reason, not the number. A count of a past event, or of the code next to the comment, does not change.

Do not restate the type or document a self-evident field. Mark a documented helper that no barrel re-exports with `@internal`; the tag and a barrel entry exclude each other. `tsdoc-coverage-boundary.test.ts` and `internal-barrel-boundary.test.ts` gate the rule. Standard: [TSDoc](https://tsdoc.org).

12.2 The curated docs in [`packages/ui/docs/`](packages/ui/docs) are the quick-glance index of the `ui` surface. `COMPONENTS`, `MODULES`, `STRUCTURE`, `LAYOUTS`, `HOOKS`, `PRIMITIVES`, `PROVIDERS`, and `CORE` index the public surface. `RECIPES` and `UTILITIES` index the package-internal layers (§9.1).

A change that adds, removes, or renames an export updates the matching doc in the same commit. A new component goes in `COMPONENTS.md` under its domain bucket; any other new export gets a one-line summary in its doc. `surface-index.test.ts` checks every doc except `RECIPES` for a missing entry. [`packages/ui/REFERENCE.md`](packages/ui/REFERENCE.md) is the hub, so keep its surface map and its §2 boundary current.

12.3 Audits under [`packages/ui/docs/audits/`](packages/ui/docs/audits) are point-in-time sweeps of one area or one lens, named `{date}-{TOPIC}-AUDIT.md`; a documentation sweep is a `{date}-DOC-AUDIT.md`.

12.4 An audit is a living record while it holds an open finding: resolve each row in place, against the pull request that closed it. Cite the pull request, not a branch commit, because a squash merge discards the branch. Delete the file once every finding is resolved, because the pull requests it names hold the history. Never name an audit from code, or from a document that outlives it; the reference dangles when the audit goes.

A resolution changes the status of the row and cites the pull request, and nothing else. The outcome belongs in the pull request and its commit, which outlive the audit. Change the prose of a row only when a fact in it no longer holds. A mechanism that moved on `main` is such a fact.

12.5 A plan under [`packages/ui/docs/plans/`](packages/ui/docs/plans) records one decision, named `{date}-{TOPIC}-PLAN.md`. It is a living record while a step of it has not landed. Progress lives in the pull requests that carry the work, not in the plan. Delete the file when the last step lands, because the pull requests hold the history. Never name a plan from code, or from a document that outlives it, as §12.4 says for an audit.

Do not mark a step done in the plan. Do not add the result of a step. Edit the plan only when the decision changes. Before you delete a plan, move each fact of it that is still true to a document that lasts. Such a document is [`packages/ui/REFERENCE.md`](packages/ui/REFERENCE.md), a surface index, a module `ROADMAP.md`, or TSDoc.

12.6 A comment gives the reason for the code. It does not record a measured time, such as the time that a build, a test, or a render took. A measured time changes with the machine and with later code, so a comment that keeps it becomes wrong. Write the reason in words that stay true, such as "most of the time of the suite". Put the measurement in the commit message or the pull request, which keep its date. The rule does not apply to a fixed value. Examples are a configured timeout or delay, the 50 ms limit of a long task, and the length of a frame at 60 Hz. A benchmark records its findings in a dated section of [`packages/ui/src/__benchmarks__/browser/README.md`](packages/ui/src/__benchmarks__/browser/README.md), and the file names that section.

## 13. Docs site

13.1 The docs site of `ui` (`packages/ui/src/docs`) shows text from four sources. They are the labels that come from names, the shell and the kit, the demos, and the API reference. The API reference is the TSDoc of `ui` (§12.1). The text of each source is clear, short, and consistent. It follows [STE.md](STE.md) where a rule fits a label. Review holds this section.

13.2 Write each title, label, heading, tab, button, column header, and badge in sentence case: "Column manager", not "Column Manager". A proper noun and an acronym keep their capitals, as in "PDF" and "JSON". A value that a demo shows as a label starts with a capital letter: "Active", not "active".

13.3 End a full sentence with a period. Do not end a fragment with a period. A title, a label, a button, a placeholder, a badge, and a column header are fragments. A confirm title is a question, so it ends with a question mark and keeps its articles: "Delete the report?". Do not use an em-dash or an exclamation mark in visible text. Use a period or parentheses in place of an em-dash.

13.4 Address the reader as "you", and do not use "we". Start an instruction with its verb, and keep it to 20 words or fewer. A validation message is an instruction, so it ends with a period: "Enter a name.", not "A name is required". Use the words of the word list in §13.9.

13.5 A page name is the name of its component. An example title comes from the file name of the example, through `humanize`. So name the file for the feature that the example shows, not for its data. Write a state or a mode as one word or one compound, such as `controlled`, `disabled`, or `read-only`. Write an added part as `with-` and the part, with no article, such as `with-icon`. Make the part plural when the example shows more than one, as in `with-actions`. Write a placement as `in-a-` or `inside-a-` and the container, such as `in-a-form`. Do not repeat the name of the item: `with-descriptions`, not `item-descriptions`. A tab label is a noun that names a feature, such as "Sorting" or "Editing". Its folder is the same word in lowercase, because the label gives the slug of its URL.

13.6 A demo that shows the value of a control writes `Value:` and the value, or `Empty` when there is no value. A demo that shows the last event writes `Last` and the name of the event, such as `Last action:`. Before the first event, it writes `None`.

13.7 The data of a demo holds a date as a `Date` and an amount as a number. The demo formats each one at render with the formatters of `useIntl` from `ui/primitives/intl`. Thus a date or an amount follows the locale of the reader, as the controls do. Fixed text that names a date uses the name of the month, as in "June 18". Fixed text that names a time uses the form that `formatTime` gives in English, as in "9:00 AM".

13.8 The data of the demos is in `src/docs/data`, in one module for each domain, such as the people (`people.ts`) and the store (`commerce.ts`). A demo takes its data from these modules, so each page shows the same people, orders, and places. A page keeps the data of one domain, such as a store or a fleet of trucks. The named people are Wade Cooper, Arlene McCoy, Devon Webb, Tom Cook, Tanya Fox, Hellen Schmidt, Ravi Shah, and Mia Chen (`profiles`). `person(id)` gives a named person for an id up to 8, and a generated person for a larger id. A generated person is "Person" and the id, such as "Person 12". `createRandom` gives the values of generated data from a seed, so each render shows the same values. An email address is the first name at `example.com`, such as `wade@example.com`. A company, a product, and a place are fictional, so a demo names no real brand. Write text that the domain can hold, not filler such as a pangram or "Box content".

Mark each proper noun and each code of the data with `names` (`src/docs/kit/proper-names.ts`). Examples are the name of a person, a company, or a project, and a reference such as `ORD-7291`. A name is the same in each language. A place that a language can give its own name, such as a city, is a word (§13.11). The page smoke test fails on a text that a Spanish page shows as the English page does. These texts pass: a name, the output of a formatter, and a message that the catalog keeps the same. A text in code (`code`, `pre`, `kbd`, or `samp`) passes too. So does a text in an element with `translate="no"`, or with the `lang` of another language. Show a prop value or another literal of the code in `<Code>`. A demo that shows another locale on purpose sets `lang` on its content.

An `aria-label` names the content, not the demo: "Monthly revenue", not "Line chart, animated". A demo does not explain itself in its own text, because its title names the feature. A demo that needs an action from the reader gives one short instruction. When the action is different for a mouse and for a touch, the instruction uses `PointerHint` from the kit. A demo that shows the key of a `$mod` shortcut uses `ShortcutHint` from the kit. The hint shows ⌘ on an Apple platform and Ctrl elsewhere. A demo shortcut does not use a key of the site, such as ⌘K for the search.

13.9 For each idea, use the word in the second column, and do not use the words in the last column. The table covers the visible text and the prose of TSDoc, not the names in the code:

| Idea | Word | Not |
|---|---|---|
| Take one option of a control | Select | Choose, Pick |
| Take an item out of a list or a group | Remove | Delete |
| Destroy an item | Delete | Remove |
| Stop an action and keep the state | Cancel | Abort |
| Shut a panel or a dialog | Close | Dismiss |
| Start or end a session | Sign in, Sign out | Log in, Log out, Login |
| An email address | Email | E-mail, Mail |
| The agreement of a service | Terms of service | Terms and conditions |
| A prop that gets a value | takes | accepts |
| No value in a value readout | Empty | None |
| No event before the first one | None | Empty |
| The opening of an event prop in TSDoc | Fires when | Called when, Runs when, Invoked when |
| The opening of a boolean prop in TSDoc | A verb in the third person that says what `true` does, such as "Shows" | Whether, Show |

Each translated language has a word list in this section. Add a list when you add a language. The Spanish catalogs use the words of the next table for the same ideas. The catalog of `ui` (`src/primitives/intl/lang/es.json`) sets them, and the catalogs of the docs use the same words. The text addresses the reader as "tú". A button and a menu item take the infinitive, such as "Guardar". An instruction takes the imperative, such as "Selecciona un país". An adjective agrees with its noun in gender and number. The value of a prop in a playground agrees with the name of the prop, such as "Densidad: Compacta" and "Tamaño: Mediano":

| Idea | Word | Not |
|---|---|---|
| Take an item out of a list or a group | Quitar | Eliminar, Borrar |
| Destroy an item | Eliminar | Borrar, Quitar |
| Empty a field or a selection | Borrar | Limpiar, Eliminar |
| Put an item in a list or a group | Añadir | Agregar |
| Stop an action and keep the state | Cancelar | Abortar |
| Shut a panel or a dialog | Cerrar | Salir |
| Start or end a session | Iniciar sesión, Cerrar sesión | Acceder, Salir |
| An email address | Correo | Email, E-mail, Mail |
| A dashboard | Tablero | Panel |
| Go back to the first state | Restablecer | Reiniciar |

13.10 The API reference shows the TSDoc of `ui`, and the kit text around it. The TSDoc stays English in each language of the docs, and its text has `lang="en"`. A page in another language shows a note under the heading of the API reference that tells the reader so. The first sentence of a component or a type is a noun phrase that states what it is (§12.1). The props of one idea use one wording in each component, such as the openings in §13.9. A controlled or a default state names its state, such as "Controlled open state". The kit text uses the same words as the TSDoc.

13.11 The text of a demo shows in the language of the reader. `pnpm intl` writes a catalog entry for each literal of `pages/` and of `src/docs/data` that is text. Such a literal is JSX text or a string as a JSX child. It is also the value of a text attribute, a text prop, or a text property of an object. A list or an arrow function in such a place gives text too, and so does the `return` of a component. The names of text are the names that `intl-coverage-boundary.test.ts` reads. A check and a summary give text too. That text is the value of `error` and of `summarize`, and the message of each check of `validate` or each value of `fieldErrors`. The docs plugin builds the copy of each module in each language with the translations in place, and "Show code" shows the copy. Thus a demo holds plain literals, not messages. Write the character in JSX text, not a character reference such as `&amp;`. A template is text in the same places when each value is a name, a property, an item of a list, or a call. Examples are `` `Edit ${row.name}` ``, `` `${value} of 5, ${levels[value]}` ``, and `` `${miles(span)} across` ``. Its message holds an argument for each value, such as `Edit {name}`, `{value} of 5, {levels}`, or `{miles} across`. Another template stays as written, so put such a value in JSX next to its text. A word of the demo data, such as a status, comes from a call of `words` (`src/docs/data/words.ts`). The data holds the key, and the demo shows the word. Its message id holds the domain and the key, so the same English word can have another translation in another domain. When you add or change a demo text, run `pnpm intl` and add the translation to each catalog in `src/docs/lang`. A text that is the same in each language, such as a file name or a shortcut, keeps its English text in the translation.

13.12 In a demo, the body text under a title is `<Text tone="muted">`. Examples are the body of a Card, a Dialog, and a Sheet.

---

**See also:** [CLAUDE.md](CLAUDE.md), [STE.md](STE.md), [`packages/ui/REFERENCE.md`](packages/ui/REFERENCE.md).
