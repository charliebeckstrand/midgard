# Docs App Performance Audit — Open Findings

Performance, stability, and bundling audit of the docs app (2026-07-13) — the ts-morph extraction engine (`src/docs/engine/api-reference`), the Vite plugin/build wiring, and the runtime. Method: first-hand baseline measurements plus two parallel area audits (extraction engine; Vite/runtime), every High verified against live source and measured where possible. The recent perf run (#994–#1000: curated shiki-core, per-component lazy API chunks, open-gated Example derivation, sidebar memoization, dep prebundle + entry warmup) and the incremental disk-cached extractor (#1001) are treated as landed context; findings below are what remains. Line numbers are as of this commit and will drift.

Baselines (this machine, [`src/__benchmarks__/docs`](../../src/__benchmarks__/docs/README.md) reproduces them). Pre-#1001, `buildApi` ran ~9.8s at ~1.1 GB RSS for 310 components / 1,132 props — ~7.1s of it building a Project over the tsconfig's 1,792 files — and every non-docs source edit re-paid ~8.4s wholesale. Post-#1001: a cold full pass runs ~3.9s (barrel-scoped Project ~1.7s of it), an unchanged-tree restart replays the disk cache in ~30ms, and a component edit re-extracts per-barrel in ~313ms. Observed end-to-end in dev (warm cache): ready ~0.8s, entry ~0.1s, first manifest read ~1.1s, steady-state edit ~334ms — with two cliffs left: a cold or invalidated cache pays the full ~4–6s pass on first read, and the first edit after a disk-served start pays a one-time ~4.4s warming pass (by design; see the Low tier). The prod build drops from ~12–16s to ~3s wall on a warm cache; the bundle is unchanged at 355 files, 6.65 MB raw / 3.31 MB gzip.

## High

- [x] **`src/docs/engine/api-reference/engine/extract-props.ts:27-33,55-58`** — RESOLVED. — `collectAllProperties` calls `checker.getTypeOfSymbolAtLocation` for *every* property of the props type before the name filter runs, so a component spreading `ComponentPropsWithoutRef<'div'>` resolves ~250 inherited HTML/aria/event prop types that the `IGNORED_PROPS`/`projectNames` filter then discards. This now dominates the residual costs: it is paid inside the ~3.9s cold pass, the ~313ms incremental pass, and CI's cold-cache builds. **Fix:** hoist the name filter above the per-symbol type resolution (types are only needed for kept props); guard with `extraction.bench.ts`'s Heading fixture. Landed: `collectAllProperties` gathers symbols only and defers each arm's type to `resolveArmTypes`, so the name/project filters discard a prop before its type is computed.

- [x] **`src/docs/engine/api-reference/engine/extract-references.ts:130-132`** — RESOLVED. — each queued type name runs `checker.getSymbolsInScope` (thousands of symbols) followed by a linear `.find`, per prop, per component, with no memoization of the scope list per location and no cross-prop cache of resolved alias definitions; a shared alias re-resolves for every prop that mentions it (`visited`/`refs` are per-call, `:57-95`). Measured 5.0ms per Button pass and 2.9ms per Combobox pass — the slowest per-component seam, ~2× its `extractProps`. **Fix:** cache the scope symbol table per location node and resolved `name → text` per file (both live naturally in #1001's extractor, scoped to one extraction pass); `extraction.bench.ts` isolates it. Landed as `scopeCache`, a `WeakMap` keyed by checker then node, holding a `name → symbol` map so each lookup is O(1).

- [x] **`src/docs/engine/api-reference/engine/find-components.ts:67-101`** — RESOLVED. — `resolveCallable` unwraps neither `as`-assertions nor identifier arguments, so `export const Grid = memo(GridImpl) as typeof GridImpl` (`src/modules/grid/grid.tsx:77`) yields no callable and the flagship Grid renders `props: []` in the live docs; 128 of 310 exported components extract zero props (some are legitimately prop-less subcomponents, but the shape above is silently dropped coverage, not perf). **Fix:** unwrap `AsExpression`/`ParenthesizedExpression` and follow identifier arguments to their declarations; then re-count the zero-prop set. Landed as `unwrapFunctionLike`, which peels `as`/`satisfies`/parentheses, recurses into call arguments, and resolves an identifier argument to its declaration — `memo(GridImpl) as typeof GridImpl` now yields its callable.

- [x] **`src/docs/engine/plugins/docs.ts:441-444`** — RESOLVED. — `virtual:component-modules` still invalidates on *any* file under `srcDir` (tests, css, benchmarks), re-running `buildNameMap` — which re-reads every barrel and re-parses every demo (`docs.ts:263-277`) — on edits that cannot change it; `virtual:demo-metas` re-parses **all** demos on any single demo edit (`docs.ts:51-69,438`). #1001 fixed exactly this class of problem for the api-reference family; these two predicates kept the old wholesale shape. **Fix:** narrow component-modules to barrels + demos and re-parse only the changed demo's meta, mirroring the extractor's per-file granularity. Landed: the predicate is now `moduleNameFor(file, srcDir) !== null || isDemoFile(file, demosDir)` — exactly what `buildNameMap` reads — and `generateDemoMetas` caches each demo's parse against its mtime, so a regeneration re-parses only what changed and drops deleted demos from the cache.

## Medium

- [ ] **`src/docs/engine/api-reference/engine/build-api.ts:132-143`** — `openProject`'s barrel-scoped shape (#1001) still measures ~1.7s of the ~3.9s cold pass; the bench's glob-scoped variants run ~0.5s (`project-construction.bench.ts`), so up to ~1.2s of cold-pass headroom remains. The catch is correctness: `resolveSourceFileDependencies` is what lets the checker see the full graph, and #1001 verified its shape byte-identical — any tighter variant needs the same output diff before adoption. **Fix:** A/B `skipFileDependencyResolution` against the current shape with the bench, diff `buildApi` output, adopt if identical. **Re-measured 2026-08-01, and the case is now stronger than this row states:** `project-construction.bench.ts` puts the current `openProject` at 1929 ms against 454 ms for `glob-scoped + skipFileDependencyResolution` — 4.25× and about 1.47 s, not the ~1.2 s estimated — of a cold pass that now measures 4.75 s. CI pays that cold pass on every build. The gate is unchanged and is the whole difficulty: `resolveSourceFileDependencies` is what lets the checker see the full graph, so adoption needs a byte-identical `buildApi` output diff, not a faster number.

- [x] **`src/docs/engine/vite/index.ts:88-99`** — RESOLVED. — `optimizeDeps.include` omits deps statically imported by modules reached only through lazy demo chunks: `d3-geo` + `topojson-client` (map), `@internationalized/date` (date/calendar), `marked` (markdown), `card-validator`, `fflate`, `tinykeys`. First dev navigation to those demos triggers the optimizer re-run and the mid-session full reload the curated list exists to prevent (the browser-bench config already prebundles the map pair; the docs config lags it). **Fix:** add them to the include list; `vite-metrics.ts` dev mode catches the regression. Landed — all seven added. A `test:browser` run had confirmed the row live, stopping mid-suite to optimize `d3-geo`, `topojson-client`, `fflate`, and `marked`.

- [x] **`src/docs/engine/components/example.tsx:78`** — RESOLVED. — the `hasDerivedCode` existence probe still runs a full `deriveCode` walk per Example at mount, so a demo page with many examples pays N tree walks before any panel opens; the open-gating from #995 covers only the string derivation at `:82-88`. **Fix:** defer the probe to first open or replace it with a cheap structural check (any tagged element in the subtree short-circuits). Landed as the structural check: deferring to first open was not open to us, since `showCode` decides whether the trigger renders at all. `hasDerivableCode` stops at the first tagged element, and a test pins it against `deriveCode` on every case.

- [ ] **`src/docs/engine/api-reference/engine/extract-props.ts:286`** (with `:202,213`) — `dropMergedArmUnions` renders every union arm to compare texts, then `formatPropTypes` renders the kept arms again; multi-arm discriminated props format twice. **Corrected 2026-08-01:** the two passes do not call the same function — `dropMergedArmUnions` uses `formatType`, `formatPropTypes` uses `formatPropType`, and the two diverge on a leaf function type (`formatType` routes it through `formatFunctionType`; `formatPropType` falls through to `typeToString`). So "render once and reuse" is not behaviour-neutral: it would change how function-typed discriminated arms display. **Fix:** align the two renderings deliberately, with a `buildApi` output diff, or accept the second pass; not the mechanical dedupe this row assumed.

- [x] **`src/docs/engine/api-reference/engine/format-type.ts:101,226,235,264-274`** — RESOLVED. — `formatType` recurses through generics, function signatures, arrays, and unions with no depth cap or visited set; named types short-circuit, but a structurally recursive anonymous type has nothing stopping it. Stability, not steady-state cost. **Fix:** a depth cap with a `…` fallback. Landed at 12 — the deepest real prop type measures under five — as a module-level counter with a `finally`, rather than a parameter threaded through seven recursion sites across four helpers.

- [x] **`src/docs/engine/app.tsx:48-56`** — RESOLVED. — the idle `loadShiki()` warm call attaches no rejection handler, so a post-deploy 404 on the shiki chunk surfaces as an unhandled rejection (the CodeBlock path catches its own). **Fix:** `.catch(() => {})` to match `code-block.tsx:100-122`. Landed, with a comment stating why swallowing is correct here.

## Low

- [ ] **`src/docs/engine/api-reference/engine/api-extractor.ts:339-361`** — the first edit after a disk-served start runs a full warming pass (~4.4s observed) because cache-replayed states carry empty `inputs` and per-barrel subset extraction is only ordering-stable against a canonically warmed checker. The design is sound; the cost is a once-per-dev-session stall on the first edit. If it proves annoying, warm proactively — kick the full pass on server idle after a disk-served load, so the checker is warm before the first edit lands — rather than weakening the ordering rule. **2026-08-01:** left as designed; nobody has reported the stall, and the row's own trigger is annoyance, not a number.

- [ ] **`src/docs/engine/plugins/virtual-json.ts:85-93`** (with `registry.ts:1`) — the eagerly imported manifest still can't render without a full `getAll()`, so a cold or invalidated cache blocks dev first paint ~4–6s on extraction the open page may never read. #1001 makes this rare (warm restore ~30ms); the residual fix — manifest keys from `listBarrels` alone, extraction deferred to per-key reads — only matters if cold-cache starts prove common (fresh clones, CI previews). **2026-08-01:** the warm restore re-measures at 31.9 ms against a 4.75 s cold pass, so the gap is real but the trigger still is not: cold starts have not proven common.

- [ ] **`src/docs/engine/api-reference/engine/link-resolver.ts`** — `createLinkResolver` measures ~39 ms per extraction pass (index over every program file); it re-runs per incremental pass via `extractionContext` (`api-extractor.ts:170-179`). **Re-measured 2026-08-01:** the incremental pass fell from 313 ms to 214 ms once the High tier landed, so this fixed cost is now ~18% of the budget rather than ~11% — the same milliseconds against a smaller total. Its gate ("only after the High tier lands") is now met, which makes it the best-value row left in this file. An index scoped to changed files is the fix.

- [x] **`src/docs/engine/api-reference/engine/extract-defaults.ts:57-68`** — CLOSED as measured-negligible. `resolveConstLiteral` still scans linearly, and the 2026-08-01 bench re-confirms it does not register: `extractDefaults` remains the cheapest of the annotation extractors, 1.69× faster than `extractPassThrough` and 4× faster than `extractProjectPropNames`. The condition this row set for acting — a file with many defaults showing up in the bench — has not been met.

- [x] **`src/docs/engine/plugins/docs.ts:86,447-459`** (with `collect-helpers.ts`) — CLOSED as condition-unmet. Transform time still does not register against extraction: the incremental pass measures 214 ms, of which the per-barrel extraction dominates. The memo stays unwritten by the row's own rule.

- [x] **`src/docs/engine/app.tsx:37`** — RESOLVED. The registry now publishes `demoById` alongside `demos`, rebuilt with it so the two cannot diverge, and the chrome resolves the route in one step.

## Bundle

Measured from `pnpm bench:docs:vite --build`: 355 files, 6.65 MB raw / 3.31 MB gzip (js 4.40/1.29 MB, css 187/27 kB). Per-demo splitting works — pdf, map, grid, chart all chunk separately and load on demand. The wins left:

- [x] **`src/docs/engine/fonts/GoogleSansFlex-VariableFont_….woff2`** — RESOLVED. The five-axis file is gone: the shipped face is `GoogleSansFlex-VariableFont_opsz,wght.woff2` at 175 kB, and the code face adds 57 kB. That alone accounts for the bundle dropping from 6.65 MB raw to 5.05 MB. Further unicode-range subsetting would need `fontTools`, and at 175 kB it no longer leads the list.

- [x] **`shiki.js` (560 kB raw / 91 kB gzip)** — RESOLVED as verified, no action. The suspicion was wrong: the built chunk declares exactly three scopes (`source.ts`, `source.tsx`, `source.shell`) and one theme, so nothing stowed away. 560 kB is what the TypeScript and TSX TextMate grammars plus the JS regex engine genuinely weigh. The only lever left is dropping a grammar, and the docs render all three.

- [x] **`index.js` (324 kB raw / 100 kB gzip)** — RESOLVED. The build runs on rolldown, so the grouping is `build.rolldownOptions.output.advancedChunks` rather than `manualChunks`; four groups (react, motion, floating-ui, tanstack) give the cross-cutting vendors a stable home. `lucide-react` is deliberately excluded — grouping a tree-shaken icon package would make one icon fetch every icon the site uses. Measured with `--compare`: the entry falls 325 → 151 kB raw (100 → 46 kB gzip, −53%), grid −16%, map −30%, and total gzip moves +0.2%, within noise.

- [x] **`states-10m` JSON (112 kB raw / ~35 kB gzip)** — RESOLVED. The map demo imports `us-atlas/states-10m.json?url`, which emits the atlas as a static asset and hands over its URL — the same effect as the suggested `public/` fetch, without leaving the module graph.

## Infrastructure

RESOLVED, in part. `docs:build` is now a turbo task with declared inputs and outputs, and the CI gate runs it, so a docs build that breaks fails the branch. `bundle:budget` runs after it and asserts a ceiling on total gzip and on the eager entry — the two numbers a stray eager import moves — failing with the delta and a pointer to raise the ceiling deliberately. The budgets are tripwires against a doubling, not a per-kilobyte ratchet.

Still unwired: the benchmark suites themselves ([`src/__benchmarks__/docs`](../../src/__benchmarks__/docs/README.md)) have no CI job, so extraction-time and cold-start regressions remain measurable only locally. CI also always runs the cold-cache path, so a docs build there pays the full extraction pass.

## Verification sweep — 2026-08-01

Re-checked against source. Three of the four High rows had already landed and are
checked off above, including the extraction-coverage one — `unwrapFunctionLike`
now peels `memo(GridImpl) as typeof GridImpl`, so the Grid renders its props. The
Medium `loadShiki` rejection handler landed too.

What remains is real and re-verified: the `virtual:component-modules` predicate is
still `file.startsWith(srcDir)`, so a test or CSS edit re-parses every barrel and
every demo; `optimizeDeps.include` still omits the lazy-demo dependencies, which a
`test:browser` run confirms by stopping mid-suite to optimize `d3-geo`,
`topojson-client`, `fflate`, and `marked`; the `hasDerivedCode` probe still walks
at mount; `formatType` still has no depth cap; `dropMergedArmUnions` still renders
each arm twice. The Low, Bundle, and Infrastructure tiers are untouched — there is
still no `docs:build` turbo task and no `manualChunks`.

The baselines above predate those three High fixes and are stale as numbers; the
re-run below supersedes them.

## Second pass — 2026-08-01

The last High row and three Medium ones landed, so the High tier is closed. One
Medium row was corrected rather than fixed: its premise — that the two arm
renderings are the same call — does not hold, and acting on it would change what
the docs display.

What remains is the Low tier, the Bundle tier, and Infrastructure. The Low rows
are mostly conditional by their own wording ("fix only if a file with many
defaults shows up in the bench", "only matters if cold-cache starts prove
common", "worth a content-hash memo only if transform time ever registers") —
they are decisions to revisit against a measurement, not queued work, and the
measurement they wait on is the re-run the baselines already need. The Bundle
tier is the real remaining value: the 1.90 MB variable font is 29% of the bundle
and does not gzip, and there is still no `manualChunks`, so shared vendors
re-shuffle across builds and defeat long-term caching. Infrastructure is
unchanged — `docs:build` is still not a turbo task and no size budget exists, so
every row here can still regress undetected.

## Third pass — 2026-08-01

The Bundle tier and the Infrastructure row are closed, and the Low tier is down
to one row. Three of the four Bundle rows turned out to need no work: the
five-axis font is long gone (175 kB, two axes), the map atlas already leaves the
JS graph through `?url`, and the shiki chunk holds exactly the three scopes its
shim registers — its 560 kB is what the TypeScript and TSX grammars weigh, not a
stowaway. Only the entry-chunk row was real, and it paid: a four-group
`advancedChunks` split halves the eager entry with total gzip flat.

`docs:build` is now a turbo task in the CI gate, followed by a `bundle:budget`
assertion on total gzip and the eager entry — so the split that just landed
cannot silently unwind.

Fresh measurements (this machine, superseding the 2026-07-13 baselines): cold
full pass 4.75 s, disk restore 31.9 ms, per-barrel incremental edit 214 ms (was
313 ms), `createLinkResolver` 39 ms, prod build ~3.1 s wall, bundle 359 files /
5062 kB raw / 1629 kB gzip.

Two rows remain worth doing, both now sharper than when written: the
project-construction A/B is worth ~1.47 s of a 4.75 s cold pass that CI pays
every build, and the link-resolver index is a larger share (~18%) of a smaller
incremental budget. Both are gated on correctness work — an output diff and a
scoped index — rather than on more measurement. The three Low rows still open
are conditional by their own wording, and none of their conditions is met.

What is still unwired: the benchmark suites have no CI job, so extraction-time
and cold-start regressions stay measurable only locally.

---

**See also:** [`src/__benchmarks__/docs/README.md`](../../src/__benchmarks__/docs/README.md).
