# Kiso 基礎 - Foundation

Every named utility-class recipe in the design system. Atomic concerns at
the top level; archetype sub-folders for the shapes that ≥2 kata compose
from.

## Boundary

`kiso/` is internal — its values are consumed only by `katakana/`,
`kata/`, and `layouts/*/variants.ts`. Components and primitives reach
kiso through their owning kata (`recipes/kata/<name>`). Foundational
types (`Step`, `SunStep`, `Ma`, `Ji`, `Color`, `GroupOrientation`,
`GroupPosition`) flow through the types-only `recipes` barrel so
consumers can derive prop unions without threading the type through
their funnel.

Composition flows downward only. Modules may import siblings — `narabi`
reads `iro` · `ji` · `sen` · `shaku`, `hannou` reads the same plus
`ugoki`, `omote` reads `iro` · `sen`, `kokkaku` reads `shaku`, archetype
folders read whichever atoms they need — but never reach upward into
`katakana/` or `kata/`. The contract is pinned by
`src/__tests__/recipes/boundary/kiso-boundary.test.ts`,
`src/__tests__/components/boundary/component-recipe-boundary.test.ts`,
and `src/__tests__/primitives/boundary/primitive-recipe-boundary.test.ts`.

## Shape

Two kinds of contents live here. The path makes which kind explicit:

- **Atomic modules** (`<name>.ts`) — one axis per file. Each module
  exports one named const matching its filename — `iro`, `ji`, `ma`, … —
  sealed with `as const` so kata derive prop types from the data.
  Accompanying type exports (`Ji`, `Ma`, `Kokkaku`, `Step`, `SunStep`,
  `GroupOrientation`, `GroupPosition`) sit alongside.
- **Archetype sub-folders** (`<archetype>/`) — multi-fragment recipes
  shared by ≥2 kata. Each folder exposes one named bundle through its
  `index.ts` (matching the folder name) — `control`, `popover`,
  `segment`, `slider`. Sub-files within the folder are internal
  organization; consumers import the bundle, not the parts.

Every file opens with a `Layer: kiso · Concern: <concern>` (or
`Layer: kiso · Archetype: <archetype> · Concern: <part>`) docblock that
pins the axis the module owns. Bodies emit Tailwind utility strings and
class fragments — `defineRecipe()` is never invoked here. The recipe
engine lives in [`core/recipe/`](../../core/recipe) and is called at the
katakana or kata public surface, where the variants axis is declared.

Atomic filenames are `<name>.ts`. Archetype filenames are
`<archetype>/<part>.ts` plus `<archetype>/index.ts`.

## Atomic modules

| Module           | Concern                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| `iro` (色)       | Semantic colour bundles and the variant × slot palette matrix (`solid` / `soft` / `outline` / `plain` / `bare`). |
| `ji` (字)        | Typography — size scale (label → text class) spread at the top level for the dominant use case, plus `weight`, `leading`, and `family` aliases. |
| `kasane/` (重ね) | The signature 4-layer chrome (inset fill, hover ring, focus ring, validation ring) plus the ring-compensated padding, radius, and gap helpers. Split into `layers.ts`, `padding.ts`, `radius.ts`, `gap.ts`. |
| `ma` (間)        | Named spacing scale — `p` / `px` / `py` / `pl` / `pr` / `pt` / `pb`, `m` / `mx` / `my` / `ml` / `mr` / `mt` / `mb`, `gap` / `gapX` / `gapY`. Each ships finished Tailwind utility maps keyed by the same `xs` / `sm` / `md` / `lg` / `xl` label set. `stops` keeps the raw numerals for arbitrary-value construction. |
| `narabi` (並び)  | Sibling arrangement — field stacks, toggle grids, group adjacency, slide positioning, the truncated description spacer, and the flex primitives `row` / `inlineRow` / `col` / `fill`. (Panel slot layout moved to `kiso/panel/layout.ts`.) |
| `omote` (面)     | Generic surface fills and chromes — surface · popover · glass · backdrop · content · tint · skeleton.            |
| `hannou/` (反応) | Interaction feedback — hover, press, focus, disabled, cursor — plus the kata-shaped `item` and `nav` composites that compose those primitives. Split into `state.ts`, `text.ts`, `cursor.ts`, `glass-item.ts`, `item.ts`, `nav.ts`. |
| `sen` (線)       | Borders, rings, dividers, focus indicators, and forced-colors safety nets.                                       |
| `shaku` (尺)     | Dimension scales — width / height / icon slot / scroll area / panel max-width.                                   |
| `sun` (寸)       | Named density steps (`sm` / `md` / `lg`) and the per-step token table.                                           |
| `tsunagi` (繋ぎ) | Group-join class fragments — dormant until the parent stamps `data-group` at runtime.                            |
| `ugoki` (動き)   | Motion — CSS transition fragments (`opacity` / `transform` / `duration` / `pulse`) and Framer Motion enter / exit configs. |
| `kokkaku/` (骨格) | Skeleton placeholder dimensions per component — chrome-, variant-, and colour-stripped. One file per unit (avatar / badge / button / card / checkbox / control / heading / radio / switch / text / textarea). |

