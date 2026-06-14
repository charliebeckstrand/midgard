# Recipes

> **Quick-glance index of the recipe (design) layer.** Variants flow through three layers — Kiso (tokens) → Katakana (bridge) → Kata (per-unit). All three are **internal**: `package.json` `exports` does not list `./recipes`, and the barrel re-exports types only. Components and primitives reach the layer through their owning kata (`from '../../recipes/kata/<name>'`), never a deeper layer directly. For the full architecture, boundary tests, and authoring rules, read the in-tree READMEs linked per section.

## Layers

| Layer | Role | Summary |
|---|---|---|
| **Kiso** 基礎 | Data | Design tokens in two tiers — primitive atoms and semantic archetype bundles. Emits Tailwind class fragments only; never calls `defineRecipe`. Read only by kata. |
| **Katakana** 片仮名 | Structure | Pure bridge functions that receive a kiso token bundle by argument and wire it into a recipe surface. Imports only the recipe engine — never kiso (values or types). |
| **Kata** 型 | Application | Per-unit recipe, 1:1 with `components/<name>/` (sometimes a primitive). The only layer that touches kiso and the single curated surface a unit reads. |

Dependencies point one way: `kata → kiso` (tokens) and `kata → katakana` (structure); the bridge receives tokens by argument and never reaches back into kiso. See [`src/recipes/README.md`](../src/recipes/README.md).

## Kiso — primitive tier

Atomic concerns, one sub-folder each; `index.ts` assembles the named bundle. Full tables in [`src/recipes/kiso/README.md`](../src/recipes/kiso/README.md).

| Token | Concern |
|---|---|
| `iro` 色 | Variant × colour × slot palette matrix plus the semantic intent-colour text bundle. `palette` is the standard five-colour set; `spectrum` is the opt-in wide palette (standard + mist / rose / violet / sky). |
| `ji` 字 | Typography — size scale plus `weight` / `leading` / `family` aliases. |
| `ma` 間 | Named spacing scale projected as Tailwind utilities, plus the raw `--spacing` numerals. |
| `narabi` 並び | Sibling arrangement — field adjacency, toggle grid, slide positioning, icon slot, truncation, flex primitives. |
| `omote` 面 | Generic surface fills and chromes (`bg`, `blur`, `surface`, `popover`, `glass`, `backdrop`, `content`, `skeleton`). |
| `hannou` 反応 | Interaction feedback (`disabled`, `fg`, `cursor`, `tint`) plus the kata-shaped `item` / `nav` composites. |
| `sen` 線 | Borders, rings, dividers, focus indicators, and forced-colors safety nets. |
| `shaku` 尺 | Dimension scales per surface (`icon`, `avatar`, `panel`, `scroll-area`, `mark`, `combobox`, `listbox`). |
| `ugoki` 動き | Motion — CSS transitions and Framer Motion enter/exit configs. |
| `kasane` 重ね | The signature 4-layer chrome stack plus ring-compensated padding / radius / rounded / gap helpers. |
| `kokkaku` 骨格 | Skeleton placeholder dimensions per component — chrome-, variant-, and colour-stripped. |
| `sun` 寸 | Named density steps (`sm` / `md` / `lg`) and the per-step token table. |
| `tsunagi` 繋ぎ | Group-join class fragments — dormant until the parent stamps `data-group` at runtime. |

## Kiso — semantic tier

Archetype bundles compose primitive atoms into the multi-fragment shape an archetype shares across ≥2 kata.

| Bundle | Composes | Consumers |
|---|---|---|
| `control` | Field archetype: frame + surface + input + reset + density + size + affix + check (composes `kasane`). | `bridge.control` / `bridge.check`; subset reach from combobox, listbox, date-picker, select, switch. |
| `popover` | Floating overlay — `trigger` / `portal` / `text` / `panel` fragments. | `bridge.popover`; subset reach from combobox, listbox, date-picker. |
| `segment` | Segmented control — `control` / `item` size maps plus `indicator` colour fragments. | `bridge.segment`. |
| `panel` | Panel archetype — `surface` (fill + chrome) and `layout` (title / description / header / body / footer). | `bridge.panel`; subset reach from box, panel. |
| `slider` | Slider palette — the `--slider-fill` / `--slider-track` CSS-variable bundle per colour. *No bridge.* | `kata/slider`, `kata/slider-range`. |

## Katakana — bridges

Each bridge is a pure function `(<tokens>, overlay?) => k`, reached through the namespaced `bridge` object. Full module table in [`src/recipes/katakana/README.md`](../src/recipes/katakana/README.md).

