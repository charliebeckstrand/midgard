# Kiso 基礎 — Tokens

> **Scope:** the design tokens of the system, in two tiers — **primitive** atomic concerns (one sub-folder each) and **semantic** archetype bundles composed from them. Kiso is data; it declares no recipes and reaches no layer above it.

## 1. Boundary

`kiso/` is internal. Its **values** are read only by `kata/` (and `layouts/*/variants.ts`); the katakana bridge receives kiso tokens by argument and imports nothing from kiso, not even types. Components and primitives reach kiso through their owning kata (`recipes/kata/<name>`). Foundational types (`Step`, `Ma`, `Color`, `ExtendedColor`, `PaletteColor`, `GroupOrientation`, `GroupPosition`) flow through the types-only `recipes` barrel so consumers can derive prop unions without threading the type through their funnel.

Composition flows downward only. Within kiso, semantic bundles compose primitive atoms, and atoms can compose sibling atoms. `narabi` reads `sen` · `shaku`, and `omote` reads `sen` · `ugoki`. `hannou` reads `iro` · `ji` · `kasane` · `sen` · `shaku` · `ugoki`. `kokkaku` reads `kasane` · `shaku`, and `shaku` reads `ji` · `kasane`. Kiso never reaches upward into `katakana/` or `kata/`. The contract is pinned by the `recipes/kiso/**` override in `biome.json`; the full boundary list lives in [`../README.md`](../README.md#3-boundary).

## 2. Shape

Every module is a sub-folder. One file per concern; `index.ts` assembles the named bundle. The bundle name matches the folder so consumers reach a finished surface by name; the sub-files are the internal structure of each axis. The four exceptions are `kara.ts`, `sou.ts`, `sun.ts`, and `tsunagi.ts` — each a single coherent concern small enough that splitting would add files without adding clarity.

Every concern file opens with a `Layer: kiso · Concern: <concern>` (or `Layer: kiso · Archetype: <archetype> · Concern: <part>`) docblock that pins the axis the module owns; the `index.ts` barrel instead opens with a prose summary of the bundle it assembles, since it owns no single concern. Bodies emit Tailwind utility strings and class fragments — `defineRecipe()` is never invoked here. The recipe engine lives in [`core/recipe/`](../../core/recipe) and is called at the katakana bridge or the kata surface, where the variants axis is declared.

## 3. Primitive tier — atomic concerns

| Module             | Concern                                                                                                                            | Files                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `iro/` (色)        | Variant × color × slot palette matrix plus the semantic intent-color text bundle and the opt-in wide `extendedPalette`. `ramp` is the color-major source the shades project from.                                                | `solid`, `soft`, `outline`, `plain`, `bare`, `hover`, `text`, `intent`, `ramp`, `project`, `extended-palette`                                             |
| `ji/` (字)         | Typography — size scale spread at the top level, plus `weight` / `leading` / `family` aliases. `stepSize` is the three-step size axis. | `size`, `weight`, `leading`, `family`                                                                              |
| `ma/` (間)         | Named spacing scale projected as finished Tailwind padding, margin, and gap utilities.                                             | `scale`, `padding`, `margin`, `gap`                                                                                |
| `narabi/` (並び)   | Sibling arrangement — field adjacency, toggle grid, slide positioning, icon slot, truncated description, flex primitives.          | `field`, `group`, `toggle`, `slide`, `item`, `description`, `flex`                                                 |
| `omote/` (面)      | Generic surface fills and chromes.                                                                                                 | `bg`, `blur`, `grayscale`, `surface`, `popover`, `glass`, `backdrop`, `content`, `skeleton`                        |
| `hannou/` (反応)   | Interaction feedback plus the kata-shaped `item` and `nav` composites.                                                             | `disabled`, `fg`, `cursor`, `tint`, `tint-filled`, `tint-surface`, `active`, `glass-item`, `item`, `nav`                                          |
| `sen/` (線)        | Borders, rings, dividers, focus indicators, forced-colors safety nets.                                                             | `tone`, `border`, `outline`, `ring`, `divider`, `focus`, `forced`                                                  |
| `shaku/` (尺)      | Dimension scales for distinct surfaces.                                                                                            | `icon`, `avatar`, `panel`, `scroll-area`, `mark`, `combobox`, `listbox`                                            |
| `ugoki/` (動き)    | Motion — tempo primitives, the spring vocabulary, the data-viz mark family, CSS transitions, and Framer Motion enter/exit configs. | `css`, `base`, `spring`, `mark`, `reveal`, `popover`, `overlay`, `toast`, `tooltip`, `collapse`, `panel` |
| `kasane/` (重ね)   | The signature 4-layer chrome stack plus the ring-compensated padding / radius / rounded / gap helpers.                             | `layers`, `padding`, `radius`, `rounded`, `gap`                                                                    |
| `kokkaku/` (骨格)  | Skeleton placeholder dimensions per component — chrome-, variant-, and color-stripped.                                            | `avatar`, `badge`, `breadcrumb`, `button`, `calendar`, `chart`, `checkbox`, `color-panel`, `control`, `heading`, `map`, `pagination`, `progress`, `radio`, `rating`, `segment`, `slider`, `sparkline`, `stepper`, `switch`, `tabs`, `text`, `textarea`, `toggle-icon-button` |
| `kara.ts` (空)     | Virtualized emptiness — selectors that read `data-empty` on a `VirtualOptions` wrapper. *Flat file — single coherent concern.* | —                                                                                                                  |
| `sou.ts` (層)      | App-level stacking order — the ordered rung ladder (`overlay` / `chrome` / `float` / `lens` / `toast`) every portaled surface lands on. Component-local `z-*` inside a positioned box stays inline. *Flat file — single coherent concern.* | —                                                                                                                  |
| `sun.ts` (寸)      | Named density steps (`sm` / `md` / `lg`) and the per-step token table. *Flat file — single coherent concern.*                      | —                                                                                                                  |
| `tsunagi.ts` (繋ぎ) | Group-join class fragments — dormant until the parent stamps `data-group` at runtime. *Flat file — single coherent concern.*       | —                                                                                                                  |

## 4. Semantic tier — archetype bundles

Bundles compose primitive atoms into the multi-fragment shape an archetype shares across ≥2 kata, exporting a single `<archetype>` value. kiso owns the data only — the katakana bridge declares the token shape it needs as its own contract, so no bridge-facing type crosses up from here. A kata that consumes the whole archetype hands the bundle to its bridge (`bridge.<archetype>(bundle, …)`); a kata that needs a subset reaches the bundle's fragments directly.

| Bundle     | Composes                                                                                                                              | Consumers                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `control/` | Field archetype: frame + surface + input + reset + density + size + affix + resets + check (+ disabled text). Composes `kasane` for the chrome. | `bridge.control` / `bridge.check`; `kata/combobox`, `kata/listbox`, `kata/date-picker`, `kata/select`, `kata/control`, `kata/switch`, `kata/color-picker`, `kata/rating` (subset reach). |
| `popover/` | Floating overlay — `trigger` / `portal` / `text` / `panel` fragments. `portal` rides `sou.float`.                                     | `bridge.popover`; `kata/combobox`, `kata/listbox`, `kata/date-picker`, `kata/color-picker` (subset reach).                                                                  |
| `segment/` | Segmented control — `control` / `item` size maps plus `indicator` color fragments.                                                  | `bridge.segment`.                                                                                                                                      |
| `panel/`   | Panel archetype — `surface` (fill + chrome), `layout` (title / description / header / body / footer arrangement), and `grip` (the drag bar).                  | `bridge.panel`; `kata/dialog`, `kata/drawer`, `kata/sheet`, `kata/box`, `kata/panel`, `kata/grid` (subset reach).                                                   |
| `slider/`  | Slider palette — the `--slider-fill` / `--slider-track` CSS-variable bundle per color. *No bridge.*                                  | `kata/slider`, `kata/slider-range`.                                                                                                                      |
| `zu/` (図)  | Data-viz substrate — the CVD-validated categorical series `palette` (slots + order), the chrome and readout `ink`, and the reveal `motion`. Composes `iro` and `ugoki`. *No bridge.* | `kata/chart`, `kata/map`.                                                                                                                      |

## 5. Rules

- **One concern per sub-file.** If a new fragment crosses axes, add a new sub-file rather than overload an existing one.
- **Two consumers, or it stays inline.** A fragment with one consumer stays inline in that consumer's kata; a shape shared by ≥2 kata earns a semantic bundle.
- **No `defineRecipe()`.** Kiso emits class fragments and token maps; the variants axis is declared at the katakana bridge or the kata surface.
- **Seal with `as const`.** Kata derive their prop types from kiso shapes — widening here propagates everywhere.
- **Compose, don't fork.** A kata, bridge, or bundle that re-derives a token already in kiso is a defect; fold it back into the source module.

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
// good — bg with its read-only variant is one property
'bg-transparent read-only:bg-transparent',

// good — placeholder color with its dark-mode pair
'placeholder:text-zinc-500 dark:placeholder:text-zinc-400',

// bad — same property, broken across two entries
'bg-transparent',
'read-only:bg-transparent',
```

**Separate strings carry meaning.** A string break signals a concern boundary — different property family, different axis, or a deliberate visual grouping. Don't introduce arbitrary breaks; don't merge unrelated properties to save space.

**Mode pairs go through `mode()`.** When both a light class and its `dark:` counterpart need to ship to the Tailwind scanner, use the `mode(light, dark)` helper from `core/recipe` rather than open-coding the pair.

---

**See also:** [`../README.md`](../README.md), [`../../../REFERENCE.md`](../../../REFERENCE.md).
