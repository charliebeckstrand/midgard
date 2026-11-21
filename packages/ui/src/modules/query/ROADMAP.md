# Query roadmap

> **Goal: make the builder safe in each lock scope, and give the engine the operators that real data needs.** The engine, the views, and the URL adapter work. The next work closes the gaps that the lock scope, the date type, and the grid filter show.

## Status

The query module edits, reads, and evaluates a tree of rules and groups. `QueryBuilder` is the edit view. `QuerySummary` and `QueryChips` are read views over one token stream. `serializeQuery` and `parseQuery` write a tree to a URL and read it back.

One judgment, `imposesConstraint` in [`engine/query-evaluate.ts`](engine/query-evaluate.ts), decides if a rule is active. `evaluateQuery`, `compileQuery`, `isQueryActive`, the summary, and the chips all read it. The judgment reads no field set. A property test in `query-evaluate.test.ts` holds `compileQuery` equal to `evaluateQuery`.

The fold reads the children of a group from left to right, with no AND or OR precedence. A rule that puts no constraint on the rows drops out with its combinator. So `A OR (blank)` matches the rows that `A` matches, and the summary shows `A`.

The evaluator knows each operator by its name. A parity test in `query-operators.test.ts` holds the names of the matchers equal to the built-in operator sets. So the summary finds a label for each operator that the evaluator applies.

`isQueryGroup` in [`engine/query-node.ts`](engine/query-node.ts) is the one structural guard. It reads groups to `MAX_DEPTH`. The dashboard spec parse and the grid column filter read a stored tree through it.

The tree edits in [`engine/query-tree.ts`](engine/query-tree.ts) keep the identity of each subtree that they do not touch. So the memo of each rule and group renders only the edited path. `moveChild` keeps each combinator in its position. `moveChildInto` gives the moved node the combinator of the place that it enters. `query-tree.test.ts` holds both rules.

`parseQuery` repairs and reports, as `parseDashboardSpec` does. It drops each node that it cannot read and gives each node a new id. A property test in `query-serialize.test.ts` holds the round trip.

A field can name a custom value editor with `QueryField.editor`. [`QueryValueEditorProvider`](query-value-editor-provider.tsx) maps each key to a component. A set operator (`setOperators`) with no custom editor edits its set with a `TagInput`. `QueryField.formatValue` gives the display text of a key. `query-value-editor.test.tsx` holds the editor contract under jsdom.

A removal moves the focus to a neighbor (WCAG 2.4.3), through `useQueryRemovalFocus`. `query-builder-focus.test.ts` and the removal cases of `query-builder.test.tsx` hold the ladder.

Under `reorder`, the builder moves nodes over the `Reorder` of Motion. The module loads no `@dnd-kit`, and [`list-dnd-boundary.test.ts`](../../__tests__/boundary/list-dnd-boundary.test.ts) holds that rule.

## Engine

The Query domain lives in [`engine/`](engine), a pure functional core. It has no `'use client'` and no runtime `react`, `motion`, `@dnd-kit`, or `@floating-ui` import. It has no `index` barrel and no runtime import from the module root. [`engine-purity-boundary.test.ts`](../../__tests__/boundary/engine-purity-boundary.test.ts) holds this invariant for each pure engine together.

[`module-filename-boundary.test.ts`](../../__tests__/boundary/module-filename-boundary.test.ts) holds the `query-*` file names of the engine and the `types.ts` exemption.

## Features

1. **A read-only builder (*P1*).** `QueryBuilder` has `disabled` and no `readOnly`, and it renders no lock scope. In a lock scope, such as a `Form` that submits, the reorder grip stays live. `QueryBuilderSortableItem` gives the grip only `disabled`, and `SortableGrip` is a plain `<button>` that reads no lock. So a grip still moves a node while each other control is locked.

   Add `readOnly` to `QueryBuilder` (CONVENTIONS §4.9), and render `ControlLockContext` with it. Make the grip read `useControlLock` and drop its listeners while locked. The grids, the kanban, and the dashboard also render `SortableGrip`, so the fix reaches them. Extend the lock case of `query-builder.test.tsx` to the grip, the Add menu, and the remove buttons. Add a `read-only` docs example.

2. **A custom editor in a grid column filter (*P2*).** `toQueryField` in `grid/grid-column-filter-button.tsx` builds a field from the name, the label, the type, the options, and the span. So a column cannot give `editor`, `formatValue`, or `operators`. A set editor needs `in` or `notIn`, which no field type offers by default. AG Grid takes a custom filter component for each column.

   Add a `GridColumn` key that merges a partial `QueryField` into the field of the column. Prove it in `grid-column-filters.test.tsx` and in a grid docs example.

3. **A date range operator (*P2*).** The `date` set holds `on`, `before`, and `after`. `between` is in `NUMERIC_OPERATORS`, so an ISO date range reads as no constraint. AG Grid offers `inRange` for dates, and `DatePicker` already has a `range` mode. Add a range operator for the `date` type that compares the bounds in ISO string order. Give it its own name, because the judgment reads no field type.

   A blank bound is open, as for `between`. Edit the value with `DatePicker` in its `range` mode, in `query-builder-rule-value.tsx`. Prove it in `query-evaluate.test.ts`, the parity test, and the summary tests.

4. **Brackets that show the fold (*P3*).** A flat group can mix AND and OR, and the fold reads it from left to right. So `A OR B AND C` matches `(A OR B) AND C`. The summary and the chips write it with no brackets, and a reader who knows SQL reads `A OR (B AND C)`. Bracket each run of the summary where the combinator changes. The open question is the id of a bracket token, because no group node holds the run.

