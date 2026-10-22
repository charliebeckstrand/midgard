# Recipes

> **Quick-glance index of the recipe (design) layer.** Variants flow through three layers: Kiso (tokens), Kumi (groups), and Kata (per-unit). All three are **internal**: `package.json` `exports` does not list `./recipes`, and the barrel re-exports types only. Components and primitives reach the layer through their owning kata (`from '../../recipes/kata/<name>'`), never a deeper layer directly. For the full architecture, boundary tests, and authoring rules, read the in-tree READMEs linked per section.

## Layers

| Layer | Role | Summary |
|---|---|---|
| **Kiso** 基礎 | Data | The token families. Each family has a Japanese name, and each key under it has an English name. Emits Tailwind class fragments only, and calls no recipe engine. Read by kumi and kata, through its barrel. |
| **Kumi** 組 | Groups | The shared structure of a family of units, declared with `defineGroup`. A unit kata `extends` a group. Reads kiso. |
| **Kata** 型 | Application | Per-unit recipe, 1:1 with a component, a primitive, a structure unit, a module part, or a layout. The single curated surface a unit reads. |

Dependencies point one way: `kata → kumi → kiso`, and `kata → kiso`. See [`src/recipes/README.md`](../src/recipes/README.md).

## Kiso: families

One sub-folder for each family, except the flat files `kara.ts`, `sou.ts`, and `tsunagi.ts`; `index.ts` assembles the named bundle. The barrel exports each family and no other value, and `kiso-families.test.ts` holds the list. Full tables in [`src/recipes/kiso/README.md`](../src/recipes/kiso/README.md).

| Family | Concern |
|---|---|
| `dan` 段 | Density ramps: each stepped `density-*` class that writes a value for each step, nested under the unit that reads it (`space.box.bottom`). |
| `iro` 色 | The color tokens of the kata. The chromatic `palette`, its `extended` hues, and its `hover` hold one literal class string for each variant and color. The other tokens are the intent-color text bundle, the `marker` and `meter` shades, and the `on.wash` rung. |
| `ji` 字 | Typography: size scale plus `weight` / `leading` / `family` aliases, and `ramp`, the stepped text size of a density-native component. |
| `ma` 間 | Named spacing scale projected as padding and gap utilities, in all-sides and axis variants. Each stop but `0` is a ramp of `dan`, so it takes the step of the nearest density scope. |
| `narabi` 並び | Sibling arrangement: field adjacency, toggle grid, slide positioning, icon slot, nav slot inset, stacked item text, truncation, and flex primitives. `fit` caps a floating panel. |
| `omote` 面 | Surface fills and chromes (popover, glass, panel), the `checkerboard` pattern, the `rail` of a scroll container, and the `fade` mask. |
| `hannou` 反応 | Interaction feedback: `disabled`, `busy`, `fg`, `cursor`, `grab`, `active`, and the `tint` washes. |
| `sen` 線 | Borders, rings, dividers, focus indicators, and forced-colors safety nets. |
| `shaku` 尺 | Dimension scales per surface (`icon`, `panel`, `mark`). `icon` holds the forms of the icon scale (`icon.base`, `icon.slot`). |
| `ugoki` 動き | Motion: tempo primitives, the spring vocabulary, the data-viz mark family, CSS transitions, and Framer Motion enter/exit configs. |
| `kasane` 重ね | The signature 4-layer chrome stack plus the `rounded` scale. The ring utilities (`px-ring-2`, …) that subtract the ring are in `core/density/utilities.ts`. |
| `kokkaku` 骨格 | The skeleton form of each unit: the dimensions of its placeholders, with no chrome, variant, or color. |
| `zu` 図 | Data-viz substrate: the categorical series `palette`, the chrome and readout `ink`, and the reveal `motion`. |
| `sou` 層 | App-level stacking order: the ordered rung ladder (`overlay` / `chrome` / `cover` / `float` / `lens` / `toast`) every portaled surface lands on. |
| `tsunagi` 繋ぎ | Group-join class fragments, keyed on the DOM position of each child of the group. |
| `kara` 空 | Virtualized emptiness: selectors that read `data-empty` on a `VirtualOptions` wrapper. |

