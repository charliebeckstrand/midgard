# Bug audit: Query module, 2026-11-06

Mode `unit`. The area is the ui Query module: `packages/ui/src/modules/query`, its kata recipes, and its docs page folder. One scope, 37 files, 4,085 lines, 20 claims. 12 findings stay open, and 8 claims are ruled out.

## Scope

The scope holds each source file of the unit: the engine, the builder, the chips and the summary, the three kata recipe files `query-builder`, `query-chips`, and `query-summary`, the module `ROADMAP.md`, and the docs page folder `packages/ui/src/docs/pages/modules/query`. It leaves out the tests and the benchmarks (§3.2). No kiso recipe file is named for the unit.

| Scope | Theme | Files | Lines | Claims |
| --- | --- | --- | --- | --- |
| B01 | Query unit | 37 | 4,085 | 20 |

<details><summary>File list</summary>

- `packages/ui/src/docs/pages/modules/query/builder.tsx` (19)
- `packages/ui/src/docs/pages/modules/query/chips.tsx` (17)
- `packages/ui/src/docs/pages/modules/query/data.ts` (54)
- `packages/ui/src/docs/pages/modules/query/index.tsx` (20)
- `packages/ui/src/docs/pages/modules/query/playground.tsx` (6)
- `packages/ui/src/docs/pages/modules/query/read-only-and-disabled.tsx` (12)
- `packages/ui/src/docs/pages/modules/query/reorder.tsx` (17)
- `packages/ui/src/modules/query/ROADMAP.md` (49)
- `packages/ui/src/modules/query/engine/query-active.ts` (28)
- `packages/ui/src/modules/query/engine/query-announcements.ts` (25)
- `packages/ui/src/modules/query/engine/query-evaluate.ts` (364)
- `packages/ui/src/modules/query/engine/query-messages.ts` (77)
- `packages/ui/src/modules/query/engine/query-node.ts` (132)
- `packages/ui/src/modules/query/engine/query-operators.ts` (198)
- `packages/ui/src/modules/query/engine/query-serialize.ts` (281)
- `packages/ui/src/modules/query/engine/query-summary.ts` (313)
- `packages/ui/src/modules/query/engine/query-tree.ts` (136)
- `packages/ui/src/modules/query/engine/types.ts` (72)
- `packages/ui/src/modules/query/index.ts` (30)
- `packages/ui/src/modules/query/query-builder/context.tsx` (78)
- `packages/ui/src/modules/query/query-builder/index.ts` (9)
- `packages/ui/src/modules/query/query-builder/query-builder-focus.ts` (64)
- `packages/ui/src/modules/query/query-builder/query-builder-group.tsx` (226)
- `packages/ui/src/modules/query/query-builder/query-builder-messages.ts` (124)
- `packages/ui/src/modules/query/query-builder/query-builder-rule-value.tsx` (229)
- `packages/ui/src/modules/query/query-builder/query-builder-rule.tsx` (225)
- `packages/ui/src/modules/query/query-builder/query-builder-sortable-item.tsx` (122)
- `packages/ui/src/modules/query/query-builder/query-builder-sortable.tsx` (171)
- `packages/ui/src/modules/query/query-builder/query-builder.tsx` (138)
- `packages/ui/src/modules/query/query-builder/use-query-builder-tree.ts` (49)
- `packages/ui/src/modules/query/query-chips.tsx` (336)
- `packages/ui/src/modules/query/query-summary.tsx` (77)
- `packages/ui/src/modules/query/use-query-removal-focus.ts` (59)
- `packages/ui/src/modules/query/use-query-tree.ts` (121)
- `packages/ui/src/recipes/kata/query-builder.ts` (123)
- `packages/ui/src/recipes/kata/query-chips.ts` (62)
- `packages/ui/src/recipes/kata/query-summary.ts` (22)

</details>

## Method

Commit `236f0bb6d`. Intent sources: `CONVENTIONS.md` §3, §4, §5, §7, §10.7, §10.8, §11.3, and §12.1; `packages/ui/REFERENCE.md` §2; the ARIA Authoring Practices pattern of each role; and the TSDoc, the comments, and the tests of the code. Consumer roots: `apps/admin`, `apps/places`, `apps/picks`, `packages/ui/src/docs`, `packages/ui/src/modules`, `packages/ui/src/layouts`, and the shipped defaults; `packages/ui/src/__tests__` and `packages/ui/src/docs/fixtures` are test roots.

Digest: the open Query rows, question Q14, the ruled-out entries, and the surfaced entries of `2026-10-26-BUG-AUDIT.md` (branch `claude/project-thread-e6s31k`), and the reader rulings of PR #2961. The record `2026-10-15-A-BUG-AUDIT.md` names no file of the area.

Coverage: the sweep listed 37 files and read 37; none stayed unopened. The evidence was stripped with `jq`, and the line-reference check printed nothing. Lenses named: `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` (`form-reset` does not apply: no part takes a `name` or reads a `Form` field). One scope, so no merge call; ids are renumbered with code (§5.5). The agents ran as `general-purpose` on Opus with their `.md` as instructions, because the cloud session does not register the agent types. Each agent made one stray read-only Bash call outside its frontmatter tools.

| Pass | In | Out |
| --- | --- | --- |
| Sweep | 37 files | 20 claims, 4 leads |
| Judge | 20 stripped claims | 11 CONFIRMED, 2 NARROWED, 7 REFUTED |
| Overturn | 6 findings at high or medium | 4 KEPT, 1 LOWERED, 1 REFUTED |

## Findings

Severity: high 1, low 8, medium 3. Reach: none 5, shipped 7. Kind: bug 5, correctness 7.

Status: `◯ OPEN`, `✅ RESOLVED (#NNN)`, or `✖ DROPPED` with the reason of the reader.

