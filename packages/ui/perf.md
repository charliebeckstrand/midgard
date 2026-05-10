# `packages/ui` Docs Performance Baselines

This file is the source of truth for measured docs performance numbers. **Do not** propose perf fixes without first updating this file with a baseline, and do not merge a perf fix without updating it with post-fix numbers.

The harness (Phase 0 of `~/.claude/plans/i-want-to-do-buzzing-wall.md`) ships the tooling. Phase 1 fills in baselines. Phase 3 records each fix.

---

## How to reproduce

```bash
cd packages/ui

# Bundle composition (writes src/docs/dist/stats.html)
pnpm docs:analyze

# Plain prod build, repeatable wall-time
pnpm docs:build

# deriveCode tree-walk bench
pnpm bench -- derive-code

# Author save-to-pixel HMR probe (requires dev server in another terminal)
pnpm docs &
pnpm perf:hmr

# Cold prod load (Lighthouse against `vite preview`)
pnpm docs:build && pnpm docs:preview &
CHROME_PATH=/path/to/chrome pnpm perf:lighthouse
```

---

## Baselines

> Filled in during Phase 1 at commit `3dacdde`. Hardware: Linux 6.18.5 sandbox, single-VM, Node 22 + pnpm 10.33. All numbers represent a single representative run; treat with ±10% noise band.

### Build wall time (`pnpm docs:build`)

| metric | value | commit |
| --- | --- | --- |
| n=5 wall time (after 1 warmup) | 5.75 / 5.79 / 5.80 / 5.80 / 6.16 s | `3dacdde` |
| median | **5.80 s** | `3dacdde` |
| min / max | 5.75 / 6.16 s | `3dacdde` |

**Plugin time breakdown** (from Rolldown `PLUGIN_TIMINGS`; varies by Vite-cache state):

| plugin | first-build share | warm-build share |
| --- | --- | --- |
| `componentTagsPlugin` | ~91% | ~39% |
| `componentApiPlugin` | ~6% | ~47% |
| `demoMetasPlugin` | ~5% | ~4% |
| `derivedCodePlugin` | (small) | ~4% |

The four custom plugins account for >90% of build time. Cache state shifts which one dominates; `componentTagsPlugin`'s eager scan dominates the cold path, the TS-compiler-based `componentApiPlugin` dominates the warm path.

### Bundle composition (prod)

| metric | value | commit |
| --- | --- | --- |
| total JS, raw | 6,812 kB | `3dacdde` |
| total JS, gzip | **1,733 kB** | `3dacdde` |
| `index-*.css`, gzip | 21.6 kB (147.8 kB raw) | `3dacdde` |
| largest single chunk | `maplibre-gl-*.js` 272.1 kB gzip (1,025 kB raw) | `3dacdde` |

**Top 10 chunks by gzip size:**

| rank | chunk | raw kB | gzip kB |
| --- | --- | --- | --- |
| 1 | `maplibre-gl` | 1025 | 272 |
| 2 | `wasm` (PDF.js) | 622 | 232 |
| 3 | `pdf` | 405 | 121 |
| 4 | `index` (entry) | 376 | 95 |
| 5 | `component` (heavy component split) | 196 | 63 |
| 6 | `cpp` (Shiki grammar) | 626 | 48 |
| 7 | `bundle-web` (Shiki runtime) | 135 | 42 |
| 8 | `php` (Shiki grammar) | 111 | 29 |
| 9 | `blade` (Shiki grammar) | 105 | 28 |
| 10 | `mdx` (Shiki grammar) | 136 | 24 |

**Shiki language grammars present (each is a separate chunk):** angular-ts, blade, c, cpp, css, html, imba, javascript, jsx, less, markdown, mdx, php, python, tsx, typescript, vue-vine, vue, vue-html, wasm, wgsl, wit, xml, yaml — plus light/dark/everforest/catppuccin/vitesse themes. Roughly **300+ kB gzip across language grammars alone**, even with the `shiki/bundle/web` alias.

### Cold prod load (Lighthouse, Fast 3G + 4× CPU simulated, headless desktop)

| route | FCP | LCP | TBT | TTI | Perf |
| --- | --- | --- | --- | --- | --- |
| home (`/`) | 2780 ms | 2953 ms | 135 ms | 3286 ms | 66 |
| `#button` | 2781 ms | 2952 ms | 135 ms | 3285 ms | 66 |
| `#dialog` | 2976 ms | 3352 ms | 57 ms | 3352 ms | 65 |
| `#data-table` | 12754 ms | 13354 ms | 0 ms | 13354 ms | 55 |
| `#query-builder` | 12679 ms | 13204 ms | 0 ms | 13204 ms | 55 |

