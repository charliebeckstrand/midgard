# Docs App Correctness Audit — `packages/ui/src/docs`

**Date:** 2026-07-07 · **Scope:** the docs app — engine (Vite plugins, API-reference
extraction, derive-code, chrome) plus every demo (197 files, ~23,073 LOC, 1,289
functions). **Method:** six parallel source-read sweeps (API-reference engine,
derive-code + plugins, chrome, demos A–L, demos M–Z, module/provider demos), the
`code-quality` MCP analyzers, and the real gate — Biome, `tsc -p
tsconfig.docs.json`, the 26-file docs Vitest suite (255 tests), and workspace
`knip` — all of which pass clean. Every High/Medium finding was verified against
source; the API-reference findings were additionally verified by running the
production `buildApi` over the real package. Findings marked PLAUSIBLE were
traced but not reproduced. Line numbers are as of this commit and will drift.

## Executive summary

The app's structure is sound: the gate is green, knip finds no dead exports, the
duplication scan reports zero duplicate blocks, and demo prop usage almost
universally type-checks against the real component surfaces. The genuine defects
cluster in three places. First, the **API-reference extractor emits wrong prop
tables at scale**: stripping `| undefined` from optional unions re-formats union
members individually, so every optional `boolean` renders `false | true` — 288
props today — alongside a family of narrower union-handling bugs (alias
reference cards that drop union-arm properties, multi-arm prop types collapsed
to their first alias, unparenthesized function arms). Second, the **dev loop has
a self-inflicted HMR defect**: the docs plugin's `handleHotUpdate` returns only
its invalidated virtual modules, which *replaces* Vite's affected-module list
and drops the edited file's own update — every edit under `src/` serves stale
code to the browser while the docs server runs. Third, **demos drift from what
they claim**: hand-written `code` overrides that no longer match the rendered
element (chart reference lines, sparkline, segment labels), captions asserting
behavior the code doesn't exercise (timeline inheritance, tooltip close delay,
hold-button default), and one editable-grid example whose commit path can never
fire.

The chrome carries two user-visible defects — a stored `'system'` theme makes
the pre-hydration script paint light for dark-OS users on every visit after the
first, and a failed demo-chunk fetch unmounts the whole app with no error
boundary and a permanently cached rejection. The cleanup tail is real but
shallow: four near-identical listbox wrappers, a title-casing helper written
three times, dead defensive branches, and copy-paste drift between sibling
demos.

## Findings by severity

All findings are ◯ OPEN — this audit scopes; remediation is a follow-up pass.