## Archetype sub-folders

| Archetype | Concern                                                                                                                                                                                                                                | Consumers                                                                                                  |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `control` | Field archetype: frame + surface + input + density + size + affix + resets + check. Composes `kasane` for the chrome.                                                                                                                  | `katakana/control`, `katakana/check`; `kata/combobox`, `kata/listbox`, `kata/date-picker`, `kata/select`, `kata/control`, `kata/switch` (subset reaches). |
| `popover` | Floating overlay archetype — shared `trigger` / `portal` / `panel` fragments plus motion / surface / glass / ring class fragments for any kata that pops a floating panel anchored to a trigger.                                       | `katakana/popover`; `kata/combobox`, `kata/listbox`, `kata/date-picker` (subset reaches).                  |
| `segment` | Segmented-control archetype — `control` / `item` size maps plus `indicator` colour fragments shared by the standalone `<Segment>` and `<Tabs variant="segment">`.                                                                       | `katakana/segment`.                                                                                        |
| `panel`   | Panel archetype — `surface` (fill + chrome) and `layout` (title / description / header / body / footer slot arrangement) for dialog, drawer, and sheet bodies.                                                                          | `katakana/panel`; `kata/dialog`, `kata/drawer`, `kata/sheet`, `kata/box`, `kata/panel` (subset reaches).   |
| `slider`  | Slider palette — the `--slider-fill` / `--slider-track` CSS-variable bundle per colour. Promoted because both kata read the same variables despite painting through different selector surfaces (native pseudo vs custom DOM).         | `kata/slider`, `kata/slider-range`.                                                                        |

## Rules

- **One concern per atomic module.** If a new fragment crosses axes,
  split rather than overload.
- **Two consumers, or it doesn't get an archetype sub-folder.** A
  fragment with one consumer stays inline in that consumer's kata.
- **No `defineRecipe()`.** Kiso emits class fragments and token maps;
  the variants axis is declared at the katakana applicator layer or at
  the kata surface.
- **Seal with `as const`.** Kata derive their prop types from kiso
  shapes — widening here propagates everywhere.
- **Compose, don't fork.** A kata, katakana applicator, or archetype
  that re-derives a token already in kiso is a defect; fold it back
  into the source module.

## Utility-array style

Class-fragment arrays in kiso follow a consistent shape so cross-file
reads stay predictable.

**Property order.** When an array carries multiple utilities, group them
in this order:

1. `z-index` (`z-10`, `z-50`)
2. `position` (`relative`, `absolute`, `fixed`, `sticky`, `inset-*`,
   `top-*`, `left-*`, ...)
3. `display` and `flex/grid alignment` (`block`, `flex`, `inline-flex`,
   `grid`, `items-*`, `justify-*`, `flex-1`, `min-w-0`, ...)
4. `width / height / size` (`w-full`, `h-4`, `size-5`, `max-w-sm`, ...)
5. `padding / margin / gap` (`p-2`, `mx-auto`, `gap-2`, ...)
6. `bg` (`bg-white`, `bg-transparent`, ...)
7. `border / ring / outline` (`border-0`, `border-zinc-200`, `ring-1`,
   `outline-none`, ...)
8. `radius` (`rounded-lg`, `rounded-full`, ...)
9. `text` (`text-zinc-700`, `text-sm`, `font-medium`, `leading-tight`,
   `placeholder:text-*`, ...)
10. `interaction / state` (`hover:*`, `focus:*`, `disabled:*`,
    `cursor-*`, ...)
11. `motion` (`transition-*`, `duration-*`, `animate-*`)
12. `forced-colors` safety nets

Cross-cutting fragments spread from sibling kiso (`...iro.text.default`,
`...hannou.cursor`) slot into the group that matches their concern.

**One string per property.** Combine same-property utilities into a
single quoted entry when their only difference is a variant prefix:

```ts
// good — bg with its read-only variant is one property
'bg-transparent read-only:bg-transparent',

// good — placeholder colour with its dark-mode pair
'placeholder:text-zinc-500 dark:placeholder:text-zinc-400',

// bad — same property, broken across two entries
'bg-transparent',
'read-only:bg-transparent',
```

**Separate strings carry meaning.** A string break signals a concern
boundary — different property family, different axis, or a deliberate
visual grouping. Don't break for the sake of breaking; don't merge
unrelated properties to save a line.

**Mode pairs go through `mode()`.** When both a light class and its
`dark:` counterpart need to ship to the Tailwind scanner, use the
`mode(light, dark)` helper from `core/recipe` rather than open-coding
the pair.
