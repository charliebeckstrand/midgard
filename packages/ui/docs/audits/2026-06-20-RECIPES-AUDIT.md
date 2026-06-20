# Recipes Audit — `packages/ui`

**Date:** 2026-06-20 · **Scope:** the three-layer recipe (design) system — `src/recipes/{kiso,katakana,kata}` (219 files, ~8.0k LOC) plus the `core/recipe` engine — read for **redundancy, idiomatic consistency, and clean-code / Tailwind hygiene**. Distinct from the [ARIA](2026-06-08-ARIA-AUDIT.md), [bug](2026-06-10-BUG-AUDIT.md), [prop](2026-06-13-PROP-AUDIT.md), and [doc](2026-06-14-DOC-AUDIT.md) sweeps: it targets the *design layer's* internal consistency, not accessibility, logic, prop surface, or docs coverage. **Method:** `code-quality` MCP sweep (complexity, duplication, dead-code, import-graph, anti-patterns) over each layer, three parallel per-layer source reads, and manual verification of every high/medium finding against source — measured against the layer READMEs, [CLAUDE.md](../../../CLAUDE.md) §1–2, and [CONVENTIONS.md](../../CONVENTIONS.md) §5 (styling), §8 (naming), §12 (docs). Baseline: `biome check` clean across all 219 files; textual duplication **0%**; circular dependencies **0**; max dependency depth **2**.

**Status legend:** ✅ resolved · ◑ partial · ◯ open. Resolving commits cited inline.

---

## Executive summary

The recipe layer is in strong mechanical shape — it lints clean, has no circular dependencies, no upward (kiso → kata) leaks, no sideways kata-to-kata imports, and effectively zero copy-paste duplication. The mechanical tools surface almost nothing actionable: the lone dead-code and the deep-nesting / feature-envy hits are **false positives** (see *Mechanical false positives*), because these files are declarative token tables, not imperative logic.

The genuine improvements are therefore **structural and idiomatic**, and they clustered into seven themes rather than scattered one-offs.

**Resolution (2026-06-20 pass).** Themes **B, C, D, E, F** and most of **G** were resolved in two commits — `6eeee4d` (behaviour-preserving refactors: shared palette projection, engine `expand` split, generated compound matrices, `mode()`, `CodeBlockVariants`) and `9f5535c` (object-literal kata docs, bridge docs, rationale comments). Every resolved change passed `biome`, `tsc`, and the recipe + changed-file Vitest suites. **Theme A is partly resolved**: the `card.ts` half is closed, but the `option.ts` / `menu.ts` half is left **open** because aligning the two padding ladders changes rendered output and wants a design call. That ladder convergence is the one substantive item still open; everything else was resolved, **declined** with rationale (cosmetics / fragile annotations), or **withdrawn** as a false positive (`dialog.ts`, `nav.ts`).

---

## Cross-cutting findings

**A. Hardcoded classes that restate an available kiso token (High). ◑ PARTIAL.** CONVENTIONS §5.3 requires spacing/sizing/color to use the named scale, not hand-written values. Three kata bypass a token that exists:

- **`kata/card.ts:51-69` ✅ resolved (`9f5535c`).** The `sections` map writes `*:data-[slot=card-header]:px-2`, `:pt-2`, `*:data-[slot=card-body]:p-2`, `:gap-1` (and the `lg` mirror) by hand, even though the file already uses `ma.px`/`pt`/`pb`/`p`/`gap` for the `headerPadding`/`footerPadding`/`bodyPadding` maps above. A runtime projection would defeat the Tailwind scanner (it emits a `*:data-[slot=…]:` variant only where it sees the full literal), so the literals must stay — they're now documented as a deliberate mirror of `ma`, which is the correct resolution.
- **`kata/option.ts:20-24` and `kata/menu.ts:14-18` ◯ open.** Two sibling "selectable row" surfaces each hand-roll a per-step `gap`/`px`/`py` ladder, neither importing `ma`/`kasane`, and they diverge two ways: **different literal steps** (`option` `px-2 / 2.5 / 3` vs `menu` `px-2.5 / 3 / 3.5`) and **different axis modeling** (`menu` splits padding onto `density` and text onto `size`; `option` folds both onto `size`). The README remedy is a shared kiso `item-density` token — but the two ladders hold *different* values, so any shared token changes one component's rendered padding. Telling: the `py` (`1 / 1.5 / 2.5`) and `gap` (`2 / 3 / 3`) steps are **identical** across both; only `px` differs, by a uniform 0.5 — which reads more like drift than intent. **Left open for a design call** on whether to converge (and on the canonical `px`, since converging widens or tightens one component by 2px).