5. **Group negation (*P3*).** react-querybuilder has `showNotToggle`, which negates a group. Here a reader must invert each rule of a group by hand. Add `not` to `QueryGroup`, read it in the fold and the compile, and write `NOT (…)` in the summary. The open question is the URL form, because a compact group is `[combinator, children]`. Old links must still parse.

6. **Date cells that hold a `Date` (*P3*).** The date matchers compare text, and `asText` of a `Date` gives `Fri Jan 02 2026…`. So `before` and `after` give a wrong result for such a cell. The TSDoc of `GridColumn.filterType` asks for a string, so the grid is correct today. A `Date` or an ISO date-time cell must read as its calendar day. The open question is the time zone of that day, because the engine is pure and has no locale.

## Pattern cleanup

1. **Operator flags that only a comment ties to the evaluator (*P2*).** The builder reads the `noValue`, `range`, and `set` flags in [`engine/query-operators.ts`](engine/query-operators.ts). The evaluator reads `VALUELESS_OPERATORS`, `RANGE_OPERATORS`, and `SET_OPERATORS` by name in [`engine/query-evaluate.ts`](engine/query-evaluate.ts). Each set says that it mirrors a flag, but the parity test holds only the names. A built-in with a wrong flag gets an editor of one shape and a judgment of another, so its rule reads as inactive. Extend the parity test in `query-operators.test.ts`: a built-in has each flag exactly when its name is in the related set.

## Performance

1. **Compile the rule value once (*P2*).** `compileNode` in [`engine/query-evaluate.ts`](engine/query-evaluate.ts) makes the active judgment once, but each matcher reads the rule value again for each row. A text matcher lowers the rule value for each row. An `in` matcher walks the whole set for each row, and lowers each member each time.

   Make each compiled test hold a lowered value, a parsed number, or a `Set` of the members. `query-evaluate.bench.ts` has no set operator, so add an `in` row with a large set over `shipments`. The compile property test holds the result.

2. **The edit cost under `reorder` (*P3*).** On 2026-10-13, `query-edit.bench.tsx` measured one edit in Chromium. With no reorder, it took 1.06 ms at 32 rules and 1.84 ms at 128 rules. With `reorder`, it took 3.48 ms and 10.16 ms. `Reorder.Group` gives its items a new context value in each render, so each `Reorder.Item` renders again.

   A local fix was measured and not kept, as [the browser bench README §Query builder](../../__benchmarks__/browser/README.md) records. The fix belongs in Motion, as a memo on that context value, so measure each Motion upgrade with the same bench.

## Accessibility and testing

1. **Focus after an add (*P2*).** `addRule` and `addGroup` in [`use-query-tree.ts`](use-query-tree.ts) move no focus. The new rule sits above the Add trigger, so a keyboard reader must go back to reach it. A removal already moves the focus (WCAG 2.4.3), so an add must do the same. Focus the first control of the new node once it enters the tree, through the registry that `useQueryRemovalFocus` reads. Prove it in `query-builder.test.tsx`, and examine it in a real browser, because the Add menu closes in the same step.

2. **A name for each nested group (*P2*).** Each nested group is a `<fieldset>` with the name "Condition group" (`queryBuilderMessages.group`). A screen reader cannot tell two groups apart, but each rule has its summary as its name. Describe each nested group by the summary of its subtree, through `aria-describedby`, as `QueryChips` does for its row (WCAG 1.3.1, 2.4.6). Prove it in `query-builder.test.tsx`.

3. **A browser test of the editor contract (*P2*).** The remarks of `QueryValueEditor` set two rules. Each control of the editor is a Tab stop in the order of the row, and Escape in a popup closes that popup only. `query-value-editor.test.tsx` runs under jsdom and does not press Escape. Add a browser test that mounts the custom editor of the docs inside a `Dialog`. Assert the Tab order of the row, and that Escape closes the listbox and keeps the dialog open.

## Not planned

- **Formatters for a server dialect**, such as the `formatQuery` of react-querybuilder for SQL or MongoDB. The engine evaluates on the client, and no app sends a query to a server. A server reads the URL form and owns its dialect.

- **One combinator for each group**, as in MUI X Data Grid (`logicOperator`) and the default of react-querybuilder. The combinator of each node carries the move rules of `moveChild` and `moveChildInto`.

- **AND before OR.** The fold follows the order that the builder shows. A precedence rule changes the result of each stored tree. Feature 4 makes the order clear in place of this.

- **A depth limit on the builder.** The builder can build a tree deeper than `MAX_DEPTH`, which the guard then refuses. That depth is far past any tree that a person builds by hand.

- **An async `formatValue`.** The summary is a pure fold. An app that loads labels gives a new field when the labels arrive, and the summary shows the key until then.

- **A component in `QueryField.editor`.** A string key keeps the engine free of React, and a context reaches a builder that another module renders.

- **The picker and the token model of the chat.** A chat mention holds offsets in the text of a `<textarea>`. A rule value has no text that an offset can address. A shared hook for the async search waits for a second consumer.

---

**See also:** [`index.ts`](index.ts) (the public surface) · [grid `ROADMAP.md` §Engine](../grid/ROADMAP.md) (the invariants this adopts) · [the browser bench README §Query builder](../../__benchmarks__/browser/README.md) · [`docs/MODULES.md`](../../../docs/MODULES.md).