| Sev | Area | File:line | Issue |
|-----|------|-----------|-------|
| **high** | api-ref | engine/api-reference/engine/format-type.ts:51 | Optional-union stripping disintegrates `boolean` into `false \| true` (288 props) and enums likewise |
| **high** | api-ref | engine/api-reference/engine/extract-references.ts:225 | Union-typed alias reference cards render only members common to all arms — arm-specific props vanish |
| **high** | plugins | engine/plugins/virtual-json.ts:50 | `handleHotUpdate` return replaces Vite's module list; every edit under `src/` loses its own HMR update |
| medium | api-ref | engine/api-reference/engine/extract-props.ts:102 | `authoredTypeText` applies to multi-arm unions, collapsing them to the first arm's alias |
| medium | api-ref | engine/api-reference/engine/extract-defaults.ts:22 | Renamed destructuring (`{ size: sizeProp = 'md' }`) keys the default under the local name — real default lost |
| medium | api-ref | engine/api-reference/engine/extract-project-props.ts:113 | Generic alias RHS walked with unbound type params — props supplied via type arguments dropped from tables |
| medium | api-ref | engine/api-reference/engine/extract-props.ts:191 | Union arms joined with `\|` without parenthesizing function types — reads as a union return type (8 props) |
| medium | api-ref | engine/api-reference/engine/extract-props.ts:219 | Pure-`undefined` discriminator arms survive the merge and render literal `undefined` |
| medium | api-ref | engine/__tests__/api-reference/helpers.ts:67 | In-memory test program loads zero lib files — stdlib-typed assertions silently test degenerate output (`string[]` → `{}`) |
| medium | derive | engine/derive-code/index.ts:158 | `hasExplicitKey` checks `.$` but nested-array keys use `:$` — iteration collapse never applies with mixed siblings |
| medium | derive | engine/derive-code/internals.ts:372 | `HOOK_RE` needs no call site — prose "use" in a snippet emits a phantom `import { use } from 'react'` |
| medium | plugins | engine/plugins/collect-helpers.ts:167 | Default-export guard never fires (demos use named `export function Demo`) — every demo page's full source ships as dead `__code` JSON |
| medium | chrome | engine/hooks/use-theme.ts:35 + index.html:12 | Persisted `'system'` defeats the pre-hydration dark check — light flash for dark-OS users on every visit after the first |
| medium | chrome | engine/demo-page.tsx:30 + engine/registry.ts:68 | `use()` on a forever-cached rejected chunk promise with no error boundary — one failed fetch blanks the app unrecoverably |
| medium | demos | demos/components/filters.tsx:193 | "Render props" example never uses a render prop; the function-child API goes undemonstrated |
| medium | demos | demos/components/hold-button.tsx:63 | Button labeled "Default" passes `duration={1500}`; the component default is 1000 |
| medium | demos | demos/components/list.tsx:67 | Sortable example renders `ListDescription` from data that has no descriptions — empty node, misleading snippet |
| medium | demos | demos/components/timeline.tsx:92 | Items captioned "Inherits the outline variant from Timeline" set `variant="outline"` explicitly; the parent sets nothing |
| medium | demos | demos/components/tooltip.tsx:49 | Copy claims a 1000ms open *and close* delay; close is hard-coded 100ms |
| medium | demos | demos/components/sparkline.tsx:27 | Line-variant `code` override omits the `fill` and `endPoint` the rendered element passes |
| medium | demos | demos/modules/grid/editable.tsx:293 | `EditorTypesExample`'s editing set always holds every row — the flush-on-leave commit path and `onValueChange` can never fire |
| medium | demos | demos/modules/chart/index.tsx:266 | "Reference lines" override shows `value: 68`; the chart renders `value: 80` |
| medium | demos | demos/modules/chart/index.tsx:575 | "Segment labels" override advertises `legend={false}`; the rendered pie omits it and shows a legend |
| medium | demos | demos/modules/chart/index.tsx:432 | "Points" override claims `fill`; the chart passes only `points` |
| medium | demos | demos/modules/map/index.tsx:193 | `{...warehouse}` spreads non-props (`city`, `abbreviation`) into `MapPoint` — derived snippet teaches invalid props |

## Detailed findings

### API-reference extraction

**Optional `boolean` renders `false \| true` — high.** `formatPropType` strips
`undefined` from an optional union by filtering `type.types` and re-formatting
the survivors individually (`format-type.ts:51-64`). TypeScript models `boolean`
as the union `false | true`, so the pair formats as two literals — `typeToString`
on the intact type would re-merge them; per-member formatting can't. Running
production `buildApi` over the package counts 288 affected props
(`AccordionItem.disabled`, `Alert.closable`, …); optional enums disintegrate the
same way. Fix: format `checker.getNonNullableType(type)` via `typeToString`
instead of mapping filtered members.

**Union alias reference cards drop arm-specific members — high.**
`formatApparentShape` (`extract-references.ts:225-254`) enumerates
`getPropertiesOfType` on the alias' declared type without guarding unions, and
that API returns only members common to every arm. Runtime-verified: `type
Action = { type: 'add'; item: number } | { type: 'remove'; id: string }` renders
the card `{ type: 'add' | 'remove' }` — `item` and `id` vanish. Fix: bail to
source text when `declaredType.isUnion()`.

**Multi-arm props collapse to the first arm's alias — medium.**
`buildPropDef` consults `authoredTypeText` even when a prop was collected from
several union arms (`extract-props.ts:102`), so `{ kind: 'a'; value?: Config } |
{ kind: 'b'; value?: string }` documents `value` as `Config`, dropping
`| string`. Require `propTypes.length === 1`, mirroring `literalUnionType`.

