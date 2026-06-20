# Recipes Audit — `packages/ui`

**Date:** 2026-06-20 · **Scope:** the three-layer recipe (design) system — `src/recipes/{kiso,katakana,kata}` (219 files, ~8.0k LOC) plus the `core/recipe` engine — read for **redundancy, idiomatic consistency, and clean-code / Tailwind hygiene**. Distinct from the [ARIA](2026-06-08-ARIA-AUDIT.md), [bug](2026-06-10-BUG-AUDIT.md), [prop](2026-06-13-PROP-AUDIT.md), and [doc](2026-06-14-DOC-AUDIT.md) sweeps: it targets the *design layer's* internal consistency, not accessibility, logic, prop surface, or docs coverage. **Method:** `code-quality` MCP sweep (complexity, duplication, dead-code, import-graph, anti-patterns) over each layer, three parallel per-layer source reads, and manual verification of every high/medium finding against source — measured against the layer READMEs, [CLAUDE.md](../../../CLAUDE.md) §1–2, and [CONVENTIONS.md](../../CONVENTIONS.md) §5 (styling), §8 (naming), §12 (docs). Baseline: `biome check` clean across all 219 files; textual duplication **0%**; circular dependencies **0**; max dependency depth **2**.

---

## Executive summary

The recipe layer is in strong mechanical shape — it lints clean, has no circular dependencies, no upward (kiso → kata) leaks, no sideways kata-to-kata imports, and effectively zero copy-paste duplication. The mechanical tools surface almost nothing actionable: the lone dead-code and the deep-nesting / feature-envy hits are **false positives** (see *Mechanical false positives*), because these files are declarative token tables, not imperative logic.

