# Recipes

> **Quick-glance index of the recipe (design) layer.** Variants flow through three layers — Kiso (tokens) → Katakana (bridge) → Kata (per-unit). All three are **internal**: `package.json` `exports` does not list `./recipes`, and the barrel re-exports types only. Components and primitives reach the layer through their owning kata (`from '../../recipes/kata/<name>'`), never a deeper layer directly. For the full architecture, boundary tests, and authoring rules, read the in-tree READMEs linked per section.

## Layers

| Layer | Role | Summary |
|---|---|---|
| **Kiso** 基礎 | Data | Design tokens in two tiers — primitive atoms and semantic archetype bundles. Emits Tailwind class fragments only; never calls `defineRecipe`. Read only by kata. |
| **Katakana** 片仮名 | Structure | Pure bridge functions that receive a kiso token bundle by argument and wire it into a recipe surface. Imports only the recipe engine — never kiso (values or types). |
| **Kata** 型 | Application | Per-unit recipe, 1:1 with a component, a primitive, a structure unit, a module part, or a layout. The only layer that touches kiso and the single curated surface a unit reads. |

Dependencies point one way: `kata → kiso` (tokens) and `kata → katakana` (structure); the bridge receives tokens by argument and never reaches back into kiso. See [`src/recipes/README.md`](../src/recipes/README.md).

## Kiso — primitive tier

Atomic concerns, one sub-folder each, except the flat files `kara.ts`, `sou.ts`, and `tsunagi.ts`; `index.ts` assembles the named bundle. Full tables in [`src/recipes/kiso/README.md`](../src/recipes/kiso/README.md).

| Token | Concern |
|---|---|
| `dan` 段 | Density ramps — each stepped `density-*` class that writes a value for each step, nested under the unit that reads it (`space.box.bottom`). |
| `iro` 色 | Variant × color × slot palette matrix plus the semantic intent-color text bundle. `palette` is the standard five-color set, and `extended` is the opt-in wide palette. |
| `ji` 字 | Typography — size scale plus `weight` / `leading` / `family` aliases, and `ramp`, the stepped text size of a density-native component. |
| `ma` 間 | Named spacing scale projected as padding and gap utilities — all-sides and axis variants. Each stop but `0` is a ramp of `dan`, so it takes the step of the nearest density scope. |
| `narabi` 並び | Sibling arrangement — field adjacency, toggle grid, slide positioning, icon slot, nav slot inset, stacked item text, truncation, flex primitives. |
| `omote` 面 | Generic surface fills and chromes, the `checkerboard` pattern, and the `rail` of a scroll container. |
| `hannou` 反応 | Interaction feedback (`disabled`, `fg`, `cursor`, `grab`, `active`, and the `tint` washes) plus the `item` / `nav` composites. |
| `sen` 線 | Borders, rings, dividers, focus indicators, and forced-colors safety nets. |
| `shaku` 尺 | Dimension scales per surface (`icon`, `panel`, `scrollArea`, `mark`). `icon` holds the scale (`icon.size`) and its forms (`icon.base`, `icon.slot`). |
| `ugoki` 動き | Motion — tempo primitives, the spring vocabulary, the data-viz mark family, CSS transitions, and Framer Motion enter/exit configs. |
| `kasane` 重ね | The signature 4-layer chrome stack plus the `rounded` scale. The ring utilities (`px-ring-2`, …) that subtract the ring are in `core/density/utilities.ts`. |
| `kokkaku` 骨格 | Skeleton placeholder dimensions per component — chrome-, variant-, and color-stripped. |
| `sou` 層 | App-level stacking order — the ordered rung ladder (`overlay` / `chrome` / `cover` / `float` / `lens` / `toast`) every portaled surface lands on. |
| `tsunagi` 繋ぎ | Group-join class fragments — dormant until the parent stamps `data-group` at runtime. |
| `kara` 空 | Virtualized emptiness — selectors that read `data-empty` on a `VirtualOptions` wrapper. |

## Kiso — semantic tier

Archetype bundles compose primitive atoms into the multi-fragment shape an archetype shares across ≥2 kata.

