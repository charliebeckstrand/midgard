# `packages/ui` Docs Performance Baselines

This file is the source of truth for measured docs performance numbers. **Do not** propose perf fixes without first updating this file with a baseline, and do not merge a perf fix without updating it with post-fix numbers.

The harness (Phase 0 of `~/.claude/plans/i-want-to-do-buzzing-wall.md`) ships the tooling. Phase 1 fills in baselines. Phase 3 records each fix.

---

## How to reproduce

```bash
cd packages/ui

# Bundle composition (writes dist/stats.html)
pnpm docs:analyze

# Plain prod build, repeatable wall-time
pnpm docs:build

# deriveCode tree-walk bench
pnpm bench -- derive-code

# Author save-to-pixel HMR probe (requires dev server)
pnpm dev &
pnpm perf:hmr

# Cold prod load (Lighthouse against `vite preview`)
pnpm perf:lighthouse
```

---

## Baselines

> Filled in during Phase 1. Each row should reference the commit it was measured at.

### Build wall time

| metric | value | commit | notes |
| --- | --- | --- | --- |
| `pnpm docs:build` median (n=5) | _todo_ | _todo_ | hyperfine 3 warmup, 5 runs |
| `pnpm build` (library only) median (n=5) | _todo_ | _todo_ | |

### Bundle composition (prod)

| metric | value | commit |
| --- | --- | --- |
| total JS, gzip | _todo_ | _todo_ |
| largest chunk, gzip | _todo_ | _todo_ |
| top 5 chunks (gzip, name) | _todo_ | _todo_ |
| Shiki gzip | _todo_ | _todo_ |
| React gzip | _todo_ | _todo_ |

### Cold prod load (Lighthouse, Fast 3G + 4× CPU)

Per representative route: `#home`, `#button`, `#dialog`, `#data-table`, `#query-builder`.

| route | FCP | LCP | TBT | TTI | Perf score |
| --- | --- | --- | --- | --- | --- |
| home | _todo_ | _todo_ | _todo_ | _todo_ | _todo_ |
| button | _todo_ | _todo_ | _todo_ | _todo_ | _todo_ |
| dialog | _todo_ | _todo_ | _todo_ | _todo_ | _todo_ |
| data-table | _todo_ | _todo_ | _todo_ | _todo_ | _todo_ |
| query-builder | _todo_ | _todo_ | _todo_ | _todo_ | _todo_ |

### Author save-to-pixel (HMR ack)

Median of n=10 saves per scenario. Probe touches the file and waits for the Vite HMR WebSocket update event.

| edit | median ack (ms) | p95 (ms) | commit |
| --- | --- | --- | --- |
| `src/components/button/component.tsx` | _todo_ | _todo_ | _todo_ |
| `src/components/button/index.ts` (barrel) | _todo_ | _todo_ | _todo_ |
| `src/docs/demos/button.tsx` | _todo_ | _todo_ | _todo_ |

### `deriveCode` tree walk (tinybench)

| fixture | ops/sec | mean (µs) | commit |
| --- | --- | --- | --- |
| small (~10 nodes) | _todo_ | _todo_ | _todo_ |
| medium (~50 nodes) | _todo_ | _todo_ | _todo_ |
| heavy (~200 nodes) | _todo_ | _todo_ | _todo_ |

### Dev cold-start

| metric | value | commit |
| --- | --- | --- |
| `pnpm dev` → docs first paint | _todo_ | _todo_ |

---

## Decision rule

A perf fix lands only if it moves the metric it claims to fix by **≥15%** on the commit it ships against. Anything below threshold is reverted. Bundle size has a CI gate at **+10% regression** from the recorded floor.

---

## Change log

| date | commit | change | baseline delta |
| --- | --- | --- | --- |
| _todo_ | _todo_ | _todo_ | _todo_ |
