# Docs App Performance Audit — Open Findings

Performance, stability, and bundling audit of the docs app (2026-07-13) — the ts-morph extraction engine (`src/docs/engine/api-reference`), the Vite plugin/build wiring, and the runtime. Method: first-hand baseline measurements plus two parallel area audits (extraction engine; Vite/runtime), every High verified against live source and measured where possible. The recent perf run (#994–#1000: curated shiki-core, per-component lazy API chunks, open-gated Example derivation, sidebar memoization, dep prebundle + entry warmup) and the incremental disk-cached extractor (#1001) are treated as landed context; findings below are what remains. Line numbers are as of this commit and will drift.

Baselines (this machine, [`src/__benchmarks__/docs`](../../src/__benchmarks__/docs/README.md) reproduces them). Pre-#1001, `buildApi` ran ~9.8s at ~1.1 GB RSS for 310 components / 1,132 props — ~7.1s of it building a Project over the tsconfig's 1,792 files — and every non-docs source edit re-paid ~8.4s wholesale. Post-#1001: a cold full pass runs ~3.9s (barrel-scoped Project ~1.7s of it), an unchanged-tree restart replays the disk cache in ~30ms, and a component edit re-extracts per-barrel in ~313ms. Observed end-to-end in dev (warm cache): ready ~0.8s, entry ~0.1s, first manifest read ~1.1s, steady-state edit ~334ms — with two cliffs left: a cold or invalidated cache pays the full ~4–6s pass on first read, and the first edit after a disk-served start pays a one-time ~4.4s warming pass (by design; see the Low tier). The prod build drops from ~12–16s to ~3s wall on a warm cache; the bundle is unchanged at 355 files, 6.65 MB raw / 3.31 MB gzip.

## High

- [ ] **`src/docs/engine/api-reference/engine/extract-props.ts:27-33,55-58`** — `collectAllProperties` calls `checker.getTypeOfSymbolAtLocation` for *every* property of the props type before the name filter runs, so a component spreading `ComponentPropsWithoutRef<'div'>` resolves ~250 inherited HTML/aria/event prop types that the `IGNORED_PROPS`/`projectNames` filter then discards. This now dominates the residual costs: it is paid inside the ~3.9s cold pass, the ~313ms incremental pass, and CI's cold-cache builds. **Fix:** hoist the name filter above the per-symbol type resolution (types are only needed for kept props); guard with `extraction.bench.ts`'s Heading fixture.

- [ ] **`src/docs/engine/api-reference/engine/extract-references.ts:130-132`** — each queued type name runs `checker.getSymbolsInScope` (thousands of symbols) followed by a linear `.find`, per prop, per component, with no memoization of the scope list per location and no cross-prop cache of resolved alias definitions; a shared alias re-resolves for every prop that mentions it (`visited`/`refs` are per-call, `:57-95`). Measured 5.0ms per Button pass and 2.9ms per Combobox pass — the slowest per-component seam, ~2× its `extractProps`. **Fix:** cache the scope symbol table per location node and resolved `name → text` per file (both live naturally in #1001's extractor, scoped to one extraction pass); `extraction.bench.ts` isolates it.

- [ ] **`src/docs/engine/api-reference/engine/find-components.ts:67-101`** — `resolveCallable` unwraps neither `as`-assertions nor identifier arguments, so `export const Grid = memo(GridImpl) as typeof GridImpl` (`src/modules/grid/grid.tsx:77`) yields no callable and the flagship Grid renders `props: []` in the live docs; 128 of 310 exported components extract zero props (some are legitimately prop-less subcomponents, but the shape above is silently dropped coverage, not perf). **Fix:** unwrap `AsExpression`/`ParenthesizedExpression` and follow identifier arguments to their declarations; then re-count the zero-prop set.

- [ ] **`src/docs/engine/plugins/docs.ts:441-444`** — `virtual:component-modules` still invalidates on *any* file under `srcDir` (tests, css, benchmarks), re-running `buildNameMap` — which re-reads every barrel and re-parses every demo (`docs.ts:263-277`) — on edits that cannot change it; `virtual:demo-metas` re-parses **all** demos on any single demo edit (`docs.ts:51-69,438`). #1001 fixed exactly this class of problem for the api-reference family; these two predicates kept the old wholesale shape. **Fix:** narrow component-modules to barrels + demos and re-parse only the changed demo's meta, mirroring the extractor's per-file granularity.

## Medium

- [ ] **`src/docs/engine/api-reference/engine/build-api.ts:132-143`** — `openProject`'s barrel-scoped shape (#1001) still measures ~1.7s of the ~3.9s cold pass; the bench's glob-scoped variants run ~0.5s (`project-construction.bench.ts`), so up to ~1.2s of cold-pass headroom remains. The catch is correctness: `resolveSourceFileDependencies` is what lets the checker see the full graph, and #1001 verified its shape byte-identical — any tighter variant needs the same output diff before adoption. **Fix:** A/B `skipFileDependencyResolution` against the current shape with the bench, diff `buildApi` output, adopt if identical.

- [ ] **`src/docs/engine/vite/index.ts:88-99`** — `optimizeDeps.include` omits deps statically imported by modules reached only through lazy demo chunks: `d3-geo` + `topojson-client` (map), `@internationalized/date` (date/calendar), `marked` (markdown), `card-validator`, `fflate`, `tinykeys`. First dev navigation to those demos triggers the optimizer re-run and the mid-session full reload the curated list exists to prevent (the browser-bench config already prebundles the map pair; the docs config lags it). **Fix:** add them to the include list; `vite-metrics.ts` dev mode catches the regression.

- [ ] **`src/docs/engine/components/example.tsx:78`** — the `hasDerivedCode` existence probe still runs a full `deriveCode` walk per Example at mount, so a demo page with many examples pays N tree walks before any panel opens; the open-gating from #995 covers only the string derivation at `:82-88`. **Fix:** defer the probe to first open or replace it with a cheap structural check (any tagged element in the subtree short-circuits).

- [ ] **`src/docs/engine/api-reference/engine/extract-props.ts:286`** (with `:202,213`) — `dropMergedArmUnions` renders every union arm through `formatType` solely to compare texts, then `formatPropTypes` re-renders the kept arms; multi-arm discriminated props format twice. **Fix:** render once into a keyed structure and reuse.

- [ ] **`src/docs/engine/api-reference/engine/format-type.ts:101,226,235,264-274`** — `formatType` recurses through generics, function signatures, arrays, and unions with no depth cap or visited set; named types short-circuit, but a structurally recursive anonymous type has nothing stopping it. Stability, not steady-state cost. **Fix:** a depth cap with a `…` fallback.

- [ ] **`src/docs/engine/app.tsx:48-56`** — the idle `loadShiki()` warm call attaches no rejection handler, so a post-deploy 404 on the shiki chunk surfaces as an unhandled rejection (the CodeBlock path catches its own). **Fix:** `.catch(() => {})` to match `code-block.tsx:100-122`.

## Low

- [ ] **`src/docs/engine/api-reference/engine/api-extractor.ts:339-361`** — the first edit after a disk-served start runs a full warming pass (~4.4s observed) because cache-replayed states carry empty `inputs` and per-barrel subset extraction is only ordering-stable against a canonically warmed checker. The design is sound; the cost is a once-per-dev-session stall on the first edit. If it proves annoying, warm proactively — kick the full pass on server idle after a disk-served load, so the checker is warm before the first edit lands — rather than weakening the ordering rule.

- [ ] **`src/docs/engine/plugins/virtual-json.ts:85-93`** (with `registry.ts:1`) — the eagerly imported manifest still can't render without a full `getAll()`, so a cold or invalidated cache blocks dev first paint ~4–6s on extraction the open page may never read. #1001 makes this rare (warm restore ~30ms); the residual fix — manifest keys from `listBarrels` alone, extraction deferred to per-key reads — only matters if cold-cache starts prove common (fresh clones, CI previews).

- [ ] **`src/docs/engine/api-reference/engine/link-resolver.ts`** — `createLinkResolver` measures ~36ms per extraction pass (index over every program file); it re-runs per incremental pass via `extractionContext` (`api-extractor.ts:170-179`), ~11% of the 313ms incremental budget. An index scoped to changed files would shave it, but only after the High tier lands.

- [ ] **`src/docs/engine/api-reference/engine/extract-defaults.ts:57-68`** — `resolveConstLiteral` linearly scans top-level statements per identifier default; measured negligible (~0.014ms), fix only if a file with many defaults shows up in the bench.

- [ ] **`src/docs/engine/plugins/docs.ts:86,447-459`** (with `collect-helpers.ts`) — the barrel-tagging and `__code` transforms re-run `ts.createSourceFile` per HMR transform of the same file, unmemoized; cheap next to extraction, worth a content-hash memo only if transform time ever registers.

- [ ] **`src/docs/engine/app.tsx:37`** — `demos.find` scans ~110 demos per App render; a registry `Map` makes it O(1) if App renders ever get hot.

## Bundle

Measured from `pnpm bench:docs:vite --build`: 355 files, 6.65 MB raw / 3.31 MB gzip (js 4.40/1.29 MB, css 187/27 kB). Per-demo splitting works — pdf, map, grid, chart all chunk separately and load on demand. The wins left:

- [ ] **`src/docs/engine/fonts/GoogleSansFlex-VariableFont_….woff2` (1.90 MB)** — the single largest asset, 29% of the bundle, and woff2 doesn't gzip (1.90 MB served). The five-axis variable font ships every axis to render docs chrome. **Fix:** subset to the axes/ranges the docs actually use (`GRAD`/`ROND`/`slnt` are likely unused), or fall back to a static weight pair.

- [ ] **`shiki.js` (560 kB raw / 91 kB gzip)** — still the largest JS chunk after #994's curation; the JS regex engine plus three grammars shouldn't need 560 kB, so the chunk likely retains more than the shim intends (check `stats.html` for stowaway grammars/themes pulled by `shiki/core`). **Fix:** `ANALYZE=1` pass over the chunk; import langs individually if the core bundle retains extras.

- [ ] **`index.js` (324 kB raw / 100 kB gzip)** — the eager entry chunk carries app chrome plus whatever Rollup's default heuristics didn't split; there is no `manualChunks`, so shared vendors (`motion`, `@floating-ui/react`, `@tanstack/*`, `lucide-react`) land by accident and re-shuffle across builds, defeating long-term caching. **Fix:** a small stable vendor grouping via `manualChunks`, verified with `vite-metrics.ts --compare` so the split doesn't grow total gzip.

- [ ] **`states-10m` JSON (112 kB raw / ~35 kB gzip)** — static import in the map demo data; already demo-chunked, but a `fetch` from `public/` would keep it out of the JS graph and let it stream. Marginal.

## Infrastructure

CI never exercises any of this: `docs:build` is not a turbo task, benchmarks have no CI wiring, and no size budget exists — extraction-time, cold-start, build-time, and bundle regressions all ship undetected; CI also always runs #1001's cold-cache path, so the ~3.9s full pass is what any docs build there would pay. The benchmark suites ([`src/__benchmarks__/docs`](../../src/__benchmarks__/docs/README.md): `bench:docs` for ts-morph and the extractor, `bench:docs:vite` for build/dev/bundle) make regressions measurable locally; wiring `docs:build` plus a size assertion into the CI gate is the follow-up once the High tier settles.

---

**See also:** [2026-07-07-DOCS-APP-CORRECTNESS-AUDIT.md](2026-07-07-DOCS-APP-CORRECTNESS-AUDIT.md) · [2026-07-01-PERFORMANCE-AUDIT.md](2026-07-01-PERFORMANCE-AUDIT.md) · [`src/__benchmarks__/docs/README.md`](../../src/__benchmarks__/docs/README.md).
