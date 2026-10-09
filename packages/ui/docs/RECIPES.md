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

Atomic concerns, one sub-folder each; `index.ts` assembles the named bundle. Full tables in [`src/recipes/kiso/README.md`](../src/recipes/kiso/README.md).

| Token | Concern |
|---|---|
| `dan` 段 | Density ramps — each stepped `density-*` class that writes a value for each step, nested under the unit that reads it (`space.box.bottom`). |
| `iro` 色 | Variant × color × slot palette matrix plus the semantic intent-color text bundle. `palette` is the standard five-color set; `extended` is the opt-in wide palette (standard + rose / violet / sky). `marker` inks a chromatic dot, `meter` paints the measured value of Progress and Sparkline, and `on.wash` inks text on the neutral wash. |
| `ji` 字 | Typography — size scale plus `weight` / `leading` / `family` aliases, and `ramp`, the stepped text size of a density-native component. |
| `ma` 間 | Named spacing scale projected as padding and gap utilities — all-sides and axis variants. Each stop but `0` is a ramp of `dan`, so it takes the step of the nearest density scope. |
| `narabi` 並び | Sibling arrangement — field adjacency, toggle grid, slide positioning, icon slot, nav slot inset, stacked item text, truncation, flex primitives. |
| `omote` 面 | Generic surface fills and chromes (`bg`, `popover`, `glass`, `backdrop`, `content`, `skeleton`), and the `checkerboard` pattern behind a translucent color. It also holds the inline `rail` of a scroll container, which composes the edge fade. |
| `hannou` 反応 | Interaction feedback (`disabled`, `fg`, `cursor`, `grab`, `active`, and the `tint` washes: `tint.base`, `tint.before`, `tint.filled`, `tint.surface`, and `tint.glass`) plus the kata-shaped `item` / `nav` composites. |
| `sen` 線 | Borders, rings, dividers, focus indicators, and forced-colors safety nets. |
| `shaku` 尺 | Dimension scales per surface (`icon`, `panel`, `scrollArea`, `mark`). `icon` holds the scale (`icon.size`) and its forms (`icon.base`, `icon.slot`). |
| `ugoki` 動き | Motion — tempo primitives, the spring vocabulary, the data-viz mark family, CSS transitions, and Framer Motion enter/exit configs. |
| `kasane` 重ね | The signature 4-layer chrome stack plus the `rounded` scale. The ring utilities (`px-ring-2`, …) that subtract the ring are in `core/density/utilities.ts`. |
| `kokkaku` 骨格 | Skeleton placeholder dimensions per component — chrome-, variant-, and color-stripped. |
| `sou` 層 | App-level stacking order — the ordered rung ladder (`overlay` / `chrome` / `float` / `lens` / `toast`) every portaled surface lands on. |
| `tsunagi` 繋ぎ | Group-join class fragments — dormant until the parent stamps `data-group` at runtime. |
| `kara` 空 | Virtualized emptiness — selectors that read `data-empty` on a `VirtualOptions` wrapper. |

## Kiso — semantic tier

Archetype bundles compose primitive atoms into the multi-fragment shape an archetype shares across ≥2 kata.

| Bundle | Composes | Consumers |
|---|---|---|
| `control` | Field archetype: frame + surface + input + reset (`reset.base`, `reset.number`) + density + radius + scale + affix + check (composes `kasane`). | `bridge.control` / `bridge.check`; subset reach from combobox, listbox, date-picker, select, switch, color-picker, rating, signature-pad, control. |
| `popover` | Floating overlay — `trigger` / `portal` / `fit` / `text` / `panel` fragments, and the `picker` group that date-picker and color-picker share. *No bridge.* | `kata/popover`; subset reach from combobox, listbox, date-picker, color-picker. |
| `segment` | Segmented control — `control` / `item` fragments plus `indicator` color fragments. *No bridge.* | `kata/tabs`, which Segment and Tabs share. |
| `panel` | Panel archetype — `surface` (fill + chrome), `layout` (title / description / header / body / footer, and the `inset` at each edge), and `grip`. The `inset` is the same on the four sides, follows density, and is larger than the slot gap. The grip is the drag bar that resizes a panel, keyed by the separator's line. `surface.axis` is the `surface` axis of a modal panel. | `bridge.panel`; subset reach from dialog, box, panel, grid, command-palette. |
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

