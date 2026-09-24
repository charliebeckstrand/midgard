# Query Module — Design Plan — 2026-07-12

What graduating `query` to a first-class module means, piece by piece. Companion to the module trackers ([grid](../../src/modules/grid/ROADMAP.md), [chart](../../src/modules/chart/ROADMAP.md), [map](../../src/modules/map/ROADMAP.md)); this doc holds the design, and the query ROADMAP it proposes will track status once the extraction lands.

## Thesis

The module is heading at **the shape grid and chart settled: a pure, framework-free `engine/` owning the Query domain, with the React shell as one view wired over it**. Today the entire domain — the node types, factories, operator registry, tree operations, evaluator, and activity test — lives inside `query-builder/`, an editor component's folder, so every consumer of the *query model* imports it from under the *query editor*. The move is to strip that Query line out of the builder into `engine/`, then wire the builder — and the grid's filter path — back into it. Nothing renames on the public surface; the extraction gives the domain its own address and the module room to grow read views (a summary line, chips) and adapters beside the edit view instead of inside it.

## Current state (verified in tree, 2026-07-12)

- **One sub-tree.** `modules/query/` holds only `query-builder/` plus a barrel. No `engine/`, no `ROADMAP.md` — the only module missing both (`chat` also lacks a ROADMAP but keeps its hooks and context at module root; `grid`, `chart`, `map` carry the full shape).

- **The domain is already pure; it just lives with the view.** `query-builder/types.ts` (the node and field types), `query-builder-evaluate.ts` (matchers, `matchQueryRule`, `evaluateQuery`), and most of `query-builder-utilities.ts` (`createRule`, `createGroup`, `getOperators`, `mapNode`, `addChild`, `removeChild`, `hasRules`, `isEmptyValue`, `isQueryActive`) import no React and carry no `'use client'` — engine-grade code filed under a component.

- **One file mixes two layers.** `query-builder-utilities.ts` interleaves the query domain with the builder's focus ladder (`FocusTarget`, `findFocusTarget`, `focusKeys`, `focusKeyOf`) — pure functions, but their subject is the editor's DOM focus (the WCAG 2.4.3 removal ladder), not the query.

- **The state hook mixes two layers the same way.** `use-query-builder-tree.ts` interleaves the controlled/uncontrolled tree (`useControllable` + the five stable actions) with the focus registry and pending-focus effect.

- **Grid's engine reaches under the builder.** `grid/engine/grid-table/options.ts` imports `evaluateQuery` from the query barrel — a runtime import that pulls a `'use client'`-bearing surface into grid's pure engine, exactly the layering the grid ROADMAP's engine invariants exist to keep out. A pure query engine turns that edge pure-to-pure.

- **Everything else consumes the barrel.** `grid-column-filter-button.tsx` (builder + `createGroup`/`createRule`/`isQueryActive`), the docs demo, the a11y corpus, and the boundary test all import `modules/query`; the pure test suites and `query-builder.bench.ts` deep-import `query-builder/types` and `use-query-builder-tree` directly and move with the files.

## Design — target layout

```
modules/query/
	ROADMAP.md              — the module tracker (new)
	index.ts                — public barrel, names unchanged
	use-query-tree.ts       — headless tree state (extracted, module root)
	engine/                 — the Query line, pure
		types.ts              — moved verbatim from query-builder/types.ts
		query-node.ts         — nextId, defaultValueFor, createRule, createGroup
		query-operators.ts    — defaultOperators, getOperators
		query-tree.ts         — mapNode, addChild, removeChild, hasRules
		query-active.ts       — isEmptyValue, isRuleActive, isQueryActive
		query-evaluate.ts     — matchers, matchQueryRule, evaluateQuery
	query-builder/          — the edit view
		index.ts              — slims to the view surface
		query-builder.tsx     — unchanged shell, imports retargeted
		query-builder-group.tsx · query-builder-rule.tsx · query-builder-rule-value.tsx
		query-builder-focus.ts — FocusTarget, findFocusTarget, focusKeys, focusKeyOf
		context.tsx           — the four narrow contexts, unchanged
		use-query-builder-tree.ts — composes use-query-tree + the focus registry
```

### The engine (the extracted Query line)

