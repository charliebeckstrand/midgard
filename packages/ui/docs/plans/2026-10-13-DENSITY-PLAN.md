# Density off the Hot Path — Design Plan — 2026-10-13

**Decision.** Each density scope sets inherited custom properties that hold its step, and each stepped class becomes one rule whose value is a `calc()` of them. The rungs, the depth layers, and `maxDepth` go. The syntax of a stepped class (`density-p-[1,2,3,4,5]`) does not change. The step variants (`density-sm:`, `density-[xs,sm]:`) go in step 3. The emitted form sits behind one seam in the plugin, so a later move to `if()` changes the plugin alone.

The plan crosses `ui`, the docs, and the three apps, and step 3 removes public variants of `ui/tailwind.css`. Under CLAUDE.md §3.1 it needs assent before any step lands.

## Why

The rungs of `core/density/rungs.ts` write a selector for each depth, each root step, and each slot host, for each density class.

**Bytes.** The docs sheet is 1,289,394 B (55.3 KB brotli). The `density-0/1/2` layers are 1,065,433 B of it (83%), in 4,532 rules. The Next apps ship the same sheet as their one render-blocking `<link>`: admin 1,282,946 B (54.9 KB br), and picks and places within 0.5% of it. The docs inline a per-page subset as critical CSS, and the rungs inflate it too: `/button` 176 KB (11.7 KB br), `/slider` 263 KB (15.2 KB br).

**Matching and recalc.** No one rung is slow; the cost is the count. Chromium selector stats on a page switch at 390 px give 71 ms of matching on main, and 21 ms in a build with every rung stripped. A cold `/button` load at 4× CPU spends 89 ms in style recalc on main, and 58 ms stripped (medians of 15).

**Two facts the cost model depends on.**
- The prerendered `/button` holds 8 `data-density` attributes, all slots. A count of 1,558 `data-density=` includes the CSS text of the inline critical `<style>`. The ancestor filter rarely rejects a rung inside a scope, because it hashes attribute names and not values. The subject filter on the utility class rejects most rungs early, so the cost is the volume of class-bucket rungs (about 7,100) walked on each element that has the class, plus 70 to 76 multi-argument `:is()` wrappers within 341 universal-bucket density selectors (admin).
- The stored density is a level (`compact`, `snug`, `loose`), not a step. A harness that stores `'xs'` or `'xl'` renders `md` and checks no root step. The harness of this plan stores `compact` (root `sm`) and `loose` (root `lg`).

## The contract

Each requirement must hold after the move. The tests named hold it now. Paths are under `packages/ui/src/__tests__/` unless noted.