**Renamed destructuring loses the real default — medium.** `extractDefaults`
ignores `element.propertyName` (`extract-defaults.ts:22`), so `function Foo({
size: sizeProp = 'md' })` keys the default under `sizeProp` and
`defaults.get('size')` misses — inverting the documented code-over-tag
precedence. Masked in-repo only because the two current renaming components also
carry `@defaultValue` tags.

**Generic aliases drop type-argument props — medium.**
`extract-project-props.ts:113-129` recurses a generic alias' RHS with unbound
type parameters, so `type WithFoo<T> = T & { foo?: string }` applied to `{ bar:
number }` collects only `foo` — `bar` is filtered out of the table. Fall through
to the resolved-type path for generic aliases.

**Function-type arms need parentheses — medium.** `formatPropTypes` joins arm
renderings bare (`extract-props.ts:191-201`): `Accordion.onValueChange` renders
`(value: string | null) => void | (value: Array<string>) => void` — production
count: 8 props. Relatedly, a pure-`undefined` discriminator arm (e.g. `list.tsx`'s
`onReorder?: undefined`) survives `dropMergedArmUnions` and renders literal
`undefined` (`extract-props.ts:219-243`), violating the stripping contract.

**Test harness loads zero lib files — medium.** `createInMemoryProgram`
(`__tests__/api-reference/helpers.ts:67`) resolves the default lib through
ts-morph's bundled path, which doesn't exist on disk; every test program reports
"Cannot find global type 'Array'" and formats `string[]` as `{}`. The doc
comment's claim that libs resolve via the real filesystem is false, and it is
exactly this blind spot that let the `false | true` and `Array<string>` defects
persist untested. Point lib resolution at the real `typescript` package.

**Lower-confidence (traced, not reproduced):** `readPublicExports`' `/^[A-Z]/`
filter admits ALL_CAPS constants as phantom components
(`find-components.ts:36`); `{@link mailto:…}` renders as a dead symbol chip
(`link-syntax.ts:46`); `toSingleQuotes` mangles literals containing apostrophes
(`format-type.ts:237`); `formatInterface` slices from the first `{`, which can
land inside a generic constraint (`extract-references.ts:275`); passthrough
`dedupe` unions omitted keys across arms where an intersection actually retains
them (`extract-passthrough.ts:174`); the `string & {}` escape hatch collapses
mixed unions to `string`, dropping non-string members (`format-type.ts:58`).
Confirmed low: array types render `Array<string>` instead of the authored
`string[]` (73 props, `format-type.ts:95`), and `buildApi` returns `{}` for a
modules-only source tree because of an early return (`build-api.ts:28`).

### Derive-code and plugins

**HMR module-list replacement — high.** `virtual-json.ts:50`'s
`handleHotUpdate` returns the invalidated virtual modules, and Vite treats a
returned array as the *replacement* for the affected-module list (verified
against the installed Vite 8.0.16). `virtual:component-modules` invalidates on
`file.startsWith(srcDir)` — every file under `src/` — so any edit while the docs
server runs returns only the virtual modules and the edited file's own update is
dropped: the browser keeps stale code. Fix: return `[...ctx.modules,
...invalidated]` or migrate to the `hotUpdate` hook. Related low: the hook only
fires on `type === 'update'`, so file create/delete never invalidates the
caches until restart.

**Iteration collapse misses nested-array keys — medium.** `hasExplicitKey`
tests for `.$` (`derive-code/index.ts:158`), but React separates nested-array
positions with `:` — `Children.toArray(['x', [el]])` yields keys like `.1:$a`
(verified against React 19.2.7). A `.map()` sharing its parent with any sibling
emits every iteration instead of collapsing to one line; the adjacent comment
documents the wrong separator. Fix: `/[.:]\$/`.