Five files plus `types.ts`, split by concept along the seams the current code already draws: node identity and construction (`query-node`), the operator registry (`query-operators`), immutable tree edits (`query-tree`), the active/empty judgement (`query-active`), and evaluation (`query-evaluate`). `query-active` and `query-evaluate` stay separate files but share `isEmptyValue` through a plain import, preserving the documented builder/evaluator agreement on what counts as empty. The layout is the one `module-filename-boundary.test.ts` already codifies — `query-*` names directly under `engine/`, `types.ts` exempt, no `index` barrel, imported file-by-file — and the grid engine's invariants hold verbatim: no `'use client'`, no runtime `react`/`motion` imports, no runtime imports from the module root. The same greps guard it, moved into the query ROADMAP:

```bash
rg -nP "^\s*import\s+(?!type\b)[^;]*from\s+'(react|react-dom|motion|framer-motion)" packages/ui/src/modules/query/engine

rg -l "'use client'" packages/ui/src/modules/query/engine

find packages/ui/src/modules/query/engine -name 'index.*'
```

### Wiring the builder back in

`use-query-builder-tree.ts` splits along its two layers. The state half becomes module-root `use-query-tree.ts` — chat's precedent for module-level hooks — owning the `useControllable` tree and the five referentially-stable actions (`updateRule`, `updateCombinator`, `addRule`, `addGroup`, `remove`), typed as `QueryTreeActions` (today's `QueryBuilderActions`, which `context.tsx` re-aliases so its consumers don't move). The focus half stays in the builder: `use-query-builder-tree.ts` becomes the composition — call `useQueryTree`, wrap `remove` to compute the focus ladder from the pre-removal tree, own the registry and the pending-focus effect. The focus ladder itself (`findFocusTarget` and friends) moves from `query-builder-utilities.ts` into a new `query-builder-focus.ts`, which empties the utilities file entirely: every symbol in it lands in either the engine or the focus file, and the file is deleted.

`useQueryTree` is deliberately **not** exported from the barrel in this pass — the builder is its only view, and grid's filter button drives a controlled `QueryBuilder` without needing it. Exporting it is the first ROADMAP backlog row, taken when a second view (the summary line) exists to justify the surface (CLAUDE.md §1.1).

### Grid rewire

`grid/engine/grid-table/options.ts` retargets its import to `modules/query/engine/query-evaluate` — the sanctioned sibling reach past a barrel for a leaf module (CONVENTIONS.md §3.5), and now a pure-engine-to-pure-engine edge with no `'use client'` on the chain. `grid-column-filter-button.tsx` is a client component composing the builder, so it keeps importing the `../query` barrel unchanged.

### Public surface

