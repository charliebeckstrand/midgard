# Density off the Hot Path — Design Plan — 2026-10-13

**Decision.** Each density scope sets inherited custom properties that hold its step, and each stepped class becomes one rule whose value is a `calc()` of them. The rungs, the depth layers, and `maxDepth` go. The class syntax (`density-p-[1,2,3,4,5]`) does not change. The emitted form sits behind one seam in the plugin, so a later move to `if()` changes the plugin alone.

The plan crosses `ui`, the docs, and the three apps, and its last step removes public variants of `ui/tailwind.css`. It is the §3.1 step: it asks for assent before any step lands.

## Why

The rungs of `core/density/rungs.ts` write a selector for each depth, each root step, and each slot host, for each density class. A prototype of this plan (below) and the strip experiment measure what that costs.

**Bytes.** The docs sheet is 1,289,394 B (55.3 KB brotli). The `density-0/1/2` layers are 1,065,433 B of it (83%), in 4,532 rules. The Next apps ship the same sheet as their one render-blocking `<link>`: admin 1,282,946 B (54.9 KB br), picks and places the same within 0.5%. The docs inline the per-page subset as critical CSS, and the rungs inflate it too: `/button` 176 KB (11.7 KB br), `/slider` 263 KB (15.2 KB br).

**Matching and recalc.** The rungs are not slow one at a time. The top density selector costs about 1 ms of matching on a page switch. The cost is the count. Chromium selector stats on a page switch at 390 px give 71 ms of matching on main against 21 ms with every density rung stripped. A cold `/button` load at 4× CPU spends 89 ms in style recalc on main against 58 ms stripped (medians of 15).

**Two corrections to the brief.**
- The 1,558 `data-density=` on `/button` are almost all CSS text in the inline critical `<style>`. The markup holds 8 attributes, all slots. The ancestor filter does reject most nested rungs today. The cost comes from the class-bucket volume (about 7,100 density selectors, each walked on each element with the class) and from about 70 to 340 multi-argument `:is()` wrappers in the universal bucket. The count depends on the heuristic; Chromium's own stats are the measure that matters.
- The equivalence harness of the brief stored `density: 'xs'` and `'xl'`. The stored value is a level (`compact`, `snug`, `loose`), so those configs rendered at `md` and checked no root step. The harness of this plan uses `compact` (root `sm`) and `loose` (root `lg`).

## The contract

Each requirement holds today, and each must hold after the move. The tests named are the ones that hold it now. Paths are under `packages/ui/src/__tests__/` unless noted.

