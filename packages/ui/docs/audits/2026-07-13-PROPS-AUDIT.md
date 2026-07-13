# Props Audit — superfluous props across the `ui` surface

**Date:** 2026-07-13 · **Scope:** every public prop on `ui` components, modules, layouts, primitives, and providers (97 component directories, 5 modules, 4 layouts, 21 primitives, 7 providers). **Method:** eleven parallel source-read sweeps, one per surface bucket, each tracing every suspect prop to its actual consumption; usage counts grepped as JSX attributes across `apps/`, `src/docs/demos/`, and `src/__tests__/`; headline claims re-verified against source at synthesis. **Living record — resolve rows in place with the commit.**

## Executive summary

The library's core prop architecture is sound: the controlled/uncontrolled triads, the form-binding cascade (§7.2), recipe variants (§5.2), the static-tier explicit sizing, and the per-item render-callback carve-out (§3.6) are applied consistently and were excluded from findings by design. What accumulated instead is a thin sediment of convenience: one-class boolean toggles that `className` already covers, shorthand props that duplicate an exported compound path, config bags with zero or one payload, single-valued enums reserving room for options that don't exist, and a handful of dead knobs no consumer — not even a demo — has ever passed.

One fact frames every row: **`apps/admin` consumes almost none of this surface** (Flex, Stack, Spacer, Card, Sidebar family, SidebarLayout, Table, ChatTranscript, UIProvider, and one Field/Input form — that's the list). Usage evidence is therefore demos and tests, which means the removals below are the cheapest they will ever be, and also that "zero usage" alone never justified a REMOVE — every row also names a structural defect or a better pattern.

Verdicts: **REMOVE** (delete, no replacement needed) · **MERGE** (two channels, keep one) · **NARROW** (shrink the type) · **REPLACE** (better pattern exists) · **WATCH** (keep, recorded so the next audit doesn't relitigate). Usage is `a/d/t` = apps / demos / tests.

## Cross-cutting themes

The individual rows mostly instantiate eight repeated patterns; fixing a pattern once beats litigating each prop.

**T1 — One-class booleans.** `Flex full/flex/equal/inline`, `Button block`, `Alert block`, `Container center`, `Banner position`, `Split align`, `Listbox/DatePicker truncate`, `Listbox tabularNums` each toggle a single utility class that `className` (with tailwind-merge and `data-slot` descendant variants) expresses directly — and the codebase itself is split, passing `className="w-full"` two files from a `full` prop. Recipes own multi-class visual axes; single classes belong to `className`.

**T2 — Shorthand beside an exported compound path.** `Field message`/`name`, `Collapse trigger`, `AvatarGroup extra`, `Input loading`, `Kbd command`/`control`, `TimeAgo absolute`, `Filters clear`/`prefix`/`suffix`, and the `Alert` title/description-vs-slots dual API each maintain two ways to produce identical output. §3.6 already names the winner (compound over slots-as-props); each shorthand body is a one-expression rewrite of the composition it hides. Alert is the one deliberate call to make: its data-driven Toast pipeline needs the prop form, so there the *slots* are the removable half.

**T3 — Config bags and speculative placeholders.** `PasswordInput toggleButton` (two-level bag, fully unused), `TagInput tag` (one key), grid `header` (one field, one ever-passed value), `groupTotalRow/grandTotalRow: 'bottom'` (single-valued enums), `ChartRangeLegendConfig.type` (one legal value), `Button loading` object form, the `SelectCapitalize` object union, and `Container size`'s numeric branch all reserve API for futures that never arrived — the shape CLAUDE.md 1.1 warns against. Collapse to the flat/boolean form; widen when a second value actually lands.

**T4 — Two channels, one capability.** `Control invalid` vs `severity="error"` (already drifted: `listbox.tsx:372` reads only `control?.invalid`, so a `severity="error"` Control marks an Input invalid but not a Listbox); panel `glass` vs leaked `surface` variant (`useResolvedSurface(surface, glass)` — `surface=` is passed nowhere); `Overlay glass` vs class-replacing `className` (Dialog on one path, Sheet/Drawer on the other); grid top-level `sortable` vs per-column `sortable` (the grid demo itself misreads it — marks 3 of 4 columns `sortable: true`, inert under the default-true grid); grid's two persistence vocabularies (`GridPreferences` vs `GridColumnManagerPreset`); chart `grid` vs per-axis `axes.*.grid`. Pick one channel per capability; the drift in Control/Listbox shows what the second channel costs.

**T5 — Presence-implies-control beats boolean gates.** The house's better convention (`onAttach`, `batchActions`, `onGroupsChange`: the callback's presence implies the affordance) coexists with gate+content pairs (`showLoadingIndicator`+`loadingIndicator`, ChatListItem `remove`+`onRemove`). Standardizing on presence-implies deletes props with zero capability loss.

**T6 — Mode booleans that select components.** `FileUpload variant` dispatches to three disjoint render functions with disjoint prop sets; `Markdown inline` swaps lexer and element; `SidebarLayout floating` swaps the entire shell. §3.6 and the composition-patterns rubric prescribe explicit variant components (`FileUploadDrop`/`FileUploadInput`/`FileUploadButton`, `MarkdownInline`) sharing internals; `floating` is the one defensible mode prop (its lone consumer toggles it at runtime).

**T7 — Per-component i18n strings while `LocaleProvider` carries dead fields.** Hardcoded English defaults ('Show password', 'Clear search', 'Sign here', 'Weak/Fair/Good/Strong', 'Total', 'No results') each grew — or will grow — an ad-hoc override prop nobody passes, while `LocaleProvider`'s `dateFormat` and `timeZone` are broadcast and read by nothing. One systemic decision (route control strings through the provider) deletes the ad-hoc props and gives every component an i18n path.

**T8 — Demo hygiene: defaults ossify.** Demos pass `p="md"`, `bg="none"`, `direction="col"`, `estimateSize={36}`, `sortable: true` — all restatements of defaults that teach cargo-culting and mask which props matter (`number-input.tsx` passing `spring={false}` twice is the fingerprint of a flipped default nobody cleaned). A demo sweep dropping prop=default occurrences should ride along with whichever rows land.

## Findings — REMOVE (dead or near-no-op; delete)

| Surface | Prop | Site | Issue | a/d/t | Status |
|---|---|---|---|---|---|
| Flex | `inline`, `full`, `flex`, `equal` | flex.tsx:32-38 | Four one-class toggles (`inline-flex`, `w-full`, `flex-1/auto`, `*:flex-1`); sibling code already uses `className="w-full"` instead; 6 internal sites migrate to `className` | 0/3/0 | ◯ OPEN |
| Button | `block` | button.tsx:39 | One class (`w-full`); two internal chart-legend sites migrate | 0/0/0 | ✅ RESOLVED |
| Button | `spring` | button.tsx:44 | Tap-scale opt-in; only non-demo passes are `spring={false}` = the default (stale-default fingerprint); removal frees non-href Buttons from the `motion.*` wrapper | 0/1/2 | ◯ OPEN |
| NavItem / SidebarItem | `spring` | use-nav-item.ts:30 | Same knob on the shared nav surface; zero passes repo-wide | 0/0/0 | ◯ OPEN |
| Container | `center` | container.tsx:29 | Toggles `mx-auto`, default true; a non-centering Container is a contradiction | 0/0/0 | ✅ RESOLVED |
| Banner | `position` | banner.tsx:6-11 | `'sticky'` toggles literal `sticky top-0 z-40` | 0/0/1 | ◯ OPEN |
| Split | `align` | split.tsx:29 | One `items-*` class | 0/0/1 | ◯ OPEN |
| Box | `m`, `mx`, `my` | box.tsx:28-33 | Margin tokens on a leaf fight the parent-`gap` spacing model; keep `p/px/py` (real consumers) | 0/0/2 | ◯ OPEN |
| Listbox + DatePicker | `truncate` | listbox.tsx:66 · date-picker.tsx:131 | One recipe class on the label span, duplicated across the pair; drop both together | 0/0/0 | ◯ OPEN |
| Combobox | `selectable` | combobox.tsx:75 | Hidden notify-only mode boolean; controlled `value` the consumer declines to update already yields the behavior | 0/0/0 | ✅ RESOLVED |
| Combobox | `inputType` | combobox.tsx:67 | APG editable combobox is text-shaped; no other value ever passed | 0/0/0 | ✅ RESOLVED |
| ColorPicker / ColorPanel | `eyedropper` | color-picker.tsx:31 · color-panel.tsx:38 | Hides a button that already self-hides when the platform API is absent | 0/0/0 | ✅ RESOLVED |
| CommandPalette | `icon` | command-palette.tsx:33 | Replaces the default Search prefix; one `prefix` slot covers it if ever needed | 0/0/0 | ✅ RESOLVED |
| Calendar (+ CalendarRange forward) | `onPickerOpenChange` | calendar.tsx:79 · calendar-range.tsx:35 | Embedding notification DatePicker — the embedding contract's only consumer — never passes; its test exists only to exercise it | 0/0/1 | ✅ RESOLVED |
| Input | `loading` | input.tsx:23 | Pure suffix sugar: `suffix={<LoadingSpinner/>}` is byte-identical (affix projection sizes the spinner; explicit size is a documented no-op); no `aria-busy`; in-house wrappers ignore it | 0/1/0 | ✅ RESOLVED |
| Field | `message`, `name` | field.tsx:29,31 | 1:1 sugar over nesting `<Message>`; TSDoc itself warns against combining both paths; `name` collides with §7.2's value-binding `name` while meaning message binding | 0/3/4 | ✅ RESOLVED |
| Group | `data-slot` override | group.tsx:19,52 | Wrapper-override affordance with no wrapper anywhere; composites use `useGroup` directly per its own doc | 0/0/0 | ✅ RESOLVED |
| BreadcrumbItem | `current` | breadcrumb-item.tsx:10 | Visually inert whenever `BreadcrumbLink current` is present (the only shown composition); even the demo omits it | 0/0/2 | ✅ RESOLVED |
| TimelineMarker | `current` | timeline-marker.tsx:28 | Emits `data-current` that no recipe or CSS styles; `TimelineItem` owns `current` and strips it from the implicit-marker path, so the only path demos use can never set it | 0/0/1 | ✅ RESOLVED |
| Kbd | `command`, `control` | kbd.tsx:9,11 | Two of five modifiers as glyph-prepending booleans; hardcoded order emits ⌘⌃ — reverse of the platform's ⌃⌘; children express glyphs correctly for free | 0/8/2 | ◯ OPEN |
| PdfViewer | `defaultRotation` | pdf-viewer.tsx:39 | Speculative seed; per-page state resets on document swap; toolbar covers the real gesture | 0/0/0 | ✅ RESOLVED |
| ChatList | `onKeyDown` | chat-list.tsx:18 | Lone DOM pass-through on an otherwise closed surface; keydown bubbles to a wrapper anyway | 0/0/1 | ✅ RESOLVED |
| ChatListItem | `remove` + `onRemove` | chat-list-item.tsx:27-29 | Canned trash button in the slot `actions` already fills; tests themselves pass a Delete button via `actions` | 0/0/1 | ✅ RESOLVED |
| GridReorder | `enabled` | grid-data-types.ts:438 | `{enabled:false}` ≡ omitting `reorder`; `{enabled:true}` ≡ the default | 0/0/1 | ✅ RESOLVED |
| PasswordStrength | `showLabel` | password-strength.tsx:50 | Hides the strength label — which is the `useA11yLiveRegion` live region, so the prop is an AT-silencing footgun | 0/0/0 | ✅ RESOLVED |
| AddressInput | `autoComplete` | address-input.tsx:40 | Pass-through whose only sane (and only ever-asserted) value is the default `'off'` | 0/0/1 | ✅ RESOLVED |
| StackedLayout | `gap` | layouts/stacked.tsx:11 | Forwarded to the inner Stack; never passed | 0/0/0 | ✅ RESOLVED |
| SidebarLayout | `menuIcon`, `panelClassName` | layouts/sidebar/sidebar.tsx:44,46 | Glyph override and single-div class pass-through; the `sidebar` node itself is styleable | 0/0/2 | ✅ RESOLVED |
| SidebarHeader | `closeIcon` | sidebar/slots.tsx:14 | Offcanvas close-glyph override; a custom dismiss composes via `OffcanvasContext` | 0/0/1 | ✅ RESOLVED |
| ShinyText | `delay` | shiny-text.tsx:54 | The one knob (of nine) not even the demo exercises | 0/0/0 | ✅ RESOLVED |
| PopoverContent | `p` | popover-content.tsx:34 | Padding override beside the `size` step that already drives padding | 0/0/0 | ✅ RESOLVED |
| PopoverTrigger | `manual` | popover-trigger.tsx:22-28 | Suppresses auto-wired interactions; controlled `open`/`onOpenChange` covers external control | 0/0/2 | ✅ RESOLVED |
| Popover | `onExitComplete` | popover.tsx:17 | After-close hook; internal consumers use the `FloatingSurface` seam directly | 0/0/1 | ✅ RESOLVED |
| Tooltip (root) | `className` | tooltip.tsx:45 | Context-carried to the *trigger* element — surprising indirection; one internal site migrates | 0/0/0 | ✅ RESOLVED |
| Tooltip (root) | `size` | tooltip.tsx:39-44 | Context fallback for `TooltipContent size`, which every consumer uses directly | 0/0/0 | ✅ RESOLVED |
| ActiveIndicator | `layoutId`; Scope `id`; `children`, `style` | active-indicator.tsx:36,94-99 | Scope-override and content/style knobs on a decorative marker; every consumer uses the scope + `className` | 0/0/1 | ✅ RESOLVED (`layoutId`, Scope `id`, `children` removed; `style` kept — StepperIndicator needs the inline radius for the morph projection) |
| VirtualOptions | `overscan` | virtual-options.tsx:73 | Tuning knob, zero call sites; the hook keeps its own option for non-primitive callers | 0/0/0 | ✅ RESOLVED |
| GlassProvider | `className` | providers/glass/glass.tsx:6 | Wrapper-class knob; zero callers including tests | 0/0/0 | ✅ RESOLVED |
| DensityProvider | `className` | providers/density/density.tsx:7 | Same pattern; own test only | 0/0/1 | ✅ RESOLVED |
| LocaleProvider | `dateFormat`, `timeZone` | providers/locale/context.ts:19,21 | Broadcast into context, read by nothing (readers consume `locale`/`currency`/`numberFormat` only); wire a consumer or delete | 0/0/0 | ◯ OPEN |
| ChartRangeLegendConfig | `type` (+ `ChartRangeLegendType` export) | chart/engine/chart-legend/range.ts:21,38 | Discriminant with one legal value, never read discriminatively; `{ placement }` alone is the object form | 0/0/3 | ✅ RESOLVED |
| SidebarSpacer | (whole part) | sidebar barrel | Duplicate of `Spacer` with different mechanics; zero usage anywhere — the admin sidebar pins footers via `k.footer` instead | 0/0/0 | ✅ RESOLVED |

## Findings — MERGE (two channels, keep one)

| Surface | Props | Site | Issue | Fix | Status |
|---|---|---|---|---|---|
| Control cascade | `invalid` vs `severity` | control.tsx:23 · use-control-props.ts:79 | Boolean duplicate of `severity="error"`; drift is live — `listbox.tsx:372` reads `control?.invalid` raw, so severity-marked Controls miss Listbox | Fold into `severity`; keep Input's leaf tri-state `invalid` (internally consumed); Listbox inconsistency fixes itself | ◯ OPEN |
| Dialog / Sheet / Drawer | `glass` vs leaked `surface` | dialog.tsx:26 + siblings | `useResolvedSurface(surface, glass)`; `surface=` passed nowhere; the glass-provider doc names `glass` the house convention | Drop `surface` from the public prop types (stays recipe-internal); resolution moves into the shared panel layer once | ◯ OPEN |
| Overlay | `glass` vs class-replacing `className` | primitives/overlay/overlay.tsx:29,139 | Dialog styles the backdrop via `glass`, Sheet/Drawer via recipe `className`; `glass` silently no-ops once `className` is set | Move Dialog onto the recipe-`className` path; delete `glass` from `OverlayProps` | ◯ OPEN |
| Grid | top-level `sortable` vs `GridColumn.sortable` | grid-data-types.ts:693 | Default-flipper over a per-column flag — two sources of truth; the module's own demo misreads it (3 of 4 columns marked `sortable: true`, inert) | One source of truth: drop the grid-level flipper or make sorting per-column opt-in | ◯ OPEN |
| GridInfiniteScroll | `showLoadingIndicator` + `loadingIndicator` | grid-data-types.ts:115,121 | Content prop silently inert unless the gate is also set | `loadingIndicator?: boolean \| ReactNode` (presence-implies, T5) | ◯ OPEN |
| GridColumnManager | `onSavePreset` payload | grid-data-types.ts:562 | Emits `GridColumnManagerPreset` — a second, narrower persistence vocabulary that can't round-trip into `GridPreferences` | Emit a `GridPreferences` snapshot; save and seed speak one type | ◯ OPEN |
| Chart (cartesian + scatter) | `grid` vs `axes.*.grid` | chart/engine/types.ts:307 | Whole-layer gate beside per-axis switches whose TSDoc must disambiguate it; never passed anywhere | Fold into the `axes` union | ◯ OPEN |
| Chart (cartesian) | `tickRotation` | chart/engine/types.ts:332 | Category-axis policy stranded at the frame level while its siblings live in `axes.x`; silent no-op when horizontal | Move into `ChartCategoryAxis` | ◯ OPEN |
| JsonTree + Grid | `maxHeight` beside `virtualize` | json-tree.tsx:35-37 · grid mirror | Coupled pair enforced by a runtime `throw`; `virtualize` already takes an options object | `virtualize={{ maxHeight, … }}` in both — change both or neither | ◯ OPEN |
| PasswordConfirm | `onPasswordMatch` + `onPasswordMismatch` | password-confirm.tsx:17,20 | Two callbacks on opposite edges of one boolean | `onMatchChange?: (matched: boolean) => void` | ◯ OPEN |
| Listbox | `inputId` | listbox.tsx:46 | Same concept spelled `id` on Combobox and `htmlFor` on Field | Rename to `id` for family parity | ◯ OPEN |
| CommandPalette | `CommandPaletteEmpty` vs built-in empty `<output>` | slots.tsx:44 · command-palette.tsx:169 | Two empty-state mechanisms | Keep one; make the built-in text a slot or drop the component | ◯ OPEN |
| Motion provider | `reducedMotion` / the provider | providers/motion/motion.tsx:19 | Defaults duplicate the internal `ReducedMotion` primitive already applied at every motion root; only distinct value (`'always'`) has no consumer | Document "handled automatically"; deprecate the provider until `'always'` earns a spelled-out `<ForceReducedMotion>` | ◯ OPEN |

## Findings — NARROW (shrink the type)

| Surface | Prop | Site | Issue | Fix | Status |
|---|---|---|---|---|---|
| Card | `p`, `px`, `py`, `m`, `mx`, `my` via `BoxProps<'radius'>` | card.tsx:8,44,49 | `radius` is omitted because `size` owns it, but padding — equally `size`-owned — leaks through, and the spread order lets consumer `p` silently desync padding from the `data-size` projections; the card demo's own "Default" example misuses `p="lg"` for `size="lg"` | Extend the Omit to the padding/margin axes; migrate six demo sites (four are no-op `p="md"`) | ◯ OPEN |
| Stack | inherited `direction` | stack.tsx:4 | `StackProps = FlexProps` verbatim; spread order lets `direction="row"` turn Stack into Flex, and demos exploit it | `Omit<FlexProps, 'direction'>`; migrate row demos to Flex | ◯ OPEN |
| Button | `loading` object form | button.tsx:26,50 | `boolean \| {color,size,label}`; object branch passed nowhere including internally | `loading?: boolean` | ◯ OPEN |
| Listbox / Combobox | `capitalize` object form | listbox.tsx:76 · combobox.tsx:95 | `boolean \| {displayValue?, options?}` plus two-context resolution plumbing, all so one boundary test can pass `false` | Collapse to `boolean`; delete `select-trigger/capitalize.ts` resolution | ◯ OPEN |
| Container | `size` numeric branch | container.tsx:20 | Number → custom-property machinery; `size` never passed at all | Drop the numeric union; token axis stays | ◯ OPEN |
| Grid | `groupTotalRow`, `grandTotalRow` | grid-data-types.ts:724,735 | Single-valued enums (`'bottom'`) — booleans in enum clothing | Booleans; widen when `'top'` exists | ◯ OPEN |
| Grid | `header` config object | grid-data-types.ts:570,1022 | One field (`position`), one ever-passed value (`{position:'sticky'}` ×15) | `stickyHeader?: boolean` | ◯ OPEN |
| Heatmap chart | inherited `animate`, `texture`, `subtitle` | heatmap-chart-schema.ts:61 · heatmap-chart.tsx:672-675 | Accepted publicly, destructured to `_discards`; a DOM leak-guard test papers over the type | Extend the existing `Omit<ChartBaseProps,'legend'>`; delete the discards and the leak-guard test | ◯ OPEN |
| Heatmap / Choropleth | `series` open array | heatmap-chart-schema.ts:63 · choropleth-chart.tsx:69 | Entries past `[0]` silently ignored | One-element tuple like pie/donut (`series: [S]`) | ◯ OPEN |
| Map barrel | `RangeArrow`, `RangeLegend` exports | map/index.ts:6-10 | `@internal` presentational parts exported publicly for one sibling consumer | Heatmap imports the leaf module directly (§3.5 allows it); drop from the barrel | ◯ OPEN |
| MapPlat | `deferPaint` | map-plat.tsx:210 | One caller (ChoroplethChart), one value (`true`) | Derive from `aspectRatio !== 'auto'` — the documented trigger condition | ◯ OPEN |
| Group | `as`/`href` polymorphism | group.tsx:26 | Never used; a joined-controls container as an anchor is an a11y trap the type invites | Plain `<div>` | ◯ OPEN |
| Collapse | `animate` `true` arm | collapse.tsx:23 | `true` is an alias of the default `'fade'`, special-cased back | `animate?: 'fade' \| 'slide' \| false` | ◯ OPEN |
| ToolbarGroup | `orientation` | toolbar-group.tsx:15 | Cross-axis override no consumer uses; every group inherits the toolbar's axis | Drop the override | ◯ OPEN |
| CreditCardInputCvv | `brand` union | credit-card-input-cvv.tsx:20-33 | `Brand \| BrandInfo` union forces dual resolvers plus a `CVV_LENGTHS` table duplicating the shared brand table; `onBrandChange` only ever emits the string | Accept `CreditCardBrand`; length from the shared table | ◯ OPEN |
| PhoneInput | `country: 'CA'` | phone-input.tsx:10 | Indistinguishable from `'US'` in every observable way (same NANP formatter) | `'US' \| 'international'` | ◯ OPEN |
| ToggleGroup | `role` redeclaration | primitives/toggle/toggle.tsx:8 | `Omit<…,'role'>` then re-adds `role?: string`, loosening the native `AriaRole` typing | Let `role` flow as the native attribute | ◯ OPEN |
| Option | `icon` | primitives/option/option.tsx:38,174 | Selected-check override only its own test passes; public via ComboboxOption/ListboxOption | Drop from the public surface | ◯ OPEN |
| FileUpload | shared `children` | file-upload.tsx:35 | The `input` variant silently ignores it | Scope `children` to the drop/button variants (falls out of the T6 split) | ◯ OPEN |
| Tree | `indent` | tree.tsx:29 | Default `false` renders nested trees flat — reads as a wrong default, not API | Default `true`; consider dropping the prop | ◯ OPEN |
| Checkbox | `icon` | checkbox.tsx:17 | Glyph replacement silently loses the indeterminate minus swap | Handle tri-state if kept; test-only usage argues remove | ◯ OPEN |
| Signature­Pad | `strokeColor` default | signature-pad.tsx:39 | Raw hex `#18181b` (§5.3 wants tokens), theme-blind on dark surfaces | Default from computed `currentColor`; keep both props as genuine canvas overrides | ◯ OPEN |

## Findings — REPLACE (better pattern exists)

| Surface | Prop | Site | Pattern | Status |
|---|---|---|---|---|
| Sidebar | render-prop `children: (mini) => ReactNode` | sidebar.tsx:25 | The one §3.6 root-render-prop violation in the library — and the context path (`useSidebarMini`, already exported and consumed by SidebarItem) coexists with it. Plain `ReactNode` + the hook | ◯ OPEN |
| FileUpload | `variant: 'drop' \| 'input' \| 'button'` | file-upload.tsx:48-70 | Three disjoint render functions with disjoint prop sets behind one discriminant → explicit `FileUploadDrop`/`FileUploadInput`/`FileUploadButton` sharing the hidden-input internals | ◯ OPEN |
| Markdown | `inline` | markdown.tsx:24 | Different lexer, different element, silently unparsed blocks → explicit `MarkdownInline` sharing the renderer | ◯ OPEN |
| Collapse | `trigger` | collapse.tsx:28 | Body is a byte-for-byte re-expression of the exported compound (`<CollapseTrigger>{trigger}</…>`); compound-only API | ◯ OPEN |
| AvatarGroup | `extra` | avatar-group.tsx:10 | Appends an `<Avatar initials="+N">` the caller can append as children; only value lost is auto `alt` phrasing | ◯ OPEN |
| Alert | `title`/`description` shorthands vs slot trio | alert.tsx:41-72 | Dual API + fragile displayName sniffing to reconcile them. Deliberate call: Toast's data pipeline needs the props, and props dominate usage — so the slots are the removable half, contra the usual §3.6 direction | ◯ OPEN |
| Filters | `clear`, `prefix`, `suffix`, `equal` | filters.tsx:29-35 | Region ReactNode props where context already escapes the row (`FiltersClear` works anywhere inside the provider); compose rows/actions as children | ◯ OPEN |
| DashboardLayout | `filters` | layouts/dashboard.tsx:18 | Single-region prop bag → compound child. Adjacent bug found: the "beside the main column" contract renders as a `<Stack>` column (dashboard.tsx:34) — aside and main stack; a `Flex` row was evidently intended | ◯ OPEN |
| TimeAgo | `absolute` | time-ago.tsx:24 | Convenience boolean drags the whole Tooltip/floating stack into a tiny inline leaf; consumer composes Tooltip, or the import gets lazy-split | ◯ OPEN |
| FileUpload | `ratio` (drop variant) | file-upload.tsx:54 | AspectRatio-wrapper sizing where sibling SignaturePad uses `h-40`+`className`; converge on the latter, dropping the prop and the dependency | ◯ OPEN |
| PasswordInput | `toggleButton` bag | password-input.tsx:14 | Two-level config bag (boolean + i18n labels), fully unused; flatten or fold labels into the T7 locale story | ◯ OPEN |
| TagInput | `tag` bag | tag-input.tsx:31 | One-key object (`{color}`) read once with a fallback; flatten to `tagColor` or remove | ◯ OPEN |
| ControlSkeleton | `joined` | control-skeleton.tsx:19 | Manual echo of the `data-group` stamp the skeleton drops on the floor; forward the stamp (as `use-group.ts` already claims) and derive | ◯ OPEN |
| Listbox | `tabularNums` | listbox.tsx:59 | One-class prop whose single internal consumer (pdf-viewer toolbar) can use a `className` descendant variant | ◯ OPEN |

## Watch-list — recorded keeps and deferred calls

| Surface | Prop | Note | Status |
|---|---|---|---|
| SidebarLayout | `floating` | Textbook explicit-variant candidate, but its lone consumer toggles it at runtime (`floating={!locked}`) — a mode prop is defensible; owner's call | ◯ OPEN |
| Grid | `condensed` vs `density` | Boolean preset overriding the enum on the same axis (`condensed density="loose"` is legal-but-contradictory, test-pinned); deliberate design — fold into the density scale or document the orthogonality | ◯ OPEN |
| QueryBuilder | `allowGroups`/`hideFieldSelector`/`requireRule` | Only real consumer passes all three together as one "flat single-field filter" mode; a preset/variant could subsume the trio — deferred, the 2026-07-12 plan has this barrel mid-extraction | ◯ OPEN |
| Drawer | `size` as Density `Step` | Same word, three meanings across the panel family (Dialog/Sheet: width variant; Drawer: density step); rename or let `createPanel` own the density story uniformly | ◯ OPEN |
| Menu | mode-by-prop-presence | `placement` present = dropdown, absent = context, `defaultOpen` = inline — three modes; ContextMenu already exists as one explicit variant, a `StaticMenu` would complete the set; noted as the family's next composition seam | ◯ OPEN |
| Confirm | `confirm`/`cancel` bags | Bags are the right shape for a two-button wrapper; the real finding is adoption — admin hand-rolls a delete-confirm Dialog while Confirm sits unused | ◯ OPEN |
| Sheet / Overlay | `modal={false}` + `backdrop` | The whole non-modal mode is test-borne; demo it or accept it as speculative surface | ◯ OPEN |
| FiltersField | function-form `children` | Third wiring mechanism beside cloneElement sniffing and `useFilters()` — and arguably the sound one (cloneElement breaks on wrappers); pick a primary story | ◯ OPEN |
| CalendarRange | `onValueChange` | Misnamed — reports the raw clicked day; the endpoint state machine lives in date-picker; document, or rename `onDayClick` at the next breaking pass | ◯ OPEN |
| Input family | `data-group`/`data-group-orientation` | Necessary Group-stamp plumbing typed as ordinary public props across five components; mark `@internal` via one shared documented type | ◯ OPEN |
| Grid | `rowClassName`, `rowLoading` | Zero/near-zero usage but genuinely useful shapes; keep, recorded | ◯ OPEN |
| Chart/map | `geographyObject`, `regionLabel`, `binning` | Real external-data variance, zero usage, and each must land in two prop vocabularies (MapPlat + ChoroplethChart renames) — demo-cover or consciously defer | ◯ OPEN |
| ToggleIconButton | `animate` | Keep only as the reduced-motion escape — the real bug is the recipe's missing `motion-reduce:` guard; fix that and the prop is removable | ◯ OPEN |
| VirtualOptions | `isDisabled`, `getTextValue`, `estimateSize` | The a11y contract for windowed lists; TSDoc when they're required; strip `estimateSize={36}` (= default) from demos | ◯ OPEN |
| Tabs | manual `Tab id` + `TabPanels`/`TabPanel` wiring | Entire secondary linkage API appears only in tests; follow-up pruning candidate beyond a props audit | ◯ OPEN |
| ShinyText | nine tuning knobs | Demo-only decorative surface; policy call — demo-driven props default private until a consumer asks | ◯ OPEN |
| PivotTable `totalLabel` · PasswordStrength `labels` | — | Unused, but each is its component's only i18n hook; resolve with T7's provider decision, not row by row | ◯ OPEN |
| `*-input` family | re-declared `prefix` | `Omit<X,'prefix'>` then type-identical re-declaration existing only to host a TSDoc default note (phone, zipcode, credit-card); a `@defaultValue` on the inherited prop does it in one place | ◯ OPEN |
| Toast `position` · ToastProvider `duration`/`maxToasts` · CodeBlock `copy` · Combobox `closeOnSelect` · Dialog `placement` · CommandPalette `dismissOnBackdrop` | — | Coherent knobs whose only ever-observed value is the default; keep, recorded so growth is deliberate | ◯ OPEN |

## Adjacent issues (not props; surfaced per CLAUDE.md 1.2)

DashboardLayout's aside/main region renders stacked where its contract says "beside" (`layouts/dashboard.tsx:34-46`) — likely a `Stack`-for-`Flex` slip. `Menu` silently drops `aria-label` (`grid-manager-color-menu.tsx:57` passes one today) and its `display:contents` root makes `className` a footgun worth a TSDoc warning; `Popover`'s root wrapper is *not* `display:contents`, introducing the layout box Menu's comment warns about. `[data-popover-ignore]` is honored but never stamped. ToggleIconButton's cross-fade recipe lacks a `motion-reduce:` guard. The heatmap's DOM leak-guard test asserts around a type problem `Omit` should solve. Focus-trap wiring is duplicated with different policies across `Overlay` and `FloatingSurface`.

## Reliability appendix

Every row above was traced to its definition and consumption in source, not name-matched; usage counts are JSX-attribute greps and carry false-positive risk only where noted by generic names. Deliberate architecture screened out before flagging: controlled/uncontrolled triads and `null` semantics (§7.3), `name` binding (§7.2), recipe variants (§5.2), static-tier explicit sizing and DOM projections (REFERENCE §2), polymorphism (`href`/`render`), a11y props, `data-slot` anchors, and §3.6's per-item render callbacks. Surfaces audited clean with no findings: currency/number/date/mask/search/zipcode-input, textarea, radio, switch, select, segment, slider, form, checkbox-/radio-group, placeholder, loading, status, and the Card slot family.