| # | Requirement | Held today by | Under this plan |
|---|---|---|---|
| R1 | Five steps `xs`…`xl`. Levels reach `sm`, `md`, `lg`. The root classes also cover `xs` and `xl`. An explicit `size` reaches any step; a slot reaches `xs`, never `xl`. | `core/control-step.test.ts`, `primitives/density.test.tsx` (`toInnerStep`), `providers/density.test.tsx` (`levelToStep`), `core/density-scale.test.ts`, `browser/geometry/size-steps.test.tsx` | Unchanged. `steps.ts` keeps its logic. |
| R2 | A list of 5 values, or 3 (`xs` copies `sm`, `xl` copies `lg`). Another length writes no CSS. Kinds: spacing, margin, text (line height = size + 8 px, `leading-*` wins), radius, ring (−1 px). | `core/density-utilities.test.ts`, `boundary/size-scale-boundary.test.ts`, `core/density-geometry.test.ts` | Unchanged syntax. Step 2 adds container names for `w`, negatives for `ms` and `me`, and the `add` and `capture` forms. The emitted shape changes, so `density-utilities.test.ts` asserts one rule per class. 3-value lists get their first computed test in step 0. |
| R3 | The nearest scope wins, the element itself included. No `data-[density=…]` selector. | `core/density-rungs.test.ts`, `browser/density-scope.test.tsx` (the root scope, static leaves, families), `sweeps/capabilities.test.tsx`, `boundary/density-native-boundary.test.ts`, the `browser/geometry/*-density` suites | Holds by inheritance, at any depth. The `data-[density=…]` gate stays: such a selector still has no proximity. |
| R4 | A consumer `className` wins over each density class. In `cn`, a later plain class removes the stepped class. | `browser/density-scope.test.tsx` "lets a consumer className win…", "keeps the Placeholder default height…"; `core/cn.test.ts` "stepped density classes" | A plain utility sits in `utilities`, and it outranks the nested density layer. `cn` keeps its groups for existing classes. Step 2 adds groups and conflicts for `pb-safe` and `touch-gap-*`. |
| R5 | A slot (`data-density="slot"`) is one step below the scope above it. `xs` stays `xs`, a slot in a slot steps once, a scope in a slot wins. | `browser/density-scope.test.tsx` "the relative slot scope", "a control slot in an xl scope"; JS mirror `scopeStepOf` | A slot reads the host copy of the weights, which only a real scope writes, so a slot in a slot steps once with no cycle. The slot-in-slot test, missing today, lands in step 0. |
| R6 | An explicit `size` makes the element its own scope. Portals carry the scope on their host. | `browser/density-scope.test.tsx` (explicit size), `boundary/density-native-boundary.test.ts` (context writers), `browser/floating-ui/density-portal.test.tsx`, component tests | Unchanged. The element sets its own weights and reads them. |
| R7 | `density-any` applies at each step and loses to each step and each plain class. | `browser/density-scope.test.tsx` (Placeholder) | `:where()` in the density layer: a stepped class (one class) and a plain class (outer layer) beat it. |
| R8 | A pseudo-element takes the step of its element. Today only a variant before the pseudo-element works (`density-xs:before:…`). | `browser/density-scope.test.tsx` "rounds the inset fill…", `boundary/density-native-boundary.test.ts` "no source file puts a density class after a pseudo-element variant" | Inverts. A pseudo-element inherits the weights, so a stepped class after it works (`before:density-rounded-ring-[1,1.5,2,2.5,3]`, `[&::-webkit-slider-thumb]:density-size-[2,3,4,5,6]`). The boundary test flips to forbid the step variants. |
| R9 | A stepped class works under each other variant (`*:data-[slot=icon]:`, `has-[…]:`, `group-has-[…]/control:autofill:`, responsive, `@source inline`). | `structure/breakpoint-classes.test.ts`, `structure/*` class tests, icon sizing in `density-scope.test.tsx`, `browser/item-row-density.test.tsx` | Holds. Each such class is one rule with no density-scope ancestor part. The universal bucket falls from 341 density selectors to 5. |
| R10 | First paint is correct before JS: `AppearanceScript` writes the root class, the markup is the same at each step, about 28 server components write `data-density` with no context, the docs subset compile carries each root step. | `providers/appearance.test.tsx`, `providers/ui-document.test.tsx`, `primitives/density.test.tsx` "useDensityStep", `browser/density-scope.test.tsx` "controls at the first paint" and the other first-paint blocks | The root mark stays a class, so the script, `readRootDensity`, and the observer do not change. The scope rules are base rules, which the subset compile writes with zero candidates, so each page's critical `<style>` carries them. |
| R11 | Nesting depth: `maxDepth = 2`, and a deeper scope ranks wrongly. | `browser/density-scope.test.tsx` "keeps each ranked depth…", `src/docs/__tests__/page-smoke.tsx` (depth gate of the `page-smoke*.test.tsx` files), `core/density-rungs.test.ts` | Removed. No depth limit: A and B checked to depth 5 (the scope oracle to depth 4); design E to depth 13. The page-smoke depth gate goes in step 3. |
| R12 | Two stepped classes on one property: the later rule in the sheet wins. | Shape only (`core/density-rungs.test.ts`). No computed test. | Holds: one layer, one class of specificity. A computed test lands in step 0. |
| R13 | The Next apps and the docs consume `ui/tailwind.css` unchanged. | No app test. | Holds with no app change. The 3-value forms of `apps/places/src/components/category-picker/category-options.tsx` get a computed test in `ui` in step 0. |
| R14 | The critical subset and the full sheet give the same layer order. | `rungs.ts` writes `density-0` first in each class. No test. | Steps 1 and 2 write only into existing layers. Step 3 leaves one density layer. |
| R15 | A step change does not animate. | No test. Rungs swap rules. | One-hot weights are unregistered and do not interpolate. A registered `--d` (form B) interpolates when a transition names it. |

