# Query roadmap

> **Goal: a first-class query module — a pure, framework-free `engine/` owning the Query domain, with the builder as one view over it and room for read views and adapters beside it.** The editor (`QueryBuilder`) shipped first; this file tracks the module the extraction opened up, one measured piece at a time.

## Status

The engine extraction is done (this change). The Query domain — node and field types, node construction, the operator registry, immutable tree edits, the active/empty judgement, and evaluation — lives in [`engine/`](engine), a d3-shaped functional core laid out like the grid and chart engines: `types.ts`, `query-node.ts`, `query-operators.ts`, `query-tree.ts`, `query-active.ts`, `query-evaluate.ts`. Each is pure and framework-free, imported file-by-file, and covered by its own `*.test.ts` suite so a change is proven correct at the layer it changed.

The builder is now one view wired over that core. `useQueryTree` (module root) holds the controlled/uncontrolled root and the five referentially-stable edit actions; `useQueryBuilderTree` composes it with the builder's focus registry, wrapping `remove` to move focus to a surviving neighbour (WCAG 2.4.3). The focus ladder is the builder's own concern in [`query-builder/query-builder-focus.ts`](query-builder/query-builder-focus.ts), not the query's. Grid's filter path reads the same core: `grid/engine/grid-table/options.ts` evaluates a column's query tree through `engine/query-evaluate`, a pure-engine-to-pure-engine edge.

The public surface was unchanged across the move — the barrel re-exports domain symbols from `./engine/*` and view symbols from `./query-builder`, so every consumer (grid, the docs demo, the a11y corpus, the boundary suite) compiled byte-unchanged. The design record for the extraction is [`docs/plans/2026-07-12-QUERY-MODULE-PLAN.md`](../../../docs/plans/2026-07-12-QUERY-MODULE-PLAN.md).

The first read view has landed, proving the thesis. [`engine/query-summary.ts`](engine/query-summary.ts) turns a tree into an ordered token stream (`summarizeQuery`) or a plain line (`formatQuerySummary`), reading the same active/empty judgement the builder does (`isRuleActive`) so a blank rule drops out and an inactive query summarizes to nothing. [`QuerySummary`](query-summary.tsx) (module root) renders that stream beside the edit view — each active rule as `field operator value`, joined by AND/OR and bracketed per nested group — needing the core, not the builder. This is the read view the extraction existed to make cheap.

## Engine — the substrate

Every domain concept lands in [`engine/`](engine), the module's pure functional core: no `'use client'`, no runtime `react` / `motion` imports, no `index` barrel (the engine is imported file-by-file), no runtime imports from the module root. The greps below all print nothing:

```bash
rg -nP "^\s*import\s+(?!type\b)[^;]*from\s+'(react|react-dom|motion|framer-motion)" packages/ui/src/modules/query/engine

rg -l "'use client'" packages/ui/src/modules/query/engine

find packages/ui/src/modules/query/engine -name 'index.*'
```

The [`module-filename-boundary.test.ts`](../../__tests__/boundary/module-filename-boundary.test.ts) suite already enforces the engine's `query-*` filename layout and the `types.ts` exemption, so the folder shape is a gate, not a convention.

## Backlog

- **Export `useQueryTree`.** The headless hook is internal today — the builder is its only view, and grid drives a controlled `QueryBuilder` without it. Export it from the barrel once a second consumer justifies the surface (CLAUDE.md §1.1).

- **Chip-row summary.** A second rendering of the same `summarizeQuery` stream — each rule token a chip, combinators and brackets the separators between them — for a filter bar that shows and clears constraints individually. The token model already carries what a chip needs; this is a view over it, no engine change.

- **Serialization adapters.** URL-safe round-trip and server filter formats as `engine/` files (`query-serialize`), so a query survives a reload or reaches a backend without the builder in the loop.

- **Per-field value editors.** A custom value-input slot on the rule, for a field whose value isn't a text/number/date/select/boolean primitive (a relation picker, a token input).

- **Rule reordering.** Drag or keyboard reorder of a group's children, over the same immutable `engine/query-tree` edits.

---

**See also:** [`index.ts`](index.ts) (the public surface) · [`docs/plans/2026-07-12-QUERY-MODULE-PLAN.md`](../../../docs/plans/2026-07-12-QUERY-MODULE-PLAN.md) (the design record) · [grid `ROADMAP.md` §Engine](../grid/ROADMAP.md) (the invariants this adopts) · [`docs/MODULES.md`](../../../docs/MODULES.md).
