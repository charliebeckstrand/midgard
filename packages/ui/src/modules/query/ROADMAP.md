# Query roadmap

> **Goal: a first-class query module, with a pure, framework-free `engine/` that owns the Query domain, the builder as one view over it, and room for read views and adapters beside it.** This file describes the module as it is, and what it must absorb next.

## Status

The Query domain lives in [`engine/`](engine), a pure functional core laid out like the grid and chart engines. `types.ts` holds the node and field types, and `query-node.ts` constructs and guards the nodes. `query-operators.ts` holds the operator sets, and `query-tree.ts` holds the immutable tree edits. `query-active.ts` and `query-evaluate.ts` judge and evaluate a tree. `query-summary.ts`, `query-serialize.ts`, `query-announcements.ts`, and `query-messages.ts` serve the read views, the URL, and the announcer. Each file has its own `*.test.ts` suite, so a change is proven at the layer that it changes.

One judgment, `imposesConstraint` in `engine/query-evaluate.ts`, decides if a rule is active. A rule is active when the evaluator has a matcher for its operator, and the operator reads no value or its value is filled. `evaluateQuery`, `isQueryActive`, the summary, and the chips all read it, so they give the same reading. The judgment reads no field set, so `isQueryActive` takes only the group. The fold drops a blank rule, or a group of blank rules, with its combinator. So `A OR (blank)` matches the rows that `A` matches, and the summary shows `A`.

`isQueryNode` and `isQueryGroup` in [`engine/query-node.ts`](engine/query-node.ts) are the one structural guard. `isQueryGroup` reads a node through `isQueryNode`. The dashboard spec parse and the grid column filter read a group through `isQueryGroup`.

`useQueryTree` (module root) holds the controlled or uncontrolled root and the edit actions, which keep their references. It is internal, because no consumer outside the module uses it. `useQueryBuilderTree` composes it with the focus registry of the builder, so a removal moves the focus to a neighbor (WCAG 2.4.3). The focus ladder is in [`query-builder/query-builder-focus.ts`](query-builder/query-builder-focus.ts). The grid filter path evaluates the query tree of a column through `compileQuery`, an edge from one pure engine to another.

## Views

`QueryBuilder` is the edit view. [`QuerySummary`](query-summary.tsx) is a read view that needs the core and not the builder. [`engine/query-summary.ts`](engine/query-summary.ts) turns a tree into an ordered token stream (`summarizeQuery`) or a plain line (`formatQuerySummary`). The view renders each active rule as `field operator value`, joined by AND or OR, with brackets for each nested group. The barrel exports the view, the plain line, and the token stream with its token types.

The summary names each operator, also one that the field does not offer. The label comes from the set of the field, then from the default set of the field type, then from the other built-in sets. So `isEmpty` on a `number` field reads `is Empty`. A blank dashboard selection makes such a rule. A parity test holds the evaluator operators and the built-in sets equal, so no active rule shows a raw operator name.

[`QueryChips`](query-chips.tsx) renders the token stream as a filter bar. Each active rule is a chip, and the combinators and brackets sit between the chips. The row is a toolbar with one Tab stop. The remove button of a chip removes its rule, and a combinator switches between AND and OR. The focus moves to a neighbor chip after a removal, and to the row after the last removal. A `readOnly` row renders text only, and each token carries the id of its source node, so the row edits the tree through `useQueryTree`.

## Adapters

[`engine/query-serialize.ts`](engine/query-serialize.ts) writes a tree as compact JSON for a URL search param (`serializeQuery`) and reads it back (`parseQuery`). The parse follows the repair-and-report model of `parseDashboardSpec`. It returns `{ value, issues }`, drops each node that it cannot read, and gives each node a new id. An optional `fields` list also drops a rule for an unknown field or operator. So a query survives a reload.

## Reorder and move

`QueryBuilder` takes an opt-in `reorder` prop, named as `GridProps.reorder` is. With it, each child of a group with more than one child shows a grip. The grip reorders by pointer or by keyboard over the `Reorder` of Motion, and each group is its own `Reorder.Group`. A pointer drag moves the nodes in a draft order and commits the move once, on the drop. Escape cancels it. The announcements name a node by its summary text and its position, from the pure builders in [`engine/query-announcements.ts`](engine/query-announcements.ts).

`moveChild` in [`engine/query-tree.ts`](engine/query-tree.ts) moves a node among its siblings, as the `move` action. Each combinator stays in its position, and only the nodes move, so a hidden combinator on the first child never becomes live. `moveChildInto` moves a node into another group, as the `moveInto` action. The node takes the combinator of the node that it displaces, or at the end, of the node before it. Each other node keeps its combinator.

