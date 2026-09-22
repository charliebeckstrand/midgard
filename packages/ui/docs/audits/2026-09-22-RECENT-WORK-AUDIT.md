# Recent-work audit — 2026-09-22

> **A correctness and cleanliness sweep of the work that landed from 2026-09-20 to 2026-09-22.** The window holds 28 commits, #1152 to #1177. Six reviewers each read one scope, and they raised 51 findings: 2 high, 11 medium, and 38 low. Four more rows sit outside the window.

This is a living record. Resolve each row in place, against the pull request that closes it ([`CONVENTIONS.md`](../../../../CONVENTIONS.md) §12.4).

Rows cite a symbol, not a line, because a line number goes stale at the next edit.

## Scope

The window is `5c75a88^..06fa6a4`. It opens after the July and August audits closed on 2026-09-15 and 2026-09-16. Each scope took an explicit commit list, and each file in the window belongs to one scope.

| Scope | Theme | Commits | Rows |
|---|---|---|---|
| `MENU` | Menu, Popover, the floating reference, scroll overflow, roving | #1168 to #1171, #1173, #1174 (runtime) | 4 |
| `BENCH` | the benchmark suite, Sparkline | #1168 to #1170, #1172 to #1177 (benches and READMEs) | 10 |
| `DOCS` | docs-engine code derivation, the comment-reference gate | #1166, #1167 | 10 |
| `SRC` | runtime and harness edits inside the test-architecture steps | #1152, #1156, #1162, #1168 (date picker, listbox) | 7 |
| `TESTS` | test-suite changes of the test-architecture steps | #1152, #1155, #1157 to #1159, #1162, #1164 | 9 |
| `TOOL` | lint, CI, and dependency configuration | #1122, #1153, #1156, #1160, #1161, #1164, #1165, `688a71d` | 11 |
| **total** | | **28** | **51** |

## Method

Each reviewer read the diffs of its scope, each changed file in full, and each commit message. Each reviewer applied two lenses.

- **Correctness.** A concrete trigger with an observable wrong result, a regression against the parent commit, a claim that the code does not keep, or a test that passes vacuously.

- **Cleanliness.** Dead code, a stale or false comment, duplication, drift from `CONVENTIONS.md`, or a design larger than its problem.

Format and naming taste stay out of scope, because Biome owns the format. A wish for a test or a document is not a finding.

Each finding needed a run or a closed trace. A run is a throwaway test, a mutation of the unit under test, a lint probe, or a Renovate dry run. Each probe file was deleted after its run. The `Verdict` cell reads `CONFIRMED` for a proven row and `PLAUSIBLE` for a traced row.

The caller verified seven of the thirteen high and medium rows again. TOOL-01 and TOOL-06 were proven by a lint probe and a Turbo dry run, and BENCH-01 by a trace of `inCorridor`. MENU-01 was checked against the `useClick` source in `@floating-ui/react` 0.27.19. SRC-01 was checked by a read of the effect, TESTS-01 by a grep, and DOCS-01 against the parent of #1166. TESTS-02, BENCH-02, and TOOL-02 to TOOL-05 carry the reviewer's proof alone.

The mechanical checks at `06fa6a4` came back clean. `biome check .` reports no diagnostic over 2,363 files. `knip` reports nothing, and `tsc --noEmit` passes in all five packages. The jsdom suite passes, 7,019 tests in 501 files. The browser suite did not run in full.

## Findings

The `Status` cell takes `◯ OPEN` for a row with no fix, `◐ FIXED` for a fix on a branch, and `✅ RESOLVED ([#NNN](https://github.com/charliebeckstrand/midgard/pull/NNN))` for a merged row.