**B. Size-driven `compound` matrices written out by hand (Medium). ✅ resolved (`6eeee4d`).** `kata/scroll-area.ts:16-22` already showed the idiom (`orientations.flatMap(o => sizes.map(s => …))`). Only one kata had the repetition the idiom targets:

- **`kata/list.ts:51-64`** ✅ generated — nine of its twelve variant × density compounds were the *same* `class: p.{sm,md,lg}` token across three variants; now built from `variants × densities → ma.p`, with the three `plain` rows (distinct px/py per density) kept explicit.
- **`kata/button.ts`**, **`kata/tabs.ts:69-76`**, **`kata/sidebar.ts:76-80`** ◯ reviewed, kept explicit — each cell is a *distinct* value per size (button `p-0.75 / 1 / 1.25 / 1.5`; tabs `px-1 pb-3 … px-5 py-2.5`; sidebar three `radius.r(step)` rows), so there is no repeated token to fold. `button` was briefly generated via a single-use size→padding map and reverted: generating distinct cells reshapes rather than dedupes and hides the structure behind a name. The explicit rules read clearer and match the codebase's literal ethos.
- **`kata/nav.ts`** ✖ withdrawn — it has no `compound` block at all (the audit conflated it with `sidebar.ts`).

**C. Light/dark pair open-coded instead of `mode()` (Medium). ✅ resolved (`6eeee4d`).** **`kiso/hannou/glass-item.ts:9-12`** hand-wrote the base/`dark:` pair; it now routes through `mode()` per kiso README §6, matching `segment/indicator.ts` and `control/check.ts`. Output is byte-identical (`mode` concatenates the pair).

**D. Duplicated projection scaffolding across the palette ramps (Medium). ✅ resolved (`6eeee4d`).** `kiso/iro/ramp.ts` and `kiso/iro/spectrum.ts` each declared an identical `Pair` type and a `project(role)` over the same `Object.fromEntries(…)` shape. Both now import a single generic `project<K, R>` from the new internal `kiso/iro/project.ts`; the per-colour token tables stay put. `contrast.test.ts` (25 cases) confirms every rung is unchanged.

**E. Engine complexity peak — `expand()` mixed two responsibilities (Medium). ✅ resolved (`6eeee4d`).** `core/recipe/engine/recipe.ts:152` collected variant axes *and* spliced the palette in one function (cyclomatic 12 / cognitive 18). The palette splice is now an `applyPaletteToVariants` helper with a named home for the "missing matrix keys become empty entries" contract; `expand` is a flat assembler. `define-recipe.test.ts` / `palette.test.ts` unchanged and green.

**F. TSDoc gaps governed by the variant-type idiom (Medium). ✅ resolved (`6eeee4d`, `9f5535c`).** The house convention documents the exported *variant type*; object-literal kata export none and so carried no public TSDoc. File-level doc headers were added to the 15 undocumented object-literal kata (menu, sheet, table, calendar, tabs, nav, kanban, markdown, date-picker, command-palette, query-builder, pdf-viewer, fieldset, tree, toolbar); the `segment` / `control` / `check` bridge functions gained declaration-site summaries; and `code.ts:53`'s `CodeBlockVariants` is now an explicit alias of `CodeVariants` (it is re-exported from `ui/code`, so it stays a named public type) instead of a duplicate `VariantProps`.

**G. Idiom & naming micro-inconsistencies (Low).** Resolved/declined individually — see the table below.

---

## Open findings

### F — object-literal kata TSDoc · ✅ resolved (`9f5535c`)

The 17 kata flagged without a public doc header are addressed: 15 gained file-level headers describing their `k` surface; **password-strength.ts** and **json-tree.ts** already carried one. `code.ts`'s redundant `CodeBlockVariants` was converted to an alias (`6eeee4d`).

### G — idiom & naming micro-inconsistencies