| # | Requirement | Held today by | Under this plan |
|---|---|---|---|
| R1 | Five steps `xs`…`xl`. Levels map to `sm`, `md`, `lg`. Only a `size` or a slot reaches `xs` or `xl`. | `core/control-step.test.ts`, `primitives/density.test.tsx` (`toInnerStep`), `providers/density.test.tsx` (`levelToStep`), `core/density-scale.test.ts`, `browser/geometry/size-steps.test.tsx` | Unchanged. `steps.ts` keeps its logic. |
| R2 | A list of 5 values, or 3 (`xs` copies `sm`, `xl` copies `lg`). Another length writes no CSS. Kinds: spacing, margin, text (line height = size + 8 px, `leading-*` wins), radius, ring (−1 px). | `core/density-utilities.test.ts`, `boundary/size-scale-boundary.test.ts`, `core/density-geometry.test.ts` | Unchanged syntax and kinds. The emitted shape changes, so `density-utilities.test.ts` asserts one rule per class. 3-value lists get their first computed test (docs sidebar `density-px-ring-[1.5,2,2.5]`, places `density-w-[3,4,5]`). |
| R3 | The nearest scope wins, the element itself included. No `data-[density=…]` selector. | `core/density-rungs.test.ts`, `browser/density-scope.test.tsx` (the root scope, static leaves, families), `sweeps/capabilities.test.tsx`, `boundary/density-native-boundary.test.ts`, the `browser/geometry/*-density` suites | Holds by inheritance, at any depth. The `data-[density=…]` gate stays: such a selector still has no proximity. |
| R4 | A consumer `className` wins over each density class. In `cn`, a later plain class removes the stepped class. | `browser/density-scope.test.tsx` "lets a consumer className win…", "keeps the Placeholder default height…"; `core/cn.test.ts` "stepped density classes" | A plain utility sits in `utilities`, and it outranks the nested layer `utilities.density`. `cn` is unchanged, because the class names are. |
| R5 | A slot (`data-density="slot"`) is one step below the scope above it. `xs` stays `xs`, no slot reaches `xl`, a slot in a slot steps once, a scope in a slot wins. | `browser/density-scope.test.tsx` "the relative slot scope", "a control slot in an xl scope"; JS mirror `scopeStepOf` | A slot reads the host copy of the weights, which only a real scope writes, so a slot in a slot steps once with no cycle. The slot-in-slot test, missing today, lands in step 1. |
| R6 | An explicit `size` makes the element its own scope. Portals carry the scope on their host. | `browser/density-scope.test.tsx` (explicit size), `boundary/density-native-boundary.test.ts` (context writers), `browser/floating-ui/density-portal.test.tsx`, component tests | Unchanged. The element sets its own weights and reads them. |
| R7 | `density-any` applies at each step and loses to each step and each plain class. | `browser/density-scope.test.tsx` (Placeholder) | `:where()` in `utilities.density`: a stepped class (one class) and a plain class (outer layer) beat it. |
| R8 | A pseudo-element takes the step of its element. Today only a variant before the pseudo-element works (`density-xs:before:…`). | `browser/density-scope.test.tsx` "rounds the inset fill…", `boundary/density-native-boundary.test.ts` "no source file puts a density class after a pseudo-element variant", `browser/avatar-group-overlap.test.tsx` | Inverts. A pseudo-element inherits the weights, so a stepped class after it works (`before:density-rounded-ring-[1,1.5,2,2.5,3]`, `[&::-webkit-slider-thumb]:density-size-[2,3,4,5,6]`). The boundary test flips to forbid the step variants. |
| R9 | A stepped class works under each other variant (`*:data-[slot=icon]:`, `has-[…]:`, `group-has-[…]/control:autofill:`, responsive, `@source inline`). | `structure/breakpoint-classes.test.ts`, `structure/*` class tests, icon sizing in `density-scope.test.tsx`, `browser/item-row-density.test.tsx` | Holds, and each such class is one rule with no ancestor part, so the `:is()` wrappers leave the universal bucket. |
| R10 | First paint is correct before JS: `AppearanceScript` writes the root class, the markup is the same at each step, about 28 server components write `data-density` with no context, the docs subset compile carries every root step. | `providers/appearance.test.tsx`, `providers/ui-document.test.tsx`, `primitives/density.test.tsx` "useDensityStep", `browser/density-scope.test.tsx` "controls at the first paint" and the other first-paint blocks | The root mark stays a class, so the script, `readRootDensity`, and the observer do not change. The scope rules are base rules, which the subset compile writes with zero candidates, so each page's critical `<style>` carries them. |
| R11 | Nesting depth: `maxDepth = 2`, and deeper scopes rank wrongly. | `browser/density-scope.test.tsx` "keeps each ranked depth…", `docs/__tests__/page-smoke*.test.tsx` (depth gate), `core/density-rungs.test.ts` | Removed. No depth limit (checked to depth 13). The page-smoke depth gate goes. |
| R12 | Two stepped classes on one property: the later rule in the sheet wins. | Shape only (`core/density-rungs.test.ts`). No computed test. | Holds: one layer, one class of specificity. A computed test lands in step 1. |
| R13 | The Next apps and the docs consume `ui/tailwind.css` unchanged. | No app test. | Holds with no app change. `apps/places` `category-options.tsx` gets a computed test. |

The JS readers (`useDensityStep`, `useDensityRoot`, Grid, Calendar, Portal, the playground) read attributes and the root class, not CSS, so this plan does not touch them. Two known gaps stay out of scope and are recorded here: `useDensityStep` in a slot returns the host step while CSS paints one lower, and the TSDoc of `DensityProvider` and `AppearanceProvider` still says charts read the context.

## Candidates

Five designs were written independently and judged on correctness, performance, and migration. The leading two were prototyped on the whole docs app.

