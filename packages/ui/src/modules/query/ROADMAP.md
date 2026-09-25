# Query roadmap

> **Goal: a first-class query module — a pure, framework-free `engine/` owning the Query domain, with the builder as one view over it and room for read views and adapters beside it.** The editor (`QueryBuilder`) shipped first; this file tracks the module the extraction opened up, one measured piece at a time.

## Status

The engine extraction is done (this change). The Query domain — node and field types, node construction, the operator registry, immutable tree edits, the active/empty judgment, and evaluation — lives in [`engine/`](engine), a d3-shaped functional core laid out like the grid and chart engines: `types.ts`, `query-node.ts`, `query-operators.ts`, `query-tree.ts`, `query-active.ts`, `query-evaluate.ts`. Each is pure and framework-free, imported file-by-file, and covered by its own `*.test.ts` suite so a change is proven correct at the layer it changed.

The builder is now one view wired over that core. `useQueryTree` (module root) holds the controlled/uncontrolled root and the referentially-stable edit actions; `useQueryBuilderTree` composes it with the builder's focus registry, wrapping `remove` to move focus to a surviving neighbor (WCAG 2.4.3). The focus ladder is the builder's own concern in [`query-builder/query-builder-focus.ts`](query-builder/query-builder-focus.ts), not the query's. Grid's filter path reads the same core: `grid/engine/grid-table/options.ts` evaluates a column's query tree through `engine/query-evaluate`, a pure-engine-to-pure-engine edge.

The public surface was unchanged across the move — the barrel re-exports domain symbols from `./engine/*` and view symbols from `./query-builder`, so every consumer (grid, the docs demo, the a11y corpus, the boundary suite) compiled byte-unchanged. The design record for the extraction is [`docs/plans/2026-07-12-QUERY-MODULE-PLAN.md`](../../../docs/plans/2026-07-12-QUERY-MODULE-PLAN.md).

The first read view has landed, proving the thesis. [`engine/query-summary.ts`](engine/query-summary.ts) turns a tree into an ordered token stream (`summarizeQuery`) or a plain line (`formatQuerySummary`), reading each rule through the same `imposesConstraint` judgment the evaluator and `isQueryActive` use, so a blank rule drops out and an inactive query summarizes to nothing. [`QuerySummary`](query-summary.tsx) (module root) renders that stream beside the edit view — each active rule as `field operator value`, joined by AND/OR and bracketed per nested group — needing the core, not the builder. This is the read view the extraction existed to make cheap. The barrel publishes the view and its plain-text form (`formatQuerySummary`).

The serialization adapters have landed. [`engine/query-serialize.ts`](engine/query-serialize.ts) writes a tree as compact JSON for a URL search param (`serializeQuery`) and reads it back (`parseQuery`). The parse follows the repair-and-report model of `parseDashboardSpec`: it returns `{ value, issues }`, drops each node that it cannot read, and gives each node a new id. An optional `fields` list also drops a rule for an unknown field or operator. `formatQuerySql` writes a tree as a SQL condition with bound parameters, and keeps the meaning of `evaluateQuery`. So a query survives a reload, or goes to a backend with no builder. The design record is the follow-up section of the [plan](../../../docs/plans/2026-07-12-QUERY-MODULE-PLAN.md).

One structural guard, `isQueryNode` and `isQueryGroup` in [`engine/query-node.ts`](engine/query-node.ts), now serves the parse, the dashboard spec parse, and the grid's column filter. Before this, the dashboard had a private full guard and the grid checked only `type === 'group'`.

A blank rule now drops out of the fold. Before, `evaluateQuery` and `formatQuerySql` read a rule with no constraint as TRUE, so `A OR (blank)` matched every row while the summary showed `A`. Now the fold drops such a rule, or a group of such rules, with its combinator. The evaluator, the SQL writer, and the summary give the same reading.