| Bundle | Composes | Consumers |
|---|---|---|
| `control` | Field archetype: frame, surface, input, reset, density, radius, scale, affix, and check (composes `kasane`). | `bridge.control` / `bridge.check`; subset reach from combobox, listbox, date-picker, select, switch, color-picker, rating, signature-pad, toggle, control. |
| `popover` | Floating overlay fragments, and the `picker` group that date-picker and color-picker share. *No bridge.* | `kata/popover`; subset reach from combobox, listbox, date-picker, color-picker, menu. |
| `segment` | Segmented control — `control` / `item` fragments plus `indicator` color fragments. *No bridge.* | `kata/tabs`, which Segment and Tabs share. |
| `panel` | Panel archetype: `surface`, `layout` (the slots and the `inset` at each edge), and the resize `grip`. | `bridge.panel`; subset reach from dialog, panel, grid, command-palette. |
| `slider` | Slider palette — the `--slider-fill` / `--slider-track` CSS-variable bundle per color, and the size `scale` that both sliders share. *No bridge.* | `kata/slider`, `kata/slider-range`. |
| `zu` 図 | Data-viz substrate — the categorical series `palette`, the chrome and readout `ink`, and the reveal `motion`. *No bridge.* | `kata/chart`, `kata/map`. |

## Katakana — bridges

Each bridge is a pure function `(<tokens>, overlay?) => k`, reached through the namespaced `bridge` object. Full module table in [`src/recipes/katakana/README.md`](../src/recipes/katakana/README.md).

| Bridge | Tokens | Returns | Kata members |
|---|---|---|---|
| `control` | `kiso/control` | Outer-frame recipe + the `surface` recipe of the ControlFrame + the `number` slot. | `input`, `textarea` |
| `check` | `kiso/control` | Check-surface recipe + visually-hidden `input` + `disabled` text. | `checkbox`, `radio` |
| `panel` | `kiso/panel` | Caller `panel` / `backdrop` recipes + standard slot bundle. | `drawer`, `sheet` |
| `backdrop` | `omote.backdrop` | Full-bleed scrim recipe with a `surface` axis (`flat` / `glass`). *Shared recipe, not an archetype.* | `dialog`, `drawer`, `sheet` |
| `palette` | `iro.palette` | The solid / soft / outline matrix for `definePalette`. *Shared wiring, not an archetype.* | `alert`, `avatar`, `badge` |

## Kata — shape

Every kata exports its runtime surface as `k`, plus its `scale` when it has one. [`src/recipes/kata/README.md`](../src/recipes/kata/README.md) gives the three shapes of `k`, the key-name rules, and the `@defaultValue` rule for variant types that `default-value-boundary.test.ts` gates.

## Recipe engine

The substrate the bridge and kata call, in [`src/core/recipe/`](../src/core/recipe). **Internal** — imported by `katakana` and `kata` via relative path; not on the `ui/core` barrel.

| Export | Summary |
|---|---|
| `defineRecipe` | The recipe primitive. It builds a callable recipe from a `RecipeConfig`, applying `base` → `variants` → `compound` → `defaults` per call (clsx + tailwind-merge). |
| `definePalette` | Declares the color × variant matrix of a recipe. The engine derives the `color` axis from its keys. |
| `applyRecipe` | Merge helper a bridge calls to fold the overlay of a kata over the standard config of an archetype. |
| `mode` / `defineColors` | Fuse colocated light (`hiru`) and dark (`yoru`) values into the flat `string[]` the engine consumes. |
| `shades` | Builds a `Record<C, string[]>` from per-color light/dark shade pairs; generic over the color set, defaulting to `Color` and widening to the extended set in `iro/extended-palette`. |
| `RecipeConfig` *(type)* | The shape a kata declares: the reserved fields plus any number of variant axes. |
| `VariantProps` *(type)* | Extracts the prop shape from a recipe or config; used to type the consumer-facing `<Name>Variants` export. |
| `Color` *(type)* | The standard palette color set — `zinc` · `red` · `amber` · `green` · `blue`. |
| `ExtendedColor` / `PaletteColor` *(types)* | The opt-in extended set (`rose` · `violet` · `sky`), and the union of standard plus extended. |

## Barrel surface

The barrel re-exports the substrate types, so a consumer derives a prop union without reaching through its kata. It also re-exports `Color` from the engine table above.

| Type | Summary |
|---|---|
| `Ma` | Name of a spacing stop in the `ma` scale. |
| `GroupPosition` | Where a member sits in a joined group, which selects the corners it rounds. |
| `GroupOrientation` | Axis a joined group runs along. |

## Boundary

Cross-layer value imports are illegal. Boundary tests and lint rules pin the rule. The full list lives in [`src/recipes/README.md`](../src/recipes/README.md#3-boundary).

---

**See also:** [`COMPONENTS.md`](COMPONENTS.md) · [`CORE.md`](CORE.md) · [`../REFERENCE.md`](../REFERENCE.md) · in-tree: [`recipes`](../src/recipes/README.md), [`kiso`](../src/recipes/kiso/README.md), [`katakana`](../src/recipes/katakana/README.md), [`kata`](../src/recipes/kata/README.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