The barrel keeps every current export under its current name — `QueryBuilder` and its sub-components, `useQueryBuilderContext`, `evaluateQuery`, `matchQueryRule`, `createRule`, `createGroup`, `getOperators`, `isQueryActive`, `mapNode`, `addChild`, `removeChild`, and the types with their `QueryGroupNode`/`QueryRuleNode` aliases — so grid, the demo, the a11y corpus, and the boundary suite compile byte-unchanged; that is the compatibility proof. What changes is provenance: the barrel draws domain symbols from `./engine/*` (chart's precedent of deep engine re-exports from the module barrel) and view symbols from `./query-builder`, whose own `index.ts` slims to the view surface.

### ROADMAP.md

The module gets its tracker in the map ROADMAP's shape — goal line, status, backlog — created with this extraction as its status baseline. Backlog candidates, none taken in this pass: exporting `useQueryTree` alongside a second view; a **query summary line** (the human-readable read view — a sentence or chip row over the same tree — the piece the extraction exists to make cheap); serialization adapters (URL-safe round-trip, server filter formats) as engine files; per-field custom value editors on the rule slot; rule reordering.

### Follow-up: serialization adapters (2026-09-24)

The serialization adapters backlog row is done. [`engine/query-serialize.ts`](../../src/modules/query/engine/query-serialize.ts) holds three pure functions, and the barrel exports each one.

`serializeQuery` writes a tree as compact JSON for a URL search param: a group is `[combinator, children]`, and a rule is `[combinator, field, operator, value]`. The form has no ids, so an equal query gives an equal string.

`parseQuery` reads that form back. It follows the repair-and-report model of `parseDashboardSpec`: it returns `{ value, issues }`, drops each node that it cannot read, keeps each other node, and gives each node a new id. An optional `fields` list also drops a rule whose field or operator the list does not offer. The parse reads groups to a depth of 32 levels, because the URL is input that the app does not control.

`formatQuerySql` writes a tree as a SQL condition with bound parameters, for a backend. It keeps the meaning of `evaluateQuery`: the fold goes left to right with no `AND` over `OR` precedence, text matches ignore case, and a rule with no constraint drops out.

No TanStack package in the tree serializes a filter tree. `react-table` filters in memory, `react-query` caches, and `react-virtual` windows rows. So the adapters use no TanStack code. The URL string is a stable part of a TanStack Query `queryKey`, and `formatQuerySql` serves the query trees that a manual-mode grid gives through its TanStack column filters.

The same change moves one structural guard into the engine. `isQueryNode` and `isQueryGroup` in `engine/query-node.ts` replace the private guard of `dashboard-spec-parse.ts` and the `type`-only `isQueryGroup` of `grid/engine/grid-table/views.ts`. The grid's column filter now reads a malformed tree as no filter. Each tree that `createGroup`, `createRule`, or `parseQuery` makes passes the guard.

### Follow-up: blank rules and the chip row (2026-09-24)

A rule with no constraint now drops out of the fold, with its combinator. Before this change, `evaluateQuery` and `formatQuerySql` read such a rule as TRUE. TRUE is the identity of `AND` but it absorbs `OR`, so `A OR (blank)` matched every row, and the summary showed only `A`. A blank rule is usual in the builder: a new rule is blank until the user types a value. The fold now skips each child that puts no constraint on the rows, and a group of such children is such a child too. So the evaluator, the SQL writer, and the summary give the same reading. A `between` rule whose value is not a tuple also puts no constraint on the rows now, as the SQL writer already read it.

[`query-chips.tsx`](../../src/modules/query/query-chips.tsx) is the second renderer of the `summarizeQuery` stream. Each token now carries the id of its source node. A rule token and a bracket name their own node. A combinator token names the node whose `combinator` it shows, which is the next active node. The sentence renderers ignore the ids.

`QueryChips` holds its tree through `useQueryTree`, so it is controlled or uncontrolled as the builder is. An interactive row is a toolbar over the remove buttons and the combinator switches, with `useA11yRoving` for one Tab stop. It does not compose `Toolbar`, because `Toolbar` writes its own `data-slot` after the spread and takes no ref. The chart legend and the map legend make the same choice. Delete and Backspace on a remove button also remove the rule, as on a `TagInput` chip. A hidden element holds the full `formatQuerySummary` sentence as the row's description, because a screen reader hears only the focused control inside a toolbar.

Focus after a removal follows the builder's ladder: the previous chip, then the next chip. After the last removal, the row itself takes focus and shows `emptyLabel`. So an interactive row stays mounted when the query has no constraint, and only a `readOnly` row renders `null`. A consumer that hides the empty row owns the focus that the row gave up.

The chip row is the second consumer of `useQueryTree` and of `summarizeQuery`, which met the condition for both exports. The barrel exports `useQueryTree` with `QueryTreeActions`, `QueryTreeOptions`, and `QueryTreeResult`, and `summarizeQuery` with `QuerySummaryToken` and `QuerySummaryRuleToken`. `spacedBefore` stays internal, because a chip row spaces its tokens with the flex gap.

### Follow-up: rule reordering (2026-09-24)

`moveChild(tree, id, toIndex)` in [`engine/query-tree.ts`](../../src/modules/query/engine/query-tree.ts) moves a node among the children of its own group. It clamps `toIndex` to the group, and it returns the same tree when nothing moves, as the other tree edits do.

The combinators stay in their positions, and only the nodes move. A node's `combinator` joins it to the node before it, so the other choice, where a combinator moves with its node, changes the query in two hidden ways. A node that moves to the top hides its combinator. The node that was first then shows a combinator that the user never saw. With fixed positions, the AND/OR between two positions stays the same through a move, and each node takes the combinator of its new position. When every combinator in a group is the same, the two choices give the same tree.

`QueryBuilder` takes an opt-in `reorder` prop, which defaults to `false`. The name follows `GridProps.reorder`, the closest module precedent. `List` uses `sortable`, but the grid uses `sortable` for sort order, and a builder often sits beside a grid. The grid column filter and the dashboard do not change.

Each group with more than one child has its own `DndContext`, through the shared `useSortableList`. So a node moves only among its siblings, and the grips of a nested group belong to the nested context. Each child gets a grip button beside it. The grip is the only drag activator, so the selects and inputs of a rule never start a drag. The combinator segment sits outside the node that the grip moves, which keeps each AND/OR in its position on the screen too. The segments fade during a drag, because the nodes pass over them. The held node translates with no scale, because a scale distorts nodes of different heights.

The keyboard uses dnd-kit's own sensor, as the grid and the dashboard do: Space or Enter picks the node up, the arrow keys move it, Space or Enter drops it, and Escape cancels. The List and Kanban handlers move focus between items with the arrow keys, but the controls of a rule take the arrow keys. The announcements replace dnd-kit's default text, which reads the generated ids. The pure builders in `engine/query-announcements.ts` name a node by its summary text and its position, as the List strings do.

A move into another group stays in the backlog. It needs a drop target for each group, and a rule for the combinator that the node takes in its new group.

### Follow-up: bounds from the column's span (2026-09-24)

`QueryField.span` is the `[min, max]` that the data of a `number` field holds. The range editor of a `between` rule reads it in two ways. Each bound shows its end of the span as its placeholder (`18` and `65`). The number alone fits beside the steppers of a narrow input, where `Min 18` clips. Each bound also clamps to the span, through the `min` and `max` of its `NumberInput`, which clamps on blur and stops its steppers at the ends.

Each bound also clamps to the other bound, with or without a span, so the pair cannot invert and select no rows. A saved bound outside the span keeps its value until the user edits it, because `NumberInput` clamps only an edit. The limits of the other input then stay in order, so no input gets a `min` above its `max`.

A grid column filter fills the span. `GridColumnFilter.span` takes the numbers among the column's faceted unique values, the facet that a `select` filter already reads for its options. So it adds no second facet to the table. TanStack's `getFacetedMinMaxValues` maps each value through `Number`, which reads a null cell as 0, so a column with blank cells would get a minimum of 0. The span comes from the rows that the other filters leave, as the unique values do, and it is `undefined` under server-side filtering. A standalone `QueryBuilder` sets `span` on the field itself.

The parts of a rule row now share the row from a zero basis, and a range value takes two shares. Before, the field, the operator, and the value each took a third, so each input of a range got a sixth of the row, and most of that went to its steppers. Below `sm` the parts stack at full width, as before. A box holds the value editor as the part, because an `Input` with affixes puts its `className` on the inner `<input>`, not on the frame that the row sizes. Each part takes `min-w-0`, so the intrinsic width of an input cannot break the shares.

## Non-goals

- **No behavior change** — every moved function moves verbatim; the tree, operator, and evaluation semantics (including the empty-value agreement and left-to-right combinator fold) are untouched.

- **No new public exports** — `useQueryTree` stays internal; the barrel's surface is frozen through the move.

- **No serialization, no summary view** — designed for, filed to backlog.

- **No focus rework** — the ladder, registry, and pending-focus effect move files without changing shape.

## Tests

The pure suites move with their subjects: `query-builder-utilities.test.ts` splits into `query-tree.test.ts`, `query-node.test.ts` + `query-operators.test.ts`, `query-active.test.ts`, and a builder-side `query-builder-focus.test.ts`; `query-builder-evaluate.test.ts` renames to `query-evaluate.test.ts`; `use-query-builder-tree.test.ts` splits its state cases onto `use-query-tree.test.ts` and keeps the focus cases. Deep imports retarget (`query-builder/types` → `engine/types`). The boundary suite (`boundary/query-builder.test.tsx`), the a11y corpus entry, and the grid column-filter suite run unchanged — they exercise the frozen barrel. `query-builder.bench.ts` retargets its pure imports to the engine; the render bench imports the barrel and is untouched. `module-filename-boundary.test.ts` newly bites on the engine layout for free; the engine-invariant greps live in the ROADMAP as with grid.

## Docs surface

Per CLAUDE.md §3.5 / CONVENTIONS.md §12: TSDoc travels with every moved symbol in the same change; the barrel's exports don't change, so `MODULES.md` stays as-is; the new `ROADMAP.md` joins the module and this plan doc holds the design record. No `COMPONENTS.md`/`HOOKS.md` entries — modules index separately.

## Suggested PR slicing

| PR | Scope | Size |
|---|---|---|
| 1 | Engine extraction: move types + five engine files, retarget module-internal imports, freeze the barrel, move/split the pure test suites and bench imports | M |
| 2 | Builder wire-in: `use-query-tree.ts` / `query-builder-focus.ts` split, delete `query-builder-utilities.ts`, split the hook tests; grid engine retarget to `query/engine/query-evaluate` | S |
| 3 | `ROADMAP.md` with the invariant greps and backlog | S |

---

**See also:** [`MODULES.md`](../MODULES.md) · [`../../src/modules/query/index.ts`](../../src/modules/query/index.ts) (the frozen surface) · [grid `ROADMAP.md` §Engine](../../src/modules/grid/ROADMAP.md) (the invariants this adopts) · [`2026-07-08-GRID-EDITING-PLAN.md`](2026-07-08-GRID-EDITING-PLAN.md) (plan-doc precedent).