## Kumi: groups

A group holds slots, axes, and defaults in the shape of a unit. A unit kata that `extends` a group merges its own over them. Full contract in [`src/recipes/kumi/README.md`](../src/recipes/kumi/README.md).

| Group | Units |
|---|---|
| `control` | `textarea` |
| `input` (extends `control`) | `input`, `number-input`, the `input` unit of `file-upload` |
| `trigger` (extends `control`) | The `list` and `picker` groups |
| `list` (extends `trigger`) | `listbox`, `combobox` |
| `picker` (extends `trigger`) | `date-picker`, `color-picker` |
| `check` | `checkbox`, `radio` |
| `slider` | `slider`, `slider-range` |
| `panel` | `dialog`, `drawer`, `sheet`, `panel` |
| `item` | `option`, the `item` units of `menu` and `command-palette` |

## Kata: shape

Every kata exports its runtime surface as `k`, plus its `scale` when it has one. [`src/recipes/kata/README.md`](../src/recipes/kata/README.md) gives the shapes of `k`, the key-name rules, and the `@defaultValue` rule for variant types that `default-value-boundary.test.ts` gates.

## Recipe engine

The substrate that kumi and kata call, in [`src/core/recipe/`](../src/core/recipe). **Internal**: imported by `kumi` and `kata` via relative path, and not on the `ui/core` barrel.

| Export | Summary |
|---|---|
| `defineRecipe` | The recipe primitive. It builds a callable recipe from a `RecipeConfig`, applying `base` → `variants` → `compound` → `defaults` per call (clsx + tailwind-merge). |
| `defineKata` | Builds the recipe of a unit. The config is the recipe of the root slot `base`, and `slots` holds the child slots. The slots share one set of props and one set of defaults, and a call returns the class string of each slot. A slot can hold child slots under its own `slots`. Its output is then a record of its own classes (`base`) and each child slot (`k().chevron.spacer`). `k.bare` is the output with each slot empty, for a headless component. |
| `defineGroup` | Declares a group: a config in the shape of a unit, and its extras, which a unit kata `extends`. A group can extend a group. |
| `definePalette` | Declares the variant × color matrix of a recipe from one or more matrices, such as the `palette` and the `hover` of iro. The cells of the same variant and color join in order. The engine derives the `color` axis from the keys. |
| `mode` / `defineColors` | Fuse colocated light (`hiru`) and dark (`yoru`) values into the flat `string[]` the engine consumes. |
| `RecipeConfig` *(type)* | The shape a kata declares: the reserved fields plus any number of variant axes. |
| `VariantProps` *(type)* | Extracts the prop shape from a recipe or config; used to type the consumer-facing `<Name>Variants` export. |
| `Color` *(type)* | The standard palette color set: `zinc` · `red` · `amber` · `green` · `blue`. |
| `ExtendedColor` / `PaletteColor` *(types)* | The opt-in extended set (`rose` · `violet` · `sky`), and the union of standard plus extended. |

## Barrel surface

The barrel re-exports the substrate types, so a consumer derives a prop union without reaching through its kata. It also re-exports `Color` from the engine table above.

| Type | Summary |
|---|---|
| `Ma` | Name of a spacing stop in the `ma` scale. |
| `GroupOrientation` | Axis a joined group runs along. |

## Boundary

Cross-layer value imports are illegal. Boundary tests and lint rules pin the rule. The full list lives in [`src/recipes/README.md`](../src/recipes/README.md#3-boundary).

---

**See also:** [`COMPONENTS.md`](COMPONENTS.md) · [`CORE.md`](CORE.md) · [`../REFERENCE.md`](../REFERENCE.md) · in-tree: [`recipes`](../src/recipes/README.md), [`kiso`](../src/recipes/kiso/README.md), [`kumi`](../src/recipes/kumi/README.md), [`kata`](../src/recipes/kata/README.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