**Key signal:** `#data-table` and `#query-builder` cold-load at ~13 s, ~4× the light routes. TBT=0 on those slow pages indicates **network/parse-bound, not JS-blocked**: their per-route chunks are large and the bundle splitter isn't isolating maplibre-gl/pdf/Shiki away from the critical path.

### Author save-to-pixel (Vite HMR ack)

Median of n=10 saves per scenario. Probe writes a marker comment, waits for the HMR `update` WebSocket frame, then restores the file.

| edit | median (ms) | p95 (ms) | ok |
| --- | --- | --- | --- |
| leaf component (`button/component.tsx`) | 1.3 | 6.2 | 10/10 |
| barrel (`button/index.ts`) | 1.3 | 1.6 | 10/10 |
| demo file (`docs/demos/button.tsx`) | 3.8 | 6.0 | 10/10 |

**The author loop is already fast.** Even barrel edits — the case First Principles flagged as likely re-paying the TS-compiler plugin — ack in 1.3 ms median. Vite's module cache absorbs the plugin cost on HMR. No action warranted here.

### `deriveCode` tree walk (tinybench, node env, mocked virtual modules)

| fixture | ops/sec | mean | p99 | samples |
| --- | --- | --- | --- | --- |
| small (~10 nodes) | 80,563 | 12.4 µs | 31.6 µs | 40,282 |
| medium (~50 nodes) | 5,153 | 194.1 µs | 386.4 µs | 2,577 |
| heavy (~200 nodes) | 338 | 2,961.7 µs (≈3 ms) | 3,810 µs | 169 |

**Scaling:** small→medium is 15.6× slower (5× input). Medium→heavy is 15.3× slower (4× input). Roughly **O(n^1.8)** — superlinear but bounded. Absolute cost even at 200 nodes is ~3 ms; React render of the same tree dominates that by ~10×. Memoizing `deriveCode` saves microseconds. **Confirmed not a bottleneck.**

### Dev cold-start

| metric | value | commit |
| --- | --- | --- |
| `vite --config vite.docs.config.ts` ready in | 632 ms | `3dacdde` |

(Server-ready, not first-paint. Browser TTI on top will add 1–3 s for the SPA's initial demo preload.)

---

## What this baseline tells us

**Strongest signals (in priority order):**

1. **Heavy demo pages cold-load 4× slower than light ones** (13 s vs 3 s under throttling). TBT=0 → not CPU-bound → chunking issue. `maplibre-gl` (272 kB gz) and `pdf` (121 kB gz) and the Shiki grammar collection likely aren't isolated from non-map / non-pdf / non-code routes.
2. **Build is plugin-bound.** The four custom Vite plugins account for >90% of build wall time (5.8 s). The TS-compiler `componentApiPlugin` dominates the warm path; `componentTagsPlugin`'s eager scan dominates cold.
3. **Shiki grammars are over-included.** ~24 language grammars plus 8+ themes ship as separate chunks. Several (imba, vue-vine, angular-ts, blade, wit, wgsl) are exotic and unlikely to appear in our code blocks.
4. **`maplibre-gl` at 272 kB gzip** dwarfs every other dependency and ships even when no map demo is being viewed (well, in its own chunk — but does the entry route eagerly preload it? Visualizer drill-down needed).

**Confirmed non-issues (don't optimize these):**

- `deriveCode` runtime walk: microseconds even at 200 nodes; already memoized in `Example` (`example.tsx:29`).
- Author HMR: sub-10 ms ack on every scenario; the docs site doesn't suffer from slow inner-loop. First Principles' bet was wrong here.
- Shiki idle lazy-load: already correctly deferred.
- Lazy demo loading: already correctly `import.meta.glob()` without `eager`.

---

## Decision rule

A perf fix lands only if it moves the metric it claims to fix by **≥15%** on the commit it ships against. Anything below threshold is reverted. Bundle size has a CI gate at **+10% regression** from the recorded floor (TODO: wire CI gate after Phase 3).

---

## Change log

| date | commit | change | baseline delta |
| --- | --- | --- | --- |
| 2026-05-10 | `3dacdde` | Phase 1 baselines recorded | — (initial) |
