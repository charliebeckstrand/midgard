# Kiso 基礎: Tokens

> **Scope:** the design tokens of the system. Each family has a Japanese name, and each key under it has an English name. Kiso is data: it declares no recipes and reaches no layer above it.

## 1. Boundary

`kiso/` is internal. Only `kumi/` and `kata/` read its values, and they read them through the barrel (`from '../kiso'`). Components, primitives, and layouts reach kiso through their owning kata (`recipes/kata/<name>`). Foundational types (`Color`, `Ma`, `GroupOrientation`) flow through the types-only `recipes` barrel, so consumers can derive prop unions without threading the type through their funnel.

Composition flows downward only. A family can compose its siblings. `narabi` reads `dan` · `sen` · `shaku`, and `omote` reads `sen` · `ugoki`. `hannou` reads `iro` · `ji` · `kasane` · `narabi` · `sen` · `ugoki`. `kokkaku` reads `dan` · `ji` · `kasane` · `shaku`, and `shaku` reads `dan` · `ji` · `kasane`. `ji` reads `dan`, which reads no other family. Kiso never reaches upward into `kumi/` or `kata/`. The `recipes/kiso/**` override in `biome.json` pins the direction, and [`../README.md`](../README.md#3-boundary) has the full boundary list.

## 2. Shape

Each family is a sub-folder, with one file per concern, and `index.ts` assembles the named bundle. The bundle name matches the folder, so a consumer reaches a finished surface by name. The three exceptions are `kara.ts`, `sou.ts`, and `tsunagi.ts`. Each is one small concern, and more files would add no clarity.

The barrel `index.ts` exports each family and no other value. `__tests__/boundary/kiso-families-boundary.test.ts` holds the list of families with the kanji of each name. To add a family, add it to that list and to the table below.

Each concern file opens with a `Layer: kiso · Concern: <concern>` docblock that pins the axis of the file. The `index.ts` of a family opens with a prose summary of the bundle. Bodies emit Tailwind utility strings and class fragments. Kiso calls no recipe engine: the axes of a recipe are in a group or in a kata.

## 3. Families

| Family             | Concern                                                                                                                            | Files                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `dan/` (段)        | Density ramps: each stepped `density-*` class that writes a value for each step. A ramp lives only here, and each list has one name. A ramp nests under the unit that reads it (`space.box.bottom`). | `text`, `space`, `gap`, `radius`, `size`                                                                           |
| `iro/` (色)        | The chromatic `palette`, its `extended` hues, and its `hover`: one literal class string for each variant and color, the one source of each chromatic class. Also the semantic intent-color text bundle, the `marker` shade, the `meter` shade (Progress and Sparkline), and the `on.wash` rung. `ramp` holds the other shades, and its `onSurface` pairs read the bare entries of the palette. | `palette`, `intent`, `ramp`, `meter`, `project` |
| `ji/` (字)         | Typography: the `size` scale, the `weight` / `leading` / `family` aliases, and `ramp`, the stepped text size of a density-native component. | `size`, `weight`, `leading`, `family` |
| `ma/` (間)         | Named spacing scale projected as finished Tailwind padding and gap utilities.                                                      | `scale`, `padding`, `gap`                                                                                          |
| `narabi/` (並び)   | Sibling arrangement: field adjacency, toggle grid, slide positioning, icon slot, nav slot inset, truncated description, flex primitives, `fit`, which caps a floating panel to the space beside its trigger, and `offcanvas`, the display of a part that shows in one offcanvas layout only. | `field`, `group`, `toggle`, `slide`, `item`, `inset`, `description`, `text`, `flex`, `fit`, `offcanvas` |
| `omote/` (面)      | Surface fills and chromes: the popover, glass, and panel chromes, the `rail` that scrolls on the inline axis, and the `fade` mask of a scroll container. `blur` is a part of the chromes and stays out of the bundle. | `bg`, `blur`, `popover`, `glass`, `panel`, `backdrop`, `content`, `skeleton`, `fade`, `rail`, `checkerboard` |
| `hannou/` (反応)   | Interaction feedback. `tint` holds the washes: `base`, `hover`, `before`, `filled`, `surface`, and `glass`. `active` is the wash of a roved row. | `disabled`, `busy`, `fg`, `cursor`, `tint`, `active` |
| `sen/` (線)        | Borders, rings, dividers, focus indicators, table gridlines, the resize grip, and forced-colors safety nets. `ring.thumb` holds the rings of a native range thumb. | `tone`, `border`, `outline`, `ring`, `divider`, `focus`, `forced`, `grip`, `gridline`                              |
| `shaku/` (尺)      | Dimension scales for distinct surfaces. `icon` holds the forms of the icon scale (`icon.base`, `icon.slot`). | `icon`, `panel`, `mark` |
| `ugoki/` (動き)    | Motion: tempo primitives, the spring vocabulary, the data-viz mark family, CSS transitions, Framer Motion enter/exit configs, the layout glide, and their reduced-motion copies. | `css`, `base`, `spring`, `mark`, `reveal`, `popover`, `overlay`, `toast`, `tooltip`, `collapse`, `glide`, `panel`, `still` |
| `kasane/` (重ね)   | The signature 4-layer chrome stack plus the `rounded` scale. The ring utilities are in `core/density`.                             | `layers`, `rounded`                                                                                                |
| `kokkaku/` (骨格)  | The skeleton form of each unit: the dimensions of its placeholders, with no chrome, variant, or color. See §4.                     | One file for each unit, such as `button`, `control`, and `slider` |
| `zu/` (図)         | Data-viz substrate: the CVD-validated categorical series `palette` (slots + order), the chrome and readout `ink`, and the reveal `motion`. Composes `iro` and `ugoki`. | `palette`, `ink`, `motion` |
| `kara.ts` (空)     | Virtualized emptiness: selectors that read `data-empty` on a `VirtualOptions` wrapper. *Flat file: one concern.* | None                                                                                                               |
| `sou.ts` (層)      | App-level stacking order: the ordered rung ladder (`overlay` / `chrome` / `cover` / `float` / `lens` / `toast`) that each portaled surface lands on. Component-local `z-*` inside a positioned box stays inline. *Flat file: one concern.* | None                                                                                                               |
| `tsunagi.ts` (繋ぎ) | Group-join class fragments, keyed on the DOM position of each child of the group. `<Group>` puts the bundle of its orientation on its container. *Flat file: one concern.*       | None                                                                                                               |

## 4. Kokkaku

The keys of `kokkaku` name units, but a form is a set of measures, not a part of a component. A form holds no chrome, so the placeholder tracks only the silhouette of its unit. The forms also read each other: the chart legend reads the height of the button form, and the picker forms read the control form. Thus the forms stay together in one family. A kata reads its form as `skeleton: kokkaku.<name>`, and some kata also read a measure of the form for the real component, so the two cannot drift apart.

## 5. Rules

- **One concern per sub-file.** If a new fragment crosses axes, add a new sub-file. Do not overload an existing one.
- **Tokens, not parts.** A token goes in kiso when two kata or more read it. A fragment of one kata stays in that kata. A fragment that builds a part of a component, such as a frame, an affix, or a row, goes in a group in [`kumi`](../kumi/README.md).
- **No recipe engine.** Kiso emits class fragments and token maps. A group or a kata declares the axes.
- **Seal with `as const`.** Kata derive their prop types from kiso shapes, so widening here propagates everywhere.
- **Keys by part.** Name each key by the rules in [`../README.md`](../README.md#4-key-names). A ramp in `dan` nests under the unit that reads it, then the part or the side (`space.box.bottom`).
- **Compose, don't fork.** A kata or a group that re-derives a token already in kiso is a defect. Fold it back into the source family.
- **Literal palette classes.** Each chromatic class is a stock Tailwind palette class, written whole in `iro/palette.ts`, because the Tailwind scanner finds only whole class literals. Do not build a class name from parts. Do not add a layer of color roles in CSS variables, such as a `@theme` token or a `data-color` scope, and do not add a tone as an `@utility` (#2917).

## 6. Utility-array style

Class-fragment arrays in kiso follow a consistent shape so cross-file reads stay predictable.

**Property order.** When an array carries multiple utilities, group them in this order:

1. `z-index` (`z-10`, `z-50`)
2. `position` (`relative`, `absolute`, `fixed`, `sticky`, `inset-*`, `top-*`, `left-*`, …)
3. `display` and `flex/grid alignment` (`block`, `flex`, `inline-flex`, `grid`, `items-*`, `justify-*`, `flex-1`, `min-w-0`, …)
4. `width / height / size` (`w-full`, `h-4`, `size-5`, `max-w-sm`, …)
5. `padding / margin / gap` (`p-2`, `mx-auto`, `gap-2`, …)
6. `bg` (`bg-white`, `bg-transparent`, …)
7. `border / ring / outline` (`border-0`, `border-zinc-200`, `ring-1`, `outline-none`, …)
8. `radius` (`rounded-lg`, `rounded-full`, …)
9. `text` (`text-zinc-700`, `text-sm`, `font-medium`, `leading-tight`, `placeholder:text-*`, …)
10. `interaction / state` (`hover:*`, `focus:*`, `disabled:*`, `cursor-*`, …)
11. `motion` (`transition-*`, `duration-*`, `animate-*`)
12. `forced-colors` safety nets

Cross-cutting fragments spread from sibling kiso (`...iro.text.default`, `...hannou.cursor`) slot into the group that matches their concern.

**One string per property.** Combine same-property utilities into a single quoted entry when their only difference is a variant prefix:

```ts
// good: bg with its read-only variant is one property
'bg-transparent read-only:bg-transparent',

// good: placeholder color with its dark-mode pair
'placeholder:text-zinc-500 dark:placeholder:text-zinc-400',

// bad: same property, broken across two entries
'bg-transparent',
'read-only:bg-transparent',
```

**Separate strings carry meaning.** A string break signals a concern boundary: a different property family, different axis, or a deliberate visual grouping. Don't introduce arbitrary breaks; don't merge unrelated properties to save space.

**Mode pairs go through `mode()`.** When both a light class and its `dark:` counterpart need to ship to the Tailwind scanner, use the `mode(light, dark)` helper from `core/recipe` rather than open-coding the pair.

---

**See also:** [`../README.md`](../README.md), [`../../../REFERENCE.md`](../../../REFERENCE.md).