**Phantom `use` imports — medium.** `HOOK_RE` (`internals.ts:372`) matches any
bare `use` identifier with no call-site requirement, so prose in a captured
snippet — a comment, or JSX text like "Easy to use." — emits `import { use }
from 'react'`. Require a following `(`.

**Every demo page ships its source as dead JSON — medium.** `collectHelpers`
skips only `default`-exported roots (`collect-helpers.ts:167`), but demos use a
named `export function Demo` consumed via `import.meta.glob(…, { import: 'Demo'
})`, so each page component's full source (plus matched preambles) is embedded
as `Demo.__code` and never read — the ~850-line grid demo ships most of itself
as a dead string. Skip the entry-export name too, and fix the docstring that
describes a default-export convention the repo doesn't use.

**Snippet self-containment gaps — low.** Preamble inclusion is non-transitive
(`collect-helpers.ts:120`): a matched const's own type references aren't
scanned, so displayed code can reference an undefined type. Lowercase top-level
function declarations aren't collected at all (`collect-helpers.ts:71`) — the
grid editable demo's `applyChanges` is referenced by an emitted snippet that
never defines it. Plausible variants: `$`-containing identifiers defeat the
`\b`-anchored reference regex (`collect-helpers.ts:128`), and `JSX_RETURN`
misses JSX behind a ternary (`collect-helpers.ts:25`), silently emitting `''`
for such helpers.

**Formatting fidelity — low.** Element-valued props discard their children —
`label={<span>Hi</span>}` emits `label={<span />}` (`internals.ts:153`); text
runs are trimmed and joined with a hard space — `{count}%` emits `5 %`
(`internals.ts:39`); `TAG_RE` can match PascalCase generic arguments as JSX tags
(`internals.ts:374`, plausible); and the `imports.size === 0` gate discards
valid snippets that reference no registry names (`derive-code/index.ts:54`,
plausible). In the plugins, `buildTaggedBarrel` silently deletes anything but
pure named re-exports if one ever appears in a taggable barrel
(`docs.ts:301`, plausible — all current barrels verified pure), and ui-name
collisions across collectors overwrite last-wins (`docs.ts:209`, plausible — no
current duplicates).

### Chrome

**Theme flash for dark-OS users — medium.** `useTheme`'s effect persists the
untouched `'system'` default on first mount (`use-theme.ts:35`); the
pre-hydration script (`index.html:12-16`) applies `.dark` only for stored
`'dark'` or empty storage, so a stored `'system'` paints light until React's
post-paint effect corrects it — a flash on every visit after the first. Treat
`'system'` like unset in the inline script, or stop persisting the default.
Plausible hardening in the same files: unguarded `localStorage` access throws
where storage is blocked, killing the inline script (and, via
`use-theme.ts:15`/`use-density.ts:7`, the whole mount).

**Failed chunk fetch blanks the app — medium.** `loadDemo` caches rejected
promises forever (`registry.ts:68`), `DemoPage` reads them via `use()`
(`demo-page.tsx:30`), and no error boundary exists anywhere in the package —
`host.tsx`'s `.catch(() => {})` swallows only the preload. One failed dynamic
import (offline, deploy skew) unmounts the root; re-navigation re-throws the
cached rejection. Wrap the page in a boundary and evict rejections from the
cache.

**Dead and misaimed DOM queries — low.** The "scroll active item into view"
effect queries `[data-slot="sheet"]` but `OffcanvasContext` is only provided
inside the mobile `Drawer` (`data-slot="drawer"`), so it never matches —
masked by the layout's own ref callback doing the same scroll
(`sidebar.tsx:149`). The combobox-select scroll queries `[data-slot="sidebar"]`
document-wide and hits the CSS-hidden desktop panel when the drawer is open
(`sidebar.tsx:178`). `classifyLiteral` misclassifies quoted-literal unions
(greedy `/^'.*'$/s` spans the `|`) and bare `{@link X}` tokens (classified
`object`), rendering both wrong (`default-value.tsx:105,115`). Plausible:
`DemoNav.register` always appends, so re-registration after tab switches breaks
the documented registration-order/document-order invariant
(`demo-nav.tsx:90`).