The genuine improvements are therefore **structural and idiomatic**, and they cluster into seven themes rather than scattered one-offs. Two are worth doing first — **A** (hardcoded classes that restate a kiso token, the system's own §5.3 rule) and **B** (size-driven `compound` matrices written out by hand when a generated map already exists one file over). The rest are consistency polish: a single `mode()` violation (**C**), duplicated palette-projection scaffolding (**D**), one real engine complexity peak (**E**), TSDoc gaps on the object-literal kata and two bridges (**F**), and a cluster of micro-inconsistencies (**G**). Nothing here is a defect; everything is a redundancy or a consistency drift against the layer's own established idiom.

All findings are **open** — this pass is diagnostic only; no recipe source was modified.

---

## Cross-cutting findings

**A. Hardcoded classes that restate an available kiso token (High).** CONVENTIONS §5.3 requires spacing/sizing/color to use the named scale, not hand-written values. Three kata bypass a token that exists:

- **`kata/card.ts:51-69`** — the `sections` map writes `*:data-[slot=card-header]:px-2`, `:pt-2`, `*:data-[slot=card-body]:p-2`, `:gap-1` (and the `px-4`/`p-4`/`gap-3` `lg` mirror) by hand, even though the file already imports `ma` and uses `ma.px`/`pt`/`pb`/`p`/`gap` for the `headerPadding`/`footerPadding`/`bodyPadding` maps directly above (`card.ts:12-35`). The projected child classes restate the same scale literally and will drift if `ma` changes. The blocker is that there is no helper to project an `ma` token through a `*:data-[slot=…]` prefix — so either add one (a `prefixed(slot, token)` mapper) or pin the literals to `ma` with a comment. Highest-value because it is the one place a real token is bypassed *and* the scale is duplicated.
- **`kata/option.ts:20-24` and `kata/menu.ts:14-18`** — two sibling "selectable row" surfaces each hand-roll a per-step `gap`/`px`/`py` ladder, neither importing `ma`/`kasane`. They diverge two ways: (1) **different literal steps** (`option` `px-2 / 2.5 / 3` vs `menu` `px-2.5 / 3 / 3.5`), and (2) **different axis modeling** — `menu` correctly splits padding onto a `density` axis and text onto `size` (`menu.ts:11-23`, well-commented), while `option` folds padding *and* text onto a single `size` axis (`option.ts:20-24`). Per the kata README ("shared *data* promotes to a kiso semantic bundle"), the remedy is a shared `item-density` token both read; at minimum, align `option` onto `menu`'s density/size split.

**B. Size-driven `compound` matrices written out by hand (Medium).** `kata/scroll-area.ts:16-22` already demonstrates the clean idiom — it generates its orientation × size compound matrix with `orientations.flatMap(o => sizes.map(s => …))`. Several kata write the equivalent out longhand:

- **`kata/button.ts:86-107`** — four `compound` rules for `bare × {xs,sm,md,lg}` setting `not-data-[has-label]:p-{0.75,1,1.25,1.5}`. The icon-only "floor" padding is a deterministic function of `size` (it tracks the `padding.p(…)` ladder in the `size` axis 1:1), so it can be a generated map or folded into the size axis the way the labeled-`py` override already lives inline.
- **`kata/list.ts:51-64`** — 12 variant × density compounds, **9 of which are literally `class: p.{sm,md,lg}`** for the `separated`/`outline`/`solid` variants — one density → `ma.p` function written nine times. Generate the nine; keep the three `plain` exceptions explicit.
- **`kata/tabs.ts:62-69`** (6 orientation × size) and **`kata/nav.ts:76-79`** / **`kata/sidebar.ts:76-80`** (3-row `size → radius.r(…)` maps) are lower-volume instances of the same shape.

**C. Light/dark pair open-coded instead of `mode()` (Medium).** **`kiso/hannou/glass-item.ts:9-12`** hand-writes the base `…hover:bg-zinc-950/10` line and its `dark:…bg-white/10` twin as two array entries. The kiso README §6 mandates mode pairs go through `mode()`, and siblings comply — `kiso/segment/indicator.ts:10` (`mode('bg-white','dark:bg-zinc-600')`), `kiso/control/check.ts:28` (`mode([…],[…])`). This is the layer's lone real §6 violation; wrap it. (The `iro/*` per-`Color` files correctly use the sanctioned `shades()` / `defineColors()` multi-key forms, and `slider/color.ts` packs light+dark per color into single CSS-var strings — both fine.)

**D. Duplicated projection scaffolding across the palette ramps (Medium).** `kiso/iro/ramp.ts` (standard colors) and `kiso/iro/spectrum.ts` (extended hues) each declare an identical `type Pair = readonly [light, dark]` and a `project(role)` built on the same `Object.fromEntries(entries.map(…))` shape (`ramp.ts:29,66` vs `spectrum.ts:29,53`), keyed by `Color` vs `ExtendedColor`. A single generic `project<K>(ramp, role)` (mirroring how `shades<C>` is already color-generic) would remove the second copy and its type pair. Additionally, `spectrum.ts:113-118` `extendedHover` re-expresses the exact `not-disabled:hover:bg-{color}-600/15 + dark:…/500/15` pattern of the standard `iro/hover.ts` for the extended hues. The bg/border/ring matrices are genuine token data and stay; only the projection scaffolding is redundant. `spectrum.ts` (169 LOC) is the layer's largest file, so this is the biggest single-file consistency win in kiso.

**E. Engine complexity peak — `expand()` mixes two responsibilities (Medium).** `core/recipe/engine/recipe.ts:152-190` is the engine's complexity high-water mark (cyclomatic 12 / cognitive 18). It does two jobs: (a) collect non-reserved top-level fields into the `variants` map (`:153-159`), and (b) splice `palette` into the `variant`/`color` axes and compounds (`:163-178`, the nested `Object.keys` loop + membership guard). Extracting an `applyPaletteToVariants(variants, palette): CompoundRule[]` helper drops `expand` to a flat assembler and gives the subtle "palette-matrix keys missing from `variant:` become empty entries" contract a named home. Single highest-value engine refactor; everything else in the engine is clean (the boundary casts are documented and correct — see *Confirmed non-issues*).

**F. TSDoc gaps governed by the variant-type idiom (Medium).** The house convention puts TSDoc on the exported **variant type** (`export type FooVariants = VariantProps<typeof k>`), which is consistent and near-100% for recipe-shaped kata. The gap is structural: **object-literal kata export no variant type, so they get no public TSDoc at all.** ~8 object-literal kata lead with a `k`/file doc (`data-table.ts`, `split.ts`, `flex.ts`, `group.ts`, `icon.ts`, `panel.ts`, `container.ts`, `shiny-text.ts`); the larger/more-complex ones do not — see the table below. CLAUDE.md §3.5 / CONVENTIONS §12.1 require public `ui` surface to carry current TSDoc. On the bridge side, `katakana/segment.ts:29` and the `check` bridge (`katakana/control.ts:84`) lack a function-level doc that their siblings `popover`/`panel`/`basePalette` carry.

**G. Idiom & naming micro-inconsistencies (Low).** A cluster of small drifts against the established idiom — enumerated in the table below.

---

## Open findings

### F — object-literal kata missing public TSDoc

| Kata | Location | Note |
|---|---|---|
| menu, sheet, table, calendar, tabs, nav | `kata/{menu,sheet,table,calendar,tabs,nav}.ts` | Large object-literal surfaces, no `k`/file doc. Bring to the `data-table.ts:1-6` bar. |
| kanban, markdown, date-picker, color-picker, command-palette, query-builder, pdf-viewer, password-strength, fieldset, tree, json-tree, toolbar | respective `kata/*.ts` | Same gap, lower complexity. `toolbar.ts` has a type doc but undocumented `k` slots. |
| `code.ts:52-53` | `kata/code.ts` | **Redundant type:** `CodeBlockVariants` is a verbatim alias of `CodeVariants` (both `VariantProps<typeof k>`); the block chrome has no variant axis. Drop it or point it at a real block sub-recipe — the TSDoc implies a distinct surface that does not exist. |
| `segment`, `check` bridges | `katakana/segment.ts:29`, `katakana/control.ts:84` | Add a function-level summary to match `popover`/`panel`/`basePalette`. |

### G — idiom & naming micro-inconsistencies

| Area | Location | Drift | Suggested change |
|---|---|---|---|
| Bridge return type | `katakana/segment.ts:29` | Relies on inference while sibling hand-rolled bridges `popover.ts:43` / `panel.ts:73-82` annotate their return (the public kata surface). | Annotate `segment`'s return for parity. |
| Engine vocabulary | `engine/recipe.ts:87,167,173,175`, `engine/palette.ts:75,81` | Magic strings `'class'`, `'variant'`, `'color'` scattered as bare literals (the `RESERVED` set is correctly centralized; these are not). | Hoist `COMPOUND_CLASS_KEY` / a `PALETTE_AXES` const. |
| Magic numbers | `kiso/kokkaku/control.ts:20-29` | `min-w-16/24/32`, `h-7.5/9.5/11.5` half-step dims with no comment, while sibling `affix.ts`/`density.ts` name their `--spacing` rationale. | One-line comment tying heights to live control heights. |
| Magic numbers | `kata/toast.ts:8` (`z-[100]`), `kata/color-panel.ts:65-66` / `color-picker.ts:44` (`12px_12px`/`8px_8px` swatch grids), `kata/editable-grid.ts:47` (`700ms` flash) | Uncommented arbitraries. (The `slider.ts`/`timeline.ts` pixel offsets *are* commented — those are the intentional idiom.) | Name or comment. |
| Barrel ordering | `kiso/{narabi,omote,hannou,shaku,sen}/index.ts` | Export order is freehand and differs from both the Biome-sorted import block and the README "Files" column. | Normalize to README-table order. |
| Bundle docblocks | every kiso bundle `index.ts` | Omit the `Layer: kiso · Concern: …` tag that concern-files carry. | Add the tag, or state the barrel exemption in kiso README §2. |
| Config-key order | `kata/dialog.ts` | Places `compound` after `defaults`; the rest of the corpus puts `compound` before `defaults` (last). | Normalize to `compound` → `defaults`. |
| Focus parity | `kata/link.ts:6-15` | Only `color`/`underline` axes, no focus token, while sibling link surfaces (`breadcrumb.ts:25` → `focus.ring`) carry one. | Confirm UA-outline reliance is intentional; else add `sen.focus`. |
| Bridge sibling parity | `katakana/control.ts:46` | `controlStandard(t)` is extracted while the parallel `check` config is inlined at the call site (`control.ts:84`). | Optional: extract `checkStandard(t)` for family symmetry. |

---

## Confirmed non-issues (intentional idioms)

Verified against source and **not** flagged:

- **No sideways kata imports / no reinvented recipes.** Grep for `from '../kata` is empty; every cross-layer import is `../kiso` or `../katakana`. `slider.ts` vs `slider-range.ts` express the same `kiso/slider` color bundle two ways, but justifiably — native `<input range>` pseudo-elements vs real DOM slots, not reinvention.
- **`basePalette` (katakana) vs `definePalette` (engine)** *compose*, they don't duplicate: `basePalette` shapes `iro` slots into the engine's `PaletteEntry[]`; kata spread its partial matrix into `definePalette`. Different layers; consolidation would breach the katakana boundary.
- **Per-bridge `Step` / `Empty` / `*Tokens` redeclaration** (`katakana/control.ts:29,32`, `segment.ts:17`) is mandated by the katakana purity boundary (a bridge imports nothing from kiso) and pinned by `katakana-purity-boundary.test.ts`. The duplication is the architecture working as intended.
- **`as Recipe<C> & X` / `as CompoundRule` / `as ApplicatorReturn` casts** (`engine/recipe.ts:81`, `palette.ts:75,81`, `applicator.ts:154`) are documented single-cast-at-the-boundary assertions of runtime-attached shape (slots, `.config`, extras). Correct.
- **`as const satisfies Record<Step, …>`** sealing, **deep token access** (`palette.bare.text.green`), **`*:data-[slot=…]` child selectors**, and **full-literal light/dark class strings** (so Tailwind's scanner sees them) are the deliberate token-table idioms.
- **Three structurally distinct bridge families** (`applyRecipe` for control/check, hand-rolled bundles for popover/segment/panel, the `basePalette` transform) — divergence is archetype-driven and documented in katakana README §2; bridges are not all call-shape siblings by design.

## Mechanical false positives

The `code-quality` sweep's automated hits were reviewed and discarded:

- **`find_dead_code` → `titleSize` (heading.ts:65)** — actually consumed by *components* (`primitives/panel/panel.tsx:113`, `components/card/card-title.tsx:32`); the tool does not trace the relative import.
- **`detect_antipatterns` → deep-nesting** (`scroll-area.ts:41` "10", `control.ts:64`, `radius.ts:59`, `padding.ts:75`, `spectrum.ts:73`, `ramp.ts:68`, `mode.ts:45`, `merge.ts:18`) — all count object-literal / expression-chain depth as control-flow nesting. The functions are cyclomatic-1 token projections; `scroll-area.ts:41` is in fact the *desirable* generated-compound `flatMap`.
- **`detect_antipatterns` → feature-envy** (13 hits like `palette.bare.text.green`) — the intended deep-token-access idiom.

---

## Scorecard

| Dimension | Grade | Note |
|---|---|---|
| Boundary discipline (no upward / sideways imports) | A | 0 violations; pinned by boundary tests. |
| Mechanical hygiene (lint, dup, cycles) | A | `biome` clean, 0% duplication, 0 cycles. |
| Token discipline (§5.3) | B | `card.ts` / `option.ts` / `menu.ts` restate the `ma`/`kasane` scale by hand. |
| Compound-matrix idiom | B | `scroll-area.ts` is the model; `button`/`list`/`tabs`/`nav`/`sidebar` write theirs longhand. |
| `mode()` discipline (kiso §6) | B+ | `glass-item.ts` the lone violation. |
| Palette projection | B | `spectrum.ts` duplicates `ramp.ts` scaffolding. |
| Engine clean-code | A− | Only `expand()` exceeds the complexity floor. |
| TSDoc coverage | B+ | Variant-type idiom is consistent; object-literal kata + 2 bridges are the gap. |
| Naming / key ordering | A− | Consistent `defaults` order and `<Name>Variants` typing; minor barrel/config-order drift. |

**Act-first (by payoff):** (A) give `option.ts`/`menu.ts` a shared kiso item-density token and pin `card.ts` `sections` to `ma`; (B) generate the `button.ts` / `list.ts` size-driven compounds via the `scroll-area.ts` `flatMap` idiom; (C) wrap `glass-item.ts` in `mode()`; (D) collapse `spectrum.ts`/`ramp.ts` onto a generic `project`; (E) extract the palette splice out of `expand()`; (F) document the large object-literal kata and drop the redundant `CodeBlockVariants`.
