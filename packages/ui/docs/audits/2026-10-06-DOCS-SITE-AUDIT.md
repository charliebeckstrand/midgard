# Docs Site Audit — 2026-10-06

**Lens:** the rows of the 2026-09-28 docs site audit that still hold in the new docs app. That audit read the legacy site, which [#1969](https://github.com/charliebeckstrand/midgard/pull/1969) removed. It had 96 open rows. This record keeps the rows that the new app still has, and the pull request that adds it deletes the old record. Each path below is relative to `packages/ui/src/docs`.

**Method:** a close read of each open row against the new app. The new app shows the source of each example file as its code, so it has no snippet derivation, no `code` overrides, no source facts, and no barrel tags. The rows about those parts (15 rows: B2, B6, B8 to B11, C7, C9 to C16) do not apply. The API extractor is new (`plugin/api.ts`, on the TypeScript 7 API), so the rows about the old extractor apply only where the new one has the same gap. The demo rows were matched to the new example files by their description. No probe ran: each row below is **R** (a close read) or **L** (a lead that no probe reproduced). E5 ("phone menu resets sort and search") is left out by the owner's choice.

**Dropped:** 65 open rows do not hold in the new app. The engine rows E4, E6, E8 to E10, and E14 to E17 went with the legacy engine: a failed chunk shows `PageError`, each route has its own title, and the frame drag area has no separator role. The extractor rows A10 to A13, A15, A16, A18, and A19 went with the legacy extractor. B3 and B7 went with the legacy plugin. The demo rows D6, D9 to D13, D16, D17, D19, D21 to D23, D25 to D28, D31, D35, D39 to D43, D50 to D52, D56, D57, D66 to D68 have no match in the new examples.

**Severity:** **high** means a reader sees wrong output on a common path. **medium** means a defect on one path, or an example that teaches wrong use. **low** means drift, dead code, or a small a11y gap.

**Status:** *Open*, *In review* (a pull request is open), or *Resolved* (merged). Resolve each row against the pull request that closes it (CONVENTIONS §12.4).

## Summary

The rows cluster in three places. The Grid examples that pose as a server (R1 to R3) sort only the loaded rows and drop no stale response, so a copy teaches a race. Several examples teach an idiom that `ui` already owns: a hand-rolled loading button, a bridge around a field that binds by name, and frozen toggles (I1 to I6). A few names and states reach assistive tech by color, placeholder, or a hidden icon only (A1 to A7).

| Section | High | Medium | Low | Rows |
|---|---|---|---|---|
| 1. Engine | 0 | 0 | 3 | 3 |
| 2. Behavior | 0 | 4 | 3 | 7 |
| 3. Wrong idiom | 0 | 4 | 9 | 13 |
| 4. Accessibility and drift | 0 | 1 | 6 | 7 |
| **Total** | **0** | **9** | **21** | **30** |

## 1. Engine

| ID | Legacy | Where | Finding | Proposed change | Sev | Check | Status |
|---|---|---|---|---|---|---|---|
| K1 | E13 | `kit/api-entry.tsx:79-87` | The deprecation reason lives only in a tooltip on the "deprecated" `Badge`. The badge is a `<span>`, so keyboard users cannot reach the reason, and a tooltip does not show on touch. No prop in `ui` carries `@deprecated` today, so the gap is latent. | Render the reason inline and muted, after the badge. | low | R | Open |
| K2 | B4 | `plugin/index.ts:108, 121, 125`; `plugin/component-events.ts:33` | `pages` and `docs` are native paths, and Vite gives posix ids and files. On Windows the transform filter and the `hotUpdate` tests never match, so no example gets its meta. | Pass both paths through `normalizePath` once. | low | L | Open |
| K3 | A14 | `plugin/api.ts:217` | The extractor reads the props of the first call signature only, so an overloaded component shows its first overload. `ui` has no overloaded component today. | Read the props of each call signature, or of the declaration with a body. | low | R | Open |

## 2. Behavior

| ID | Legacy | Where | Finding | Proposed change | Sev | Check | Status |
|---|---|---|---|---|---|---|---|
| R1 | D2 | `pages/modules/grid/groups/server-side-grouping.tsx:124-138, 141-153` | `regroup` has no request order. Ungroup, then regroup within 500 ms: the older flat response replaces `rows` under the new grouping and clears `loading`. `loadChildren` can splice children from an earlier grouping into the headers of a later one. | A request epoch that drops a stale result. | medium | R | Open |
| R2 | D3 | `pages/modules/grid/groups/server-side-grouping.tsx:69-90` | Manual grouping forces a manual sort, and the example binds no `sort`. Customer, Orders, and Revenue stay sortable by default, so "Sort by Revenue" sets `aria-sort` and reorders nothing. | `sortable: false` on the three columns. | medium | R | Open |
| R3 | D4 | `pages/modules/grid/pagination/server-pagination.tsx:14-24`; `pages/modules/grid/virtualization/server-infinite-scroll.tsx:45-59` | Both server examples use the sortable `columns` of `data.tsx:31-40` with no manual `sort`. A header click sorts only the loaded page or the loaded rows, against the server pattern that the examples show. | `sort={{ …, manual: true }}` and a sort in the fake server, or columns that do not sort. | medium | R | Open |
| R4 | D5 | `pages/modules/map/pick-a-state.tsx:13, 36, 46`; `pages/modules/map/data.ts:40-43` | `onRegionClick` fires for a region with no timezone row. A click on Alaska, Hawaii, or DC shows "Alaska — undefined time." and sets the Select to a value with no option. The data comment omits DC. | Ignore a state with no timezone row. Add DC to the comment. | medium | R | Open |
| R5 | D7 | `pages/modules/dashboard/build-and-save.tsx:215-223, 320, 353-354` | The board is keyed on `board.template`. A reset to the same template keeps the key, so the Dashboard keeps its selection and widget state. The `startFromPreset` TSDoc example (`modules/dashboard/engine/dashboard-preset.ts:45-49`) keys the same way. | Key on a counter that each start increments, in the example and the TSDoc. | low | R | Open |
| R6 | D8 | `pages/modules/grid/groups/data.ts:43-55` | The `$/unit` leaf cells print `$120`, and the group cells print `$130.00`. The column has no `value`, so its sort reads `undefined` and an export writes an empty field. | `value: (row) => row.revenue / row.units`, and one money formatter. | low | R | Open |
| R7 | D69 | `pages/modules/grid/data.tsx:23-29`; `pages/modules/grid/virtualization/server-infinite-scroll.tsx:8-19` | Two generators of "Person N" disagree: `manyPeople` derives role and status from `id - 1`, and `rowsAt` from `id`. Person 1 is a Developer and inactive in one, and a Designer and active in the other. | One `makePerson(id)` that both read. | low | R | Open |

## 3. Wrong idiom

| ID | Legacy | Where | Finding | Proposed change | Sev | Check | Status |
|---|---|---|---|---|---|---|---|
| I1 | D36 | `pages/components/loading/inside-a-button.tsx:13, 16` | Both buttons hand-roll Button's `loading` prop with `disabled` and a spinner or dots prefix. They get no `aria-busy`, and `disabled` drops focus. | `<Button loading>` for the spinner. Add `aria-busy` to the dots button. | medium | R | Open |
| I2 | D37 | `pages/modules/grid/editable/bulk-edit.tsx:36-47, 138, 142` | `FormCurrencyInput` bridges `useFormField` into `value` and `onValueChange`, though `CurrencyInput` binds by `name` and marks the field touched. The bridge is the pattern that CONVENTIONS §7.2 forbids, and it drops the touched state. | `<CurrencyInput name="perMile" />`. Delete the bridge. | medium | R | Open |
| I3 | D38 | `pages/components/collapse/controlled.tsx:12` | The external toggle has no `aria-expanded`, and the text says "Any external button can toggle the panel". | `aria-expanded={open}`. | medium | R | Open |
| I4 | D34 | `pages/components/toolbar/with-groups.tsx:29-50`; `pages/components/toolbar/playground.tsx:9-22` | Twelve toolbar toggles are frozen at `aria-pressed={false}`. A click does nothing, and assistive tech hears "not pressed". | An uncontrolled `ToggleIconButton` for each toggle. | medium | R | Open |
| I5 | D33 | `pages/components/filters/parts.tsx:23-34`; `pages/providers/density/playground.tsx:46-56` | `FiltersClear` wraps a `<Button>` with no `type`, where its own fallback button is typed. No `Filters` renders a form today, so the click submits nothing. | `<FiltersClear variant="soft" color="red">Reset</FiltersClear>`. | low | R | Open |
| I6 | D44 | `pages/modules/grid/selection/selection.tsx:15`; `pages/modules/grid/pin/pinned-selection.tsx:22`; `pages/modules/grid/footer/selection-summary.tsx:23`; `pages/modules/grid/export/export-with-selection.tsx:20`; `pages/modules/grid/editable/bulk-edit.tsx:95` | Five examples pass `(next) => setSelection(next ?? new Set())`, though `onValueChange` always gives a `Set`. | `onValueChange: setSelection`. | low | R | Open |
| I7 | D45 | `pages/modules/grid/editable/people.tsx:75` | `value={value \|\| undefined}` flips the Listbox to uncontrolled on a clear to `''` (CONVENTIONS §7.3). | `value \|\| null`. | low | R | Open |
| I8 | D46 | `pages/modules/grid/editable/people.tsx:24-29` | `applyChanges` writes `change.columnId` as the row field. It works only because each column id equals its field. | Map the column id to `column.field`. | low | R | Open |
| I9 | D47 | `pages/modules/grid/groups/row-groups.tsx:10, 17`; `pages/modules/grid/state/error.tsx:12` | Row groups binds a `groupBy` handler, but no column can group, so the handler never runs. The error state uses `<Alert color="red">` in place of `severity="error"`, so it has no `role="alert"` and no icon. | `groupBy={{ value: 'role' }}`. `severity="error"`. | low | R | Open |
| I10 | D48 | `pages/modules/grid/editable/editable.tsx:20`; `pages/modules/grid/editable/bulk-edit.tsx:75`; `pages/modules/grid/editable/editor-types.tsx:81` | Each example builds a new `columns` array on each render, so every cell renders again. | `useMemo` with the closed-over values as dependencies. | low | R | Open |
| I11 | D49 | `pages/components/context-menu/actions.tsx:9-18` | The `items` array is built on each render, against ContextMenu's memo on `items`. The other ContextMenu examples hoist theirs. | Hoist the array, or `useMemo` it. | low | R | Open |
| I12 | D18 | `pages/structure/flex/column.tsx:6`; `pages/structure/flex/responsive-direction.tsx:6` | The Flex "Column" example uses `direction="col"`, against Flex's own "Use Flex for rows and Stack for columns". The Stack page shows `align`, `justify`, and `full` only in its playground. | Drop the Flex "Column" example, or point it at Stack. | low | R | Open |
| I13 | D24 | `pages/components/sidebar/item-size.tsx:6`; `with-header-and-footer.tsx:25`; `sections-divider-and-spacer.tsx:42`; `with-suffix-slot.tsx:7`; `with-actions.tsx:16` | Each Sidebar example wraps the sidebar in a docs-only frame (`h-108 overflow-hidden rounded-lg border …`), so a copy carries the frame. | Give the page a surface frame, and drop the wrapper from each example. | low | R | Open |

## 4. Accessibility and drift

| ID | Legacy | Where | Finding | Proposed change | Sev | Check | Status |
|---|---|---|---|---|---|---|---|
| A1 | D55 | `pages/providers/density/playground.tsx:71` | The SearchInput in `FiltersField name="id"` has only a placeholder as its name. | A `<Label>` in the `FiltersField`, or an `aria-label`. | medium | R | In review |
| A2 | D58 | `pages/components/group/with-inputs.tsx:9-18`; `pages/primitives/skeleton/form.tsx:33, 36, 39` | Six Group inputs and three skeleton form fields have only a placeholder as their name. | `aria-label` on each, or a `Label`. | low | R | In review |
| A3 | D59 | `pages/components/kanban/playground.tsx:38` | `aria-label={load.code}` on each card hides the customer and the weight that the card shows, against the KanbanCard TSDoc. | Drop the label. | low | R | In review |
| A4 | D60 | `pages/components/stat/trend.tsx:8-17`; `pages/components/stat/with-delta-and-description.tsx:10-11`; `pages/components/stat/dashboard-grid.tsx:22-23`; `pages/components/status/playground.tsx:4` | The direction of a Stat delta is only in an `aria-hidden` arrow, and the text is an unsigned "12.5%" (StatDelta's TSDoc asks for a textual sign). The StatusDot `label` stays "Server status" when `status` changes, so color alone tells the status. | A sign in the delta text (`+12.5%`, `−0.8%`). A label that names the status. | low | R | In review |
| A5 | D61 | `pages/providers/locale/locale-provider.tsx:24-28`; `pages/components/pdf-viewer/driven-from-a-list.tsx:15-19` | Only the button variant shows the selected preset or region. | `aria-pressed`. | low | R | In review |
| A6 | D62 | `pages/components/odometer/currency.tsx:15`; `pages/components/odometer/instant.tsx:12`; `pages/components/time-ago/with-absolute-time.tsx:15-16` | The Odometer values are `h2` headings inside the `h3` of the example frame. The TimeAgo tooltip trigger is a `<time>` with no `tabIndex`, so the tooltip opens on a hover only. | `Text` for each value. A focusable trigger. | low | L | Part in review: the TimeAgo trigger. The Odometer headings stay open. |
| A7 | D65 | `pages/components/toast/with-action.tsx:8`; `pages/modules/query/data.ts:29, 41`; `pages/modules/chart/data.ts:163` | Text that misstates the example. `crypto.randomUUID()` repeats the id that `toast()` returns. The query comment says "Two active rules" over three rules, and the `gte` rule holds the string `'18'` for a number field. The chart comment says "2020 census", but the figures are later estimates. | Correct each. | low | R | In review |

## 5. Surfaced, outside the legacy rows

- `pages/components/progress/gauge-color.tsx:10` and `gauge-size.tsx:10` give each gauge the same `aria-label="Progress"`. *In review.*
