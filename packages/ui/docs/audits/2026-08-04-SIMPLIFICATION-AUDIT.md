# Simplification Audit

Survey of `packages/ui` (2026-08-04) for code that a change can delete, merge, or make smaller with no
loss of behaviour and no loss of public surface. Nine area sweeps covered the package, and a skeptic
tried to refute each claim against the source. Of 57 claims, 35 did not survive; they are recorded under
Ruled out, because they name ground the next audit does not need to walk again. The method is the one the
built-in adoption audit set: a claim is not a finding until somebody read, probed, or ran something. Line
numbers are as of this commit and will drift.

The headline is that there is very little to remove. Twenty findings survive and they total 989 lines
against 109,560 lines of source — 0.9 percent. No finding names a wrong abstraction. The package applies
its own patterns consistently, and the sweeps came back with long ruled-out lists and short findings
lists, which is the signature of a surface that six prior audits already walked. What remains divides
almost evenly into two kinds: code that no caller reaches (a recipe helper, nine spacing axes, three
chart predicates, a contrast threshold layer, six hook options, a skeleton clamp — 295 lines), and one
machine written twice (three date-picker prologues, two reorder hooks, two grid dialogs, two chart menu
frames, two boundary tests, two contrast implementations). Test and boundary files give 186 of the 989.

## Measured

`packages/ui` holds 240,722 lines across 2,037 TypeScript files. Source is 109,560 lines in 1,211 files;
the Vitest suite is 96,275 in 555; the docs engine and demos are 27,555 in 206; benchmarks are 6,869 in
58. About 30 percent of source lines are TSDoc, which [CONVENTIONS.md](../../../../CONVENTIONS.md) §12.1
requires.

The weight is in `modules/`: 49,356 lines in 249 files, of which `grid` is 22,899 and `chart` is 18,625.
`components/` is 38,692 lines across 97 directories. The largest files are `modules/map/map-plat.tsx`
(1,425), `modules/grid/grid-data.tsx` (1,344), `modules/chart/engine/chart-layout.ts` (1,191), and
`hooks/a11y/use-a11y-roving.ts` (1,029).

Three mechanical checks came back empty and set the audit's direction. `knip` reports no unused file, no
unused export, and no unused dependency across the repo. A token-level duplicate-block scan of
`components/` reports zero blocks, so there is no copy-paste to harvest and the redundancy that exists is
structural. No React Compiler is configured anywhere in the repo, so the 842 `useMemo` and `useCallback`
sites are load-bearing and are not a target.

One fact bounds what "unused" can mean here. `apps/admin` imports 20 of the package's ~110 entry points.
The library is the product, not an app dependency, so no finding argues from the absence of an
application consumer.

## Ready

Behaviour-neutral. Each removes a file, an export, or a layer.

- [x] **Collapse the two grid manager dialogs into one shell.** `GridColumnManagerDialog`
  (`grid-column-manager-dialog.tsx`, 79 lines) declares 13 props and forwards 10 of them unchanged to
  `GridColumnManager`. Its `Dialog` / `DialogTitle` / `DialogBody` / `DialogFooter`-with-"Done" shell
  matches `GridRowManagerDialog` (`grid-row-manager-dialog.tsx`, 48 lines) line for line. Two files hold
  one four-element shell and a pass-through. Add `GridManagerDialog({ open, onOpenChange, label,
  children })`, which satisfies the stem-to-symbol rule at `helpers/filename-rules.ts:31-41`, then delete
  both files and move each manager's JSX to its call site. Four call sites change: `grid-data.tsx:1262`,
  `grid-region.tsx:198`, `grid-column-manager.test.tsx:439`, and
  `browser/floating-ui/grid-column-manager-menu-dismiss.test.tsx:25` — all four render the dialog
  directly today. Neither symbol is on `modules/grid/index.ts`, and the rendered tree does not change.
  Saving: 75 lines.

- [x] **Delete the nine unread `ma` spacing axes.** The `ma` bundle publishes 16 keys. `stops`, `pl`,
  `pr`, `pt`, `pb`, `ml`, `mr`, `mt`, and `mb` have no reader in the monorepo; a grep for each returns
  zero. Every use resolves to `p`, `px`, `py`, `m`, `mx`, `my`, or `gap` through `kata/box.ts:9-14`,
  `kata/list.ts:8`, `kata/flex.ts:1`, and `kata/split.ts:1`. Delete `padding.ts:34-65` and
  `margin.ts:34-65`, then trim the import lists and the nine barrel keys at `ma/index.ts:13-15,19-35`.
  Keep `stops.ts` as a module: `padding`, `margin`, and `gap` import the `Ma` type from it, and
  `recipes/index.ts:31` re-exports that type. Update the `ma` row at `docs/RECIPES.md:23`, which still
  advertises the raw `--spacing` numerals. `kiso` is internal and `./recipes` is absent from the
  package.json `exports`. Saving: 74 lines.