| Area | Location | Drift | Status |
|---|---|---|---|
| Magic numbers | `kiso/kokkaku/control.ts:25-29` | `h-7.5/9.5/11.5` half-step dims unexplained | ✅ commented (live control box) — `9f5535c` |
| Magic numbers | `kata/toast.ts:8` (`z-[100]`) | bare z-index | ✅ commented — `9f5535c` |
| Bridge docs | `katakana/segment.ts`, `control.ts` (`check`) | no declaration-site summary | ✅ added — `9f5535c` |
| Magic numbers | `kata/color-panel.ts:65`, `editable-grid.ts:47` | `12px_12px` swatch grid, `700ms` flash | ◯ reviewed — self-documenting in their commented slot / `motion-safe` context; left as-is |
| Bridge return type | `katakana/segment.ts:29` | inferred, unlike `popover`/`panel` | ◯ declined — `segment` builds its recipes internally; inference is exact and a hand-written `Recipe<…>` annotation would be fragile. A function doc was added instead |
| Engine vocabulary | `engine/recipe.ts`, `palette.ts` | `'class'`/`'variant'`/`'color'` literals | ◯ declined — stable domain vocabulary; const-ifying hurts the `{ variant, color, class }` construction in `palette.ts` |
| Barrel ordering | `kiso/{narabi,omote,hannou,shaku,sen}/index.ts` | freehand export order | ◯ declined — cosmetic; Biome doesn't enforce export order and the import order is already sorted |
| Bundle docblocks | kiso bundle `index.ts` files | omit the `Layer:` tag | ✅ kiso README §2 now states the barrel carries a prose summary, not the per-concern `Layer:` tag |
| Config-key order | `kata/dialog.ts` | reported `compound` after `defaults` | ✖ withdrawn — `dialog.ts` has **no** `compound` field; the finding was inaccurate |
| Focus parity | `kata/link.ts:6-15` | no focus token | ✅ confirmed intentional — `Link` renders a native `<a>` (`primitives/link/link.tsx`) and uses the UA focus outline; not a defect |
| Bridge parity | `katakana/control.ts:46` | `controlStandard` extracted but `check` inlined | ◯ declined — `check`'s config is small; extracting `checkStandard` is churn for marginal symmetry |

---

## Confirmed non-issues (intentional idioms)

Verified against source and **not** flagged:

- **No sideways kata imports / no reinvented recipes.** Grep for `from '../kata` is empty; every cross-layer import is `../kiso` or `../katakana`. `slider.ts` vs `slider-range.ts` express the same `kiso/slider` color bundle two ways, but justifiably — native `<input range>` pseudo-elements vs real DOM slots, not reinvention.
- **`Link` keeps the native focus outline** (`kata/link.ts` has only `color`/`underline`): `Link` is an `<a>`, so the UA outline is the intended affordance.
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

| Dimension | Before | After | Note |
|---|---|---|---|
| Boundary discipline (no upward / sideways imports) | A | A | 0 violations; pinned by boundary tests. |
| Mechanical hygiene (lint, dup, cycles) | A | A | `biome` clean, 0% duplication, 0 cycles. |
| Token discipline (§5.3) | B | B+ | `card.ts` pinned to `ma`; `option`/`menu` ladders still divergent (open). |
| Compound-matrix idiom | B | A− | `list` generated (repeated token); `button`/`tabs`/`sidebar` kept explicit (distinct cells); `nav` had none. |
| `mode()` discipline (kiso §6) | B+ | A | `glass-item.ts` resolved. |
| Palette projection | B | A | `ramp`/`spectrum` share one generic `project`. |
| Engine clean-code | A− | A | `expand()` split into assembler + palette helper. |
| TSDoc coverage | B+ | A | Object-literal kata + bridges documented. |
| Naming / key ordering | A− | A− | Consistent typing; `Layer:`-tag exemption documented; barrel export order left (declined, cosmetic). |

**Done this pass:** B, C, D, E, F, the `Layer:`-tag clarification, and the resolved half of A plus most of G (`6eeee4d`, `9f5535c`, and this doc commit). **Remaining (open):** only `option.ts`/`menu.ts` ladder alignment — a design call (identical `py`/`gap`; `px` off by a uniform 0.5, likely drift, but the canonical value is the maintainers'). **Reviewed, kept explicit:** the `button.ts`, `tabs.ts`, and `sidebar.ts` compound matrices (distinct value per size — no repeated token to fold). **Declined (rationale above):** `segment` return annotation, engine magic-string consts, barrel export ordering, `checkStandard` extraction. **Withdrawn (false positives):** `dialog.ts` config-key order and `nav.ts` compound.