| Candidate | Verdict |
|---|---|
| **A. One-hot weights** (unregistered). Each scope sets `--dxs`…`--dxl` to 0 or 1, and a host copy `--hxs`…`--hxl`. Each value is a weighted sum. | **Chosen.** Correct at any depth, no registration, best load numbers. |
| **B. Registered index.** `@property --d { syntax: '<integer>'; inherits: true }` and a host copy. Each value is a hinge `a + b·d + Σ c·max(0, d − k)`. | Runner-up. 9 KB smaller raw, and a density switch restyles faster (44 ms against A's 107 ms on a 28k-element page, unthrottled). It loads no faster, and a registered `--d` interpolates when a transition names it. It stays behind the seam. |
| **E. Token toggles** (space toggles: the held step is `initial`, the others empty; values select by `var()` fallback). | Third. Most general values (keywords too), same bytes as A. A slot rule depends on what an invalid custom property computes to; older engine behaviour inherits the parent's value and breaks the slot. A failure leaves a property unset, not `md`. |
| **C. Modern CSS**: `@scope` with proximity, container style queries, `if()`, `@function`, `inherit()`. | The end state, not now. Above the floor: `@scope` Firefox 146 and Safari 17.4; style queries Firefox 151 and Safari 18; `if()` Chrome 137 only; `inherit()` unshipped. A fallback under the floor keeps all the cost of the fallback, so progressive enhancement saves nothing. A style query reads the ancestor, so it is wrong for a self scope. |
| **D. Render time**: React context writes the stepped class. Hybrids of root rules and explicit per-scope classes. A build step that rewrites the rungs. | Rejected. The prerendered shell serves every user, and the root step lives in `localStorage`, so a JS step paints `md` and jumps after hydration (the pre-paint plan's rule: no number in JS picks what the shell paints). About 28 server components write `data-density` with no context. The hybrid kept the rungs and `maxDepth` and measured 537 KB. |

### The rungs.ts objection

`rungs.ts` rejects custom properties because they "move the styles out of the Tailwind classes". In this design they do not. Each class still carries its own declarations and its own values: `.density-p-[1,2,3,4,5]{padding:calc(var(--spacing) * (3 - 2 * var(--dxs) - var(--dsm) + var(--dlg) + 2 * var(--dxl)))}`. A scope publishes only which step it holds, which is what `data-density` already does. `cn`, `defineScale`, and the class literals in `kiso/dan` do not change. The pre-paint plan gave the real blocker as "where the step is resolved, not where the styles live". The step still resolves in CSS from the attribute and the root class.

## The mechanism

**Scopes**, in `@layer base`, written by `addBase` from `steps.ts`, so they cannot drift from `densitySteps`, `rootDensityClasses`, and `slotStep`:

```css
:where(:root) { --dxs:0; --dsm:0; --dmd:1; --dlg:0; --dxl:0; --hxs:0; --hsm:0; --hmd:1; --hlg:0; --hxl:0 }
:where(:root.density-root-sm), [data-density=sm] { --dxs:0; --dsm:1; --dmd:0; --dlg:0; --dxl:0; --hxs:0; --hsm:1; … }
/* xs, lg, xl likewise; [data-density=md] resets to md */
[data-density=slot] { --dxs:calc(var(--hxs) + var(--hsm)); --dsm:var(--hmd); --dmd:var(--hlg); --dlg:var(--hxl); --dxl:0 }
```

A slot never writes the host copy, so a slot in a slot reads the same host. `:where()` on the root keeps `<html data-density>` able to win over the root class, as it does today. The prototype used `:root.density-root-*` at (0,2,0), and the adversarial pass caught the inversion. The final names take a prefix (`--ui-dxs`, or a shorter private form), because the weights inherit into every consumer element and a consumer `--dmd` would change density silently.

**Stepped utilities**, one rule per class in `@layer utilities { @layer density { … } }`. The emitter writes the most frequent value as a base and adds a term for each step that differs, grouped by equal delta. It falls back to the exact `Σ v·w` when the base form is not exact in double precision. Text keeps `line-height: var(--tw-leading, calc(<size sum> + .5rem))`. Ring forms subtract one `- 1px`. Names (`--text-*`, `--radius-*`, `--container-*`) weight their `var()`.

**`density-any`** is `:where(&)` in `utilities.density`.

**The seam.** All value emission goes through `pick(kind, valuesByStep)`. A and B differ only there and in the base rules. When the floor ships `if()`, `pick` writes `if(style(--d: N): …)`, which also takes keywords and non-finite values.

**What one-hot cannot express.** A weighted sum takes numbers and lengths only.
- `infinity * 0` is NaN, so `full` is not a radius name in a ramp (it writes no CSS). Main already breaks here: its `md` rung reads the undefined `var(--radius-full)` and paints 0 px.
- One unknown name (`density-w-[auto,xs,sm]`) invalidates the whole sum, so the property is unset at every step. The plugin checks each name against the theme keys and writes no CSS for an unknown one.
- A keyword (`display`, `shadow`, `flex-direction`) cannot be stepped. Today `REFERENCE.md` documents `density-sm:shadow-sm` as the way to step such a class. No source file uses a step variant for a keyword, but it is public.

## Measured evidence

The prototype is commit `499e7cd6e` on the local branch `claude/density-proto`, 13 files. It implements A and B behind `DENSITY_EMIT`, converts each step variant in the repository to a stepped class, and keeps `density-any`. All figures: Chromium 141, docs app built with `pnpm turbo run docs:build --filter=ui`.

### Bytes (brotli q11)

| | main | A | B | strip-all bound |
|---|---|---|---|---|
| Docs full sheet | 1,289,394 / 55,266 | 274,989 / 27,545 | 265,779 / 27,376 | 251,800 / 26,515 |
| Density layers | 1,065,433 / 31,522, 4,532 rules | 50,311 / 3,660, 304 rules | 41,413 / 3,506, 304 rules | 0 |
| Scope base rules (raw) | — | 1,489 | 908 | — |
| `/button` critical | 176,336 / 11,728 | 41,396 / 7,240 | 40,368 / 7,168 | 37,500 / 6,880 |
| `/input` critical | 222,006 / 13,055 | 44,297 / 7,673 | 43,291 / 7,599 | 40,192 / 7,289 |
| `/slider` critical | 262,853 / 15,211 | 57,556 / 8,682 | 56,008 / 8,612 | — |
| admin sheet (render-blocking) | 1,282,946 / 54,929 | 270,705 / 26,908 | 261,485 / 26,616 | — |

picks and places match admin within 0.5%. A `next build` of admin in A mode shipped 274,400 B; its density layer is byte-identical to the direct compile.

### Selector buckets (density rules, admin)

| | selectors | class | attr | tag | universal |
|---|---|---|---|---|---|
| main | 8,389 | 7,107 | 934 | 7 | 341 |
| A and B | 309 | 265 | 32 | 7 | 5 |

### Runtime (390 px, mobile emulation)

| | main | A | B | strip |
|---|---|---|---|---|
| Cold `/button` at 4× CPU, TBT median of 15 (interleaved) | 147 ms | 82 ms | 113 ms | 104 ms |
| — style recalc during load (`RecalcStyleDuration`) | 89 ms | 58 ms | 65 ms | 58 ms |
| — FCP | 244 ms | 216 ms | 224 ms | 208 ms |
| Page switch, selector matching (selector stats, 3 runs) | 71 ms | 23 ms | 21 ms | 21 ms |
| Search open, selector matching | 65 ms | 22 ms | 22 ms | 25 ms |
| Root density switch, style + layout, 28k elements (unthrottled) | 305 ms | 107 ms | 44 ms | — |
| Event Timing at 4× CPU, median of 15: open nav / page switch / open search / type | 296 / 176 / 280 / 64 | 280 / 184 / 280 / 64 | 296 / 200 / 288 / 64 | 272 / 176 / 272 / 64 |

The TBT spread is wide (main 116–284 ms, A 34–210 ms), and A's lead over B there is not significant. A and B match the strip bound on recalc and matching. The Event Timing rows do not separate the builds at 15 runs, not even the strip bound against main. React rendering dominates those interactions, so the CSS change shows at load, on recalc, and on a density switch, not as a lower INP. Selector-stats tracing inflates `UpdateLayoutTree` by about an order of magnitude, so the recalc row comes from un-instrumented runs.

### Correctness

- **Whole docs app, computed style.** Every element and its `::before` and `::after`, each property but custom properties and animations, on each of 110 pages, in light `md` at 390 px, dark root `sm` at 390 px, and light root `lg` at 1280 px: about 129,000 element states per config, for A and for B. Result: 0 unexplained diffs. Each flagged row reran clean, or came from main's own noise (a late toast region, running chart animations, React `useId` in `url(#…)`, and `/modules/grid/virtualization`, where main against main differs).
- **Contract probes.** 274 synthetic cases against a copy of `scopeStepOf`: root swaps at run time, depth 3 to 13, slot in slot under each host, `xs` and `xl` slots, explicit size in a slot, consumer override of each converted form, `::before` and `::-webkit-slider-thumb` at each step and in slots, capture semantics, 3-value lists, R12, `density-any`, hover, focus, autofill, the `2xl` safelist at 1536 px, bad values, and transitions. A and B pass all 274. Main fails only beyond `maxDepth`, as expected.
- **Refutation pass.** 59,925 class × scope states against main within depth 2, again at a 13.37 px root font size, and B with its `@property` rules stripped: 0 diffs each time.
- **Repo gates on the prototype.** Biome, `check-types`, `test:workspace`, and `test:docs-build` (166 tests: bundle budget, axe, hydration) pass. The browser project passes, except one test that reads a custom property as text. 26 unit tests fail, and each asserts the old rung shape or the old variant syntax (inventory under step 2). No regression in behaviour.
- **Not verified.** Firefox and Safari: only Chromium runs here. `::-moz-range-*`, `calc()` of `var() * number` in `border-radius`, `gap`, and `font-size` on Safari 16.4, and nested layers under `@media` on Chrome 111 are asserted, not run. Step 1 makes them a gate.

## Steps

Each step is one pull request and stands alone. Each runs `pnpm check`, the browser project, and the parity harness against the build of its base. Each reverts as one commit.

**0. Harness.** Land the measurement before the change.
- `scripts/density-parity.ts`: the computed-style dump and diff of this plan (three configs with real levels, `FULL` detail, noise filters for animations and `useId`). It compares two built `dist/client` directories.
- The contract probes as a browser suite, `browser/density-contract.test.tsx`: the cases of the table under R3, R5, R8, R11, and R12 that no test holds today, written against the `scopeStepOf` oracle. Depth beyond 2 is `it.fails` on main.
- A restyle bench under `__benchmarks__/browser/`: a Grid of 1,000 rows under 0, 1, and 2 scopes and a slot, with mount, sort, and root switch. Record its first numbers in the bench README (CONVENTIONS §12.7).
- A Firefox and a WebKit instance for the density browser files in `vitest.browser.config.ts`, run in CI only.
- Gate: all green on main.

**1. Emitter.** Stepped utilities move to the weights. The step variants stay as they are.
- `utilities.ts` writes the base rules and one rule per class through `pick`, with the hardening above: the prefixed names, `:where()` on the root, theme-key validation of names, and `full` rejected.
- Coexistence order: the variants still write `density-0`, `-1`, `-2`, and Tailwind orders layers by first use. A new `density` layer would come first and lose to the old `density-0`, which holds `density-any`. So in this step the stepped rules go into the existing `density-0`, where one class beats `density-any`'s `:where()` and the variant rungs keep their depth layers.
- Rewrite `core/density-utilities.test.ts` to the one-rule shape, and give its fake plugin API `addBase`.
- No recipe changes. Expected docs sheet about 362 KB (31.2 KB br).
- Gate: parity 0 diffs against main; contract suite green, depth > 2 flips from `it.fails` to pass; Firefox and WebKit green; TBT and recalc at or under main on `docs:bench`.
- Rollback: revert the plugin file.

**2. Fold the variants.** The repository stops using `density-<step>:` and `density-[list]:`.
- `utility-table.ts`: `ms` and `me` take negatives; add `mx`, `touch-gap-x`, `touch-gap-y`, `pb-safe` (adds `env(safe-area-inset-bottom)`), and `space-x` (captures the group's step in a private property and applies it to the children); `w` takes container names. Wire the `cn` conflicts: `pb-safe` against `pb`, `p`, `py`; `touch-gap-*` against the arbitrary `[--touch-target-gap-*:…]`.
- Codemod 110 tokens in `kiso/dan/{gap,space}.ts` and `kata/{slider,control,sidebar-layout,avatar,dashboard,tag-input,query-chips}.ts` to 22 stepped classes, and move each new ramp into `kiso/dan` (`size-scale-boundary.test.ts`). The forms are in the prototype commit.
- Invert the pseudo-element rule of `density-native-boundary.test.ts`: it forbids a step variant in source, and it allows `before:density-…`.
- Rewrite the tests that read the old classes: `core/density-geometry.test.ts` (touch gaps), `core/cn.test.ts` (new groups; `density-w-[1,2,3]` takes names now), `layouts/sidebar.test.tsx` (selectors by `data-slot`), `recipes/safe-area-edges.test.ts`, `browser/geometry/query-density.test.tsx` (resolve the custom property through a probe width, because an unregistered property reads back as its `calc()` text). Delete `stepsOfList` with the list variant's last user.
- Known semantic edges, each with a test: a `space-x` group in another `space-x` group takes its own overlap, not the outer one; the slider thumb offset is a rem stop now, so it scales with the root font size (main used px).
- Gate: parity 0 diffs; contract suite green.

**3. Retire the rungs.** Needs assent: it removes public variants of `ui/tailwind.css`.
- Delete `rungs.ts`, the step variants, the list variant, `maxDepth`, the page-smoke depth gate, and `core/density-rungs.test.ts`. Rename `density-0` to `density`.
- Update `REFERENCE.md` (Density), `docs/CORE.md`, `docs/RECIPES.md`, `docs/LAYOUTS.md`, the TSDoc of `steps.ts`, `variants.ts`, `utilities.ts`, and `helpers/density-step.ts` (CLAUDE.md §3.4).
- The question for assent is what replaces `density-sm:shadow-sm` for a keyword. Options:
  1. Nothing. Each value that density steps is a number or a length, and a keyword step is a design smell. A consumer writes two elements, or a stepped custom property that its own class reads.
  2. Keep the rung variants as an opt-in escape hatch. An unused variant writes 0 bytes, but `rungs.ts`, `maxDepth`, and the layer-order rules stay, and a used variant brings back the rung cost.
  3. Keep them as rung variants until the floor ships style queries (Firefox 151, Safari 18), then rewrite them as `@container style(--d: N)` for descendants and pseudo-elements. A self scope still needs another form.
  This plan recommends option 1.
- Gate: parity 0 diffs; `docs:bench` and the restyle bench recorded in the pull request.

**4. Choose the form.** With the seam in place, build both forms and run the restyle bench and `docs:bench` against each other. Keep B only if it wins the restyle bench without losing load time, and then move its `@property` rules to the top level of `tailwind.css` and forbid `--d` in a `transition-property`. Otherwise delete the index form and the `DENSITY_EMIT` flag.

## Future

The seam is the migration path. Each trigger is a floor change in `.browserslistrc`, not a date.

- **`if()` in each floor engine.** `pick` writes `if(style(--d: N): v; …)`. Keywords and non-finite values become stepped values, and the step variants of option 2 or 3 can go.
- **Container style queries** (Firefox 151, Safari 18). A variant for descendants and pseudo-elements only. A query reads the nearest ancestor container, not the element, so it is wrong for a self scope. It does not replace the weights.
- **`@scope` with proximity** (Firefox 146, Safari 17.4, and Safari 26.0–26.3 drop rules on `input` and `textarea`). It gives nearest-scope-wins for any rule, but each scope rule needs its own `@scope` block, which Tailwind does not write from a variant today. The weights already give proximity for the values density needs.
- **`inherit()`** is unshipped. It would let a slot read its parent's step with no host copy.

## Costs accepted

- **Readable output.** DevTools shows `calc(var(--spacing) * (3 - 2 * var(--dxs) …))`, not a literal, and `getComputedStyle` of an unregistered weight-based custom property returns the expression. Probe tests resolve a length through a real property.
- **Ten inherited custom properties on each element.** Inheritance is a copy-on-write pointer in Chromium. Elements under different steps no longer share matched-properties cache entries, as today.
- **A density change restyles the subtree** as an inherited change, about as costly as today's rematch, and measured cheaper (305 → 107 ms).
- **`::backdrop`** does not inherit from its element before Chrome 122, so `backdrop:density-*` would read no weights on Chrome 111–121. No source uses it; a boundary test forbids it.

## Rejected

- **A build step that expands a leading `:is()`.** Rejected in the session that found this: it expanded 241 selectors, with gains within noise, because the hot forms put the `:is()` outside the leftmost compound.
- **Lowering `maxDepth` again.** The bytes grow with the square of depth, but the docs nest two deep and the matching cost stays.
- **Space toggles (E) as the default.** The same bytes as A, with a floor risk in how an invalid custom property computes, and an unset fail mode.
- **Render-time resolution and its hybrids (D).** See Candidates.
- **Progressive enhancement with `@scope` or style queries now.** The fallback carries the full cost under the floor.
