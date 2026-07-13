# Docs benchmarks

Measurement seams for the docs app's two cost centers: the ts-morph API extraction (`src/docs/engine/api-reference`) and the Vite build/dev pipeline. Baselines from 2026-07-13, after #1001's incremental disk-cached extractor: cold full pass ≈ 3.9s (barrel-scoped Project ≈ 1.7s of it; the pre-#1001 tsconfig shape measured 9.8s), disk-cache restore ≈ 30ms, per-barrel incremental edit ≈ 313ms, prod build ≈ 3s wall on a warm cache, for 310 components / 1132 props; the docs audit ([2026-07-13-DOCS-PERF-AUDIT.md](../../../docs/audits/2026-07-13-DOCS-PERF-AUDIT.md)) carries the findings these suites guard.

## ts-morph suite — `pnpm bench:docs`

Runs under `vitest.bench.docs.config.ts` (node environment), split from `pnpm bench` because every file pays a multi-second Project setup.

[`project-construction.bench.ts`](project-construction.bench.ts) A/Bs the `openProject` hypotheses — the current barrel-scoped shape (#1001) against the pre-#1001 tsconfig include, `skipFileDependencyResolution`, and glob-scoped file sets — each including checker creation, the cost every cold extraction pays before touching a component; variants that shrink the file set must diff extraction output before adoption.

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