Every kata exports its runtime surface as `k`, plus its `scale` when it has one, and `k` takes one of three shapes ([`src/recipes/kata/README.md`](../src/recipes/kata/README.md)). Its keys follow the key-name rules of [`src/recipes/README.md`](../src/recipes/README.md#4-key-names). Each key is one word, and a part with children is an object whose own classes are `base`.

- **Archetype** — `k = bridge.<archetype>(tokens, { … })`. The kata reads its token bundle from `kiso/<archetype>` and hands it to the bridge, which builds the surface.
- **Recipe-shaped** — `k = defineRecipe(…)`, called as `k({ variant, size, … })`; slots and sub-recipes attach as properties (`k.title`, `k.thumb`).
- **Object-literal** — `k = { … }`, a curated bag of slot fragments, sub-recipes, motion configs, and skeleton data when there's no top-level variants axis.

Variant types derive from the concrete result — `export type FooVariants = VariantProps<typeof k>`. When the recipe sets a default for an axis, the type declares that axis again with a description and a `@defaultValue` tag. The tag equals the default ([kata §2](../src/recipes/kata/README.md#2-shape)). A public component also tags each destructured default and each `??` fallback on the prop. The same holds for each recipe default that an unset prop gets. `default-value-boundary.test.ts` gates both.

## Recipe engine

The substrate the bridge and kata call, in [`src/core/recipe/`](../src/core/recipe). **Internal** — imported by `katakana` and `kata` via relative path; not on the `ui/core` barrel.

| Export | Summary |
|---|---|
| `defineRecipe` | The recipe primitive. It builds a callable recipe from a `RecipeConfig`, applying `base` → `variants` → `compound` → `defaults` per call (clsx + tailwind-merge). `slots` pre-merge and attach as properties, and a slot group (`close: { base, line }`) pre-merges each entry. `palette` expands into an implicit `color` axis, and `extras` attach arbitrary siblings (`motion`, sub-recipes). A slot or extra name that collides with a recipe property throws. |
| `definePalette` | Declares a recipe's color × variant matrix (single or merged per-color records, plus per-color overlays); lives on `RecipeConfig.palette`, separate from the variant scaffold. The engine derives the `color` axis from the matrix's own keys. A kata that takes the wide `iro.extended` bundle gains the extended colors with no engine change. |
| `applyRecipe` | Merge helper a bridge calls to fold a kata's per-call overlay over an archetype's standard config and extras. It preserves key-type inference, then hands the result to `defineRecipe`. |
| `mode` / `defineColors` | Fuse colocated light (`hiru`) and dark (`yoru`) values into the flat `string[]` the engine consumes. `mode` takes a scalar pair; `defineColors` works across a multi-key map. The dark class carries its own `dark:` prefix. |
| `shades` | Builds a `Record<C, string[]>` from per-color light/dark shade pairs; generic over the color set, defaulting to `Color` and widening to the extended set in `iro/extended-palette`. |
| `RecipeConfig` *(type)* | The shape a kata declares: reserved fields (`base`, `palette`, `compound`, `slots`, `defaults`, `skeleton`) plus any number of variant axes. A `compound` condition coerces to its axis key, so a rule on a `true` / `false` axis accepts `{ interactive: true }` and `{ interactive: 'true' }` alike. |
| `VariantProps` *(type)* | Extracts the prop shape from a recipe or config; used to type the consumer-facing `<Name>Variants` export. |
| `Color` *(type)* | The standard palette color set — `zinc` · `red` · `amber` · `green` · `blue`. |
| `ExtendedColor` / `PaletteColor` *(types)* | The opt-in extended set — `rose` · `violet` · `sky` — and the union of standard plus extended. A kata surfaces the union when it reads `iro.extended`. |

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