- [x] **Fold `primitive-recipe-boundary.test.ts` into `component-recipe-boundary.test.ts`.** The two
  boundary tests run the same scan for the same rule over different directories. `IMPORT_RE`
  (`component-recipe-boundary.test.ts:16` against `primitive-recipe-boundary.test.ts:15`) and the
  `isAllTypeNamed` helper are identical; only the header comment, the test titles, one indent level, and
  the loop differ. Add `primitivesDir` to the `for (const dir of [componentsDir, modulesDir])` loop at
  `component-recipe-boundary.test.ts:22`, make the failure message name the offending path's layer, and
  delete the 76-line primitive file. Reword the four references at `recipes/index.ts:19-20`,
  `recipes/README.md:43-44`, `recipes/kata/README.md:7`, and `docs/RECIPES.md:100` in the same change.
  Nothing imports either file. Saving: 70 lines.

- [x] **Delete `core/recipe/merge`.** `merge` (`core/recipe/merge.ts:12-20`) folds per-key class records
  into pre-merged variant-by-colour bundles. No production file calls it. The only importer is the barrel
  re-export at `core/recipe/index.ts:9`, plus its own test at `__tests__/recipes/merge.test.ts:2` —
  confirmed by grep. The use its doccomment names does not exist: `recipes/kata/calendar.ts:73-77`
  spreads three single-colour strings from the soft palette, not the per-colour records `merge` folds.
  Delete `merge.ts`, the re-export, the 39-line test, the row at `docs/RECIPES.md:79`, and the mention at
  `recipes/README.md:13`. Nothing public moves: `core/index.ts` does not re-export `./recipe`, and
  package.json `exports` has no `./recipes` entry, which `recipe-boundary.test.ts:21-30` pins. Saving:
  62 lines.

- [x] **Delete the duplicate `useComboboxTrigger` suite.** The 12-line hook has two full harnesses.
  `combobox-utilities.test.ts:111-169` is a second `describe('useComboboxTrigger')` with its own
  `setupHook`. `use-combobox-trigger.test.ts:6-60` covers the same two cases with a strict superset of
  assertions: it also asserts that `preventDefault` ran (`:47`) and that `close` did not (`:59`). The
  remaining differences are inert stubs and one needless `act`. Delete
  `combobox-utilities.test.ts:110-169` and the dead `useComboboxTrigger` import at `:4`, then narrow line
  1 to `renderHook`. The file then tests only `combobox-utilities.ts`, which is its subject. Coverage
  after the change is larger, not smaller. Saving: 61 lines.

- [x] **Merge the heatmap and choropleth context frames into one engine part.** `HeatmapContextFrame`
  (`heatmap-chart.tsx:850-890`) and `ChoroplethContextFrame` (`choropleth-chart.tsx:296-340`) are the
  same component in two directories: the same props bag, the same `if (useChartFullscreen()) return
  <>{children}</>` gate (`:877` and `:326`), and the same `ChartContextMenu` wrap. Only the choropleth
  forwards `target`, which is already optional at `chart-context-menu.tsx:96` and read as `target?.index
  ?? null` at `:145`, so the heatmap loses nothing. Add `ChartMenuFrame` beside `ChartContextMenu` in
  `engine/chart-context-menu.tsx`, which already imports `./context` for the fullscreen hook, and point
  both charts at it. Neither local frame is exported. `ChartFrame` performs the same gate a third time
  inline (`frame.tsx:288,:518`) and can adopt the part later. Saving: 48 lines.

- [x] **Delete the three unused chart hit-test predicates.** `withinBarMarks`
  (`chart-hit-test.ts:96-111`), `nearSeriesLines` (`:208-222`), and `withinSeriesAreas` (`:277-291`) each
  wrap `!== null` around the function beside them. No chart calls any of the three; the charts reach the
  underlying functions directly at `bar-chart.tsx:266`, `combo-chart.tsx:124-132`,
  `line-chart.tsx:248-249`, and `area-chart.tsx:431`. Grep confirms their only consumers are their own
  test blocks, and `barMarkAt`, `nearestSeriesLine`, and `nearestSeriesArea` each already own a block in
  the same file (`chart-hit-test.test.ts:67,:95,:153`). Delete the three functions with their TSDoc,
  rewrite the three wrapper blocks at `:22`, `:182`, and `:221` as `!== null` assertions, and drop the
  stale mention at `chart-geometry/bar.ts:86`. None of the three is on a barrel. Saving: 46 lines.