In the builder, each group is a drop target. The height of the pointer finds the innermost group and the place among its children (`findDrop` in [`query-builder/query-builder-move.ts`](query-builder/query-builder-move.ts)). The group shows the drop with `data-over`, and a line shows the place. While the drag is over another group, the nodes of its own group stop their draft moves. With the keyboard, the arrow toward the end of the line moves a lifted node into the next group, and the arrow toward the start moves it out of its group. Under `requireRule`, the sole node of a group does not leave it.

## Values

A `between` rule reads the span of its data. `QueryField.span` holds the `[min, max]` that the data of a `number` field holds. Each bound of the range editor in [`query-builder-rule-value.tsx`](query-builder/query-builder-rule-value.tsx) clamps to the span and to the other bound, so the pair cannot invert. Each bound shows its end of the span as its placeholder. A range value takes two shares of the rule row, so its two inputs have room beside their steppers. A grid column filter fills the span from the faceted unique values of the column, so a blank cell does not pull the minimum to 0.

A field whose value is not a primitive, such as a related record or a set of tokens, names a custom editor with `QueryField.editor`. The key is a string, so a field stays data that JSON can hold, and the engine imports no React. [`QueryValueEditorProvider`](query-value-editor-provider.tsx) maps each key to a `QueryValueEditor` component. It is a context and not a prop of the builder, so it reaches a builder that another module renders. A key that no provider holds falls back to the input of the field type. The editor gets the field, the operator, the value, a name, `disabled`, and the lock of the nearest lock scope as `readOnly`.

An editor writes a key or a set of keys, and not an object. A set is a list of one or more strings or numbers, each not blank. [`setOperators`](engine/query-operators.ts) holds `in` and `notIn`. A row matches `in` when its value is one member of the set, and a cell that is a list matches when one of its items is a member. `imposesConstraint` reads the shape, so a value of the wrong shape reads as inactive. No field type offers the set operators by default, because a built-in `select` input writes one value. A field adds them to its `operators`.

A set operator with no custom editor edits its set with a `TagInput`. A change of operator to another shape of value resets the value to the blank value of that shape (`blankValue` in [`engine/query-node.ts`](engine/query-node.ts)). `QueryField.formatValue` gives the display text of a value, such as the name of a record. The summary, the chips, and the names of the rules read it before the option labels, and a set reads as one list with "or". The function is synchronous, because the summary is a pure fold. An app that loads its labels gives a new field when more labels arrive, and until then the summary shows the key.

The composer of the chat has a picker and a token model too, and the query module does not use them. A mention of the chat is a citation: offsets in the text of a `<textarea>`, with a quote that guards them. A rule value has no text that an offset can address. The custom editor composes the parts that the picker of the chat also composes, such as `Combobox`, `Option`, and `useA11yRoving`. A shared hook for the async search waits for a second consumer in the library.

## Engine: the substrate

Every domain concept lands in [`engine/`](engine), the module's pure functional core: no `'use client'`, no runtime `react` / `motion` / `@dnd-kit` / `@floating-ui` imports, no `index` barrel (the engine is imported file-by-file), no runtime imports from the module root.

[`engine-purity-boundary.test.ts`](../../__tests__/boundary/engine-purity-boundary.test.ts) holds that invariant for this engine and each other pure engine together, so it is a gate rather than a paragraph that each module re-asserts.

The [`module-filename-boundary.test.ts`](../../__tests__/boundary/module-filename-boundary.test.ts) suite already enforces the engine's `query-*` filename layout and the `types.ts` exemption, so the folder shape is a gate, not a convention.

## Backlog

- **A custom editor in a grid column filter.** `GridColumn.filterType` takes only a primitive type, and `toQueryField` in the column filter button builds the field from the name, the label, the type, the options, and the span. So a column cannot name a custom editor. The column sheet already renders `QueryBuilder`, so a provider above the grid reaches it. The column needs a way to give `editor`, `formatValue`, and `operators` to its field, because a set editor needs `in` or `notIn`, which no field type offers by default.
- **A read-only builder.** `QueryBuilder` has `disabled` and no `readOnly`, and it sets no lock scope. A read-only view is `QueryChips` with `readOnly` or `QuerySummary` today. A `readOnly` prop can provide the lock scope. The value editor, the buttons, the field and operator selects, and the AND/OR segment read the lock. The segment items take `lockable`, because a `Tab` stays live in a locked scope by default.

---

**See also:** [`index.ts`](index.ts) (the public surface) · [grid `ROADMAP.md` §Engine](../grid/ROADMAP.md) (the invariants this adopts) · [`docs/MODULES.md`](../../../docs/MODULES.md).
