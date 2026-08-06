# Docs benchmarks

Measurement seams for the docs app's two cost centers: the ts-morph API extraction (`src/docs/engine/api-reference`) and the Vite build/dev pipeline.

Run them on demand, to measure a change or to drive one. They are deliberately not wired into CI: every number here is wall clock, and a shared agent moves it further than most real regressions do. CI holds the correctness instead — `api-extractor.test.ts` pins the cross-root link resolution that project scoping must preserve.

Baselines on a 4-core machine, for 313 components / 1223 props: cold full pass ≈ 4.8s (project construction ≈ 1.9s of it; the pre-#1001 tsconfig shape measures ≈ 5.4-6.9s), disk-cache restore ≈ 32ms, per-barrel incremental edit ≈ 182ms, link index ≈ 44ms, prod build ≈ 3s wall on a warm cache. Compare these only against each other, and only from the same machine.

## ts-morph suite — `pnpm bench:docs`

Runs under `vitest.bench.docs.config.ts` (node environment), split from `pnpm bench` because every file pays a multi-second Project setup.

[`project-construction.bench.ts`](project-construction.bench.ts) A/Bs the `openProject` hypotheses — the current barrel-scoped shape (#1001) against the pre-#1001 tsconfig include, `skipFileDependencyResolution`, and glob-scoped file sets — each including checker creation, the cost every cold extraction pays before touching a component. A variant that shrinks the file set must diff extraction output before adoption, and the two fast ones fail that diff: they drop every file outside the seed from the link index, so cross-root TSDoc links resolve to nothing. Hold dependency resolution fixed and the seed no longer moves the number.

[`extraction.bench.ts`](extraction.bench.ts) isolates the per-component extractors (`extractProps`, `extractReferences`, `formatPropType`, annotation extractors, the link-resolver index) on one shared Project, against three fixtures: `Button` (typical), `Heading` (HTML-attribute spread, the `collectAllProperties` worst case), and `Combobox` (widest extractable surface).

[`extractor.bench.ts`](extractor.bench.ts) covers the end-to-end paths through `createApiExtractor` (#1001): cold whole-project `buildApi`, extractor cold, disk-cache restore, and the per-barrel incremental edit a live dev session pays — the same costs the `apiManifestMs` / `apiReextractMs` metrics below observe from outside.

## Vite harness — `pnpm bench:docs:vite`

[`vite-metrics.ts`](vite-metrics.ts) measures what vitest bench can't: prod build wall time, per-chunk raw/gzip bundle sizes (hash-stripped names, so chunks stay comparable across builds), dev-server ready time, entry transform time, and the dev-served extraction cost — first read of `virtual:api-reference-manifest`, then re-reads after two component-source touches: the first edit pays the extractor's one-time warming pass on a disk-served start, the second is the per-barrel steady state.

Typical A/B loop:

```sh
git stash            # or check out the baseline commit
pnpm bench:docs:vite -- --runs 3 --json /tmp/base.json
git stash pop
pnpm bench:docs:vite -- --runs 3 --compare /tmp/base.json
```

`--build` / `--dev` scope a run to one half; `--runs N` repeats for variance (medians are reported alongside raw runs, so instability shows up rather than averaging away).