| Row | File | Symbol | Lens | Severity | Verdict | Status |
|---|---|---|---|---|---|---|
| `TOOL-01` | `packages/*/package.json`, `apps/*/package.json` | the `lint` script | correctness | high | CONFIRMED | ✅ RESOLVED ([#1179](https://github.com/charliebeckstrand/midgard/pull/1179)) |
| `BENCH-01` | `packages/ui/src/__benchmarks__/browser/menu-pointer.bench.tsx` | the travel-test rung (`openCorridor`) | correctness | high | CONFIRMED | ✅ RESOLVED ([#1186](https://github.com/charliebeckstrand/midgard/pull/1186)) |
| `MENU-01` | `packages/ui/src/hooks/use-floating-reference.ts` | `useDeferredFloatingReference` | correctness | medium | CONFIRMED | ✅ RESOLVED ([#1181](https://github.com/charliebeckstrand/midgard/pull/1181)) |
| `SRC-01` | `packages/ui/src/modules/grid/grid-pagination.tsx` | `GridPagination` (focus restore) | correctness | medium | CONFIRMED | ✅ RESOLVED ([#1182](https://github.com/charliebeckstrand/midgard/pull/1182)) |
| `TESTS-01` | `packages/ui/src/__tests__/boundary/test-isolation-boundary.test.ts` | `NULLABLE_CAST` | correctness | medium | CONFIRMED | ✅ RESOLVED ([#1185](https://github.com/charliebeckstrand/midgard/pull/1185)) |
| `TESTS-02` | `packages/ui/src/__tests__/components/breadcrumb.test.tsx` | the current-link case | correctness | medium | CONFIRMED | ✅ RESOLVED ([#1185](https://github.com/charliebeckstrand/midgard/pull/1185)) |
| `DOCS-01` | `packages/ui/src/docs/engine/plugins/collect-helpers.ts` | `collectHelpers` | correctness | medium | CONFIRMED | ◯ OPEN |
| `BENCH-02` | `packages/ui/src/__benchmarks__/browser/menu-keyboard.bench.tsx` | the one-letter typeahead rung | correctness | medium | CONFIRMED | ✅ RESOLVED ([#1186](https://github.com/charliebeckstrand/midgard/pull/1186)) |
| `TOOL-02` | `biome.json` | the `hooks`, `primitives`, and `kiso` layer rules | correctness | medium | CONFIRMED | ◐ FIXED |
| `TOOL-03` | `renovate.json` | the `@floating-ui/react` approval rule | correctness | medium | CONFIRMED | ◯ OPEN |
| `TOOL-04` | `.github/dependabot.yml`, `renovate.json` | npm security updates | correctness | medium | PLAUSIBLE | ◯ OPEN |
| `TOOL-05` | `pnpm-workspace.yaml` | `overrides` | correctness | medium | CONFIRMED | ◯ OPEN |
| `TOOL-06` | `turbo.json` | `lint.inputs` | correctness | medium | CONFIRMED | ✅ RESOLVED ([#1179](https://github.com/charliebeckstrand/midgard/pull/1179)) |
| `MENU-02` | `packages/ui/src/hooks/a11y/use-a11y-roving.ts` | `setVirtualActiveElement` | correctness | low | CONFIRMED | ✅ RESOLVED ([#1181](https://github.com/charliebeckstrand/midgard/pull/1181)) |
| `MENU-03` | `packages/ui/src/hooks/use-floating-reference.ts` | `useDeferredFloatingReference` (TSDoc) | cleanliness | low | CONFIRMED | ✅ RESOLVED ([#1181](https://github.com/charliebeckstrand/midgard/pull/1181)) |
| `MENU-04` | `packages/ui/src/__tests__/browser/menu-scroll-overflow.test.tsx` | the gate comment | cleanliness | low | CONFIRMED | ✅ RESOLVED ([#1181](https://github.com/charliebeckstrand/midgard/pull/1181)) |
| `BENCH-03` | `packages/ui/src/__benchmarks__/browser/README.md` | §Menus figures | cleanliness | low | CONFIRMED | ✅ RESOLVED ([#1186](https://github.com/charliebeckstrand/midgard/pull/1186)) |
| `BENCH-04` | `packages/ui/src/__benchmarks__/browser/README.md`, `menu-shell.bench.tsx` | the overflow-gate prose | cleanliness | low | CONFIRMED | ✅ RESOLVED ([#1186](https://github.com/charliebeckstrand/midgard/pull/1186)) |
| `BENCH-05` | `packages/ui/src/__benchmarks__/browser/menu-open.bench.tsx` | `FLOOR_ROWS` | cleanliness | low | CONFIRMED | ✅ RESOLVED ([#1186](https://github.com/charliebeckstrand/midgard/pull/1186)) |
| `BENCH-06` | `packages/ui/src/__benchmarks__/browser/README.md` | lever 2 | cleanliness | low | PLAUSIBLE | ✅ RESOLVED ([#1186](https://github.com/charliebeckstrand/midgard/pull/1186)) |
| `BENCH-07` | `packages/ui/src/__benchmarks__/fixtures.ts` | `MENU_ROWS` | cleanliness | low | CONFIRMED | ✅ RESOLVED ([#1186](https://github.com/charliebeckstrand/midgard/pull/1186)) |
| `BENCH-08` | `packages/ui/src/__benchmarks__/menu.bench.tsx` | the submenus describe | cleanliness | low | CONFIRMED | ✅ RESOLVED ([#1186](https://github.com/charliebeckstrand/midgard/pull/1186)) |
| `BENCH-09` | `packages/ui/src/components/sparkline/sparkline.tsx` | the geometry memo | correctness | low | CONFIRMED | ✅ RESOLVED ([#1186](https://github.com/charliebeckstrand/midgard/pull/1186)) |
| `BENCH-10` | `packages/ui/docs/audits/2026-09-13-BUG-AUDIT.md` | the Q2 settlement | cleanliness | low | CONFIRMED | ✅ RESOLVED ([#1186](https://github.com/charliebeckstrand/midgard/pull/1186)) |
| `DOCS-02` | `packages/ui/src/__tests__/boundary/comment-reference-boundary.test.ts` | `extractComments` | correctness | low | CONFIRMED | ◯ OPEN |
| `DOCS-03` | `packages/ui/src/__tests__/boundary/comment-reference-boundary.test.ts` | `CITATION` | correctness | low | CONFIRMED | ◯ OPEN |
| `DOCS-04` | `packages/ui/src/__tests__/boundary/comment-reference-boundary.test.ts` | the citation lookbehind | correctness | low | CONFIRMED | ◯ OPEN |
| `DOCS-05` | `packages/ui/src/__tests__/boundary/comment-reference-boundary.test.ts` | `declaredName` | correctness | low | CONFIRMED | ◯ OPEN |
| `DOCS-06` | `packages/ui/src/docs/engine/plugins/collect-helpers.ts` | `returnsJsx` | correctness | low | CONFIRMED | ◯ OPEN |
| `DOCS-07` | `packages/ui/src/__tests__/boundary/comment-reference-boundary.test.ts` | the gate comment | cleanliness | low | CONFIRMED | ◯ OPEN |
| `DOCS-08` | `packages/ui/src/__tests__/docs/demo-code-block.test.ts` | the helper-tag check | correctness | low | CONFIRMED | ◯ OPEN |
| `DOCS-09` | `packages/ui/src/docs/demos/components/password-strength.tsx` | the demo rename | cleanliness | low | CONFIRMED | ◯ OPEN |
| `DOCS-10` | `packages/ui/src/docs/engine/derive-code/internals.ts` | `resolveTypeIn` (TSDoc) | cleanliness | low | CONFIRMED | ◯ OPEN |
| `SRC-02` | `packages/ui/src/modules/grid/engine/grid-table/views.ts` | `buildPaginationView` | correctness | low | CONFIRMED | ✅ RESOLVED ([#1182](https://github.com/charliebeckstrand/midgard/pull/1182)) |
| `SRC-03` | `packages/ui/src/__tests__/modules/grid-pagination.test.tsx` | the double-click comment | correctness | low | CONFIRMED | ✅ RESOLVED ([#1182](https://github.com/charliebeckstrand/midgard/pull/1182)) |
| `SRC-04` | `packages/ui/src/hooks/use-truncation.ts` | `__resetTruncationObserver` | correctness | low | CONFIRMED | ✅ RESOLVED ([#1185](https://github.com/charliebeckstrand/midgard/pull/1185)) |
| `SRC-05` | `packages/ui/src/__tests__/setup/index.ts`, `helpers/reset-singletons.ts` | the reset comments | cleanliness | low | CONFIRMED | ✅ RESOLVED ([#1185](https://github.com/charliebeckstrand/midgard/pull/1185)) |
| `SRC-06` | `packages/ui/src/__tests__/helpers/reset-singletons.ts`, `helpers/residue.ts`, `packages/ui/vitest.browser.config.ts` | audit names in code | cleanliness | low | CONFIRMED | ✅ RESOLVED ([#1185](https://github.com/charliebeckstrand/midgard/pull/1185)) |
| `SRC-07` | `packages/ui/src/recipes/kiso/index.ts` | `IconSize` | cleanliness | low | CONFIRMED | ◯ OPEN |
| `TESTS-03` | `packages/ui/src/__tests__/hooks/use-scroll-overflow.test.tsx` | the child-list case | correctness | low | CONFIRMED | ✅ RESOLVED ([#1185](https://github.com/charliebeckstrand/midgard/pull/1185)) |
| `TESTS-04` | `packages/ui/src/__tests__/modules/grid-export-csv.test.ts` | the signed-number property | correctness | low | CONFIRMED | ✅ RESOLVED ([#1185](https://github.com/charliebeckstrand/midgard/pull/1185)) |
| `TESTS-05` | `packages/ui/src/__tests__/sweeps/capabilities.test.tsx` | the teeth checks | correctness | low | CONFIRMED | ✅ RESOLVED ([#1185](https://github.com/charliebeckstrand/midgard/pull/1185)) |
| `TESTS-06` | `packages/ui/src/__tests__/boundary/test-isolation-boundary.test.ts` | `LOOSE_VIEWPORT` | correctness | low | CONFIRMED | ✅ RESOLVED ([#1185](https://github.com/charliebeckstrand/midgard/pull/1185)) |
| `TESTS-08` | `packages/ui/src/__tests__/modules/grid-column-groups.test.ts` | the `collapsedHiddenIds` oracle | cleanliness | low | CONFIRMED | ✅ RESOLVED ([#1185](https://github.com/charliebeckstrand/midgard/pull/1185)) |
| `TESTS-09` | `packages/ui/src/__tests__/browser/floating-ui/grid-cell-truncate-tooltip.test.tsx` | the negative cases | cleanliness | low | CONFIRMED | ✅ RESOLVED ([#1185](https://github.com/charliebeckstrand/midgard/pull/1185)) |
| `TESTS-10` | `packages/ui/src/__tests__/helpers/residue.ts` | the header, `guardResidue` | cleanliness | low | CONFIRMED | ✅ RESOLVED ([#1185](https://github.com/charliebeckstrand/midgard/pull/1185)) |
| `TOOL-07` | `biome-plugins/no-camel-case-data-slot.grit` | the template-literal form | correctness | low | CONFIRMED | ◯ OPEN |
| `TOOL-08` | `biome.json` | the two plugin excludes | correctness | low | CONFIRMED | ◯ OPEN |
| `TOOL-09` | `packages/ui/docs/RECIPES.md`, `packages/ui/vitest.config.ts` | tooling prose | cleanliness | low | CONFIRMED | ◯ OPEN |
| `TOOL-10` | `.github/workflows/ci.yml`, `README.md` | the commit gate | correctness | low | PLAUSIBLE | ◯ OPEN |
| `TOOL-11` | `turbo.json`, `pnpm-workspace.yaml` | `$schema`, `minimumReleaseAgeExclude` | cleanliness | low | CONFIRMED | ◯ OPEN |

TESTS-07 and TOOL-07 found the same defect, so the table keeps it once as TOOL-07.

## High

**TOOL-01 — CI applies no `packages/ui` override of Biome.** Each package `lint` script ran `biome check --config-path=../.. .`. With that flag, Biome matches each override's `includes` against a path relative to the package, such as `src/hooks/x.ts`. No `packages/ui/**` glob matches that path. So CI's `turbo run lint` applied none of the eleven `packages/ui` overrides: the seven layer-import rules, the three GritQL plugins, and the complexity override. #1152 and #1164 moved eight boundary tests into those overrides, so the move took their rules out of CI. Only the Lefthook `pre-push` hook ran them, from the root.

A probe under `components/` imported `createContext` from `react`, imported the `kiso` barrel, and declared a `dataSlot` key. The package run passed it, and the root run failed it with three errors. Without the flag, Biome finds the root `biome.json` itself and matches the globs from the root. Fix: drop the flag from each package script, which covers `lint`, `lint:fix`, and `format`. `lint:fix` had the same fault as `lint`.

**BENCH-01 — The travel-test rung never runs the travel test.** `openCorridor` hovers the submenu parent open at its centre, and the sweep then visits the sibling rows at the same x. `inCorridor` computes a progress of 0 on the first arrival and returns false, so `hoverRow` closes the submenu. Each later arrival returns early, because no submenu is open. A Chromium probe counted one rect read in the first pass and none in the second, with `aria-expanded="false"` after the settle.

The README's claim that the travel triangle is free (0.327 ms against 0.324 ms) therefore compares a plain sweep with itself. Fix: send arrivals that stay inside the corridor, or open the submenu again in a setup for each iteration. Measure again, then correct the README.

## Medium

**MENU-01 — A deferred reference breaks Space on a typeable trigger.** `useDeferredFloatingReference` keeps `elements.domReference` null until the first open. `useClick` reads it on each key event while the panel is closed. There, `isSpaceIgnored(domReference)` is `isTypeableElement(null)`, which is false. So with `<PopoverTrigger><input /></PopoverTrigger>`, the first Space press is prevented and opens the panel on keyup. After one open and close, the same press types a space and opens nothing.

Before #1168 and #1169, the press never opened the panel. `MenuTrigger` behaves the same way. No trigger inside the library wraps a typeable element, so only a consumer's trigger can reach this. Three statements are false: the hook's `@remarks`, the `PopoverTrigger` comment that nothing binds to the node while it is shut, and the #1168 commit body. Fix: register at once when the node is typeable, and name the `useClick` Space read in the TSDoc.

**SRC-01 — Grid pagination loses its focus restore under a deferred page commit.** #1152 moved the restore effect from `[pageIndex]` to a `navigations` counter. The counter commits in the render of the click itself. A controlled consumer can commit the page later, in `startTransition` or after a fetch. The effect then runs while Next is still enabled, so `heldInNav` returns early. The page commit disables Next, and no effect runs.

Focus stays on the disabled Next in jsdom, and falls to the body in Chromium (WCAG 2.4.3). A probe with the real Grid on page 2 of 3 showed this; the old latch put focus on page 3. Fix: key the effect on `[navigations, pageIndex]`, and disarm it only after a page commit follows the navigation, or when the navigation resolves to the current page.

**TESTS-01 — The nullable-cast rule misses each cast that Biome wraps.** `NULLABLE_CAST` matches `\([^\n]*\)\s+as …`, so a call whose arguments wrap across lines passes it. Biome wraps each long query, and 16 such casts are live: ten in `browser/` and six in the jsdom tree. In `grid-resize.test.tsx`, #1162 converted a cast on one line and left the wrapped cast two lines below it. The 2026-09-11 test-architecture audit says that no such cast remains in the browser suite, which is false. The rule also missed a query with a type argument, `querySelector<T>(…) as T`, on one line or many, and 13 of the 16 sites took that form. Fix: let the pattern span lines and take the type argument, then convert the 16 sites to `present`.

**TESTS-02 — A Breadcrumb assertion went with no replacement.** #1155 removed `expect(el?.tagName).toBe('A')` from "marks a current crumb that is still a link with aria-current". The breadcrumb subject of the link sweep passes no `current`, so nothing checks that a current crumb with an `href` stays an anchor. A mutant `BreadcrumbLink` that drops `href` when `current` is set passed both the test and the sweep. The removed assertion failed on it. Fix: restore the assertion, or query `getByRole('link', { current: 'page' })`.

**DOCS-01 — The code blocks that #1166 exposed are often incomplete.** #1166 shows the code block on a demo that renders a local helper, and about 90 blocks now appear. `collectHelpers` prepends, in one pass, only the type aliases, interfaces, and `const` declarations whose names occur in the helper. It adds no function declaration and no other helper. It takes imports only from `<Tag>` names and React hooks.

Over the 213 helpers, 38 render a helper that they do not define. About 45 use a declaration that they do not include, and about 59 lack an import. `SingleComboboxExample` renders `<FilteredPeople />` with no definition. `CustomRulesExample` imports neither `defaultPasswordRules` nor `PasswordRule`. The scan predates #1166, and so does the TSDoc claim of "a self-contained snippet"; #1166 made the gap visible. The corpus gate checks only that each snippet holds an import. See Q1.

**BENCH-02 — The typeahead rung measures a buffer that grows at each iteration.** `matchTypeaheadCore` clears its buffer after 500 ms of idle, and each press resets that timer. In the bench loop, the query gains one character at each iteration, and the match costs O(buffer). A probe measured 0.220 ms for each press over the first 500 presses at eight rows, and 0.428 ms after about 10,500 presses. That is why the README reads eight rows as slower than 24. The jsdom docblock's claim that typeahead seeds its own buffer is false. Fix: clear the buffer between iterations, then measure again.

**TOOL-02 — Three layer rules miss a bare barrel.** The `hooks`, `primitives`, and `kiso` rules list `**/<layer>/**`, but not `**/<layer>`. So `'../layouts'` from `hooks/` or `primitives/` passes, and so do `'../katakana'` and `'../../hooks'` from `recipes/kiso/`. From inside `recipes/kiso`, a relative path never holds a `recipes/` segment, so the kiso rule's `**/recipes/kata/**` entries cannot match. The deleted tests had the same gaps, so this is not a regression. But `src/recipes/README.md` says that kiso never reaches up into katakana or kata. Fix: add the bare form and the sibling form, as #1156 did for the recipe-import rule.

**TOOL-03 — One approval rule holds the whole non-major branch.** `renovate.json` puts `@floating-ui/react` behind dashboard approval, but not in a group of its own. Renovate makes a branch wait for approval when any upgrade in it needs approval. A dry run put 0.27.20 into `renovate/non-major` with about 40 other dependencies, so that whole tail waits for a click. An approval also moves the lockfile off 0.27.19, which `patchedDependencies` keys on. Fix: give the rule its own `groupName`.

**TOOL-04 — Two bots act on npm security updates.** #1153 splits the version updates: Renovate takes npm, and Dependabot takes GitHub Actions. Dependabot's npm security updates come from a repository setting, not from `dependabot.yml`. It opened #664, #1022, #1035, #1082, and #1122 before the file existed. Renovate's `vulnerabilityAlerts` also acts on npm. The `chore(deps)` header of those pull requests fails the commitlint `scope-enum` rule. The Renovate app also looks absent: no `renovate/*` branch or pull request exists two days after the config landed. See Q2.

**TOOL-05 — Renovate reads the workspace overrides.** A comment in `pnpm-workspace.yaml` says that Renovate does not read the file. Renovate extracts both `pnpm.catalog.default` and `pnpm-workspace.overrides`. A dry run proposed the `undici` override `'>=7.29.0 <8'` → `'<9'`, which drops the advisory floor and forces 8.x onto each transitive consumer. Only the major-approval gate stops it today. Fix: add a `packageRule` for `matchDepTypes: ["pnpm-workspace.overrides"]`, and correct the comment.

**TOOL-06 — The Turbo hash for `lint` ignores the plugins.** The `lint` inputs named `biome.json` but not `biome-plugins/**`. A change to a `.grit` file alone kept the hash, so CI replayed a cached pass from `.turbo`. Fix: add `$TURBO_ROOT$/biome-plugins/**`. The inputs also omit `apps/admin/proxy.ts` and `css-modules.d.ts`, but that gap predates the window.

## Low

**MENU-02.** `setVirtualActiveElement` finds the previous row with `container.querySelector('[data-active]')`, which matches any element. It finds the new row through `document.getElementById(row.id)`. A consumer's `<span data-active>` inside a `MenuItem` loses its attribute on the first pointer move. A duplicate `id`, which is invalid HTML, clears the highlight from every row. The keyboard path still marks the row itself. Fix: mark `row` directly, and clear with `${MENUITEM_SELECTOR}[data-active]`.

**MENU-03.** The `useDeferredFloatingReference` TSDoc says that the layout effect runs in the commit that mounts the panel. The portal mounts the panel one synchronous commit later, as the `MenuSub` comment says. The effect also calls `setReference` on each open, not only the first. Neither changes behaviour, and the panel is placed before paint. Fix: correct the wording.

**MENU-04.** A comment in `browser/menu-scroll-overflow.test.tsx` says that a capped viewport always overflows. A capped menu with two rows does not. The gate needs only the first half of the sentence. Fix: drop the second half.

**BENCH-03.** Six README figures disagree with their own tables.

- "Under 0.003 ms per menu" is 0.0037 by the table.

- "The hook tree is the largest term at 0.0157" sits beside a trigger step of 0.0166.

- "12×" is a net figure beside the gross "22×"; the gross value is 13×.

- "The rest — about 0.39" is 0.411.

- "Four times what a closed root menu costs" is 2.5×.

- "The largest single figure" conflicts with the 2.65 ms shell in `menu-shell.bench.tsx`.

**BENCH-04.** Prose went stale after #1170, #1173, and #1174. The README gate section says that `MenuContent` reads `useMenuCapped` and that an uncapped viewport attaches no ref. `MenuViewport` now reads the flag, and the ref attaches with `enabled: false`. The `menu-shell.bench.tsx` docblocks still describe an overflow observer on the static rungs. Lever 6 says that the work for each open is unchanged, but another line says that the same lever removed `useScrollOverflow` from each closed `MenuSub` row. The `MenuViewport` TSDoc sends readers to this section.

**BENCH-05.** `FLOOR_ROWS` in `menu-open.bench.tsx` has no effect. A closed Dropdown never renders its rows, and the floor comes off four rungs, not one. Fix: drop the constant, or its claim.

**BENCH-06.** README lever 2 cites 0.71 ms for a toggle read back to a placed panel. No bench measures a toggle to a placed panel. Fix: cite the source, or drop the figure.

**BENCH-07.** `MENU_ROWS` in `__benchmarks__/fixtures.ts` sits between the `Option` doccomment and `export type Option`. `Option` lost its doc, and `MENU_ROWS` carries two. Fix: move `MENU_ROWS` above the `Option` doccomment.

**BENCH-08.** `menu.bench.tsx` says that every fourth row opens a submenu. The six `MenuSub` rows are the last six. The browser twin in `menu-mount.bench.tsx` says it correctly.

**BENCH-09.** #1176 memoizes the Sparkline projection on the identity of `data`. A consumer that changes the array in place, such as a ring buffer, now draws the old series. Before #1176, each render projected again. The `data` TSDoc does not state the identity contract. Fix: state it.

**BENCH-10.** The Q2 settlement that #1177 added to the 2026-09-13 bug audit says that each of ten call sites runs the consumer's handler first. `date-picker.tsx` composes two library handlers and no consumer handler. The `sidebar.tsx` line cite is off by one line.

**DOCS-02.** `extractComments` in the comment-reference gate loses its place on a regex literal that holds a quote, such as `/name: '/`. It then skips each comment up to the next matching quote. About 80 comments in 11 files go unread, among them 14 of the 21 in `controlled-language.ts`. A missing citation below such a literal passed the gate. The controlled-language gate uses the same reader. Fix: take the comment ranges from the TypeScript parse, which the link half of the gate already has.

**DOCS-03.** `CITATION` matches only a name with a test or bench extension. The tree also cites a bare stem, such as "see test-isolation-boundary". A probe `// see zz-missing-boundary` passed. The test title says that each test file a comment names exists. Fix: match the `-boundary` stems too, or narrow the title.

**DOCS-04.** The `(?<![*-])` lookbehind misreads Markdown emphasis. `**zz-bold-probe.test.ts**` reports as `-bold-probe.test.ts`, and `**missing.test.ts**` never matches. No live case exists. Fix: strip the emphasis before the match, as `normalize` does.

**DOCS-05.** `declaredName` records each node with an identifier `name`, and that includes references: property accesses, JSX attributes, and `import.meta`. A `{@link}` to a name that occurs only as `o.name` passes. No live target depends on this. Fix: skip those node kinds.

**DOCS-06.** `returnsJsx` counts JSX anywhere in a returned expression. So `function MakeColumns() { return [{ cell: <Badge /> }] }` now counts as a helper, and its declaration leaves the source facts. `return () => <X />` counts, but `const r = () => <X />; return r` does not. No live demo changes: over 111 demos, the change adds 8 intended helpers and removes none.

**DOCS-07.** The gate's comment names two audits from code, which §12.4 bans, and the same comment cites §12.4. It also says that steps 7 and 9 moved four boundary rules. They moved eight: five tests in #1152 and three in #1164. The hunk in the 2026-09-12 documentation audit repeats the count.

**DOCS-08.** `demo-code-block.test.ts` accepts a helper tag by its snippet, whatever the tag holds. The runtime reads the snippet only for a helper with no children. So `<Example><Wrapper>plain</Wrapper></Example>` passes the gate, but `hasDerivableCode` returns false. The file header lists two approximations that err toward a pass, and not this one. No live case exists. Fix: use the snippet only for a helper with no children.

**DOCS-09.** #1166 renames `MeterOnlyExample` and two titles in the password-strength demo. The fix does not need the rename, and the commit gives no reason ([`CLAUDE.md`](../../../../CLAUDE.md) §1.2).

**DOCS-10.** The `resolveTypeIn` TSDoc still gives the emptiness probe as its reason to exist. The probe and the renderer now reach it through `classifyElement`. Fix: point the sentence at `classifyElement`.

**SRC-02.** #1152 passes relative updaters to `setPageIndex`, and the `views.ts` TSDoc says that the engine clamps the result. TanStack clamps only against `options.pageCount`, and neither client mode nor server mode with `rowCount` alone sets it. Two Next activations in one task on page 2 of 3 reach index 3. The status then reads "0–0 of 25", and no rows render. Fix: clamp in `buildPaginationView`, or correct the TSDoc.

**SRC-03.** A comment in `grid-pagination.test.tsx` says that two clicks with no commit between them are what a double-click does. A real double-click in Chromium commits between the clicks, and the real Grid lands on the last page. The test-architecture audit gives the same claim as the root cause of the `grid-pagination-focus` flake, so that root cause needs a second look. Fix: say "two programmatic clicks in one task".

**SRC-04.** `__resetTruncationObserver` runs in `afterEach`. Vitest 4.1.11 restores a stubbed global only before the next test, so the stubbed `ResizeObserver` is still in place, and the reset keeps the observer. A later test that arms a truncation span can then share the stub's instance. No suite that stubs the observer arms truncation today. Fix: reset in a `beforeEach`.

**SRC-05.** Three comments went stale. `setup/index.ts` says that `__resetAnnouncer` clears the state, above a call that resets more. `reset-singletons.ts` and `use-truncation.ts` say that each project runs `isolate: false`, but `integration` does not. `reset-singletons.ts` counts four jsdom files that stub `ResizeObserver`, but there are five.

**SRC-06.** New code comments name the 2026-09-11 audit, in `reset-singletons.ts`, `residue.ts`, and `vitest.browser.config.ts`. §12.4 bans this, because the reference dangles when the audit goes. Fix: state the fact inline, or cite the pull request.

**SRC-07.** After #1156, `IconSize` in the kiso and shaku recipes has no importer. `RECIPES.md` still says that `Icon` sizes against it. The test-architecture audit keeps the export on purpose. Fix: drop the export, or reword the row.

**TESTS-03.** #1152 deleted "re-measures when children are added or removed". It was the only test of the `MutationObserver` branch in `useScrollOverflow`. No test in either tree appends a child now. Fix: add a browser case that mounts a second child.

**TESTS-04.** In `grid-export-csv.test.ts`, "lets a signed number through the guard" checks only that each field that starts with a sign is a number. A guard that neutralizes each signed number leaves no such field, so the property still passes. A mutant proved it. Fix: rename the property, or generate signed numbers and assert that they arrive with no prefix.

**TESTS-05.** The teeth checks in `sweeps/capabilities.test.tsx` run the matchers on local stubs, not on the sweep bodies. A weaker sweep assertion keeps them green, but the block comment says that they prove the sweeps can fail. Fix: extract each sweep body, and run it on the stub.

**TESTS-06.** `LOOSE_VIEWPORT` accepts any indented `beforeAll(() => page.viewport(…))`, so it does not enforce file scope. It does not catch the chart-aspect-legend shape that its comment cites. No live instance exists. Fix: anchor the pattern at column 0, or say that a hook at describe level is allowed.

**TESTS-08.** The oracle in the `collapsedHiddenIds` property copies the implementation line for line. It detects a change, not a defect. Fix: assert the invariants. The anchor is never hidden, the hidden ids are a subset of the collapsed members, and an expanded group hides nothing.

**TESTS-09.** `grid-cell-truncate-tooltip.test.tsx` pastes the same five-line comment and assertion three times. Fix: extract one helper.

**TESTS-10.** #1162 moved `residue.ts` from `browser/setup/` to `helpers/`. Its header still speaks for both browser instances and cites "this file's sibling". `guardResidue` has no importer outside the file, and its TSDoc calls it the only way in.

**TOOL-07.** `no-camel-case-data-slot.grit` misses a template literal, such as ``p[`dataSlot`]``. The deleted `\bdataSlot\b` scan matched it, and the plugin's comment says that it covers computed access. Fix: add a template-string form.

**TOOL-08.** The `no-react-create-context` and `no-unsanctioned-define-recipe` overrides exclude only the top-level `__tests__` and `__benchmarks__` trees. The old walk skipped them at each depth, so a probe under `docs/engine/__tests__/` now fails. The shape gaps carry over from the deleted tests: `React.createContext`, `import R, { createContext }`, a re-export, and `import('react')`. Fix: exclude `**/__tests__/**` and `**/__benchmarks__/**`.

**TOOL-09.** Tooling prose went stale. `RECIPES.md` names three deleted boundary tests. `vitest.config.ts` says that each agent run takes the warm path, but since #1161 the cache key is the lockfile hash with no restore key. The test-architecture audit still describes the old key.

**TOOL-10.** The commit gate is local only. `688a71d` ("Update README.md") fails `type-empty` and `subject-empty`, and #1122 fails `scope-enum`. CI runs no commitlint step. GitHub reports `main` as unprotected, and `688a71d` landed with no pull request, so the claim that CI gates merges ([`CLAUDE.md`](../../../../CLAUDE.md) §3.4) holds by habit alone. A ruleset that the reviewer could not see can exist. `688a71d` also removed `apps/admin` from the README workspace table, which now lists neither app.

**TOOL-11.** `turbo.json` still points `$schema` at 2.10.8 after #1165 moved Turbo to 2.11.2. `minimumReleaseAgeExclude` in `pnpm-workspace.yaml` still lists `turbo@2.9.18`, but that entry predates the window.

## Outside the window

These rows came up during the sweep. They predate `5c75a88`, so they sit outside the counts above.

| Row | File | Symbol | Severity | Verdict | Status |
|---|---|---|---|---|---|
| `ADJ-01` | `packages/ui/src/components/accordion/accordion.tsx` | `Accordion` | low | CONFIRMED | ◯ OPEN |
| `ADJ-02` | `packages/ui/src/components/popover/popover.tsx` | the context memo | low | PLAUSIBLE | ◯ OPEN |
| `ADJ-03` | `packages/ui/src/modules/grid/engine/grid-menu-targeting.ts` | the active-cell query | low | PLAUSIBLE | ◯ OPEN |
| `ADJ-04` | several | dangling citations | low | CONFIRMED | ◯ OPEN |

**ADJ-01.** #1150 spread `...rest` onto the root `<div>`, but did not take `collapsible` out of it. Each `<Accordion collapsible>` writes an invalid attribute, and React warns; the warning shows in the stderr of the jsdom run. Fix: destructure `collapsible` with the other selection props.

**ADJ-02.** The `PopoverContext` memo keys on the whole floating `context`, so each consumer renders again on each reposition. #1168 fixed the same shape for Menu. The `FloatingFocusManager` needs the value, so the fix is a split, not a removal.

**ADJ-03.** `grid.querySelector('[data-active]')` can match the header filter button or the group-by button before the active cell, when the header sits inside `[role="grid"]`. This was not run.

**ADJ-04.** Five citations dangle. `a11y/baseline.test.tsx` cites `cases.tsx` and `cases.ts`. `controlled-language.ts` and its boundary test name the deleted 2026-08-02 audit. `no-unsanctioned-define-recipe.grit` names the deleted `kata-boundary` test. The B07-C10 body of the bug audit cites a `variant` prop, but the prop is `shape`. `recipes/kata/README.md` still says "boundary-test list".

## Ruled out

Each item below was checked and found sound. The next sweep can start from here.

- `dismissToTab` and the date-picker and listbox handlers depend on `context.onOpenChange`. In `@floating-ui/react` 0.27.19, that handler is a `useEffectEvent` with one identity for each mount.

- No other read of the reference changes while the panel is closed. This covers `useDismiss`, `useRole`, outside press, `FloatingFocusManager`, and `matchReferenceWidth`. Neither Menu nor Popover wires `useHover`, `useFocus`, or `useListNavigation`. The first open places the panel before paint, `defaultOpen` and a controlled `open` register at mount, and an unmount passes no null.

- `useComposedRef` runs the cleanup of each ref, so `MenuSub` receives `setRows(null)` on detach. A `capped` flip clears both attributes and measures again.

- `ScrollOverflowOptions` is on the hooks barrel and in `HOOKS.md`. `MenuViewport`, `useDeferredFloatingReference`, and `setVirtualActiveElement` carry `@internal` and sit on no barrel.

- The #1175 bar keys are unique for each datum, and they fix the `x` collision at zero width. Duplicate, reordered, NaN, empty, single, equal, and negative data render correctly.

- The #1176 memo deps are complete: `data`, the box size, `padding`, `barGap`, `min`, and `max`.

- No bench probe patches a global or a production module. The `sparkline-geometry` bench builds its fixture outside the timed region. Each figure that a source comment cites resolves to the README and to a bench that exists.

- The #1166 probe changes only from false to true, and its recursion ends. An overload emits the implementation alone.

- The #1167 gate is not vacuous: a crafted bad citation and a crafted bad `{@link}` both fail.

- The #1156 recipe-import rule catches each import shape probed from the root. The #1164 sanction set for `defineRecipe` equals the old `isSanctioned`.

- The Vitest family is at 4.1.11 in each manifest, the catalog, and the lockfile, with one instance. Renovate keeps the family in one group. The GitHub Actions split between the two bots is exclusive.

- The CI jobs run lint, check-types, test, knip, build, the bundle budget, and the browser suite, with no `continue-on-error`. The pnpm, Node, Turbo, and Biome versions agree across the manifests, CI, and the README.

- The browser config's include and exclude globs are identical to the parent commit. No config sets `retry`, and isolation is unchanged.

- The test setup adds no console filter and does not swallow a rejection. `vi.useRealTimers()` before `cleanup` does nothing when no fake clock is installed.

- Each case in the deleted or shrunk test files has a counterpart elsewhere, except TESTS-02 and TESTS-03. The files are `chart-aspect-legend`, `map-plat-resize`, `current-contents-morph`, `chart-resize-tracking`, `use-plot-frame`, `use-is-truncated`, and `scroll-area`.

- The #1162 mechanical edits (`getSlot`, `present`, `budget`, `pause`) make the tests stronger, and none drops an `await` or an `expect`. Each property oracle is independent of its unit, except TESTS-08.

- #1152 does not touch a shrink of the row count, a change of page size, or zero rows.

## Steps

1. TOOL-01 and TOOL-06. Drop the flag from the `lint` scripts, and add the plugins to the Turbo inputs.

2. MENU-01, SRC-01, TESTS-01, and TESTS-02.

3. BENCH-01 and BENCH-02. Fix both rungs, measure again, and correct the README with BENCH-03 to BENCH-06.

4. DOCS-01, after Q1.

5. TOOL-03, TOOL-04, and TOOL-05, after Q2.

6. The remaining low rows, one batch for each scope.

## Open questions

**Q1 — DOCS-01.** Make each snippet complete, with a transitive closure and the imports from `importFacts`? Or narrow the TSDoc to the helper and the declarations that it names?

**Q2 — TOOL-04.** Is the Renovate app installed on the repository? Which bot owns npm security updates?
