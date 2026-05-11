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

> Filled in during Phase 1 at commit `3dacdde`. Hardware: Linux 6.18.5 sandbox, single-VM, Node 22 + pnpm 10.33. All numbers represent a single representative run; treat with ±10% noise band on direct measurements; **Lighthouse simulated metrics are bimodal at this scale, ±5×** — see "Known noise" below.

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

**Note:** Lighthouse's simulated FCP/LCP at this scale is bimodal: re-running the same URL on the same build produces ~3 s in some runs and ~12.5 s in others (verified n=3 on `#button`). The 4× gap visible here between light and heavy routes is **not reproducible** — it's the simulation's variance, not a real signal. Treat single-shot Lighthouse numbers as illustrative only; use direct browser timing (next section) for change detection.

### Real-world per-route load (Playwright, no throttling)

Direct browser navigation, fresh chrome instance, measure to `networkidle`. Reproducible run-to-run.

| route | requests | bytes (kB) | networkidle (ms) | first paint (ms) |
| --- | --- | --- | --- | --- |
| `/` | 234 | 3497.8 | 2625 | 76 |
| `#button` | 234 | 3497.8 | 2660 | 88 |
| `#dialog` | 234 | 3497.8 | ~2500 | 64 |
| `#data-table` | 234 | 3497.8 | 2649 | 76 |
| `#query-builder` | 234 | 3497.8 | 2553 | 84 |

**Key signal:** every route loads the **same** 234 requests / 3.5 MB on networkidle, regardless of which demo the user wanted. This is the idle pump in `app.tsx` fanning out to all 104 demos. First paint itself (the 56-88 ms numbers) is decoupled and already fast — the waste is purely post-paint over-fetching.

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

1. **Idle pump pre-fetches every demo on every page load** (`app.tsx:46`). Every route ends up with 234 requests / 3.5 MB on networkidle, regardless of which demo was visited. **Fixed — see the post-fix section below.**
2. **Build is plugin-bound.** The four custom Vite plugins account for >90% of build wall time (5.8 s). The TS-compiler `componentApiPlugin` dominates the warm path; `componentTagsPlugin`'s eager scan dominates cold. **No fix proposed:** 5.8 s is acceptable build time and the plugins do useful work.
3. **Shiki grammars are over-included.** ~24 language grammars plus 8+ themes ship as separate chunks. Several (imba, vue-vine, angular-ts, blade, wit, wgsl) are exotic and unlikely to appear in our code blocks. **Deferred:** these are lazy chunks, not in the critical path; impact is minimal post fix #1.
4. **`maplibre-gl` at 272 kB gzip** dwarfs every other dependency. Verified isolated to the map demo's lazy chunk; not on the critical path. **No action needed.**

**Confirmed non-issues (don't optimize these):**

- `deriveCode` runtime walk: microseconds even at 200 nodes; already memoized in `Example` (`example.tsx:29`).
- Author HMR: sub-10 ms ack on every scenario; the docs site doesn't suffer from slow inner-loop. First Principles' bet was wrong here.
- Shiki idle lazy-load: already correctly deferred.
- Lazy demo loading: already correctly `import.meta.glob()` without `eager`.

## Known noise

- **Lighthouse simulated FCP/LCP is bimodal** at 5× spread (verified n=3 on `#button`: 2808 ms / 2931 ms / 12455 ms). Use direct browser timing (Playwright `networkidle` + `firstPaint`) for change detection. Lighthouse numbers are kept as smoke signals only.
- Build wall time has ~7% noise across the 5-run sample; treat anything under 15% as no signal.

## Post-fix measurements

### Fix 1 — drop all-demos idle preload (`app.tsx`)

`app.tsx:37-65` was iterating over all 104 demos, calling `preloadDemo()` on each via `requestIdleCallback`. Sidebar hover/focus prefetch already covers user navigation. Replaced the 25-line pump with a one-shot `loadShiki()` warmup.

| metric | before | after | Δ |
| --- | --- | --- | --- |
| `/` requests on networkidle | 234 | **33** | **−86%** |
| `#button` requests | 234 | **33** | **−86%** |
| `#dialog` requests | 234 | **44** | **−81%** |
| `#data-table` requests | 234 | **54** | **−77%** |
| `#query-builder` requests | 234 | **49** | **−79%** |
| `/` networkidle (ms) | 2625 | **935** | **−64%** |
| `#button` networkidle | 2660 | **933** | **−65%** |
| `#data-table` networkidle | 2649 | **1023** | **−61%** |
| `/` total bytes (kB) | 3497.8 | **2838.4** | **−19%** |
| `#button` bytes | 3497.8 | **2838.4** | **−19%** |
| Lighthouse FCP/LCP (any route) | n/a | within noise band (see above) | no change |
| Build wall time | 5.80 s | 5.74 s (1 sample) | no change |
| HMR ack | 1.3-3.8 ms | 1.3-3.8 ms | no change |
| `deriveCode` bench | 12-2961 µs | 12-2961 µs | no change |

**Decision rule check:** request count and networkidle move ≥60%, well over the 15% threshold. Fix lands.

---

## Decision rule

A perf fix lands only if it moves the metric it claims to fix by **≥15%** on the commit it ships against. Anything below threshold is reverted. Bundle size has a CI gate at **+10% regression** from the recorded floor (TODO: wire CI gate after Phase 3).

---

## Change log

| date | commit | change | baseline delta |
| --- | --- | --- | --- |
| 2026-05-10 | `3dacdde` | Phase 1 baselines recorded | — (initial) |
| 2026-05-11 | (this) | Drop all-demos idle preload from `app.tsx`; keep hover/focus prefetch | requests −86%, networkidle −64%, bytes −19% |