- [x] **Delete `createSkeleton`'s unreachable size clamp.** `sizeClassFor`
  (`placeholder-skeleton.ts:37-60`) clamps a sub-step size to the nearest key a recipe defines, but no
  call site can reach the clamp. `SizedSkeletonRecipe<S>` infers `S` from the recipe's own `size` record,
  so the component accepts only keys the map already holds, and `resolved in sizeMap` at `:43`
  short-circuits every time. A `tsc --noEmit` probe over all 12 sized skeletons confirms the pin, and
  every sized map is `xs/sm/md/lg` or `sm/md/lg` with a matching union. Delete `sizeClassFor` and the
  `MA_ORDER` const with its comment (`:6-11`), replace the const with a plain `ResolvableSize` union, and
  collapse `:99-102` to one indexed read. `MA_ORDER` mirrors a spacing scale, not a component size axis,
  so no `size` prop can carry `xl`. The public `createSkeleton` signature does not change. Saving: 32
  lines.

- [ ] **Collapse the eight pdf-viewer toolbar icon-buttons.** The toolbar family writes the same
  Tooltip / Trigger / Button / Icon scaffold eight times across 114 lines
  (`pdf-viewer-toolbar.tsx:54-68,:72-86,:122-135`; `pdf-viewer-zoom-controls.tsx:37-50,:51-64,:65-78`;
  `pdf-viewer-document-actions.tsx:34-47,:48-61`), and every copy spells `type="button"` and
  `variant="plain"`. Only five values change: icon, accessible name, tooltip text, disabled expression,
  and handler. Add an internal `PdfViewerToolbarButton` that renders the scaffold, defaults `tooltip` to
  `label`, and spreads the rest for the two `aria-expanded` cases (`:54` and `:78`). The three files then
  drop three imports each and add one. `TooltipTrigger` clones its element child
  (`tooltip-trigger.tsx:78-88`), so the tree and every `data-slot` stay the same, and `pdf-viewer.test.tsx`
  queries only accessible names (`:97,:103,:115,:131`) and `aria-expanded` (`:199`). Saving: 30 lines.