| Row | File | Symbol | Verdict | Severity | Reach | Kind | Group | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [C01](#c01) | `modules/query/query-builder/query-builder-rule.tsx` | QueryBuilderRule | CONFIRMED | high | shipped | bug | independent | ✅ RESOLVED ([#3304](https://github.com/charliebeckstrand/midgard/pull/3304)) |
| [C04](#c04) | `modules/query/query-builder/query-builder-sortable.tsx` | QueryBuilderSortable | CONFIRMED | medium | shipped | bug | M1 | ◯ OPEN |
| [C10](#c10) | `recipes/kata/query-builder.ts` | k (sortable slot) | CONFIRMED | medium | shipped | bug | independent | ✅ RESOLVED ([#3305](https://github.com/charliebeckstrand/midgard/pull/3305)) |
| [C17](#c17) | `modules/query/engine/query-evaluate.ts` | matchers (equals, notEquals) | CONFIRMED | medium | shipped | bug | independent | ✅ RESOLVED ([#3303](https://github.com/charliebeckstrand/midgard/pull/3303)) |
| [C02](#c02) | `modules/query/query-chips.tsx` | QueryChips | CONFIRMED | low | none | correctness | independent | ✅ RESOLVED ([#3306](https://github.com/charliebeckstrand/midgard/pull/3306)) |
| [C05](#c05) | `modules/query/use-query-removal-focus.ts` | useQueryRemovalFocus | CONFIRMED | low | none | correctness | independent | ✅ RESOLVED ([#3304](https://github.com/charliebeckstrand/midgard/pull/3304)) |
| [C06](#c06) | `modules/query/query-builder/query-builder-sortable.tsx` | QueryBuilderSortable | CONFIRMED | low | none | correctness | M1 | ◯ OPEN |
| [C07](#c07) | `modules/query/query-builder/query-builder-group.tsx` | QueryBuilderGroup | CONFIRMED | low | none | correctness | independent | ✅ RESOLVED ([#3307](https://github.com/charliebeckstrand/midgard/pull/3307)) |
| [C09](#c09) | `modules/query/query-builder/query-builder-sortable-item.tsx` | QueryBuilderSortableItem | CONFIRMED | low | shipped | bug | independent | ◯ OPEN |
| [C12](#c12) | `recipes/kata/query-builder.ts` | k (sortable.handle, sortable.separator) | NARROWED | low | shipped | correctness | independent | ✅ RESOLVED ([#3305](https://github.com/charliebeckstrand/midgard/pull/3305)) |
| [C14](#c14) | `modules/query/query-builder/query-builder.tsx` | QueryBuilder | CONFIRMED | low | none | correctness | independent | ✅ RESOLVED ([#3307](https://github.com/charliebeckstrand/midgard/pull/3307)) |
| [C19](#c19) | `modules/query/query-builder/query-builder-rule.tsx` | QueryBuilderRule | CONFIRMED | low | shipped | correctness | independent | ✅ RESOLVED ([#3307](https://github.com/charliebeckstrand/midgard/pull/3307)) |

## Mechanisms

### C01

- File: `packages/ui/src/modules/query/query-builder/query-builder-rule.tsx` (QueryBuilderRule)
- Claim: The group goes and focus moves to the remove button of the previous rule. The next auto-repeat Enter keydown fires a native click on that button, so the rule goes with no hold, and each further repeat removes the next earlier rule while the key stays down.
- Mechanism:
  - `packages/ui/src/modules/query/query-builder/query-builder-group.tsx:204 onHoldComplete={() => remove(group.id)}`
  - `packages/ui/src/modules/query/query-builder/use-query-builder-tree.ts:36 const targets = findFocusTarget(root, id)`
  - `packages/ui/src/modules/query/query-builder/use-query-builder-tree.ts:40 if (targets.length > 0) focusFirst(targets.map(getFocusKey))`
  - `packages/ui/src/modules/query/query-builder/query-builder-focus.ts:31 if (prev) candidates.push({ kind: 'node', id: prev.id })`
  - `packages/ui/src/modules/query/use-query-removal-focus.ts:48 if (el?.isConnected && !el.matches(':disabled')) {`
  - `packages/ui/src/modules/query/use-query-removal-focus.ts:49 el.focus()`
  - `packages/ui/src/modules/query/query-builder/query-builder-rule.tsx:203 ref={removeRef}`
  - `packages/ui/src/modules/query/query-builder/query-builder-rule.tsx:209 onClick={onRemove}`
  - `packages/ui/src/components/hold-button/hold-button.tsx:143 if (event.repeat || (event.key !== ' ' && event.key !== 'Enter')) return`
  - `packages/ui/src/components/menu/menu-trigger.tsx:89-92 but its OS auto-repeat is swallowed, so a held key neither / rapidly re-toggles the menu (Enter's per-repeat clicks) nor opens it when the / key was already down as focus arrived (released from a HoldButton whose / completion moved focus here).`
- Trigger: As stated. The hold completes, the removal ladder moves focus to the remove Button of the previous rule, and the next auto-repeat keydown of the held Enter fires the native click of that Button. The HoldButton skips a repeat (hold-button.tsx:143) and the Add menu trigger swallows one (menu-trigger.tsx:112), but the rule remove Button has no guard, so each repeat removes the rule that now holds focus. The chain also runs when the next sibling is a rule and no previous sibling exists.
- Documented intent: packages/ui/src/components/hold-button/hold-button.tsx:49 Button that fires `onHoldComplete` only after a sustained press of `duration` ms. The repository already names the Enter auto-repeat click as a defect for the control that takes focus after a hold completes (menu-trigger.tsx:89-92). No source makes the extra removals deliberate.
- Reach: shipped. Searched <QueryBuilder in apps/admin, apps/places, apps/picks, packages/ui/src/docs, packages/ui/src/modules, packages/ui/src/layouts. The docs seed `filters` puts the nested group g1 after the rule r1, and the shipped default allowGroups true lets a user build the shape on each builder page. `packages/ui/src/docs/pages/modules/query/data.ts:36 { id: 'r1', type: 'rule', field: 'status', operator: 'equals', value: 'active' },`; `packages/ui/src/docs/pages/modules/query/data.ts:38 id: 'g1',`; `packages/ui/src/docs/pages/modules/query/chips.tsx:14 <QueryBuilder fields={fields} value={query} onValueChange={setQuery} />`; `packages/ui/src/docs/pages/modules/query/reorder.tsx:13 <QueryBuilder fields={fields} value={query} onValueChange={setQuery} reorder />`
- Severity: high. A keyboard user who removes a nested group on a shipped docs builder also loses the rules before it, with no hold and no undo, so the surface loses the data of the query.
- Kind: bug
- Overturn: KEPT. No source makes the extra removals intended: menu-trigger.tsx:89-92 names the per-repeat Enter click after a HoldButton completion as a defect to guard, the rule remove Button (query-builder-rule.tsx:200-212) has no key handler, ui Button has no repeat guard, and the docs seed data.ts:36-38 builds the rule-then-group shape, so the trigger reaches shipped data loss.
- Prior art: NONE. Searched the digest for HoldButton, hold, repeat, removal focus, and remove. The overturn pass also searched `repeat` in packages/ui/src/modules/query and packages/ui/src/components/button: no match, so no guard and no test that pins the cascade.

### C04

- File: `packages/ui/src/modules/query/query-builder/query-builder-sortable.tsx` (QueryBuilderSortable)
- Claim: The draft order commits as if the finger had dropped the node: onValueChange gets the move and the drop is announced, where the gesture was canceled.
- Mechanism:
  - `node_modules/.pnpm/framer-motion@14.0.0_react-dom@19.3.0_react@19.3.0/node_modules/framer-motion/dist/es/gestures/pan/PanSession.mjs:130 addPointerEvent(this.contextWindow, "pointercancel", this.handlePointerUp, eventOptions)`
  - `node_modules/.pnpm/framer-motion@14.0.0_react-dom@19.3.0_react@19.3.0/node_modules/framer-motion/dist/es/gestures/pan/PanSession.mjs:105-108 if (this.startEvent && onEnd) { onEnd(event, panInfo); } onSessionEnd && onSessionEnd(event, panInfo);`
  - `node_modules/.pnpm/framer-motion@14.0.0_react-dom@19.3.0_react@19.3.0/node_modules/framer-motion/dist/es/gestures/drag/VisualElementDragControls.mjs:171-172 if (onDragEnd) { frame.postRender(() => onDragEnd(finalEvent, finalPanInfo));`
  - `packages/ui/src/modules/query/query-builder/query-builder-sortable-item.tsx:84-86 onDragEnd={() => { setDragging(false) onDragEnd()`
  - `packages/ui/src/hooks/use-reorder-drag.ts:138 if (live.canceled) {`
  - `packages/ui/src/hooks/use-reorder-drag.ts:146-148 if (onReorder === undefined || sameElements(order, ids)) return / onReorder(order, live.id)`
- Trigger: As stated. Motion routes pointercancel to the same handler as pointerup, and the item drops the end event, so useReorderDrag reads only its Escape flag and commits the draft.
- Documented intent: packages/ui/src/modules/query/query-builder/query-builder.tsx:71-73 A / pointer drag calls `onValueChange` once, on the drop, and Escape cancels / it. packages/ui/src/modules/query/query-builder/query-builder-sortable.tsx:45-47 the drop commits the move once. Escape cancels / the drag and puts the nodes back. A pointercancel is the browser ending the gesture, not a drop. The dashboard resize reverts on it: packages/ui/src/modules/dashboard/use-dashboard-resize.ts:268 handle.addEventListener('pointercancel', end(false), { signal }).
- Reach: shipped. Searched reorder and useReorderDrag in the consumer roots. The grip is touch-none, so a scroll does not cancel a drag; a system interruption on a touch device does. `packages/ui/src/docs/pages/modules/query/reorder.tsx:13 <QueryBuilder fields={fields} value={query} onValueChange={setQuery} reorder />`; `packages/ui/src/recipes/kiso/hannou/cursor.ts:59 'touch-none select-none **:select-none [-webkit-touch-callout:none]',`
- Severity: medium. On the shipped reorder docs page, a touch drag that the system cancels commits a move the user did not drop, and the user can drag the node back.
- Kind: bug
- Overturn: KEPT. The commit on pointercancel is Motion's default, not a choice that a ui source states: the TSDoc of QueryBuilder and of useReorderDrag commits only on the drop, and the dashboard resize and the panel resize both revert on a canceled pointer, so no intent source excuses it and the reorder docs page reaches it.
- Prior art: NONE. Searched the digest for pointercancel, drag, reorder, and drop. The overturn pass searched packages/ui/src/__tests__ for pointercancel: no test of useReorderDrag or of the query builder pins a commit on a canceled pointer.

### C10

- File: `packages/ui/src/recipes/kata/query-builder.ts` (k (sortable slot))
- Claim: The held node looks the same as its neighbors. Forced colors replace the white surface with Canvas and remove the shadow, and nothing else marks data-dragging, so a keyboard lift has no visible state.
- Mechanism:
  - `packages/ui/src/recipes/kata/query-builder.ts:77-79 'data-dragging:relative data-dragging:z-10', / 'data-dragging:rounded-lg data-dragging:shadow-lg', / ...mode('data-dragging:bg-white', 'dark:data-dragging:bg-zinc-900'),`
  - `packages/ui/src/modules/query/query-builder/query-builder-sortable-item.tsx:71 const held = dragging || lifted`
  - `packages/ui/src/modules/query/query-builder/query-builder-sortable-item.tsx:90 data-dragging={dataAttr(held)}`
- Trigger: As stated. Forced colors drop the shadow and repaint the background, and the held state has no other paint, so a keyboard lift looks the same as rest. A pointer drag still shows by the move of the node.
- Documented intent: CONVENTIONS.md:160 In `ui`, a part that shows a state or an edge only with a background or a box-shadow keeps a paint under forced colors. ... A surface or a track takes `outline`. Tailwind reads only literal class names. Thus a ring behind another gate, such as `data-active`, writes the four outline classes behind that gate. The entry: packages/ui/src/recipes/kiso/sen/forced.ts:23 outline: 'forced-colors:outline-solid forced-colors:outline-1',
- Reach: shipped. Searched data-dragging and forced in recipes/kata/query-builder.ts and recipes/kiso/sen; no forced-colors class sits behind data-dragging. `packages/ui/src/docs/pages/modules/query/reorder.tsx:13 <QueryBuilder fields={fields} value={query} onValueChange={setQuery} reorder />`
- Severity: medium. A forced-colors keyboard user on the shipped reorder page sees no change when Space lifts a node, and can recover by the announcement or by a move.
- Kind: bug
- Overturn: KEPT. CONVENTIONS.md:160 states the rule with no exemption list, the kata comment explains the background as an opaque surface and not as a waiver, and neither forced-colors test exempts the held node, so the lifted state that the box-shadow alone paints is a convention break that the reorder docs page reaches.
- Prior art: NONE. Searched the digest for forced colors, data-dragging, and sortable.

### C17

- File: `packages/ui/src/modules/query/engine/query-evaluate.ts` (matchers (equals, notEquals))
- Claim: equals does not match and notEquals matches, because the comparison is exact, while contains, startsWith, and endsWith on the same row ignore case.
- Mechanism:
  - `packages/ui/src/modules/query/engine/query-evaluate.ts:88-91 function holdsValue(fieldValue: unknown, ruleValue: unknown): boolean { return typeof ruleValue === 'number' ? asNumber(fieldValue) === ruleValue : asText(fieldValue) === asText(ruleValue)`
  - `packages/ui/src/modules/query/engine/query-evaluate.ts:106-108 equals: (a, b) => holdsValue(a, b), notEquals: (a, b) => !holdsValue(a, b), contains: (a, b) => asText(a).toLowerCase().includes(asText(b).toLowerCase()),`
  - `packages/ui/src/modules/query/engine/query-operators.ts:116-117 worded('equals', messages.textEquals), / worded('notEquals', messages.textNotEquals),`
- Trigger: A text rule Name equals lee, or Name does not equal lee, runs against a row whose name is Lee.
- Documented intent: packages/ui/src/modules/query/engine/query-evaluate.ts:95-97 Predicate per operator value ... Mirrors / the default operator sets in {@link getOperators}; text matches are / case-insensitive. The test names equals among them: packages/ui/src/__tests__/modules/query-evaluate.test.ts:18 it('matches text operators case-insensitively', () => { and :25 expect(matchQueryRule('equals', 'Alice', 'Alice')).toBe(true), which checks only the same case.
- Reach: shipped. Searched compileQuery, evaluateQuery, and filterable text columns in the consumer roots. `packages/ui/src/docs/pages/modules/grid/data.tsx:98 return { ...column, filterable: true }`; `packages/ui/src/modules/grid/grid-column-filter-button.tsx:64 type: column.filterType ?? 'text',`; `packages/ui/src/modules/grid/engine/grid-filter/filter.ts:50 const query = isQueryGroup(value) ? compileQuery(value) : null`; `packages/ui/src/docs/pages/modules/grid/filters/column-filters.tsx:5 return <Grid columns={filterableColumns} rows={people} getKey={(row) => row.id} />`
- Severity: medium. A text column filter on the shipped grid docs drops rows that differ only in case under equals, and keeps them under does not equal, and the user can change the case or the operator.
- Kind: bug
- Overturn: KEPT. No source makes a case-sensitive text equals deliberate: the matcher TSDoc says text matches are case-insensitive, the test that names text operators case-insensitive includes equals, the only exact-text pin (query-evaluate.test.ts:63-64) is about digits, and the default first operator of a text column filter is equals, so the shipped grid docs reach it.
- Prior art: NONE. Searched the digest for equals, case, and text matcher. The reader rulings on PR #2961 cover number equality only.

### C02

- File: `packages/ui/src/modules/query/query-chips.tsx` (QueryChips)
- Claim: The roving handler of the toolbar does not run, so the arrow keys no longer move across the chips and the combinators. A keyboard user reaches only the one control that holds the Tab stop.
- Mechanism:
  - `packages/ui/src/modules/query/query-chips.tsx:326 onKeyDown={composeEventHandlers(onKeyDownProp, onKeyDown)}`
  - `packages/ui/src/core/compose-event-handlers.ts:36 { checkForDefaultPrevented = true }: ComposeEventHandlersOptions = {},`
  - `packages/ui/src/core/compose-event-handlers.ts:41 if (!checkForDefaultPrevented || !event.defaultPrevented) ours(event)`
  - `packages/ui/src/components/toolbar/toolbar.tsx:70-72 // Roving takes no gate: the consumer's handler runs first, then roving. / onKeyDown={composeEventHandlers(onKeyDown, handleKeyDown, { / checkForDefaultPrevented: false,`
- Trigger: As stated: a consumer onKeyDown that calls preventDefault() on an arrow, Home, or End key cancels the roving handler of the interactive row.
- Documented intent: CONVENTIONS.md:59 Pass `checkForDefaultPrevented: false` in three cases only. The first is the activation that the component exists to perform. The second is a roving keyboard model, which no consumer switches off. packages/ui/src/modules/query/query-chips.tsx:173-174 An interactive row is a toolbar with one Tab stop, and the arrow keys move across its controls.
- Reach: none. Searched <QueryChips and onKeyDown in the consumer roots. The sites docs/pages/modules/query/chips.tsx:13 and read-only-and-disabled.tsx:8-9 pass no onKeyDown, and no app imports ui/query. 
- Severity: low. No consumer in the roots passes an onKeyDown to QueryChips, so the roving model that the convention locks stays live on each shipped row.
- Kind: correctness
- Prior art: NONE. Searched the digest for onKeyDown, roving, composeEventHandlers, and QueryChips.

### C05

- File: `packages/ui/src/modules/query/use-query-removal-focus.ts` (useQueryRemovalFocus)
- Claim: Focus moves at once to the next target of the ladder while the removed rule or chip is still on screen. After a refusal, focus leaves the control that the user pressed for no change. After a late update under requireRule, the neighbor remove button that took focus can then unmount, and focus drops to the body.
- Mechanism:
  - `packages/ui/src/modules/query/query-builder/use-query-builder-tree.ts:38-40 actions.remove(id) / if (targets.length > 0) focusFirst(targets.map(getFocusKey))`
  - `packages/ui/src/modules/query/query-chips.tsx:232-234 focusFirst(focusLadder(tokens, token.id)) / actions.remove(token.id)`
  - `packages/ui/src/modules/query/use-query-removal-focus.ts:42-53 useEffect(() => { if (!pending) return for (const key of pending) { const el = targets.current.get(key) if (el?.isConnected && !el.matches(':disabled')) { el.focus()`
  - `packages/ui/src/modules/query/use-query-tree.ts:59-63 const [tree, setTree] = useControllable<QueryGroup>({ value, defaultValue: initial, onValueChange: ...`
- Trigger: As stated. The effect runs on the commit of the pending ladder and checks only the targets, never that the removed node left the tree, so a refused or late removal still moves focus.
- Documented intent: packages/ui/src/modules/query/use-query-removal-focus.ts:19-21 A removal gives its ladder of keys, best first, and the effect focuses / the first target that is connected and not disabled, after the removed node / unmounts.
- Reach: none. Searched value= and onValueChange= on QueryBuilder and QueryChips in the consumer roots. Each controlled consumer applies the change in the same event: docs/pages/modules/query/chips.tsx:13-14, builder.tsx:14, reorder.tsx:13, docs/pages/modules/dashboard/query.tsx:104 (useState setters), and modules/grid/grid-column-filter-sheet.tsx:86-87 with grid-column-filter-button.tsx:172 (useState setDraft). 
- Severity: low. No consumer in the roots refuses or defers a removal, so focus moves only after the node unmounts on each shipped surface.
- Kind: correctness
- Prior art: NONE. Searched the digest for focus, removal, ladder, and controlled.

### C06

- File: `packages/ui/src/modules/query/query-builder/query-builder-sortable.tsx` (QueryBuilderSortable)
- Claim: The drop commits the move and calls onValueChange while the builder is disabled. A keyboard lift drops on the same change, but the pointer drag does not.
- Mechanism:
  - `packages/ui/src/modules/query/query-builder/query-builder-sortable-item.tsx:98-99 listeners: disabled ? undefined`
  - `packages/ui/src/modules/query/query-builder/query-builder-sortable.tsx:95 enabled: !disabled,`
  - `packages/ui/src/modules/query/query-builder/query-builder-sortable.tsx:98-104 const { order, sorting, setDraft, onDragStart, onDragEnd } = useReorderDrag({ ids, onReorder: ..., name, onStart: ... })`
  - `packages/ui/src/hooks/use-reorder-drag.ts:22-31 export type ReorderDragOptions = { ids ... onReorder ... name ... onStart }`
  - `packages/ui/src/hooks/use-reorder-drag.ts:146-148 if (onReorder === undefined || sameElements(order, ids)) return / onReorder(order, live.id)`
- Trigger: As stated. The disabled flag removes the grip listeners only for the next press; the live Motion session listens on the window, and useReorderDrag takes no enabled flag, so the drop commits.
- Documented intent: packages/ui/src/modules/query/query-builder/query-builder.tsx:38 /** Disables every control in the tree. @defaultValue false */ and, for the keyboard path, packages/ui/src/hooks/use-keyboard-lifted.ts:17-18 @param enabled - Whether the surface takes a lift. When it turns false, the / lift drops before paint.
- Reach: none. Searched reorder and disabled on QueryBuilder in the consumer roots. docs/pages/modules/query/reorder.tsx:13 passes no disabled, and docs/pages/modules/query/index.tsx:12 <Playground of={QueryPlayground} api={api} omit={['reorder']} /> keeps reorder off where disabled toggles. 
- Severity: low. No consumer in the roots disables a builder that reorders, so no shipped drag commits while disabled.
- Kind: correctness
- Prior art: NONE. Searched the digest for disabled, drag, and reorder.

### C07

- File: `packages/ui/src/modules/query/query-builder/query-builder-group.tsx` (QueryBuilderGroup)
- Claim: The menu panel is portaled out of the disabled fieldset, so it stays open and its Add rule and Add group items stay live. A click on an item adds a node and calls onValueChange while the builder is disabled.
- Mechanism:
  - `packages/ui/src/modules/query/query-builder/query-builder-group.tsx:175 disabled={disabled}`
  - `packages/ui/src/modules/query/query-builder/query-builder-group.tsx:181 <MenuItem onAction={() => addRule(group.id)}>`
  - `packages/ui/src/modules/query/query-builder/query-builder-group.tsx:186 <MenuItem onAction={() => addGroup(group.id)}>`
  - `packages/ui/src/components/menu/use-menu-root.ts:142-145 // A disabled context menu keeps its wrapper ... A dropdown and a static menu ignore the flag. / const suppressed = isContextMenu && disabled`
  - `packages/ui/src/components/menu/menu-item-utilities.ts:16 if (disabled) return`
- Trigger: As stated. Only the trigger takes disabled; the open dropdown has no close on disable, and its items take no disabled, so an item still runs addRule or addGroup.
- Documented intent: packages/ui/src/modules/query/query-builder/query-builder.tsx:38 /** Disables every control in the tree. @defaultValue false */
- Reach: none. Searched disabled on QueryBuilder in the consumer roots. Only the playground (docs/pages/modules/query/playground.tsx:5) toggles it, and its control sits outside the builder, so a press on it dismisses the open menu first. modules/grid/grid-column-filter-sheet.tsx:81-88 passes no disabled. 
- Severity: low. No consumer in the roots disables the builder while its Add menu is open, so no shipped edit lands while disabled.
- Kind: correctness
- Prior art: NONE. Searched the digest for disabled, menu, and addRule.

### C09

- File: `packages/ui/src/modules/query/query-builder/query-builder-sortable-item.tsx` (QueryBuilderSortableItem)
- Claim: On the drop, the node glides from the pointer back into its slot with Motion's drag-end inertia animation (a spring with a 750 ms time constant), which is a move animation under reduced motion. The instant transition reaches only the layout moves.
- Mechanism:
  - `packages/ui/src/modules/query/query-builder/query-builder-sortable-item.tsx:79 transition={instant ? k.instant : undefined}`
  - `node_modules/.pnpm/framer-motion@14.0.0_react-dom@19.3.0_react@19.3.0/node_modules/framer-motion/dist/es/components/Reorder/Item.mjs:27 return (jsx(Component, { drag: dragAxis, ...props, dragSnapToOrigin: true,`
  - `node_modules/.pnpm/framer-motion@14.0.0_react-dom@19.3.0_react@19.3.0/node_modules/framer-motion/dist/es/gestures/drag/VisualElementDragControls.mjs:169 this.startAnimation(velocity);`
  - `node_modules/.pnpm/framer-motion@14.0.0_react-dom@19.3.0_react@19.3.0/node_modules/framer-motion/dist/es/gestures/drag/VisualElementDragControls.mjs:302-304 if (dragSnapToOrigin === true || dragSnapToOrigin === axis) transition = { min: 0, max: 0 };`
  - `node_modules/.pnpm/framer-motion@14.0.0_react-dom@19.3.0_react@19.3.0/node_modules/framer-motion/dist/es/gestures/drag/VisualElementDragControls.mjs:313-323 const inertia = { type: "inertia", ... timeConstant: 750, ... ...dragTransition, ...transition, };`
  - `node_modules/.pnpm/framer-motion@14.0.0_react-dom@19.3.0_react@19.3.0/node_modules/framer-motion/dist/es/gestures/drag/VisualElementDragControls.mjs:335 return axisValue.start(animateMotionValue(axis, axisValue, 0, transition, this.visualElement, false));`
  - `node_modules/.pnpm/motion-dom@14.0.0/node_modules/motion-dom/dist/es/animation/interfaces/motion-value.mjs:71-74 if (MotionGlobalConfig.instantAnimations || MotionGlobalConfig.skipAnimations || element?.shouldSkipAnimations || valueTransition.skipAnimations) {`
  - `node_modules/.pnpm/motion-dom@14.0.0/node_modules/motion-dom/dist/es/animation/interfaces/visual-element-target.mjs:83 const shouldReduceMotion = reduceMotion ?? visualElement.shouldReduceMotion;`
- Trigger: As stated. The release animation goes from the drag offset to the slot through animateMotionValue directly; the item transition and the reducedMotion of MotionConfig do not reach that path, which reads only skipAnimations. With min and max at 0 the inertia runs as its boundary spring, not only the 750 ms decay.
- Documented intent: packages/ui/src/modules/query/query-builder/query-builder-sortable-item.tsx:29 /** Whether the node moves to its new place with no animation, for reduced motion. */ and packages/ui/src/modules/query/query-builder/query-builder-sortable.tsx:108-110 // Motion's `MotionConfig` leaves `layout` animations running, so the nodes / // read the preference themselves (WCAG 2.3.3). / const instant = usePrefersReducedMotion()
- Reach: shipped. Searched reorder and dragTransition in the consumer roots and in modules/query; no dragTransition is set. `packages/ui/src/docs/pages/modules/query/reorder.tsx:13 <QueryBuilder fields={fields} value={query} onValueChange={setQuery} reorder />`
- Severity: low. On the shipped reorder page a pointer drop glides the node a short distance into its slot for a reader who asked for reduced motion, but the glide is a spring settle of under a second that ends by itself in the correct slot, so the defect heals itself (§6.1 low).
- Kind: bug
- Overturn: LOWERED. The defect is real and not deliberate (sortable-item.tsx:29 promises no animation), but the wrong part is only the path of a node that the user drags with the pointer, from the release offset to the correct slot, and it ends by itself within a spring settle, which §6.1 rates low, not a wrong result that persists.
- Prior art: NONE. Searched the digest for reduced motion, instant, and drag.

### C12

- File: `packages/ui/src/recipes/kata/query-builder.ts` (k (sortable.handle, sortable.separator))
- Claim: The grip box stays 24px with an 18px top margin and an sm icon, so it leaves the center of the first control line, whose height steps with density. The item gap and the separator inset stay fixed too.
- Mechanism:
  - `packages/ui/src/recipes/kata/query-builder.ts:88-90 The grip centers on the first control line of a rule: the rule's border / and 'p-2.5', then half a control.`
  - `packages/ui/src/recipes/kata/query-builder.ts:93 'mt-4.5 flex size-6 shrink-0 items-center justify-center',`
  - `packages/ui/src/recipes/kata/query-builder.ts:37 rule: ['p-2.5', border.default, rounded.lg],`
- Trigger: A builder with reorder in a density scope other than md: the control height steps with the scope, the grip margin stays 18px, so the grip leaves the center of the first control line. The fixed item gap and separator inset are dropped (ruledOut).
- Documented intent: The kata comment at query-builder.ts:88-90 states the centering, and the fixed mt-4.5 keeps it only at md.
- Reach: shipped. Searched reorder in the consumer roots; the stored density of the reader sets the root step. `packages/ui/src/docs/pages/modules/query/reorder.tsx:13 <QueryBuilder fields={fields} value={query} onValueChange={setQuery} reorder />`
- Severity: low. The grip on the shipped reorder page sits a few pixels off center at a non-md step and still drags, the level the digest gives the same open row.
- Kind: correctness
- Prior art: Digest open row R1-C11: "The drag handle keeps a fixed `mt-4.5` offset while the control height steps, so the handle is not centered on the first control line at xs, sm, lg, or xl." Severity low, kind correctness. (known)

### C14

- File: `packages/ui/src/modules/query/query-builder/query-builder.tsx` (QueryBuilder)
- Claim: The builder starts with an empty root group and shows the No rules added warning, so the query holds no rule.
- Mechanism:
  - `packages/ui/src/modules/query/use-query-tree.ts:57 const initial = useMemo(() => defaultValue ?? createGroup('and'), [defaultValue])`
  - `packages/ui/src/modules/query/query-builder/query-builder-group.tsx:109 const childRemovable = !requireRule || group.children.length > 1`
  - `packages/ui/src/modules/query/query-builder/query-builder-group.tsx:148-153 {group.children.length === 0 ? ( <Alert severity="warning" ... title={intl.formatMessage(queryBuilderMessages.noRules)}`
- Trigger: As stated: requireRule only hides remove controls, so an empty start stays empty.
- Documented intent: packages/ui/src/modules/query/query-builder/query-builder.tsx:62-64 Keeps at least one rule in the query. A group's sole remaining rule hides its / remove control, so the builder can't be emptied. For always-on filters (a / column filter) that must keep a rule to edit. The first sentence is not kept for an empty start; packages/ui/src/modules/query/query-builder/query-builder.tsx:34 Omitted, the tree starts as an empty `and` group.
- Reach: none. Searched requireRule in the consumer roots. The one site, modules/grid/grid-column-filter-sheet.tsx:85-86 requireRule / value={draft}, gets a seeded draft (modules/grid/grid-column-filter-button.tsx:96 return createGroup('and', [field.type === 'text' ? { ...rule, operator: 'contains' } : rule])). The playground forces docs/pages/modules/query/playground.tsx:5 defaultValue={seed}, which holds a rule. 
- Severity: low. The one shipped requireRule consumer seeds a rule, so no shipped builder starts empty under requireRule.
- Kind: correctness
- Prior art: Digest open row Q1-C05: "The builder shows the 'No rules added' warning and the query holds no rule, so the column filter has no rule to edit until the user adds one." Reach none, severity low. Digest open question Q14: "Should QueryBuilder seed one rule when requireRule meets an empty tree, or is the seed the job of the consumer?" Answer: open. (known)

### C19

- File: `packages/ui/src/modules/query/query-builder/query-builder-rule.tsx` (QueryBuilderRule)
- Claim: The field Select, the operator Select, the value editor of each rule, and the AND/OR segment get disabled only through the native fieldset. They receive no disabled prop, so they stamp no data-disabled while they are disabled, and a style or a selector that reads data-disabled does not apply.
- Mechanism:
  - `packages/ui/src/modules/query/query-builder/query-builder.tsx:131 disabled={disabled}`
  - `packages/ui/src/components/fieldset/fieldset.tsx:13 export const Fieldset = createSlot('fieldset', 'fieldset', k().base)`
  - `packages/ui/src/modules/query/query-builder/query-builder-rule.tsx:144-150 <Select value={rule.field} displayValue={displayField} onValueChange={onFieldChange} placeholder={fieldLabel} aria-label={fieldLabel} className={slots.parts.item}`
  - `packages/ui/src/modules/query/query-builder/query-builder-rule.tsx:180-186 <QueryBuilderRuleValue field={field} value={rule.value} onValueChange={onValueChange} range={selectedOperator?.range} className="w-full"`
  - `packages/ui/src/modules/query/query-builder/query-builder-rule.tsx:207 disabled={disabled}`
  - `packages/ui/src/components/listbox/listbox-button.tsx:117 data-disabled={dataAttr(disabled)}`
  - `packages/ui/src/modules/query/query-builder/query-builder-group.tsx:74-77 <Segment value={combinator} onValueChange={(next) => next && updateCombinator(id, next as QueryCombinator)} >`
- Trigger: As stated. The Fieldset is a plain slot with no Control scope, so the native disabled reaches the elements but not the props that stamp data-disabled. The remove Button gets the prop and stamps; the Selects, the value editor, and the Segment do not.
- Documented intent: CONVENTIONS.md:84 A part that can be disabled also stamps `data-disabled` while it is disabled. Use `dataAttr` from `ui/core` (§3.10). A consumer then styles the state of each disclosure with the same selector.
- Reach: shipped. Searched disabled on QueryBuilder in the consumer roots; the playground forwards the disabled control. `packages/ui/src/docs/pages/modules/query/index.tsx:12 <Playground of={QueryPlayground} api={api} omit={['reorder']} />`; `packages/ui/src/docs/pages/modules/query/playground.tsx:5 return <QueryBuilder {...props} fields={fields} defaultValue={seed} />`
- Severity: low. The library styles read :disabled beside data-disabled, so the shipped playground builder looks disabled, and only a selector on data-disabled misses the parts.
- Kind: correctness
- Prior art: Related, not a match: digest resolved row Q1-C11 (QueryChips row stamps no data-disabled), RESOLVED by #3110, low correctness. This claim is on the parts of QueryBuilder.

## Lens and contract lines

| Lens | Result | Guards or claims |
| --- | --- | --- |
| keyboard | broken | C01, C02 Escape that the code and an enclosing overlay both handle (keyboard lift and pointer drag): `packages/ui/src/hooks/use-keyboard-reorder.ts:107-111 if (event.key !== 'Escape' && event.key !== 'Enter') return; event.preventDefault(); drop(at.describe); with packages/ui/src/hooks/use-escape-layer.ts:68 if (event.key !== 'Escape' \|\| event.defaultPrevented) return`; Item selector when a reorderable group holds another reorderable group: `packages/ui/src/modules/query/query-builder/query-builder-sortable.tsx:83-85 querySlot(listRef.current, 'query-sortable', 'node-id', id)?.querySelector<HTMLElement>(':scope > [data-slot="query-reorder-handle"]')?.focus()`; Focus after the removal of a rule or a group (builder): `packages/ui/src/modules/query/query-builder/query-builder-focus.ts:31-35 if (prev) candidates.push({ kind: 'node', id: prev.id }); if (next) candidates.push({ kind: 'node', id: next.id }); candidates.push({ kind: 'add', groupId: tree.id })`; Focus after the last chip goes (chips): `packages/ui/src/modules/query/query-chips.tsx:227-229 useQueryRemovalFocus<HTMLButtonElement>(() => rowRef.current?.focus())`; Lift drops when the builder turns disabled: `packages/ui/src/hooks/use-keyboard-lifted.ts:50-52 useLayoutEffect(() => { if (!enabled) setLiftedId(null) }, [enabled, setLiftedId])` |
| touch | broken | C04 touch-action of the grip against the vertical drag: `packages/ui/src/recipes/kiso/hannou/cursor.ts:58-59 'cursor-grab data-dragging:cursor-grabbing', 'touch-none select-none **:select-none [-webkit-touch-callout:none]' (sortable handle via ...grab.default at packages/ui/src/recipes/kata/query-builder.ts:95)`; One finger, two fingers, and a pen: `packages/ui/src/modules/query/query-builder/query-builder-sortable-item.tsx:101-106 onPointerDown: (event: PointerEvent) => { if (!isPrimaryPress(event)) return; holdTextSelection(event); controls.start(event) }`; A touch on the rule body scrolls: `packages/ui/src/modules/query/query-builder/query-builder-sortable-item.tsx:77-78 dragListener={false} dragControls={controls}` |
| rtl | holds | Horizontal arrow keys of the QueryChips toolbar: `packages/ui/src/modules/query/query-chips.tsx:217-222 const onKeyDown = useA11yRoving(rowRef, { itemSelector: ITEM_SELECTOR, orientation: 'horizontal', manageTabIndex: true, enabled: !readOnly, }) with packages/ui/src/hooks/a11y/use-a11y-roving.ts:1467 const key = logicalArrowKey(event.key, context.container)`; Horizontal arrow keys of the AND/OR segment: `packages/ui/src/components/tabs/tab-list.tsx:97-100 const handleKeyDown = useA11yRoving(ref, { itemSelector: TAB_SELECTOR, orientation, })`; Start side of the separator in a reorderable group: `packages/ui/src/recipes/kata/query-builder.ts:110-113 separator: ['ps-7.5', 'motion-safe:transition-opacity group-data-sorting/sortable:opacity-0']`; Start side of the Add menu panel: `packages/ui/src/modules/query/query-builder/query-builder-group.tsx:168 <Menu placement="bottom-start">`; Start side of the hold fill of Remove group: `packages/ui/src/components/hold-button/hold-button.tsx:195 className="pointer-events-none absolute inset-0 origin-left rtl:origin-right bg-current/20"`; Inline order of the parts of a horizontal rule: `packages/ui/src/modules/query/query-builder/query-builder-rule.tsx:137-141 <Flex flex="1" gap="sm" direction={mapResponsive(orientation, toDirection)} className={slots.parts.base}> (a flex row follows the direction)`; Horizontal gesture and horizontal reorder key: none: `packages/ui/src/modules/query/query-builder/query-builder-sortable.tsx:124 axis="y" and :36 const stepFor = (key: string) => (key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : null)`; Chip focus ladder in reading order: `packages/ui/src/modules/query/query-chips.tsx:164 return [...ids.slice(0, index).reverse(), ...ids.slice(index + 1)]` |
| density | broken | C11, C12, C13 Chips row steps and gaps: `packages/ui/src/recipes/kata/query-chips.ts:30-36 base: [flex.row, 'flex-wrap gap-1.5', dan.gap.touch.chips, '[--touch-target-gap-y:--spacing(3)]', dan.text.chip] with packages/ui/src/modules/query/query-chips.tsx:315 data-density="slot"`; Separator of the builder one step below: `packages/ui/src/modules/query/query-builder/query-builder-group.tsx:73 <div data-density="slot">` |
| motion | broken | C09 Layout move of the nodes under reduced motion: `packages/ui/src/modules/query/query-builder/query-builder-sortable-item.tsx:79 transition={instant ? k.instant : undefined} with packages/ui/src/modules/query/query-builder/query-builder-sortable.tsx:110 const instant = usePrefersReducedMotion()`; Separator fade during a drag: `packages/ui/src/recipes/kata/query-builder.ts:112 'motion-safe:transition-opacity group-data-sorting/sortable:opacity-0'` |
| forced-colors | broken | C10 Focus of the grip: `packages/ui/src/recipes/kata/query-builder.ts:101 ...focus.ring`; Edges of the rule and the nested group: `packages/ui/src/recipes/kata/query-builder.ts:33 ['p-3', ...mode('bg-zinc-50', 'dark:bg-zinc-900/40'), border.default, rounded.lg] and :37 rule: ['p-2.5', border.default, rounded.lg] (border.default is a 1px border, packages/ui/src/recipes/kiso/sen/border.ts:29)`; Disabled controls: `packages/ui/src/modules/query/query-builder/query-builder.tsx:128-131 <Fieldset ... disabled={disabled}> (native disabled)` |
| first-paint | broken | C20 Responsive orientation of a rule at the server render: `packages/ui/src/modules/query/query-builder/query-builder-rule.tsx:140 direction={mapResponsive(orientation, toDirection)} with packages/ui/src/recipes/kata/query-builder.ts:49 responsive: { orientation: { vertical: 'flex-nowrap', horizontal: 'flex-wrap' } } (CSS, no client read)`; Reduced motion before hydration: `packages/ui/src/hooks/use-prefers-reduced-motion.ts:19-20 'The value is true on the server and in the hydration render' (sets a transition, no layout)` |
| controlled | broken | C05, C06, C07, C08 Value shown from the prop and reported on each change: `packages/ui/src/modules/query/use-query-tree.ts:59-63 const [tree, setTree] = useControllable<QueryGroup>({ value, defaultValue: initial, onValueChange: onValueChange && ((next) => next != null && onValueChange(next)), })`; Keyboard lift when disabled turns true: `packages/ui/src/hooks/use-keyboard-lifted.ts:50-52 useLayoutEffect(() => { if (!enabled) setLiftedId(null) }, [enabled, setLiftedId])` |

| Contract | Result | Code or claims |
| --- | --- | --- |
| packages/ui/src/modules/query/query-builder/query-builder.tsx:18 the parts of a rule stack on a compact viewport, and share a row from medium. | kept | packages/ui/src/modules/query/query-builder/query-builder.tsx:19-22 adaptive({ compact: 'vertical', medium: 'horizontal' }); packages/ui/src/recipes/kata/query-builder.ts:55 orientation: { vertical: stacked, horizontal: 'min-w-32 flex-1' } |
| packages/ui/src/modules/query/query-builder/query-builder.tsx:34 Omitted, the tree starts as an empty `and` group. | kept | packages/ui/src/modules/query/use-query-tree.ts:57 defaultValue ?? createGroup('and') |
| packages/ui/src/modules/query/query-builder/query-builder.tsx:36 Fires when an edit changes the query, with the next query tree. | kept | packages/ui/src/modules/query/use-query-tree.ts:62 onValueChange && ((next) => next != null && onValueChange(next)); packages/ui/src/hooks/use-controllable.ts:109 if (Object.is(normalized, base) && Object.is(normalized, heldRef.current)) return |
| packages/ui/src/modules/query/query-builder/query-builder.tsx:38 Disables every control in the tree. @defaultValue false | broken | C06, C07 |
| packages/ui/src/modules/query/query-builder/query-builder.tsx:41-42 Allows nested groups via an "Add group" action. Set `false` for a flat list of rules joined by AND/OR. | kept | packages/ui/src/modules/query/query-builder/query-builder-group.tsx:185 {allowGroups && (<MenuItem onAction={() => addGroup(group.id)}> |
| packages/ui/src/modules/query/query-builder/query-builder.tsx:47-48 Hides the field selector of each rule, for a single fixed field. | kept | packages/ui/src/modules/query/query-builder/query-builder-rule.tsx:143 {!hideFieldSelector && (<Select |
| packages/ui/src/modules/query/query-builder/query-builder.tsx:53-57 `vertical` stacks them at full width, and `horizontal` puts them in a row that wraps a part that cannot get its minimum width. | kept | packages/ui/src/recipes/kata/query-builder.ts:49 { vertical: 'flex-nowrap', horizontal: 'flex-wrap' }; packages/ui/src/recipes/kata/query-builder.ts:24 const stacked = 'min-w-auto flex-initial' |
| packages/ui/src/modules/query/query-builder/query-builder.tsx:62-63 Keeps at least one rule in the query. A group's sole remaining rule hides its remove control, so the builder can't be emptied. | broken | C14 |
| packages/ui/src/modules/query/query-builder/query-builder.tsx:70-71 Each child shows a grip when its group has more than one child. | kept | packages/ui/src/modules/query/query-builder/query-builder-sortable.tsx:151 handle={children.length > 1} |
| packages/ui/src/modules/query/query-builder/query-builder.tsx:71-72 A node moves only among its siblings, and each AND/OR stays in its position. | kept | packages/ui/src/modules/query/engine/query-tree.ts:113-124 const to = clamp(toIndex, 0, children.length - 1) ... withCombinator(child, children[index]?.combinator) |
| packages/ui/src/modules/query/query-builder/query-builder.tsx:72-73 A pointer drag calls `onValueChange` once, on the drop, and Escape cancels it. | broken | C04, C06 |
| packages/ui/src/modules/query/query-builder/query-builder.tsx:73-74 With the keyboard, each arrow key moves the node and calls `onValueChange`. | kept | packages/ui/src/hooks/use-keyboard-reorder.ts:120 onReorder(moveItem(items, at.index, target), at.id, target); packages/ui/src/modules/query/query-builder/query-builder-sortable.tsx:91 onReorder: (_next, id, index) => move(id, index) |
| packages/ui/src/modules/query/query-builder/query-builder.tsx:81-84 controlled or uncontrolled through `value`/`onValueChange`. | kept | packages/ui/src/modules/query/query-builder/use-query-builder-tree.ts:24 const { root, actions } = useQueryTree(options) |
| packages/ui/src/modules/query/query-builder/context.tsx:13 Stable across tree edits. | kept | packages/ui/src/modules/query/query-builder/query-builder.tsx:123 [fields, getField, disabled, allowGroups, hideFieldSelector, orientation, requireRule, reorder] |
| packages/ui/src/modules/query/query-builder/context.tsx:24 When true, the query keeps at least one rule: a group's last rule hides its remove control. | broken | C14 |
| packages/ui/src/modules/query/query-builder/context.tsx:26 When true, each group with more than one child shows a drag grip beside each child. | kept | packages/ui/src/modules/query/query-builder/query-builder-group.tsx:155-156 reorderable ? (<QueryBuilderSortable ...; packages/ui/src/modules/query/query-builder/query-builder-sortable.tsx:151 handle={children.length > 1} |
| packages/ui/src/modules/query/query-builder/context.tsx:30 Tree-edit actions provided to rule/group consumers; referentially stable across edits. | kept | packages/ui/src/modules/query/use-query-tree.ts:115-118 useMemo over callbacks with deps [setTree, initial] or [setTree, initial, fields]; packages/ui/src/modules/query/query-builder/use-query-builder-tree.ts:43-46 useMemo(() => ({ ...actions, remove }), [actions, remove]) |
| packages/ui/src/modules/query/query-builder/context.tsx:50-51 Callback ref that registers the element under `key` for the lifetime it's mounted. Memoized on `key`. | kept | packages/ui/src/modules/query/query-builder/context.tsx:56 useCallback((el: HTMLElement \| null) => register(key, el), [register, key]) |
| packages/ui/src/modules/query/query-builder/query-builder-focus.ts:17-20 The ladder follows the APG list pattern: previous sibling, then next sibling, then the enclosing group's add control. The add control of each ancestor group follows, nearest first, on the way to the root. Empty when `id` isn't found. | kept | packages/ui/src/modules/query/query-builder/query-builder-focus.ts:31-35; packages/ui/src/modules/query/query-builder/query-builder-focus.ts:46 return [...inner, { kind: 'add', groupId: tree.id }]; packages/ui/src/modules/query/query-builder/query-builder-focus.ts:50 return [] |
| packages/ui/src/modules/query/query-builder/query-builder-group.tsx:32 When true, the group is the root and omits its "remove" button. | kept | packages/ui/src/modules/query/query-builder/query-builder-group.tsx:193 {!root && removable && ( |
| packages/ui/src/modules/query/query-builder/query-builder-group.tsx:37-38 When false, the group omits its "remove" button. The parent sets it under `requireRule` when the group is its sole child. | kept | packages/ui/src/modules/query/query-builder/query-builder-group.tsx:126 <QueryBuilderGroup group={child} removable={childRemovable} /> |
| packages/ui/src/modules/query/query-builder/query-builder-group.tsx:53-55 The segment is a density scope one step below the scope around it. | kept | packages/ui/src/modules/query/query-builder/query-builder-group.tsx:73 <div data-density="slot"> |
| packages/ui/src/modules/query/query-builder/query-builder-group.tsx:89-92 The root renders as a plain `<div>`; nested groups render as a labeled `<fieldset>` with a hold-to-remove control. ... an edit re-renders only the affected group. | kept | packages/ui/src/modules/query/query-builder/query-builder-group.tsx:122 const Wrapper = root ? 'div' : 'fieldset'; packages/ui/src/modules/query/query-builder/query-builder-group.tsx:144 aria-label={root ? undefined : ...}; packages/ui/src/modules/query/query-builder/query-builder-group.tsx:226 memo(QueryBuilderGroupImpl) |
| packages/ui/src/modules/query/query-builder/query-builder-messages.ts:72-73 The tooltip of the Remove group button, which removes the group only after a long press. | broken | C01 |
| packages/ui/src/modules/query/query-builder/query-builder-rule-value.tsx:34 non-tuples read as both-blank. | kept | packages/ui/src/modules/query/query-builder/query-builder-rule-value.tsx:36-38 const [lo, hi] = Array.isArray(value) ? value : []; return [lo ?? '', hi ?? ''] |
| packages/ui/src/modules/query/query-builder/query-builder-rule-value.tsx:41 A set bound as a number, or `undefined` for a blank bound or one that is not a number. | kept | packages/ui/src/modules/query/query-builder/query-builder-rule-value.tsx:43-45 if (value === '') return undefined; return finiteOrUndefined(Number(value)) |
| packages/ui/src/modules/query/query-builder/query-builder-rule-value.tsx:49-51 Each bound clamps to the field's `span`, and each bound also clamps to the other, so the pair cannot invert. | broken | C15 |
| packages/ui/src/modules/query/query-builder/query-builder-rule-value.tsx:88-91 With a span, each placeholder is its end of the span alone, in the number form of the reader. With no span, the placeholders are `Min` and `Max`. | kept | packages/ui/src/modules/query/query-builder/query-builder-rule-value.tsx:113-117 floor === undefined ? intl.formatMessage(queryBuilderMessages.min) : intl.formatNumber(floor); packages/ui/src/modules/query/query-builder/query-builder-rule-value.tsx:127-131 ceiling === undefined ? ... max : intl.formatNumber(ceiling) |
| packages/ui/src/modules/query/query-builder/query-builder-rule-value.tsx:143-149 Value input for a query rule, chosen by the field's type: select, number (or a pair for a range), date round-tripped as a local-wall-clock ISO date, anything else a text Input. | kept | packages/ui/src/modules/query/query-builder/query-builder-rule-value.tsx:166-228; packages/ui/src/modules/query/query-builder/query-builder-rule-value.tsx:73-84 toCalendarDate(date).toString() / fromCalendarDate(parseDate(value)) |
| packages/ui/src/modules/query/query-builder/query-builder-rule.tsx:35-37 The enclosing group passes `false` for the sole remaining rule under `requireRule`. | kept | packages/ui/src/modules/query/query-builder/query-builder-rule.tsx:200 {removable && (; packages/ui/src/modules/query/query-builder/query-builder-group.tsx:128 <QueryBuilderRule rule={child} removable={childRemovable} /> |
| packages/ui/src/modules/query/query-builder/query-builder-rule.tsx:45-47 For a `noValue` operator the value input is replaced by its fixed `valueLabel` as static text. It is replaced by nothing when the operator names none. | kept | packages/ui/src/modules/query/query-builder/query-builder-rule.tsx:120 const subject = selectedOperator?.noValue && operatorValueLabel(intl, selectedOperator); packages/ui/src/modules/query/query-builder/query-builder-rule.tsx:178 {field && !selectedOperator?.noValue && (; packages/ui/src/modules/query/query-builder/query-builder-rule.tsx:193 {subject && ( |
| packages/ui/src/modules/query/query-builder/query-builder-rule.tsx:48-49 Changing the field resets the operator and the value to those of a new rule of that field. | kept | packages/ui/src/modules/query/query-builder/query-builder-rule.tsx:69-71 const { operator, value } = createRule(getField(nextFieldName)); updateRule(rule.id, { field: nextFieldName, operator, value }) |
| packages/ui/src/modules/query/query-builder/query-builder-rule.tsx:49-50 The rule is a `role="group"` named by its summary. | kept | packages/ui/src/modules/query/query-builder/query-builder-rule.tsx:131-132 role="group" aria-label={describeNode(intl, rule, fields)} |
| packages/ui/src/modules/query/query-builder/query-builder-sortable-item.tsx:29 Whether the node moves to its new place with no animation, for reduced motion. | broken | C09 |
| packages/ui/src/modules/query/query-builder/query-builder-sortable-item.tsx:33 Drops a keyboard lift when the grip loses focus. | kept | packages/ui/src/modules/query/query-builder/query-builder-sortable-item.tsx:109 onBlur,; packages/ui/src/hooks/use-keyboard-lifted.ts:102-106 if (movingRef.current) return; setLiftedId(null) |
| packages/ui/src/modules/query/query-builder/query-builder-sortable-item.tsx:44-46 The grip is the only drag activator, so the controls of the rule do not start a drag and a touch on the rule scrolls. The grip also takes the reorder keys. | kept | packages/ui/src/modules/query/query-builder/query-builder-sortable-item.tsx:77 dragListener={false}; packages/ui/src/modules/query/query-builder/query-builder-sortable-item.tsx:108 onKeyDown: (event: KeyboardEvent) => onKeyDown(id, event) |
| packages/ui/src/modules/query/query-builder/query-builder-sortable.tsx:45 Only the grip starts a pointer drag. | kept | packages/ui/src/modules/query/query-builder/query-builder-sortable-item.tsx:106 controls.start(event) |
| packages/ui/src/modules/query/query-builder/query-builder-sortable.tsx:45-46 The nodes move in a draft order as the pointer passes them, and the drop commits the move once. | broken | C04, C06, C08 |
| packages/ui/src/modules/query/query-builder/query-builder-sortable.tsx:46-47 Escape cancels the drag and puts the nodes back. | kept | packages/ui/src/hooks/use-reorder-drag.ts:79-87 if (event.key !== 'Escape' \|\| live === null) return; event.preventDefault(); live.canceled = true; setDraft(ids); live.controls.stop() |
| packages/ui/src/modules/query/query-builder/query-builder-sortable.tsx:47-49 With the keyboard, Space on a grip picks the node up, each arrow key moves it one position, and Space, Enter, or Escape drops it. | kept | packages/ui/src/hooks/use-keyboard-reorder.ts:138-143 if (event.key === ' ') { event.preventDefault(); toggleLift(id, describe) }; packages/ui/src/hooks/use-keyboard-reorder.ts:107 if (event.key !== 'Escape' && event.key !== 'Enter') return; packages/ui/src/modules/query/query-builder/query-builder-sortable.tsx:36 stepFor |
| packages/ui/src/modules/query/query-builder/query-builder-sortable.tsx:49-50 Each step is announced by the summary text of the node and its position in the group. | kept | packages/ui/src/hooks/use-keyboard-reorder.ts:122 announce(movedText(intl, itemName(at.id), { position: target + 1, total: items.length }), { assertive: true }); packages/ui/src/modules/query/query-builder/query-builder-sortable.tsx:75 describeNode(intl, child, fields) |
| packages/ui/src/modules/query/query-builder/query-builder-sortable.tsx:52-54 each combinator keeps its position through a move. So a drag moves the nodes between the separators. | kept | packages/ui/src/modules/query/query-builder/query-builder-sortable.tsx:136-145 const between = separator(index) ... key={`${children[index]?.id}-separator`} |
| packages/ui/src/modules/query/query-builder/use-query-builder-tree.ts:19-20 It wraps `remove` so removing a node moves focus to a surviving neighbor (WCAG 2.4.3) rather than dropping to `<body>`. | broken | C05 |
| packages/ui/src/modules/query/use-query-removal-focus.ts:11-12 Each call takes a new array, so a second removal runs the effect again. | kept | packages/ui/src/modules/query/use-query-removal-focus.ts:56 }, [pending, exhausted]) |
| packages/ui/src/modules/query/use-query-removal-focus.ts:19-21 the effect focuses the first target that is connected and not disabled, after the removed node unmounts. | broken | C05 |
| packages/ui/src/modules/query/use-query-removal-focus.ts:23 Runs when no target of the ladder can take focus. | kept | packages/ui/src/modules/query/use-query-removal-focus.ts:55 exhausted() |
| packages/ui/src/modules/query/use-query-tree.ts:16 Moves a node to `toIndex` in its own group. Each combinator stays in its position. | kept | packages/ui/src/modules/query/use-query-tree.ts:110 setTree((prev) => moveChild(prev ?? initial, id, toIndex)) |
| packages/ui/src/modules/query/query-chips.tsx:75 Fires when a remove or a combinator switch changes the query, with the next query tree. | kept | packages/ui/src/modules/query/query-chips.tsx:234 actions.remove(token.id); packages/ui/src/modules/query/query-chips.tsx:270 actions.updateCombinator(token.id, ...) |
| packages/ui/src/modules/query/query-chips.tsx:78-80 Renders the chips with no controls: no remove button, and each combinator as text. A read-only row renders `null` when the query puts no constraint on the rows. | kept | packages/ui/src/modules/query/query-chips.tsx:239 if (readOnly && tokens.length === 0) return null; packages/ui/src/modules/query/query-chips.tsx:246 onRemove={readOnly ? undefined : remove}; packages/ui/src/modules/query/query-chips.tsx:257 if (readOnly) return <span ...>{token.label}</span> |
| packages/ui/src/modules/query/query-chips.tsx:85-86 Disables each remove button and each combinator switch. The interactive row stamps `data-disabled`. | kept | packages/ui/src/modules/query/query-chips.tsx:248 disabled={disabled}; packages/ui/src/modules/query/query-chips.tsx:267 disabled={disabled}; packages/ui/src/modules/query/query-chips.tsx:317 data-disabled={dataAttr(disabled)} |
| packages/ui/src/modules/query/query-chips.tsx:90 The accessible name of the row. @defaultValue `'Filters'`, in the language of the reader. | kept | packages/ui/src/modules/query/query-chips.tsx:207 ariaLabelProp ?? intl.formatMessage(messages.filters) |
| packages/ui/src/modules/query/query-chips.tsx:93-95 The text of an interactive row when the query puts no constraint on the rows. @defaultValue `'No filters'`. | kept | packages/ui/src/modules/query/query-chips.tsx:209 emptyLabelProp ?? intl.formatMessage(messages.noFilters); packages/ui/src/modules/query/query-chips.tsx:328 {empty ? <span className={k().empty}>{emptyLabel}</span> : body} |
| packages/ui/src/modules/query/query-chips.tsx:121-122 Delete or Backspace on the button also removes the rule. | kept | packages/ui/src/components/badge/badge-removable.tsx:87-93 if (event.key !== 'Delete' && event.key !== 'Backspace') return; event.preventDefault(); onRemove?.() |
| packages/ui/src/modules/query/query-chips.tsx:153-155 The rule ids that take focus after the rule `id` goes, best first: the previous chips, nearest first, then the next chips. | kept | packages/ui/src/modules/query/query-chips.tsx:164 return [...ids.slice(0, index).reverse(), ...ids.slice(index + 1)] |
| packages/ui/src/modules/query/query-chips.tsx:173-174 An interactive row is a toolbar with one Tab stop, and the arrow keys move across its controls. | broken | C02 |
| packages/ui/src/modules/query/query-chips.tsx:174-175 A chip's remove button removes its rule. A combinator switches between AND and OR on a click. | kept | packages/ui/src/modules/query/query-chips.tsx:269-273 onClick={() => { actions.updateCombinator(token.id, token.combinator === 'and' ? 'or' : 'and') ... |
| packages/ui/src/modules/query/query-chips.tsx:175-176 After a removal, focus moves to a neighbor chip. | broken | C05 |
| packages/ui/src/modules/query/query-chips.tsx:176-177 After the last removal, focus moves to the row, which then shows `emptyLabel`. | kept | packages/ui/src/modules/query/query-chips.tsx:227-229 useQueryRemovalFocus<HTMLButtonElement>(() => rowRef.current?.focus()); packages/ui/src/modules/query/query-chips.tsx:324 tabIndex={props.tabIndex ?? (empty ? -1 : undefined)} |
| packages/ui/src/modules/query/query-chips.tsx:178-179 A blank or half-built rule has no chip, as in `QuerySummary`. | kept | packages/ui/src/modules/query/query-chips.tsx:205 const tokens = summarizeQuery(root, fields, intl) |
| packages/ui/src/modules/query/query-chips.tsx:181-183 The row is a density scope one step below the scope around it. ... At `md` the chips are `sm` Badges. | kept | packages/ui/src/modules/query/query-chips.tsx:315 data-density="slot"; packages/ui/src/modules/query/query-chips.tsx:298 data-density="slot" |
| packages/ui/src/modules/query/query-summary.tsx:48-50 Renders `null` when the query imposes no constraint, in step with isQueryActive. | kept | packages/ui/src/modules/query/query-summary.tsx:64 if (tokens.length === 0) return null |
| packages/ui/src/modules/query/query-summary.tsx:53-58 A blank or half-built rule drops out; a select value shows its option label; an operator that the field does not offer shows the built-in label of the field type; when that type has no such operator, the first built-in label shows. | kept | packages/ui/src/modules/query/engine/query-summary.ts:156 if (!imposesConstraint(rule.operator, rule.value)) return null; packages/ui/src/modules/query/engine/query-summary.ts:130 offered ?? findBuiltInOperator(rule.operator, field?.type); packages/ui/src/modules/query/engine/query-summary.ts:105 field.options?.find((option) => option.value === value)?.label ?? text |
| packages/ui/src/modules/query/engine/query-active.ts:5-6 It is true when any rule (at any depth) puts a constraint on the rows by imposesConstraint. | kept | packages/ui/src/modules/query/engine/query-active.ts:25-27 child.type === 'group' ? isQueryActive(child) : imposesConstraint(child.operator, child.value) |
| packages/ui/src/modules/query/engine/query-active.ts:12-13 A tree of only blank rules reads as inactive. A freshly seeded or fully cleared builder leaves such a tree behind. | broken | C16 |
| packages/ui/src/modules/query/engine/query-active.ts:18-20 A rule whose operator the evaluator does not know reads as inactive. A value-less operator reads as active, even when its field does not offer it. | kept | packages/ui/src/modules/query/engine/query-evaluate.ts:200-202 if (!Object.hasOwn(matchers, operator)) return false; if (VALUELESS_OPERATORS.has(operator)) return true |
| packages/ui/src/modules/query/engine/query-evaluate.ts:5-6 Nullish, blank or whitespace-only strings, and empty arrays read as empty. | kept | packages/ui/src/modules/query/engine/query-evaluate.ts:15 Array.isArray(value) ? value.every((item) => isEmptyValue(item)) : isBlank(value) |
| packages/ui/src/modules/query/engine/query-evaluate.ts:22-23 Mirrors the `noValue` operator flag in `getOperators`. | kept | packages/ui/src/modules/query/engine/query-evaluate.ts:27 new Set(['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse']); packages/ui/src/modules/query/engine/query-operators.ts:123-124, 142-143 noValue: true |
| packages/ui/src/modules/query/engine/query-evaluate.ts:30-32 Operators that read a `[min, max]` range ... Mirrors the `range` operator flag in `getOperators`. | kept | packages/ui/src/modules/query/engine/query-evaluate.ts:36 new Set(['between']); packages/ui/src/modules/query/engine/query-operators.ts:133 worded('between', messages.between, { range: true }) |
| packages/ui/src/modules/query/engine/query-evaluate.ts:59-61 A value that does not parse is `NaN`, so a blank cell matches no comparison and is not read as `0`. | kept | packages/ui/src/modules/query/engine/query-evaluate.ts:65 return parseNumeric(value) ?? Number.NaN |
| packages/ui/src/modules/query/engine/query-evaluate.ts:80-84 A number rule value ... reads the cell through asNumber ... Each other rule value reads the cell as text. | kept | packages/ui/src/modules/query/engine/query-evaluate.ts:89-91 |
| packages/ui/src/modules/query/engine/query-evaluate.ts:95-97 Mirrors the default operator sets in getOperators; text matches are case-insensitive, date comparisons rely on ISO (`YYYY-MM-DD`) string order. | broken | C17 |
| packages/ui/src/modules/query/engine/query-evaluate.ts:98-99 A blank date cell is not before or after a date. | kept | packages/ui/src/modules/query/engine/query-evaluate.ts:128-129 before: (a, b) => !isBlank(a) && asText(a) < asText(b), after: ... |
| packages/ui/src/modules/query/engine/query-evaluate.ts:181-187 It does when the evaluator has a matcher for the operator, and the operator reads no value or its value is filled. A filled value must also have the shape that the operator reads. For an operator in NUMERIC_OPERATORS, the value must also be numeric. | kept | packages/ui/src/modules/query/engine/query-evaluate.ts:200-208 |
| packages/ui/src/modules/query/engine/query-evaluate.ts:226-237 Four cases pass as no constraint ... Value-less operators evaluate regardless. | kept | packages/ui/src/modules/query/engine/query-evaluate.ts:240 return testRule(operator, fieldValue, ruleValue) ?? true |
| packages/ui/src/modules/query/engine/query-evaluate.ts:244-247 A child with no constraint drops out, and its combinator drops with it. | kept | packages/ui/src/modules/query/engine/query-evaluate.ts:259-262 if (value === undefined) continue; if (result === undefined) result = value |
| packages/ui/src/modules/query/engine/query-evaluate.ts:273-276 So `A OR (blank rule)` reads as `A`, as the summary shows it. A query with no constraint matches every row. | kept | packages/ui/src/modules/query/engine/query-evaluate.ts:283 return foldGroup(group, getValue) ?? true |
| packages/ui/src/modules/query/engine/query-evaluate.ts:317-320 The steps fold left to right, as in foldGroup. A step whose result cannot change the fold does not run. | kept | packages/ui/src/modules/query/engine/query-evaluate.ts:341-343 for (const step of rest) { if (step.and === result) result = step.test(getValue) } |
| packages/ui/src/modules/query/engine/query-evaluate.ts:350-352 Compiles a query tree into a test that gives the result of evaluateQuery. It gives `null` when the tree puts no constraint on the rows. | kept | packages/ui/src/modules/query/engine/query-evaluate.ts:334 if (!first) return null |
| packages/ui/src/modules/query/engine/query-node.ts:14-15 Creates a fresh QueryRule with a unique id, defaulting its operator to the field's first and its value to the type-appropriate empty value. | broken | C16 |
| packages/ui/src/modules/query/engine/query-node.ts:36-37 @param combinator @defaultValue 'and'; @param children @defaultValue `[]` | kept | packages/ui/src/modules/query/engine/query-node.ts:40-41 combinator: QueryCombinator = 'and', children: QueryNode[] = [] |
| packages/ui/src/modules/query/engine/query-node.ts:98-101 Each node needs a string `id` and, when it has one, a combinator of `and` or `or`. A rule needs a string `field` and a string `operator`. | kept | packages/ui/src/modules/query/engine/query-node.ts:79-87 |
| packages/ui/src/modules/query/engine/query-node.ts:104-107 The guard reads groups to a depth of 32 levels, as parseQuery does. A deeper group fails the guard. | kept | packages/ui/src/modules/query/engine/query-node.ts:91 depth < MAX_DEPTH |
| packages/ui/src/modules/query/engine/query-node.ts:117-128 Whether a value is a query group whose children are all query nodes. | kept | packages/ui/src/modules/query/engine/query-node.ts:131 return isQueryNode(value) && value.type === 'group' |
| packages/ui/src/modules/query/engine/query-operators.ts:150 Resolves the operators available for a field: its explicit `operators`, else the defaults for its type. | kept | packages/ui/src/modules/query/engine/query-operators.ts:152 return field.operators ?? defaultOperators[field.type] ?? [] |
| packages/ui/src/modules/query/engine/query-operators.ts:156-160 The default set of `type` comes first ... Then the first match in the other sets wins, and the text set comes first. | kept | packages/ui/src/modules/query/engine/query-operators.ts:169-171; packages/ui/src/modules/query/engine/query-operators.ts:148 Object.values(defaultOperators).flat() |
| packages/ui/src/modules/query/engine/query-operators.ts:175-177 A built-in operator takes its label from the catalog. An operator of the app, or a copy of a built-in operator, keeps its own `label`. | kept | packages/ui/src/modules/query/engine/query-operators.ts:182-184 builtInMessages.get(operator)?.label ... : operator.label |
| packages/ui/src/modules/query/engine/query-serialize.ts:31-32 The string has no node ids, so an equal query always gives an equal string. | kept | packages/ui/src/modules/query/engine/query-serialize.ts:20-28 compact |
| packages/ui/src/modules/query/engine/query-serialize.ts:36-38 A node that has no combinator gets `and`. | kept | packages/ui/src/modules/query/engine/query-serialize.ts:21 const combinator = node.combinator ?? 'and' |
| packages/ui/src/modules/query/engine/query-serialize.ts:87-89 When you give them, the parse drops each rule whose field is not in the list, or whose operator the field does not offer. When you do not give them, the parse checks only the structure. | kept | packages/ui/src/modules/query/engine/query-serialize.ts:159-181 |
| packages/ui/src/modules/query/engine/query-serialize.ts:96 It is `undefined` when the input has no usable root. | kept | packages/ui/src/modules/query/engine/query-serialize.ts:252, 265, 275 return { value: undefined, issues } |
| packages/ui/src/modules/query/engine/query-serialize.ts:226-228 It drops each node that it cannot read, keeps each other node, and reports each change. Each node gets a new id. | kept | packages/ui/src/modules/query/engine/query-serialize.ts:216-222 invalid-node; packages/ui/src/modules/query/engine/query-serialize.ts:184, 211 createRule / createGroup |
| packages/ui/src/modules/query/engine/query-serialize.ts:230-233 A missing param gives no query and no issue. Text that is not JSON, or a root that is not a group, gives no query and one issue. The parse reads groups to a depth of 32 levels, and drops a deeper group. | kept | packages/ui/src/modules/query/engine/query-serialize.ts:252 if (text == null \|\| text === '') return { value: undefined, issues }; packages/ui/src/modules/query/engine/query-serialize.ts:199 if (depth >= MAX_DEPTH) |
| packages/ui/src/modules/query/engine/query-serialize.ts:65-72 invalid-combinator: the parse uses `and`; too-deep, unknown-field, unknown-operator: the parse drops it. | kept | packages/ui/src/modules/query/engine/query-serialize.ts:118 return 'and'; packages/ui/src/modules/query/engine/query-serialize.ts:169, 179 return undefined |
| packages/ui/src/modules/query/engine/query-summary.ts:17-19 A `select` value resolves to its option label; a one-sided range renders as a `≥`/`≤` bound. A number value is in the number form of the intl. | kept | packages/ui/src/modules/query/engine/query-summary.ts:95-97; packages/ui/src/modules/query/engine/query-summary.ts:67 intl.formatNumber(value, NUMBER_FORMAT) |
| packages/ui/src/modules/query/engine/query-summary.ts:42-43 A combinator token names the node whose `combinator` it shows, which is the node after it. A bracket names its group. | kept | packages/ui/src/modules/query/engine/query-summary.ts:219-224 id: child.id; packages/ui/src/modules/query/engine/query-summary.ts:231 { kind: 'group-open', id: group.id } |
| packages/ui/src/modules/query/engine/query-summary.ts:192-195 Inactive rules and empty groups drop out, taking their leading combinator with them. | kept | packages/ui/src/modules/query/engine/query-summary.ts:214-216 if (tokens.length === 0) continue; if (body.length > 0) { |
| packages/ui/src/modules/query/engine/query-summary.ts:239-241 Empty when the query imposes no constraint (in step with isQueryActive). | kept | packages/ui/src/modules/query/engine/query-summary.ts:156, 259 |
| packages/ui/src/modules/query/engine/query-summary.ts:263-265 There is none at the start, none after an opening bracket, and none before a closing one. | kept | packages/ui/src/modules/query/engine/query-summary.ts:274 prev != null && prev.kind !== 'group-open' && token.kind !== 'group-close' |
| packages/ui/src/modules/query/engine/query-tree.ts:8-9 Returns the same `tree` reference when `id` is not found. | kept | packages/ui/src/modules/query/engine/query-tree.ts:34 return tree |
| packages/ui/src/modules/query/engine/query-tree.ts:39-40 Returns the same `tree` reference when `parentId` is not found. | kept | packages/ui/src/modules/query/engine/query-tree.ts:55 return tree |
| packages/ui/src/modules/query/engine/query-tree.ts:60-61 Returns the same `tree` reference when `id` is not found. | kept | packages/ui/src/modules/query/engine/query-tree.ts:76 return tree |
| packages/ui/src/modules/query/engine/query-tree.ts:95-96 `toIndex` clamps to the group. Returns the same `tree` reference when `id` is not found or the move changes nothing. | kept | packages/ui/src/modules/query/engine/query-tree.ts:113-115 clamp(toIndex, 0, children.length - 1); if (to === from) return tree; packages/ui/src/modules/query/engine/query-tree.ts:135 return tree |
| packages/ui/src/modules/query/engine/query-tree.ts:98-101 Each combinator stays in its position ... a hidden combinator on the first child never becomes live. A node that moves takes the combinator of its new position. | kept | packages/ui/src/modules/query/engine/query-tree.ts:123 moved.map((child, index) => withCombinator(child, children[index]?.combinator)) |
| packages/ui/src/modules/query/engine/query-announcements.ts:7-9 An active rule reads as its summary text, and a blank rule reads by its field. A group reads as `condition group`. | kept | packages/ui/src/modules/query/engine/query-announcements.ts:14-24 |
| packages/ui/src/modules/query/engine/types.ts:46 Ignored unless `noValue` is set. | kept | packages/ui/src/modules/query/query-builder/query-builder-rule.tsx:120 selectedOperator?.noValue && operatorValueLabel(intl, selectedOperator) |
| packages/ui/src/modules/query/engine/types.ts:50-52 either bound can be left blank for an open-ended range. | kept | packages/ui/src/modules/query/engine/query-evaluate.ts:121-122 isBlank(low) ? Number.NEGATIVE_INFINITY : asNumber(low) |
| packages/ui/src/modules/query/engine/types.ts:67-69 Each bound of a `between` rule clamps to it, and its placeholder shows it. | broken | C15 |
| packages/ui/src/recipes/kata/query-builder.ts:71-72 A held node sits over its neighbors on an opaque surface, so the nodes it passes do not show through it. | broken | C10 |
| packages/ui/src/recipes/kata/query-builder.ts:88-90 The grip centers on the first control line of a rule: the rule's border and `p-2.5`, then half a control. | broken | C12 |
| packages/ui/src/recipes/kata/query-chips.ts:16-21 The row is a density scope one step below the scope around it ... At `md` the chips are `sm` Badges with `text-sm`, and a combinator is an `xs` Button with `text-xs`. | kept | packages/ui/src/recipes/kata/query-chips.ts:35 dan.text.chip; packages/ui/src/recipes/kata/query-chips.ts:47 dan.text.combinator |

## Root-cause groups

- **M1**: useReorderDrag commits every end of a Motion drag as a drop, whatever ended it, because the items drop the end event and the hook takes no enabled flag. Members: C04, C06.

## Recommended resolution

Step S6 (Make NumberInput clamp and round on an Enter keydown as it does on a blur, so a commit with no blur, such as the implicit submit of the grid filter sheet, carries the clamped bound.) is withdrawn: the overturn refuted each row that it closes.

| Step | Change | Rows closed | Files | Order | Depends on | Gate | Test seam |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | Give the rule remove Button an onKeyDown that calls preventDefault() on an auto-repeat (event.repeat) of Enter or Space, as menu-trigger.tsx:112 does, so a key that is still down when focus arrives from a removal does not click it. | C01 | `packages/ui/src/modules/query/query-builder/query-builder-rule.tsx` | First: the only high finding, and a data loss. | none | none | jsdom: render a QueryBuilder with a rule before a nested group, fire keyDown Enter with repeat: true on the rule remove Button, and assert defaultPrevented and that the rule stays. The native click from a repeat is a browser default; the preventDefault is the synchronous seam. |
| S2 | Let useReorderDrag end a drag as canceled when the end event is a pointercancel, and when a new enabled option turns false during a live drag (mark it canceled, put the draft back, and stop the controls). The query sortable item and the List reorder item pass Motion's end event to onDragEnd, and the query sortable and List pass enabled. | C04, C06 | `packages/ui/src/hooks/use-reorder-drag.ts`, `packages/ui/src/modules/query/query-builder/query-builder-sortable-item.tsx`, `packages/ui/src/modules/query/query-builder/query-builder-sortable.tsx`, `packages/ui/src/components/list/list-item-reorder.tsx`, `packages/ui/src/components/list/context.ts`, `packages/ui/src/components/list/list.tsx` | Second: the medium bug of the drag commit, before S3, which edits the same item file. | none | none | renderHook of useReorderDrag with fake controls ({ stop: vi.fn() }): call onDragStart, setDraft with a new order, then onDragEnd with an event of type pointercancel, and assert that onReorder does not run; rerender with enabled false during a live drag and assert stop and no report. No Motion drive is needed. |
| S3 | Pass dragTransition={k.instant} on the Reorder.Item when instant is true, so the release animation has duration 0 and animateMotionValue applies it at once (motion-value.mjs:64-65 options.duration === 0 makes the animation instant). Apply the same in the List reorder item, which has the same instant prop and the same gap. | C09 | `packages/ui/src/modules/query/query-builder/query-builder-sortable-item.tsx`, `packages/ui/src/components/list/list-reorder.tsx` | Third, after S2, which edits the same item file. | S2 | none | No synchronous seam: the release animation is Motion's. The browser motion project (src/__tests__/browser/motion) runs Motion for real and can drop a node under emulated reduced motion and read its transform on the next frame. |
| S4 | Add the forced-colors outline behind the data-dragging gate on sortable.base: forced-colors:data-dragging:outline-solid and forced-colors:data-dragging:outline-2, with the offset and color classes that §5.10 asks behind a gate. | C10 | `packages/ui/src/recipes/kata/query-builder.ts` | Fourth: an independent medium bug in one kata. | none | none | recipes/forced-colors.test.ts reads the class list of the slot; browser/forced-colors-indicators.test.tsx can lift a node with Space and read the outline. |
| S5 | Compare a text rule value case-insensitively in holdsValue: asText(fieldValue).toLowerCase() === asText(ruleValue).toLowerCase(), so equals and notEquals keep the matchers TSDoc. Add a case pair to the test at query-evaluate.test.ts:18. | C17 | `packages/ui/src/modules/query/engine/query-evaluate.ts` | Fifth: a medium bug, gated on the scope of the change. | none | Q2 | matchQueryRule in a node test: equals('Lee', 'lee') is true and notEquals('Lee', 'lee') is false. |
| S7 | Pass disabled to the field Select, the operator Select, the Segment items, and a new disabled prop of QueryBuilderRuleValue, which passes it to its Select, NumberInput pair, DatePicker, and Input, so each part stamps data-disabled. | C19 | `packages/ui/src/modules/query/query-builder/query-builder-rule.tsx`, `packages/ui/src/modules/query/query-builder/query-builder-rule-value.tsx`, `packages/ui/src/modules/query/query-builder/query-builder-group.tsx` | Seventh: the first correctness finding with shipped reach. | none | none | jsdom: render <QueryBuilder disabled> with a rule and assert data-disabled on each listbox trigger, input, and segment tab. |
| S8 | Set the top margin of sortable.handle from the control ramp (border, p-2.5, half a control, minus half the grip) with a stepped density class, so the comment at query-builder.ts:88-90 holds at each step. | C12 | `packages/ui/src/recipes/kata/query-builder.ts` | Eighth: correctness with shipped reach, cosmetic. | none | none | browser/geometry: render the reorder builder at each step and compare the grip center with the center of the first control. |
| S9 | Compose the roving handler of the interactive QueryChips row with { checkForDefaultPrevented: false }, as toolbar.tsx:71-73 does. | C02 | `packages/ui/src/modules/query/query-chips.tsx` | Ninth: correctness with no reach. | none | none | jsdom: render QueryChips with an onKeyDown that calls preventDefault, fire ArrowRight on a chip remove button, and assert that focus moves. |
| S10 | Move focus in useQueryRemovalFocus only once the removed node is gone: keep the removed key with the ladder, run the effect again when the tree changes, and skip the move while the removed target is still connected. | C05 | `packages/ui/src/modules/query/use-query-removal-focus.ts`, `packages/ui/src/modules/query/query-builder/use-query-builder-tree.ts`, `packages/ui/src/modules/query/query-chips.tsx` | Tenth: correctness with no reach. | S9 | none | jsdom: a controlled QueryChips or QueryBuilder whose onValueChange keeps the old tree; click a remove control and assert focus stays on it. |
| S11 | Pass disabled to the Add rule and Add group MenuItems, so an open menu is inert once the builder turns disabled. | C07 | `packages/ui/src/modules/query/query-builder/query-builder-group.tsx` | Eleventh: correctness with no reach, after S7, which edits the same file. | S7 | none | The menu opens through floating-ui, which CONVENTIONS.md §10.3 bars a jsdom test from driving. The synchronous seam is handleMenuItemClick (menu-item-utilities.ts:16 if (disabled) return), already covered; the browser suite can open the menu, disable the builder, and click an item. |
| S12 | Under the recommended answer of Q3, state in the requireRule TSDoc that the prop keeps an existing rule and that the consumer seeds the first one, as the grid column filter does. | C14 | `packages/ui/src/modules/query/query-builder/query-builder.tsx` | Last: correctness with no reach, gated on an open question of the reader. | none | Q3 | None needed for a TSDoc change; under the seed answer, a jsdom render of <QueryBuilder requireRule /> asserts one rule. |

## Open questions

### Q1

Where does the clamp of a range bound run for a commit that has no blur? Withdrawn: the overturn refuted the row of the step that it gates.

### Q2

Does a case-insensitive equals reach each string rule value, or must the TSDoc instead say that equals is exact?

- Axes: (a) Lowercase both sides in holdsValue: the evaluator reads no field set (query-evaluate.ts:186-187), so select options and dashboard selections also match regardless of case; dates are digits and do not change. (b) Keep exact equals and change the matchers TSDoc and the test name to exclude equals and notEquals: files packages/ui/src/modules/query/engine/query-evaluate.ts and the test.
- Recommended: (a), because the test at query-evaluate.test.ts:18 names equals as a case-insensitive text operator and the text column filter is the shipped user of it.
- Answer: Proceed as recommended (Charlie, 2026-11-06 08:10Z, "All six PRs, as recommended").

### Q3

Should QueryBuilder seed one rule when requireRule meets an empty tree, or is the seed the job of the consumer? (Digest Q14, open.)

- Axes: Seed in the component: an uncontrolled seed, and an onValueChange on mount for a controlled empty tree; files packages/ui/src/modules/query/query-builder/query-builder.tsx and packages/ui/src/modules/query/use-query-tree.ts. Consumer duty: no behavior change; the requireRule TSDoc states that it keeps an existing rule; files packages/ui/src/modules/query/query-builder/query-builder.tsx.
- Recommended: Consumer duty, because the one shipped consumer seeds its draft and a seed on mount would send a controlled consumer a change that it did not ask for.
- Answer: Proceed as recommended (Charlie, 2026-11-06 08:10Z, "All six PRs, as recommended").

## Ruled out

- **C03** (`modules/query/query-builder/query-builder-group.tsx`, QueryBuilderSeparator): The control is a Segment, which is a Tabs tablist, so it reads as a tab list with an AND tab and an OR tab, selected, and no tab panel exists. The user hears a navigation widget, not a choice of one value. Ruled out: packages/ui/src/components/tabs/tab.tsx:148-149 A segmented control often has no panels, / so a segment tab also waits for a registered panel.
- **C08** (`modules/query/query-builder/query-builder-sortable.tsx`, QueryBuilderSortable): The new child does not render until the drop, because the list renders the draft order from the drag start. The drop then moves the dragged node to an index read from that stale draft. Ruled out: packages/ui/src/hooks/use-reorder-drag.ts:50-51 @returns `order` (the draft during a drag, else `ids`), `sorting` (whether a / drag is live)
- **C11** (`recipes/kata/query-builder.ts`, k (base, group, rule, value slots)): The controls and the gaps step with the scope, but the frame padding, the nested group padding, the rule padding, and the static value text stay at one size, so a compact or a spacious builder keeps the md box around each rule. Ruled out: CONVENTIONS.md:148 In `ui`, a ramp is the one place that writes a value for each density step (a placement rule, not a rule that each padding steps).
- **C13** (`recipes/kata/query-summary.ts`, k): The sentence stays text-sm and its combinators text-xs at each step, while QueryChips steps its text with the scope. Ruled out: packages/ui/src/recipes/kata/query-chips.ts:15-17 The row is a density scope one step below the scope around it (QueryChips opts in; no source makes QuerySummary a density scope).
- **C15** (`modules/query/query-builder/query-builder-rule-value.tsx`, RangeValue): Each keystroke reports the inverted or out-of-span pair to onValueChange, and the evaluator applies it, so the rows can go empty during the entry. The clamp runs only on blur, so an editor that unmounts while focused (a filter popover that closes) can keep the inverted pair. Ruled out: Overturn: packages/ui/src/modules/grid/grid-column-filter-sheet.tsx:73 <form className="contents" onSubmit={submit}> with no noValidate, and packages/ui/src/components/number-input/number-input.tsx:198-199 min={min} / max={max}, so an inverted pair (rule-value.tsx:62-64 makes one input out of range) fails native interactive validation on Enter and on Apply, and the submit event that calls onApply does not fire.
- **C16** (`modules/query/engine/query-node.ts`, createRule): The new rule starts as an active constraint: a select rule takes its first option as its value, and a boolean rule takes the value-less isTrue. The rows filter at once, and QuerySummary and QueryChips show the rule. Ruled out: packages/ui/src/modules/query/engine/query-node.ts:47-49 The value that a new rule of `field` starts with: `null` for a `boolean` / field, the first option for a `select` field
- **C18** (`modules/query/query-builder/index.ts`, QueryBuilderRuleValue): The barrel re-exports two symbols that their TSDoc marks @internal. Ruled out: packages/ui/src/__tests__/boundary/internal-barrel-boundary.test.ts:62-64 A barrel deeper / than that is internal composition: a sibling reaches it by module path, and / the symbols it carries stay `@internal` on purpose.
- **C20** (`modules/query/query-builder/query-builder-sortable-item.tsx`, QueryBuilderSortableItem): The server and the client mint different random node ids, so the data-node-id of each sortable node differs between the server markup and the hydration render, and React logs a hydration mismatch. Ruled out: packages/ui/src/modules/query/engine/query-node.ts:13-14 Creates a fresh {@link QueryRule} with a unique id (the consumer that builds the tree in render gives each render different props; CONVENTIONS.md:90 governs layout only).

## Surfaced, not judged

- `packages/ui/src/hooks/use-reorder-drag.ts` (sweeper): onDragEnd commits the draft whenever the drag is not marked canceled. Motion raises onDragEnd for a pointercancel too (PanSession maps pointercancel to its pointer-up path), so each Reorder user commits a canceled touch drag. The Escape listener also closes over the ids of the drag start.
- `packages/ui/src/components/badge/badge-removable.tsx` (sweeper): The Delete and Backspace handler has no event.repeat guard, and Enter repeats fire native clicks. With the focus ladder of QueryChips (or TagInput) moving focus to the next remove button, a held key removes chip after chip. Its remarks say 'Delete and Backspace prevent the default action of the key, so the key does nothing more after the removal.'
- `packages/ui/src/components/hold-button/hold-button.tsx` (sweeper): The hold progress fill paints only bg-current/20 (a background). Under forced colors the background is replaced, so the progress of a hold is invisible (CONVENTIONS.md section 5.10).
- `packages/ui/src/components/listbox/listbox.tsx` (sweeper): Under a disabled ancestor fieldset the trigger is disabled but stamps no data-disabled, as its own comment notes, which CONVENTIONS.md section 3.11 requires.
- `packages/ui/src/components/badge/badge-removable.tsx` (verifier): Delete and Backspace on a chip remove button remove the rule on keydown (badge-removable.tsx:88) with no event.repeat check, and the QueryChips ladder moves focus to the previous chip, so a held key removes chip after chip. Enter held on a chip remove button chains the same way through native clicks. Adjacent to C01.
- `packages/ui/src/components/segment/segment.tsx` (verifier): Segment is a tablist with no panels by design (tab.tsx:148-149). For a choice of one value, such as the query combinator, the APG pattern is a radio group. A design-system decision outside this scope.
- `packages/ui/src/hooks/use-reorder-drag.ts` (verifier): A value change during a live pointer drag is not merged into the draft; the drop moves the node to an index read from the stale draft (query-builder-sortable.tsx:100 move(id, next.indexOf(id))), so a node can land one place off when the group gained a child before it. No root writes the value during a drag.
- `packages/ui/src/components/number-input/number-input.tsx` (verifier): Enter in a NumberInput inside a Form submits the raw value with no clamp, because the clamp runs only on blur (number-input.tsx:168-181). Adjacent to C15 and Q1.
- `packages/ui/src/recipes/kiso/sen/focus.ts` (overturn): The shared lift entries (:105 raise: ['z-10', 'shadow-md'], :109 outline: 'focus-visible:outline-violet-600') paint a keyboard lift only with a shadow and an outline color, which forced colors remove or replace. List, Kanban, and Dashboard take them, so their lifted state may also look the same as focus under forced colors. Not judged; adjacent to C10.
- `packages/ui/src/recipes/kata/query-builder.ts` (caller, from `/assess`): Motion `Reorder.Item` writes an inline `z-index` (`unset` while x and y are 0), which voids `data-dragging:z-10`; a keyboard move paints the held node under its neighbor. `recipes/kata/list.ts` has the same cause. Fixed by [#3305](https://github.com/charliebeckstrand/midgard/pull/3305).
- `packages/ui/src/components/menu` (caller, from `/assess`): Enter on a trigger opens the menu with no active item, and a second Enter closes it.
- `packages/ui/src/components/json-tree/json-tree.tsx` (fix session, #3306): the recursive (default) JsonTree root `handleKeyDown` returns on `event.defaultPrevented` itself, because a branch row cancels its toggle arrow before the key bubbles, so a consumer `preventDefault` still switches off roving (same rule as C02, another cause). The windowed JsonTree got the option.