Two deliberate changes, each with a test in step 2: a `space-x` group inside another `space-x` group takes its own overlap, not the outer one; the slider thumb offset becomes a rem stop, so it scales with the root font size (main used px).

The JS readers (`useDensityStep`, `useDensityRoot`, Grid, Calendar, Portal, the playground) read attributes and the root class, not CSS, so this plan does not touch them. Two known gaps stay out of scope: `useDensityStep` in a slot returns the host step while CSS paints one lower, and the TSDoc of `DensityProvider` and of `steps.ts` still says charts read the step.

## Candidates

Five designs were judged on correctness, performance, and migration. A and B were prototyped on the whole docs app.

| Candidate | Verdict |
|---|---|
| **A. One-hot weights** (unregistered). Each scope sets `--dxs`…`--dxl` to 0 or 1, and a host copy `--hxs`…`--hxl`. Each value is a weighted sum. | **Chosen.** Correct at any depth, no registration, no transition hazard, the lowest load recalc. |
| **B. Registered index.** `@property --d { syntax: '<integer>'; inherits: true }` and a host copy. Each value is a hinge `a + b·d + Σ c·max(0, d − k)`. | Runner-up. Load numbers tie with A. It is 9 KB smaller raw (0.2 KB br), and it restyles a root density switch 2.4× faster on a synthetic page. A registered `--d` interpolates when a transition names it. The seam keeps it possible. |
| **E. Token toggles** (space toggles: the held step is `initial`, the others empty, and values select by `var()` fallback). | Third, though the judges scored it highest on average. The same bytes as A, and keyword values too. Its slot rule depends on what an invalid custom property computes to, and an older reading of the spec inherits the parent's value there, which breaks the slot. A failure leaves a property unset, not `md`. |
| **C. Modern CSS**: `@scope` with proximity, container style queries, `if()`, `@function`, `inherit()`. | The end state, not now. Above the floor: `@scope` Firefox 146 and Safari 26.4 (17.4 ships it; 26.0–26.3 drop rules on `input` and `textarea`); style queries Firefox 151 and Safari 18; `if()` Chrome 137 only; `inherit()` unshipped. Under the floor the fallback keeps all its cost, so progressive enhancement saves nothing. A style query reads an ancestor, so it is wrong for a self scope. |
| **D. Render time**: React context writes the stepped class. Hybrids of root rules and per-scope classes. A build step that rewrites the rungs. | Rejected. The prerendered shell serves each user, and the root step lives in `localStorage`, so a JS step paints `md` and jumps after hydration (the contract of #1539: no number in JS picks what the shell paints). About 28 server components write `data-density` with no context. The hybrid kept the rungs and `maxDepth` and measured 537 KB. |

### The rungs.ts objection

`rungs.ts` rejects custom properties because they "move the styles out of the Tailwind classes". In this design they do not. Each class still carries its own declarations and its own values: `.density-p-[1,2,3,4,5]{padding:calc(var(--spacing) * (3 - 2 * var(--dxs) - var(--dsm) + var(--dlg) + 2 * var(--dxl)))}`. A scope publishes only which step it holds, which `data-density` already does. `cn`, `defineScale`, and the literals in `kiso/dan` do not change. #1539 gave the real blocker as "where the step is resolved, not where the styles live", and the step still resolves in CSS from the attribute and the root class.

## The mechanism

**Scopes**, in `@layer base`, written by `addBase` from `steps.ts`, so they cannot drift from `densitySteps`, `rootDensityClasses`, and `slotStep`:

```css
:where(:root) { --dxs:0; --dsm:0; --dmd:1; --dlg:0; --dxl:0; --hxs:0; --hsm:0; --hmd:1; --hlg:0; --hxl:0 }
:where(:root.density-root-sm), [data-density=sm] { --dxs:0; --dsm:1; --dmd:0; --dlg:0; --dxl:0; --hxs:0; --hsm:1; … }
/* xs, lg, xl likewise; [data-density=md] resets to md */
[data-density=slot] { --dxs:calc(var(--hxs) + var(--hsm)); --dsm:var(--hmd); --dmd:var(--hlg); --dlg:var(--hxl); --dxl:0 }
```

A slot never writes the host copy, so a slot in a slot reads the same host. `:where()` on the root lets `<html data-density>` win over the root class, as it does today; `:root.density-root-*` at (0,2,0) would invert that. The `:where(:root)` default must come before each root-class rule, because both have zero specificity. Step 1 fixes the names with a prefix (`--ui-d<step>` and `--ui-h<step>`, or a `--_d…` form to match `--_density-space-x`), because the weights inherit into each consumer element, and a consumer `--dmd` would change density silently.

**Stepped utilities**: one rule per class in a nested layer of `utilities`. The emitter writes the most frequent value as a base and adds a term for each step that differs, grouped by equal delta. It falls back to the exact `Σ v·w` when the base form is not exact in double precision. Text keeps `line-height: var(--tw-leading, calc(<size sum> + .5rem))`. Ring forms subtract one `- 1px`. Names (`--text-*`, `--radius-*`, `--container-*`) weight their `var()`.

**`density-any`** is `:where(&)` in the same layer.

**The seam.** All value emission goes through `pick(kind, valuesByStep)`. A and B differ only there and in the base rules. When the floor ships `if()`, `pick` writes `if(style(--d: N): …)`, which also takes keywords and values that are not finite.

**What one-hot cannot express.** A weighted sum takes numbers and lengths only.
- `infinity * 0` is NaN, so `full` is not a radius name in a ramp; it writes no CSS. Main already breaks here: its `md` rung reads the undefined `var(--radius-full)` and paints 0 px.
- One unknown name (`density-w-[auto,xs,sm]`) invalidates the whole sum, so the property is unset at each step. The plugin checks each name against the theme keys and writes no CSS for an unknown one.
- A keyword (`display`, `box-shadow`, `flex-direction`) cannot be stepped. See Keyword steps.

## Measured evidence

The prototype was one commit over `main` (13 files), kept out of the repository because its old-shape tests were not rewritten. It implemented A and B behind `DENSITY_EMIT`, converts each step variant in the repository to a stepped class, and keeps `density-any`. It does not have the hardening of the mechanism above (prefix, `:where()` root, theme-key check); the figures below are for the prototype form. All runs: Chromium 141, docs built with `pnpm turbo run docs:build --filter=ui`.

### Bytes (brotli q11)

| | main | A | B | Every rung stripped |
|---|---|---|---|---|
| Docs full sheet | 1,289,394 / 55,266 | 274,989 / 27,545 | 265,779 / 27,376 | 251,800 / 26,515 |
| Density layers | 1,065,433 / 31,522, 4,532 rules | 50,311 / 3,660, 304 rules | 41,413 / 3,506, 304 rules | 0 |
| Scope base rules (raw) | — | 1,489 | 908 | — |
| `/button` critical | 176,336 / 11,728 | 41,396 / 7,240 | 40,368 / 7,168 | 37,500 / 6,880 |
| `/input` critical | 222,006 / 13,055 | 44,297 / 7,673 | 43,291 / 7,599 | 40,192 / 7,289 |
| `/slider` critical | 262,853 / 15,211 | 57,556 / 8,682 | 56,008 / 8,612 | 52,640 / 8,307 |
| admin sheet (render-blocking) | 1,282,946 / 54,929 | 270,705 / 26,908 | 261,485 / 26,616 | — |

picks and places match admin within 0.8%. A `next build` of admin in A mode shipped 274,400 B; its density layer is byte-identical to the direct compile.

### Selector buckets (density rules, admin)

| | selectors | class | attr | tag | universal |
|---|---|---|---|---|---|
| main | 8,389 | 7,107 | 934 | 7 | 341 |
| A and B | 309 | 265 | 32 | 7 | 5 |

### Runtime (390 px, mobile emulation)

| | main | A | B | stripped |
|---|---|---|---|---|
| Cold `/button` at 4× CPU, style recalc (`RecalcStyleDuration`), median of 15 interleaved | 89 ms | 58 ms | 65 ms | 58 ms |
| — TBT (range) | 147 ms (116–284) | 82 ms (34–210) | 113 ms (79–274) | 104 ms (45–189) |
| — FCP | 244 ms | 216 ms | 224 ms | 208 ms |
| Page switch, selector matching (selector stats, 3 runs) | 71 ms | 23 ms | 21 ms | 21 ms |
| Search open, selector matching | 65 ms | 22 ms | 22 ms | 25 ms |
| Root density switch, style + layout, synthetic 28k elements, no throttle | 305 ms | 107 ms | 44 ms | — |
| Event Timing at 4× CPU, median of 15: open nav / page switch / open search / type | 296 / 176 / 280 / 64 | 280 / 184 / 280 / 64 | 296 / 200 / 288 / 64 | 272 / 176 / 272 / 64 |

A matches the stripped build on recalc, and A and B match it on matching. B's recalc is 7 ms over. The TBT ranges overlap, so TBT does not rank A against B. The Event Timing rows do not separate the builds at 15 runs, not even the stripped build from main: React rendering dominates those interactions. The change shows at load, in recalc, in matching, and on a density switch, not as a lower INP. Selector-stats tracing inflates `UpdateLayoutTree` by an amount not measured here, so the recalc row comes from runs with no tracing.

### Correctness

- **Whole docs app, computed style.** Each element and its `::before` and `::after`, each property but custom properties and animations, on each of 152 pages, in light `md` at 390 px, dark root `sm` at 390 px, and light root `lg` at 1280 px: about 129,000 element states for each config, for A and for B. Result: 0 unexplained diffs. Each flagged row reran clean or came from main's own noise: a late toast region, running chart animations, React `useId` in `url(#…)`, and `/modules/grid/virtualization`, where main against main differs.
- **Contract probes.** 274 synthetic cases against a copy of `scopeStepOf`: root swaps at run time, depth 3 to 5, slot in slot under each host, `xs` and `xl` slots, explicit size in a slot, consumer override of each converted form, `::before` and `::-webkit-slider-thumb` at each step and in slots, capture semantics, 3-value lists, R12, `density-any`, hover, focus, autofill, the `2xl` safelist at 1536 px, bad values, and transitions. A and B match the oracle or main on all 274; B's 4 rows with an explicit `transition: --d` interpolate. Main fails beyond `maxDepth` and on `full` in a radius ramp.
- **Refutation pass.** 59,925 class × scope states against main within depth 2, again at a 13.37 px root font size, and B with its `@property` rules stripped: 0 diffs each time.
- **Repo gates on the prototype.** Biome, `check-types`, `test:workspace`, and `test:docs-build` (166 tests: bundle budget, axe, hydration) pass. 23 unit tests in 7 files fail, `density-utilities.test.ts` fails at import, the browser project fails 3 tests in `query-density.test.tsx`, and Knip flags `stepsOfList`, so `pnpm check` is red. Each failure asserts the old shape or the old syntax; step 2 lists the rewrites. No regression in behavior.
- **Not verified.** Only Chromium ran. Firefox and WebKit (`::-moz-range-*`, `calc(var() * n)` in `border-radius`, `gap`, and `font-size`) run in step 1 on current engines. The floor engines (Chrome 111, Firefox 128, Safari 16.4) stay asserted from the specs: no step runs them. The parity harness opens no overlay and forces no state, so the contract suite covers those cases.

## Steps

Each step is one pull request on the step before it. Each runs `pnpm check`, the browser project, and the parity harness against the build of its base. Each reverts as its squash commit, in reverse order.

**0. Harness.** Land the measurement before the change.
- `scripts/density-parity.ts`: the computed-style dump and diff of this plan. It compares two built `dist/client` directories in three configs with real levels, with a detail mode, noise filters for animations and `useId`, one automatic rerun of each flagged page, and a written exclusion list (`/modules/grid/virtualization`, the late toast region).
- `browser/density-contract.test.tsx`, against the `scopeStepOf` oracle: each case of R3, R5, R8, R11, and R12 that no test holds today; slot in slot; `<html class="density-root-sm" data-density="lg">` resolves `lg`; the 3-value lists of the docs sidebar (`density-px-ring-[1.5,2,2.5]`) and of `category-options.tsx` (`density-w-[3,4,5]`, `density-me-ring-[2.5,3,3.5]`); the open dialog panel at 390 px at each root step and in a scope (`density-pb-[4,5,6,7,8]` with the `max-sm:` safe-area inset on one element). Depth beyond 2 and a stepped class after a pseudo-element are `it.fails` on main.
- A restyle bench under `__benchmarks__/browser/`: a Grid of 1,000 rows under 0, 1, and 2 scopes and a slot, with mount, sort, and root switch, and `RecalcStyleDuration`. It records its first numbers in the bench README (CONVENTIONS §12.7). It also measures the matched-properties-cache effect asserted under Costs.
- Firefox and WebKit: `.github/actions/playwright` installs and caches them, and `vitest.browser.config.ts` gets an instance of each for the density files. A file that does not apply to an engine (a WebKit-only pseudo-element) skips it with the reason.
- Gate: all green on main, in each engine.

**1. Emitter.** Stepped utilities move to the weights. The step variants stay.
- `utilities.ts` writes the base rules and one rule per class through `pick`, with the hardening: the prefixed names, `:where()` on the root, theme-key validation, and `full` rejected. A unit test asserts that the `:where(:root)` default comes before each root-class rule.
- Only the one-hot form ships. The index form waits for step 4.
- Coexistence order: the variants still write `density-0`, `-1`, and `-2`, and Tailwind orders layers by first use. A new layer would come first and lose to the old `density-0`, which holds `density-any`. So in this step the stepped rules go into `density-0`, where one class beats the `:where()` of `density-any`, and the variant rungs keep their depth layers. Design E verified this order; this step builds it for A and runs the contract suite on it.
- One overlap exists while both systems live: the panel inset of the dialog, drawer, and sheet holds `density-pb-[4,5,6,7,8]` and the `max-sm:density-<step>:pb-[…]` safe-area variants on one element. In `density-0` the `md` rung of the variant and the stepped class have equal specificity, so sheet order decides. The step 0 dialog test holds it. A boundary test forbids any other class string with a stepped class and a step variant on one property until step 2.
- A boundary test forbids `backdrop:density-*`: `::backdrop` does not inherit from its element before Chrome 122.
- Rewrite `core/density-utilities.test.ts` to the one-rule shape, and give its fake plugin API `addBase`.
- No recipe changes. Expected docs sheet about 363 KB (about 31 KB br): A's coexistence build in a new layer measured 363,533 B, and E's in `density-0` measured 362,196 B; A in `density-0` is not measured yet.
- Gate: parity 0 diffs; contract suite green, and depth beyond 2 flips from `it.fails` to pass; Firefox and WebKit green; density layer bytes, cold `/button` recalc (median of 15), and page-switch selector matching each at or under main. TBT is recorded, not gated: its spread is wider than the effect.

**2. Fold the variants.** The repository stops using `density-<step>:` and `density-[list]:`.
- `utility-table.ts`: `ms` and `me` take negatives; add `mx`, `touch-gap-x`, `touch-gap-y`, `pb-safe` (adds `env(safe-area-inset-bottom)`), and `space-x` (captures the group's step in a private property and applies it to the children); `w` also takes container names. Wire the `cn` conflicts: `pb-safe` against `pb`, `p`, and `py`; `touch-gap-*` against the arbitrary `[--touch-target-gap-*:…]`. Until then, a plain arbitrary `--touch-target-gap-*` class wins over a later stepped class.
- Codemod the 108 step-variant tokens in `kiso/dan/{gap,space}.ts` and `kata/{slider,control,sidebar-layout,avatar,dashboard,tag-input,query-chips}.ts` to 22 stepped classes, and move each new ramp into `kiso/dan` (`size-scale-boundary.test.ts`). `density-any` stays. The forms below matched main in the prototype's Chromium parity run; the `::-moz-range-*` forms have not run:

  | Today | After |
  |---|---|
  | `density-<step>:[--touch-target-gap-x:--spacing(n)]`, five per ramp (`dan/gap.ts`, `tag-input`, `query-chips`) | `density-touch-gap-x-[n1,…,n5]`, and `-y` likewise |
  | `density-<step>:[&::-webkit-slider-thumb]:size-n` and the track and `::-moz-range-*` forms (`slider`) | `[&::-webkit-slider-thumb]:density-size-[2,3,4,5,6]`, `[&::-webkit-slider-thumb]:density-mt-[-0.75,-1,-1.25,-1.5,-1.75]`, `[&::-webkit-slider-runnable-track]:density-h-[0.5,1,1.5,2,2.5]`, and the `::-moz-range-*` forms likewise |
  | `density-<step>:before:rounded-ring-n` (`control`) | `before:density-rounded-ring-[1,1.5,2,2.5,3]` |
  | `density-[xs,sm]:w-2xs density-md:w-xs density-[lg,xl]:w-sm` and `…:start-72/80/96` (`sidebar-layout`) | `density-w-[2xs,2xs,xs,sm,sm]`, `density-inset-s-[72,72,80,96,96]` |
  | `density-[…]:-space-x-0.5` / `-1` (`avatar`) | `density-space-x-[-0.5,-0.5,-1,-1,-1]` |
  | `**:data-[variant=bare]:not-data-has-label:density-<step>:-mx-n` (`dashboard`) | `**:data-[variant=bare]:not-data-has-label:density-mx-[-0.75,-1,-1.25,-1.5,-1.75]` |
  | `max-sm:density-<step>:pb-[calc(nrem+env(safe-area-inset-bottom))]` (`dan/space.ts`) | `max-sm:density-pb-safe-[4,5,6,7,8]` |
- Invert the pseudo-element rule of `density-native-boundary.test.ts`: it forbids a step variant in source, and it allows `before:density-…`.
- Rewrite the tests that read the old classes: `core/density-geometry.test.ts` (touch gaps); `core/cn.test.ts` (the new groups); `layouts/sidebar.test.tsx` (select by `data-slot`); `recipes/safe-area-edges.test.ts`; `browser/geometry/query-density.test.tsx` (resolve the custom property through a probe width, because an unregistered property reads back as its `calc()` text). Add the tests of the two deliberate changes under the contract table.
- Gate: parity 0 diffs; contract suite green.

**3. Retire the rungs.** It removes public variants of `ui/tailwind.css`. No variant replaces them for a keyword (Keyword steps).
- Delete `rungs.ts`, the step variants, the list variant and `stepsOfList`, `maxDepth`, the page-smoke depth gate, and `core/density-rungs.test.ts`. Rename `density-0` to `density`.
- Update `REFERENCE.md` (Density, and drop the `density-sm:shadow-sm` example), `docs/CORE.md`, `docs/RECIPES.md`, `docs/LAYOUTS.md`, the TSDoc of `steps.ts`, `variants.ts`, and `utilities.ts`, and `__tests__/helpers/density-step.ts` (CLAUDE.md §3.4).
- Gate: parity 0 diffs; the restyle bench and `docs:bench` recorded in the pull request.

**4. Drop the index form.** Delete the index form and the `DENSITY_EMIT` flag. Reopen B only if the step 0 restyle bench shows a root switch past the frame budget under A. If B is kept, its `@property` rules move to the top level of `tailwind.css`, `DENSITY_EMIT` enters the env of `test:browser` and each app build, and a boundary test forbids `--d` in a `transition-property`.

## Keyword steps

Once the variants go, nothing steps a keyword (`density-sm:shadow-sm` in `REFERENCE.md` today). No source in the repository uses a step variant for a keyword. A consumer adds a stepped entry to `utility-table.ts` for a numeric value, or reads the step in JS with `useDensityStep`, which paints `md` before hydration. `if()` in each floor engine makes keywords stepped values with no variant (Future).

Rejected: keeping the rung variants as an opt-in escape hatch (it keeps `rungs.ts`, `maxDepth`, and the layer-order rules, and a used variant brings back the rung cost), and keeping them until the floor ships style queries (a query reads an ancestor, so a self scope still needs another form).

## Future

The seam is the migration path. Each trigger is a floor change in `.browserslistrc`, not a date.

- **`if()` in each floor engine.** `pick` writes `if(style(--d: N): v; …)`. Keywords and values that are not finite become stepped values.
- **Container style queries** (Firefox 151, Safari 18). A variant for descendants and pseudo-elements only. A query reads the nearest ancestor container, not the element, so it is wrong for a self scope. It does not replace the weights.
- **`@scope` with proximity** (Firefox 146, Safari 26.4). It gives nearest-scope-wins for any rule, but each scope rule needs its own `@scope` block, which Tailwind does not write from a variant today. The weights already give proximity for the values that density needs.
- **`inherit()`** is unshipped. It would let a slot read its parent's step with no host copy.

## Costs accepted

- **Readable output.** DevTools shows `calc(var(--spacing) * (3 - 2 * var(--dxs) …))`, not a literal. `getComputedStyle` of an unregistered custom property returns its expression, so a probe test resolves a length through a real property.
- **Ten inherited custom properties on each element.** Inheritance is a copy-on-write pointer in Chromium. Elements under different steps do not share matched-properties cache entries, as today (asserted from the source; the step 0 bench measures it).
- **A density change restyles the subtree** as an inherited change. It measured about 3× cheaper than today on a synthetic page (305 → 107 ms).
- **`backdrop:density-*`** reads no weights on Chrome 111–121. No source uses it, and step 1 forbids it.

## Rejected

- **A build step that expands a leading `:is()`.** An earlier experiment expanded 241 selectors, with gains within noise, because the hot forms put the `:is()` outside the leftmost compound, where expansion is not equivalent.
- **Lowering `maxDepth` again.** The bytes grow with the square of depth, but the docs nest two deep, and the matching cost stays.
- **Space toggles (E) as the default.** The same bytes as A, a floor risk in how an invalid custom property computes, and an unset fail mode.
- **Render-time resolution and its hybrids (D).** See Candidates.
- **Progressive enhancement with `@scope` or style queries now.** The fallback carries the full cost under the floor.