A rule with an unknown operator now reads as inactive. Before, `isQueryActive` resolved the operator from the field set. So a rule with an operator that the evaluator does not know read as active. The summary and the chips showed it, but the rows did not change. A value-less operator that the field did not offer read as inactive, but the evaluator applied it. Now one judgment, `imposesConstraint` in `engine/query-evaluate.ts`, decides for all four readers. A rule is active when the evaluator has a matcher for its operator, and the operator reads no value or its value is filled. The judgment reads no field set, so `isQueryActive` takes only the group.

The chip row has landed. [`QueryChips`](query-chips.tsx) (module root) renders the `summarizeQuery` stream as a filter bar. Each active rule is a chip, and the combinators and brackets sit between the chips. The row is a toolbar with one Tab stop. A chip's remove button removes its rule, and a combinator switches between AND and OR. Focus moves to a neighbor chip after a removal, and to the row after the last removal. A `readOnly` row renders text only. Each token now carries the id of its source node, so the row edits the tree through `useQueryTree`.

The chip row is the second consumer of both `useQueryTree` and `summarizeQuery`, which is the condition that this file set for each export (CLAUDE.md §1.1). So the barrel now exports the hook with its option, result, and action types, and the token stream with its token types.

Rule reordering has landed. [`engine/query-tree.ts`](engine/query-tree.ts) adds `moveChild`, which moves a node among its siblings. Each combinator stays in its position, and only the nodes move, so a hidden combinator on the first child never becomes live. `useQueryTree` exposes it as the `move` action. `QueryBuilder` takes an opt-in `reorder` prop, named as `GridProps.reorder` is. With it, each child of a group with more than one child shows a grip. The grip reorders by pointer or by keyboard through the shared dnd-kit sortable hooks, and each group has its own drag context. The announcements name a node by its summary text and its position, from the pure builders in [`engine/query-announcements.ts`](engine/query-announcements.ts).

A `between` rule now reads the span of its data. `QueryField.span` holds the `[min, max]` that a `number` field's data holds. Each bound of the range editor in [`query-builder-rule-value.tsx`](query-builder/query-builder-rule-value.tsx) clamps to it and shows its end of the span as its placeholder, and each bound also clamps to the other, so the pair cannot invert. A range value takes two shares of the rule row, so its two inputs have room beside their steppers. A grid column filter fills the span from the column's faceted unique values, the facet that its `select` options already read. So a blank cell does not pull the minimum to 0, as TanStack's `getFacetedMinMaxValues` does.

## Engine — the substrate

Every domain concept lands in [`engine/`](engine), the module's pure functional core: no `'use client'`, no runtime `react` / `motion` / `@dnd-kit` / `@floating-ui` imports, no `index` barrel (the engine is imported file-by-file), no runtime imports from the module root.

[`engine-purity-boundary.test.ts`](../../__tests__/boundary/engine-purity-boundary.test.ts) holds that invariant for this engine, the grid engine, and the map engine together, so it is a gate rather than a paragraph three modules re-assert.

The [`module-filename-boundary.test.ts`](../../__tests__/boundary/module-filename-boundary.test.ts) suite already enforces the engine's `query-*` filename layout and the `types.ts` exemption, so the folder shape is a gate, not a convention.

## Backlog

- **Per-field value editors.** A custom value-input slot on the rule, for a field whose value isn't a text/number/date/select/boolean primitive (a relation picker, a token input).

- **Move across groups.** A drag moves a node only among its siblings today. A move into another group needs a drop target per group and a rule for the combinator that the node takes there.

---

**See also:** [`index.ts`](index.ts) (the public surface) · [`docs/plans/2026-07-12-QUERY-MODULE-PLAN.md`](../../../docs/plans/2026-07-12-QUERY-MODULE-PLAN.md) (the design record) · [grid `ROADMAP.md` §Engine](../grid/ROADMAP.md) (the invariants this adopts) · [`docs/MODULES.md`](../../../docs/MODULES.md).