| Bridge | Tokens | Returns | Kata members |
|---|---|---|---|
| `control` | `kiso/control` | Outer-frame recipe + `inputControl` / `prefix` / `suffix`. | `input`, `textarea` |
| `check` | `kiso/control` | Check-surface recipe + visually-hidden `input` + `disabled` text. | `checkbox`, `radio` |
| `popover` | `kiso/popover` | `trigger` / `portal` / `text` / `panel` bundle. | `popover` |
| `segment` | `kiso/segment` | `control` / `item` recipes + `indicator` fragment. | `segment`, `tabs` |
| `panel` | `kiso/panel` | Caller `panel` / `backdrop` recipes + standard slot bundle. | `dialog`, `drawer`, `sheet` |

## Kata — shape

Every kata exports exactly one runtime value, `k`, in one of three shapes ([`src/recipes/kata/README.md`](../src/recipes/kata/README.md)):

- **Archetype** — `k = bridge.<archetype>(tokens, { … })`. The kata reads its token bundle from `kiso/<archetype>` and hands it to the bridge, which builds the surface.
- **Recipe-shaped** — `k = defineRecipe(…)`, called as `k({ variant, size, … })`; slots and sub-recipes attach as properties (`k.title`, `k.thumb`).
- **Object-literal** — `k = { … }`, a curated bag of slot fragments, sub-recipes, motion configs, and skeleton data when there's no top-level variants axis.

Variant types derive from the concrete result — `export type FooVariants = VariantProps<typeof k>`.

## Recipe engine

The substrate the bridge and kata call, in [`src/core/recipe/`](../src/core/recipe). **Internal** — imported by `katakana`, `kata`, and `layouts/*/variants.ts` via relative path; not on the `ui/core` barrel.

| Export | Summary |
|---|---|
| `defineRecipe` | The recipe primitive. Builds a callable recipe from a `RecipeConfig` — `base` → `variants` → `compound` → `defaults` per call (clsx + tailwind-merge); `slots` pre-merge and attach as properties; `palette` expands into an implicit `color` axis; `extras` attach arbitrary siblings (`motion`, sub-recipes). |
| `definePalette` | Declares a recipe's colour × variant matrix (single or merged per-colour records, plus per-colour overlays); lives on `RecipeConfig.palette`, separate from the variant scaffold. The engine derives the `color` axis from the matrix's own keys, so a kata handed the wide `iro.spectrum` bundle gains the extended colours with no engine change. |
| `applyRecipe` | Merge helper a bridge calls to fold a kata's per-call overlay over an archetype's standard config / extras, preserving key-type inference, then hands the result to `defineRecipe`. |
| `merge` | Concatenates per-key class records into one — pre-merged variant × colour bundles outside the engine's compound expansion. |
| `mode` / `defineColors` | Fuse colocated light (`hiru`) / dark (`yoru`) values into the flat `string[]` the engine consumes — `mode` for a scalar pair, `defineColors` across a multi-key map. The dark class carries its own `dark:` prefix. |
| `shades` | Builds a `Record<C, string[]>` from per-colour light/dark shade pairs; generic over the colour set, defaulting to `Color` and widening to the extended set in `iro/spectrum`. |
| `RecipeConfig` *(type)* | The shape a kata declares: reserved fields (`base`, `palette`, `compound`, `slots`, `defaults`, `skeleton`) plus any number of variant axes. |
| `VariantProps` *(type)* | Extracts the prop shape from a recipe or config; used to type the consumer-facing `<Name>Variants` export. |
| `Color` *(type)* | The standard palette colour set — `zinc` · `red` · `amber` · `green` · `blue`. |
| `ExtendedColor` / `PaletteColor` *(types)* | The opt-in extended set — `mist` · `rose` · `violet` · `sky` — and the union of standard + extended a kata surfaces by reading `iro.spectrum`. |

## Boundary

Cross-layer value imports are forbidden and pinned by tests (`recipe-boundary`, `kiso-boundary`, `katakana-purity-boundary`, `kata-boundary`, and the component/primitive recipe-boundary tests). The full list lives in [`src/recipes/README.md`](../src/recipes/README.md#3-boundary).

---

**See also:** [`COMPONENTS.md`](COMPONENTS.md) · [`CORE.md`](CORE.md) · [`../REFERENCE.md`](../REFERENCE.md) · in-tree: [`recipes`](../src/recipes/README.md), [`kiso`](../src/recipes/kiso/README.md), [`katakana`](../src/recipes/katakana/README.md), [`kata`](../src/recipes/kata/README.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
