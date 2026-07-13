# Docs benchmarks

Measurement seams for the docs app's two cost centers: the ts-morph API extraction (`src/docs/engine/api-reference`) and the Vite build/dev pipeline. Baselines from 2026-07-13: `buildApi` ≈ 9.8s (~7.1s Project construction, ~2.1s checker creation, the rest extraction) at ~1.1 GB RSS for 310 components / 1132 props; prod build ≈ 16s wall; the docs audit ([2026-07-13-DOCS-PERF-AUDIT.md](../../../docs/audits/2026-07-13-DOCS-PERF-AUDIT.md)) carries the findings these suites guard.

## ts-morph suite — `pnpm bench:docs`

Runs under `vitest.bench.docs.config.ts` (node environment), split from `pnpm bench` because every file pays a multi-second Project setup.

[`project-construction.bench.ts`](project-construction.bench.ts) A/Bs the `openProject` hypotheses — the current tsconfig-rooted shape against `skipFileDependencyResolution` and glob-scoped file sets — each including checker creation, the cost every extraction pays before touching a component.

[`extraction.bench.ts`](extraction.bench.ts) isolates the per-component extractors (`extractProps`, `extractReferences`, `formatPropType`, annotation extractors, the link-resolver index) on one shared Project, against three fixtures: `Button` (typical), `Heading` (HTML-attribute spread, the `collectAllProperties` worst case), and `Grid` (widest real surface).

[`build-api.bench.ts`](build-api.bench.ts) runs the full `buildApi` end to end — the number the dev server pays on first manifest read and on every HMR invalidation. Extraction-caching work should move this and the `apiReextractMs` metric below, while the micro benches confirm which layer the win came from.

## Vite harness — `pnpm bench:docs:vite`

[`vite-metrics.ts`](vite-metrics.ts) measures what vitest bench can't: prod build wall time, per-chunk raw/gzip bundle sizes (hash-stripped names, so chunks stay comparable across builds), dev-server ready time, entry transform time, and the dev-served extraction cost — first read of `virtual:api-reference-manifest`, then a re-read after touching a component source to trigger the HMR invalidation path.

Typical A/B loop:

```sh
git stash            # or check out the baseline commit
pnpm bench:docs:vite -- --runs 3 --json /tmp/base.json
git stash pop
pnpm bench:docs:vite -- --runs 3 --compare /tmp/base.json
```

`--build` / `--dev` scope a run to one half; `--runs N` repeats for variance (medians are reported alongside raw runs, so instability shows up rather than averaging away).