### Demos

**Doc-truth defects (medium, all confirmed).** Filters' "Render props" example
uses no render prop (`filters.tsx:193`); hold-button labels 1500ms "Default"
against a 1000ms component default (`hold-button.tsx:63`); the sortable list
renders descriptions its data lacks (`list.tsx:67`); timeline captions describe
inheritance while every item sets its variant explicitly (`timeline.tsx:92`);
tooltip copy claims a symmetric 1000ms delay but close is fixed at 100ms
(`tooltip.tsx:49`); the sparkline, chart reference-lines, chart segment-labels,
and chart points `code` overrides all show props or values their rendered
elements don't pass (`sparkline.tsx:27`, `chart/index.tsx:266,575,432`); the map
demo spreads whole warehouse records into `MapPoint`, leaking `city`/
`abbreviation` as fake props into the derived snippet (`map/index.tsx:193`); and
the editable grid's `EditorTypesExample` memoizes its editing set as all row
ids, so the flush-on-leave commit path — and its `onValueChange` — can never
fire (`grid/editable.tsx:293`).

**Confirmed low.** `Sizer` interpolates an always-undefined `className`,
rendering a literal `undefined` class token, duplicated verbatim in two files
(`aspect-ratio.tsx:19`, `file-upload.tsx:10`); `underline:offset-4` is not a
Tailwind utility (`address-input.tsx:139`); the "Dirty and touched" form example
never surfaces touched state (`form.tsx:358`); json-tree's bare `SearchInput`s
have no accessible name (`json-tree.tsx:54`); Undo/Redo carry toggle-only
`aria-pressed` (`toolbar.tsx:22`); the sparkline end-point and area-fill
examples share one wrong `aria-label` (`sparkline.tsx:108`); the grid
aggregation demo's `$/unit` leaf and aggregate cells format differently
(`grid/index.tsx:605`); the map's `useRoute` comment promises a fallback the
callers don't implement, and a failed OSRM fetch caches `null` under `staleTime:
Infinity`, blanking the overlay for the session (`map/index.tsx:71`); the
chart's "2020 census" data is 2024–25 estimates (`chart/data.ts:11`). Plausible:
`time-ago.tsx:12` freezes `Date.now()` at module load so labels drift unbounded
in a long-lived tab; `server-grouping.tsx:143` lets an early regroup race the
mount seed.

## Cleanup opportunities

**Chrome.** Four near-identical listbox wrappers with inconsistent undefined
handling — two guard, two cast away the type (`density-/theme-/size-/
variant-listbox.tsx`); title-casing written three ways (`sidebar.tsx:41`,
`registry.ts:142`, `format.ts:2`); `Example`'s `useMemo` keys on `children` and
never caches (`example.tsx:42`); `default-value.tsx:51` re-declares the
`{@link}` grammar instead of composing `LINK_RE.source` as `doc-description.tsx`
does; `app.tsx:41`'s `deferredRoute != null` guard is always true; `SortDirection`
state names the opposite of what it renders (`sidebar.tsx:127`);
`SearchLoadMore`'s pagination silently depends on a fresh `onVisible` closure
per render — key the effect on `limit` instead (`sidebar.tsx:56`); `prop-list.tsx:36`
stacks single-child wrappers, nests a block `div` in a `span`, and omits any
separator between the required `*` and the default; `unquote` strips only single
quotes though `splitUnion` tracks three quote kinds (`type-cell.tsx:73`); the
`[class*="overflow-y"]` scroller selector is duplicated with cross-referencing
comments (`app.tsx:41`, `demo-nav.tsx:58`).

**Derive-code and plugins.** Dead `seen` set in `prependReferencedPreamble`
(`collect-helpers.ts:127`); unreachable `export default const` guard
(`collect-helpers.ts:90`); `virtualJsonHooks` has no production caller
(`virtual-json.ts:75`); dead newline guard and an indent-blind 80-column budget
in `renderOpenTag` (`internals.ts:259`); unanchored `.replace('.tsx', '')` among
anchored siblings (`registry.ts:42`); `initRegistry` resets `loaderById` but
never `promiseCache` (`registry.ts:68`); `assemble` sorts by internal module key
while its docstring implies emitted-specifier order (`internals.ts:290`).

**API-reference.** `trimDefaultArgs` never returns the `null` its TSDoc
promises, leaving dead fallback branches at `format-type.ts:90,112`
(`format-type.ts:125`); `unwrapFunctionLike(decl.callable) ?? decl.callable` is
a no-op (`build-api.ts:98`); `PropDef.example` documents "first `@example`
block" but the extractor keeps the last (`types.ts:29`).

**Demos.** `colorVariants` duplicates `variants` in `badge.tsx:8` and
`alert.tsx:9`; the closable/reset scaffold is hand-rolled with drift across
alert, banner, hold-button, and form; `form.tsx:309` seeds a `darkMode` default
for a field that no longer exists and `form.tsx:337` inlines the file's own
`ResetButton`; `command-palette.tsx:133`'s description/shortcut branches are
dead (no command defines either); checkbox groups omit the group labels the
component's own docs require (`checkbox.tsx:19`); `list.tsx` has aria-label and
naming drift (`VerticalExample` renders "Sortable"); `stepper.tsx:14`'s
`description` data is dead; stray `{' '}` in `slider.tsx:30`; sibling-drift
one-offs in sheet (missing `variant="outline"`), sidebar (dead `Spacer`),
mask-input (trailing spaces and mixed helper styles inside `code` overrides),
menu (redundant page-level `Stack`), tree ("Rich content" shows none), odometer
(missing wrapper), drawer (light-mode text class), and the input family's
inconsistent manual `htmlFor`/`id` wiring; `popover.tsx:43` renders both
responsive branches so the derived snippet lists every placement twice. In
modules: `sortableColumns` is a no-op opt-in map over an opt-out default
(`grid/index.tsx:74`); `dollars` is duplicated across grid files
(`grid/index.tsx:579`, `server-grouping.tsx:67`); `(s) => setSelection(s ?? new
Set())` repeats a dead coalesce four times; `RowGroupExample` wires a no-op
`onValueChange` and a lone-child `Stack` (`grid/index.tsx:551`); the map's
`Container` size prop is dead and unguarded (`map/index.tsx:112`); chat's
`timestamp` data is dead (`chat.tsx:19`) and its `meta` sits mid-file;
`LocalProviderExample` misspells Locale (`locale.tsx:19`); the donut "Basic"
snippet is a malformed bare open tag (`chart/index.tsx:652`); `useGeography`
hand-rolls the map demo's react-query fetch with swallowed errors
(`chart/index.tsx:97`); the chart demo alone omits the `fade={false}` its
sibling module demos document as convention (`chart/index.tsx:193`); the
1,536-line grid demo should continue the `editable.tsx`/`server-grouping.tsx`
extraction pattern for its remaining heavy tabs.

## Test-coverage note

The API-reference suite has no test formatting an optional `boolean`, an array
type, a renamed destructured default, or a union-typed alias reference card —
precisely the four highest-impact extractor defects — and the lib-less harness
(medium, above) is what keeps the stdlib-shaped gaps invisible. Fixing the
harness first makes the other regressions testable.

## Analyzer reliability appendix

`find_duplicates` reported zero duplicate blocks — consistent with the
hand-audit, which found only small-scale sibling drift below its 6-line
threshold. `find_dead_code` crashes on this tree (it builds a regex from source
text and trips over a template literal); workspace `knip` stood in and reports
clean. `detect_antipatterns` produced 149 "errors," nearly all JSX-depth
false positives (its nesting metric counts markup, flagging depths like "265"
in the grid demo) plus intrinsic demo-page length; its genuine signals —
`extract-project-props.ts:walk` (CC 27), `type-cell.tsx:splitUnion` (CC 23),
and the oversized grid/chart demo files — are captured above. As in the grid
audit, raw analyzer output was mostly noise; every reported finding traces to a
source read.
