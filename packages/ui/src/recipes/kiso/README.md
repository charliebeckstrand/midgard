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
| `ji` (字)        | Type-size scale — font-size with line-height bundled.                                                            |
| `kasane/` (重ね) | The signature 4-layer chrome (inset fill, hover ring, focus ring, validation ring) plus the ring-compensated padding, radius, and gap helpers. Split into `layers.ts`, `padding.ts`, `radius.ts`, `gap.ts`. |
| `ma` (間)        | Named spacing scale shared by padding, margin, and gap; projected as first-class Tailwind utilities.             |
| `narabi` (並び)  | Sibling arrangement — field stacks, toggle grids, group adjacency. (Panel slot layout moved to `kiso/panel/layout.ts`.) |
| `omote` (面)     | Generic surface fills and chromes — surface · popover · glass · backdrop · content · tint · skeleton.            |
| `hannou/` (反応) | Interaction feedback — hover, press, focus, disabled, cursor — plus the kata-shaped `item` and `nav` composites that compose those primitives. Split into `state.ts`, `text.ts`, `cursor.ts`, `glass-item.ts`, `item.ts`, `nav.ts`. |
| `sen` (線)       | Borders, rings, dividers, focus indicators, and forced-colors safety nets.                                       |
| `shaku` (尺)     | Dimension scales — width / height / icon slot / scroll area / panel max-width.                                   |
| `sun` (寸)       | Named density steps (`sm` / `md` / `lg`) and the per-step token table.                                           |
| `tsunagi` (繋ぎ) | Group-join class fragments — dormant until the parent stamps `data-group` at runtime.                            |
| `ugoki` (動き)   | Motion — CSS transition fragments and Framer Motion enter / exit configs.                                        |
| `kokkaku/` (骨格) | Skeleton placeholder dimensions per component — chrome-, variant-, and colour-stripped. One file per unit (avatar / badge / button / card / checkbox / form-control / heading / radio / switch / text / textarea). |

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