- [x] **Fold `useControlFieldContext` into `ControlField`.** The hook is a 36-line `@internal` file that
  builds one `useMemo` for one 30-line component, and its own TSDoc admits the arrangement ("Not on the
  barrel — backs `ControlField`"). `control-field.tsx:27` is its only caller; no test and no docs page
  names it. Move the `useControl()` plus `useA11yControl(scope.id)` plus `useMemo<ControlContextValue>`
  body into `ControlField`, which already computes `scope.id`, then delete
  `use-control-field-context.ts`. Hook order is preserved, and the memo dependencies go from `[id,
  parent, a11y]` to `[scope.id, parent, a11y]`, which is the same value. `ControlField` keeps its three
  consumers in `checkbox-field.tsx`, `radio-field.tsx`, and `switch-field.tsx`, and stays off
  `components/control/index.ts`, so `internal-barrel-boundary`, `hook-type-name-boundary`, and
  `component-filename-boundary` are unaffected. Saving: 18 lines.

- [x] **Inline `resolveMount`.** `resolveMount(_fade, mount)` returns `mount ?? 'active'`
  (`current.ts:114-116`). The `fade` parameter is unused, and the doccomment keeps it only in case the two
  axes ever re-couple. Both call sites are safe to inline: `current-contents.tsx:64` already destructures
  `mount = 'active'`, so `:73` is the identity function and `CurrentMountContext` at `:88` and `:99`
  receives `mount` itself; `tab-contents.tsx:39` leaves `mount` undefaulted, so `:48` becomes `mount ===
  'always'`. Delete `current.ts:104-116` and both imports. The `'active'` default is already stated at
  `current.ts:115` and `current-contents.tsx:64`, so the helper adds drift risk instead of removing it.
  The symbol is `@internal`, on no barrel, and 13 of its 18 lines are doccomment. Saving: 18 lines.

- [x] **Replace Listbox's `resolveControlState` with `useControlProps`.** `listbox.tsx:127-132` returns
  `overrides.x ?? control?.x` for id, disabled, readOnly, and required, which `use-control-props.ts:89-93`
  already returns. `listbox.tsx:195` repeats `use-control-props.ts:73` character for character, and the
  `severity === 'error' || undefined` check at `:374` yields the same value as `:80` when no `invalid` is
  passed. Delete `resolveControlState` (`listbox.tsx:114-134`), replace the destructure at `:186-195`
  with one `useControlProps` call that also yields `invalid` and the merged `aria-describedby`, pass that
  `invalid` at `:374`, keep `useControl()` for `control?.labelledBy` at `:394`, and drop `useAriaIds`
  from the import at `:14`. The cross-barrel import follows `input.tsx:11`, `textarea.tsx:10`, and
  `slider.tsx:9`. Neither symbol is barrel-exported and nothing rendered changes. Saving: 16 lines.

## Needs care

Each is a real reduction that needs a decision or careful test work first.

- [ ] **Hand the resolved `chart` to the cartesian engine parts.** `ChartCartesianAxesProps` is a
  13-field list (`engine/chart-axes/cartesian.tsx:7-42`) that all four call sites fill from the same
  object: `area-chart.tsx:391-405`, `line-chart.tsx:206-220`, `bar-chart.tsx:228-243`, and
  `combo-chart.tsx:343-358` are identical except for `hasData` and the `baseline` that bar and combo add.
  `ChartReferenceLines` repeats the shape. The sibling `ChartCartesianFrame` already takes `chart:
  CartesianChart` and reads 14 fields off it (`chart-frame/cartesian.tsx:8,:49-107`), and its TSDoc
  states the rule, so the exploded lists are the outlier; `use-chart-cartesian.ts` never imports
  `chart-axes/cartesian`, so no cycle forms. Two decisions hold this back. `CartesianChart.baseline` is a
  non-optional `number` (`use-chart-cartesian.ts:192`), so it must stay a real prop or area and line gain
  a category-axis rule they do not draw today (`axis.tsx:113-124`). The `gridPositions ??
  valueTicks.map(...)` fallback and four prop defaults move with it. Saving: 100 lines.

- [ ] **Lift the shared disclosure prologue out of the three DatePicker state hooks.**
  `useDatePickerState`, `useDatePickerRangeState`, and `useDatePickerRelativeState` open and close with
  the same block, and a difflib run reports 159 shared lines between the single and range variants:
  `useControl` / `useIdScope` (`use-date-picker-state.ts:45-47`, `use-date-picker-range-state.ts:52-54`,
  `use-date-picker-relative-state.ts:77-79`), the resolved disabled/readOnly pair, the `useFormValue`
  binding, the `useControllable` open triad with its readOnly gate, and the `useFloatingUI` epilogue with
  its `onOpenChange` re-wrapper and `setReference` capture, which is identical apart from one generic.
  Add `useDatePickerDisclosure`, but note that it must own the composed open/close pair and take `onOpen`
  and `onClose` as the variant extras, because `useFloatingUI` needs a `handleOpenChange` built from the
  `setOpen` the shared hook owns. Each variant then hoists its state declarations above the call and
  memoises those callbacks, or `useFloatingUI` gets a new handler each render. The single variant keeps
  its own `floatingRef` capture for `useDatePickerInputTab`. All three hooks are `@internal` and off the
  barrel, but three dedicated suites plus `DatePickerApi = ReturnType<typeof useDatePickerState>`
  (`date-picker.test.tsx:35`) drive these returns. Saving: 75 lines.

- [ ] **Merge the List and Kanban reorder hooks onto one lifted engine.** `useListKeyboard` and
  `useKanbanKeyboard` implement the same APG grabbed-element machine twice, and both files admit it in
  their own TSDoc. The space-toggle matches down to the announcement template
  (`use-list-keyboard.ts:33-49` against `use-kanban-keyboard.ts:88-106`), the Escape/Enter drop matches
  (`:77-88` against `:127-141`), and the dispatchers share the same modifier-bail, space, not-lifted,
  lifted flow. Lift the shared layer into `hooks/use-lifted-reorder-keyboard.ts` beside
  `useKeyboardLifted`, parameterized by container, slot, id attribute, `locate`, `focusNeighbor`, and
  `move`; `hook-purity-boundary.test.ts:13-19` permits the location, and neither hook is barrel-exported.
  Two limits temper the win. `locate` is not shared, because the list walks a flat array (`:186-193`)
  while kanban resolves a column first (`:212-225`), so it stays per hook and is not counted. The adapter
  must report "not handled" for cross-axis arrows, because a vertical list neither moves nor calls
  `preventDefault` on ArrowLeft (`:76-104`) where kanban does (`:157-167`). Confidence is medium: verify
  the announcement strings and the arrow behaviour against the existing suites before you land it.
  Saving: 75 lines.

- [ ] **Drop the named-threshold layer and `meetsContrast` from `utilities/contrast`.** `contrast.ts`
  ships a named-conformance abstraction — `ContrastLevel`, `ContrastThreshold`, `LEVEL_FLOOR`,
  `contrastFloor`, and four WCAG constants — plus `meetsContrast`. An unfiltered repo sweep finds readers
  only in the module, `utilities/index.ts:15-19`, its own unit test, and `docs/UTILITIES.md`. The one
  non-unit consumer, `chart-label-contrast.test.ts:4,19,59`, passes `WCAG_NON_TEXT` as a number, so the
  string arm at `:59-61` is reached only from `contrast.test.ts:108-112`; the browser suite routes
  contrast checking to axe instead (`baseline.test.tsx:13-14`). Delete `meetsContrast` (`:201-213`), the
  two types (`:39-48`), `LEVEL_FLOOR` (`:50-56`), `contrastFloor` (`:58-61`), and the four constants;
  keep `WCAG_NON_TEXT` for the chart gate; narrow `readableInk`'s third parameter to `number` and remove
  the `contrastFloor` call at `:231`. `readableInk` is a barrel export whose `@defaultValue` at `:222`
  changes from `'AA'` to `4.5`, and `surface-index.test.ts:70-72` pins `docs/UTILITIES.md` against every
  value export, so the eight index rows and four doc rows change in the same commit. This is internal,
  not public: `docs/UTILITIES.md:3` and package.json `exports` confirm no `./utilities` entry. Saving: 64
  lines.

- [ ] **Route the test contrast helper through `utilities/contrast`.** `__tests__/helpers/contrast.ts`
  re-derives what the shipped module exports one directory over. The nine OKLab coefficients at `:55-63`
  are the literals at `utilities/contrast.ts:125-133`, `encode` and `decode` at `:80-81` are the
  piecewise functions at `:66-72`, the 0.2126 / 0.7152 / 0.0722 weighting at `:83` is what `:185`
  applies, and `contrastOf` at `:132-140` is `luminanceRatio` (`:189-191`) inlined. Keep `THEME`,
  `tokenOf`, `themeColor`, and `SHADE`, which are genuinely local. Delete `:36-83` and the RGB alias at
  `:17`, type `SURFACE` and `tinted` as `Srgb`, build them with `parseColor(themeColor(token))`, blend in
  gamma-encoded space, and delegate `contrastOf` to `contrastRatio`. The two pipelines agree on
  lightness, because the helper's regex always divides by 100 and the Tailwind `theme.css` writes the
  percent form that `parseOklch` (`:152`) also divides. `chart-label-contrast.test.ts:4-5` already pairs
  both modules, so the path is proven. Run this after the threshold-layer deletion to avoid rework. The
  codebase writes an explicit "Deliberately not" comment where duplication is intended
  (`walk-source.ts:14-18`), and this file carries none. Saving: 55 lines.

- [ ] **Share the hidden-iframe print harness with `printPdf`.** `print.ts:29-59` and
  `pdf-viewer-utilities.ts:35-65` are 31 byte-identical lines: the same `createElement`, the same six
  style writes, `aria-hidden`, the `cleaned` latch, the cleanup closure with its focus-listener removal,
  and the load handler's `win` guard. `print.ts:20-21` names the mirror in its own TSDoc. Add
  `utilities/print-frame.ts` exporting `printInHiddenFrame({ prepare, onFail })`, then let `printRows`
  set `srcdoc` and `printPdf` set `src` with its `window.open` fallback as `onFail`. The import edge
  already exists in both directions (`grid-export/accessor.ts:1`, `use-pdf-viewer-document.ts:5`). The
  divergence is wider than the two assignments: `pdf-viewer-utilities.ts:67-83` wraps the whole
  `afterprint` block in try/catch and `:86-90` adds an iframe `error` listener, where `print.ts:61-69`
  has neither. The helper must therefore gate both on `onFail`, or a throwing `win.print()` in the grid
  path becomes silent instead of propagating. jsdom cannot exercise the catch branch —
  `grid-export-html.test.tsx:136-182` covers only the happy path — so review this by reading, not by
  test. [CONVENTIONS.md](../../../../CONVENTIONS.md) §12.2 adds one `utilities/index.ts` row and one
  `docs/UTILITIES.md` row. Saving: 26 lines.

## Public API

Worth doing, but a consumer notices.

- [ ] **Delete the two zero-behaviour listbox wrappers in the docs kit.** `theme-listbox.tsx:13-15` and
  `density-listbox.tsx:13-15` are each a whole file whose body is `<OptionsListbox options={X}
  {...props} />`, and each re-declares `value`, `placement`, and `onValueChange` (`:6-10` in both) that
  `options-listbox.tsx:8-13` already carries. Both option sets are `LabeledOption`-shaped at source
  (`providers/density/context.ts:12`, `engine/hooks/use-theme.ts:6`), so no mapping is lost — unlike
  `size-listbox.tsx:22-25` and `variant-listbox.tsx:13-16`, which build their arrays and earn their
  files. Delete both files, write `OptionsListbox` at the three call sites (`settings-dialog.tsx:68` and
  `:76`, `demos/providers/density.tsx:134`), and export `OptionsListbox` from `engine/index.ts` in place
  of the `DensityListbox` row (`:6`) and the `ThemeListbox` row (`:11`). A consumer notices:
  `engine/index.ts:1-4` declares itself the demo-authoring kit, and `demos/providers/density.tsx:30,134`
  must change both its import and its JSX. `engine/README.md:13` describes the kit generically, so it
  needs no edit. Saving: 27 lines.

- [ ] **Prune five hook options that no call site passes.** `useA11yRoving.scrollIntoView`,
  `useSortableSensors.activationDistance`, and `useKeybindings.event`, `capture`, and `timeout` are each
  declared, documented, defaulted, and threaded through a context object or a dependency array, and no
  caller in `packages` or `apps` passes one. `scrollIntoView` appears only inside `use-a11y-roving.ts`,
  none of the 18 call sites sets it, and the guard at `:535` is always taken under the `true` default at
  `:874`. `activationDistance` has zero hits outside the hook; its callers pass only
  `keyboardCoordinateGetter` (`grid-group-manager.tsx:162`) or `keyboard` (`kanban.tsx:60`,
  `use-sortable-list.ts:66`). The three keybinding options are destructured with no defaults at `:36` and
  forwarded raw at `:73`, so tinykeys already supplies the documented values and dropping them is
  behaviour-identical. Remove the declarations and doc lines, strip `scrollIntoView` from
  `RovingKeyContext`, `resolveRovingContext`, the ctx literal and the dependency array, unwrap the guard
  in `moveTo`, replace `activationDistance` with a module constant at `use-sortable-sensors.ts:76`, and
  shrink the keybindings destructure, options literal, and dependency array. Each option is a documented,
  defaulted field on a barrel-exported hook, so the removal is a public signature change. No docs surface
  index moves with it: `docs/HOOKS.md` carries one row per hook and does not enumerate options, so the
  change is TSDoc only. Saving: 17 lines.

## Ruled out

Thirty-five claims did not survive. These are the ones that name ground worth not re-walking.

**The DatePicker and ColorPicker shells must not adopt `SelectTrigger` and `FloatingSurface`.** Four
concrete mismatches, all read from source. `SelectTrigger` wraps its whole subtree in
`<AffixContext value={affixStepDown(size)}>` (`select-trigger.tsx:65`), while
`date-picker-trigger.tsx:152` scopes `AffixContext` to the clear-suffix span only and deliberately leaves
the Button outside it; `color-picker-trigger.tsx:60-94` has no `AffixContext` at all. The affix classes
differ: `kata/date-picker.ts:61-64` overrides `affix.base`, and `SelectTrigger` reads `kata/select.ts:10-21`,
whose base adds cursor rules and whose suffix span stamps a `peer/suffix` the date picker's does not.
On the content side, `color-picker-content.tsx:55` renders `FloatingFocusManager` with no `initialFocus`,
and floating-ui 0.27.19 defaults it to `0`, where `FloatingSurface` hard-defaults `initialFocus={-1}`
(`floating-surface.tsx:126`). Adopting it moves focus on open.

**Tree's roving tab-stop is not `useA11yRoving({ manageTabIndex })`.** `tree.tsx:128` resolves the target
with `event.target.closest<HTMLElement>(ITEM_SELECTOR)`, so focus landing on any descendant of a treeitem
seats the stop on that treeitem. The hook's `focusin` listener does an identity match
(`use-a11y-roving.ts:924`) and its descendant fallback (`:938-945`) is gated on `rowSelector`, which Tree
does not pass. The descendant path is first-class, not hypothetical: `TreeItem` exposes prefix and suffix
slots and `tree-constants.ts:5-6` defines an interactive selector over them.

**`useIsTruncated` and `useTruncation` differ in behaviour, not packaging.** `useTruncation`'s `measure`
returns early unless contact has armed it (`use-truncation.ts:205`), a laziness its TSDoc justifies for
virtualized grids. `useIsTruncated` measures eagerly on mount and on every `text` change
(`use-is-truncated.ts:59-61`), which `file-upload.tsx:90-94` documents it for. `isOverflowing`'s `padded`
parameter exists *for* `useIsTruncated` against `useTruncation`'s stated contract that its element
carries no padding, so folding them contradicts the doc the proposal cites.

**`useScrollWithin` has no convention-compliant landing spot.** The mechanics check out — the body
returns a module-scope function — but `UTILITIES.md:3` states that `utilities` is not a package.json
export, so moving the function there deletes it from the public surface rather than retiring a wrapper.
Exporting a bare `scrollWithin` from `ui/hooks` breaks §3.4 and §8.1. The one-line pass-through is a house
idiom: `use-has-hover.ts:6-8` is the same shape.

**`useSortableList`'s drag lifecycle has four production callers, not zero.** The refuting grep found
`onDragStart` and `onDragEnd` inside the `useSortableList` option objects at
`use-grid-row-reorder.ts:130-131` and `use-grid-reorder.ts:76-77` — not as `DndContext` props, as the
claim assumed. They wire the grid's public `onReorderStart` and `onReorderEnd`. Removing the options
breaks row and column reorder.

**`usePendingCaret` has a second real caller.** `__tests__/hooks/use-pending-caret.test.ts:14` renders it
directly, and two of its four cases are not expressible through `useFormattedInput`: `:48` asserts the
`queueMicrotask(flush)` path with no render at all, and `:62` spies on `setSelectionRange` across a bare
`rerender()`. Routing them through `reformat` needs a synthetic ChangeEvent plus cursor arithmetic,
against §10.3.

**`DashboardLayout` is not a second hand-rolled offcanvas, and it is not deletable.** Both
`layouts/dashboard.tsx` and `layouts/sidebar/sidebar.tsx` compose the same two shared abstractions, the
`useOffcanvas` hook and `Drawer`; nothing is duplicated. `dashboard.tsx:37` also holds the only `<aside>`
in the layouts surface.

**The 85 per-component `data-slot` render tests are not one guarantee.** Extracting all 85 it-blocks
shows only 39 are a pure `renderUI` + `bySlot` + `toBeInTheDocument` block, totalling 413 lines. The
other 46 assert something a slot/tag column cannot express — a `toolbar` role and name, a default
`sr-only` "Loading" name, a default error severity, child cloning, per-item counts. The claim's own
filter could not see any of these.

**Five single-rule boundary scanners do not collapse into two tables.** Read in full, the three
directory walks use two different file filters, the three import regexes have three different shapes and
only one admits `import type`, and the sanction predicates range from one string equality to a
three-branch helper. A `{symbol, from, dir, allow}` row would have to carry a RegExp, a second RegExp,
and an arbitrary predicate per rule. The table moves the complexity rather than removing it.

**`tsconfig.scripts.json` must stay.** Running both programs shows 31 files unique to the scripts program,
not the claimed 6, so the two are not near-identical. Merging is also not free: `tsconfig.json` is the
build program, so adding `*.config.ts` puts the five vitest configs and `vite.docs.config.ts` into
declaration emit and into `.tsbuildinfo`, changing `dist` output and making a `vitest.config.ts` edit
invalidate the library build cache.

**The demo `meta` build pipeline crosses a documented boundary.** The arithmetic is right — 7 of 9 metas
restate the derived label, and only `dl` and `providers-ui` differ — but `src/docs/engine/README.md:5-6`
states the engine stays library-agnostic. `virtual:demo-metas` is the only mechanism a consuming library
has to name a demo whose id does not title-case; a `NAME_OVERRIDES` table hardcodes `ui`'s own demo ids
into the engine.

**The container-width measurement in MapPlat and HeatmapChart is not the duplicate it looks like.** The
proposed destination, `engine/chart-legend/range.ts:1-10`, opens by stating it is kept React-free so the
breakpoint maths stays unit-testable. Both hosts also already call `usePlotFrame`
(`map-plat.tsx:377`, `heatmap-chart.tsx:499`), so the package's measured-size hook is in use and the
second measurement answers a different question.

**`useGridSelection`'s composition is load-bearing for a boundary test.** `filename-rules.ts:79-101`
requires every `use-*` file to export the symbol its filename spells, and the `\b` after
`useGridSelection` refuses to match `useGridSelectionState` or `useGridSelectionActions`. Deleting the
composition turns `module-filename-boundary` red.

**Three findings were accurate but too small to bank.** The two hand-rolled `Set` toggles net exactly 10
lines once each file pays back a new import, and the second site is not a verbatim duplicate — it derives
`expanding` off the mutated copy and gates a lazy-load callback on it. `AnimatedChartLineMarks.delay` is
a real dead prop, but the deletion is 3 lines: the four transition edits are one-line-for-one-line. The
three Stat skeletons rebuilt on `createSkeleton` save 15 lines and keep every file, export, and prop
type.

## Re-verified against main

Re-checked on 2026-08-06 against `origin/main` at 6cf95b6 (#1058, grid and combobox refinements,
+1,371 / −144 across 32 files), merged into this branch at dbb246e. All 20 findings stand. Line numbers
in the sections above are from base a238968 and have drifted where #1058 touched a file.

Three corrections came out of the re-check. The hook-option finding names five options, not six, and its
title is fixed above. That finding moves no docs surface index: `docs/HOOKS.md` carries one row per hook
and does not enumerate options, so it is a TSDoc-only change. The grid manager dialog finding grew:
`grid-column-manager-dialog.tsx` is now 83 lines rather than 79, and its call sites moved to
`grid-data.tsx:1278` and `grid-column-manager.test.tsx:590`.

One new constraint applies to the pdf-viewer toolbar finding. #1058 added an `@remarks` block to
`tooltip-trigger.tsx` recording that the clone stamps `k.trigger` (`inline-flex`) ahead of the child's
own `className`, so a child that needs a different display box must restate it. All eight toolbar
buttons were read in the merged tree and none sets `className`, so the shared button stays a pure
scaffold and the constraint does not bite.

#1058 itself introduced no new finding. `ComboboxCreateOption` and `GridExportOverlay` are single-purpose
files whose bodies are 14 and 12 lines under their TSDoc, and the new column filter resolves one
`matches` predicate in `GridColumnManager` and threads it to `GridGroupManager` as a prop instead of
writing the machinery twice.

## Landed

Eleven of the twelve Ready findings are done, in three commits on `claude/ui-cleanup-audit-pxryra`.
Replace this note with the pull-request citations on merge, per
[CONVENTIONS.md](../../../../CONVENTIONS.md) §12.4; the checked rows above carry the detail.

The count came in at 601 removed lines against the 550 the tier estimated, because the `ma` and grid
findings each gave more than the audit counted. Every commit was proved against the full jsdom suite
(447 files, 5,734 tests) and `tsc --noEmit`; the boundary gate and the browser suite (83 files, 475
tests) ran on the commits that touched what they cover.

Two checks are worth recording because they could have gone the other way. The merged recipe-import
scanner was probed with a real `kiso` import planted in `primitives/`, and it failed with the layer
named — so folding the two scanners did not silently drop the primitive half. Every sized skeleton map
was read before the clamp came out: all sit inside the `Ma` scale and all define `md`, including
`shaku.avatar`, which the recipe reaches indirectly.

`Collapse the eight pdf-viewer toolbar icon-buttons` is the one Ready finding left. It is the tier's
worst ratio — 30 lines across eight sites in three files, plus the a11y case surface — so it is better
done beside other pdf-viewer work than on its own.

## Totals

989 counted lines across 20 findings; 550 of those in the Ready tier. Against 109,560 lines of source
that is 0.9 percent, and it is the honest measure of what this sweep found. Twelve Ready findings are
behaviour-neutral and can land independently of each other. Four of them — the recipe `merge` deletion,
the nine `ma` axes, the three chart predicates, and the two grid manager dialogs — were re-verified
first-hand after the sweep; the grid finding's original claim that the production call sites compose
their manager directly is wrong, and all four call sites plus two tests render the dialog itself.
