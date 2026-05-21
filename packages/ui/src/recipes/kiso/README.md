# Kiso 基礎 - Foundation

Substrate tokens. One file per concern.

## Boundary

`kiso/` is the only recipe layer with a public surface. Every export
in `src/recipes/kiso/index.ts` is re-exported from
`src/recipes/index.ts` and ships through the package's `exports`.
[`genkei/`](../genkei/README.md), [`kata/`](../kata/README.md), and
components compose freely from kiso.

Composition flows downward only. Modules may import siblings —
`narabi` reads `iro` · `ji` · `sen` · `shaku`, `hannou` reads the
same plus `ugoki`, `omote` reads `iro` · `sen`, `kokkaku` reads
`shaku` — but never reach upward into `genkei/` or `kata/`. The
contract is pinned by
`src/__tests__/recipes/boundary/recipe-boundary.test.ts`.

## Shape

Each module exports one named const matching its filename — `iro`,
`ji`, `ma`, … — sealed with `as const` so kata derive prop types
from the data. Accompanying type exports (`Ji`, `Ma`, `Kokkaku`,
`Step`, `SunStep`, `GroupOrientation`, `GroupPosition`) sit
alongside.

Every file opens with a `Layer: kiso · Concern: <concern>` docblock
that pins the axis the module owns. Bodies emit Tailwind utility
strings and class fragments — `defineRecipe()` is never invoked
here. The recipe engine lives in [`core/recipe/`](../../core/recipe)
and is called at the kata public surface, where the variants axis is
declared.

Filenames are `<name>.ts`, matching the module's named export.

## Modules

| Module           | Concern                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| `iro` (色)       | Semantic colour bundles and the variant × slot palette matrix (`solid` / `soft` / `outline` / `plain` / `bare`). |
| `ji` (字)        | Type-size scale — font-size with line-height bundled.                                                            |
| `ma` (間)        | Named spacing scale shared by padding, margin, and gap; projected as first-class Tailwind utilities.             |
| `narabi` (並び)  | Sibling arrangement — field stacks, panel slot layout, toggle grids, group adjacency.                            |
| `omote` (面)     | Surface chromes — surface · panel · popover · glass · backdrop · content · tint · skeleton.                      |
| `hannou` (反応)  | Interaction states — hover, press, focus, disabled, cursor feedback.                                             |
| `sen` (線)       | Borders, rings, dividers, focus indicators, and forced-colors safety nets.                                       |
| `shaku` (尺)     | Dimension scales — width / height / icon slot / scroll area / panel max-width.                                   |
| `sun` (寸)       | Named density steps (`sm` / `md` / `lg`) and the per-step token table.                                           |
| `tsunagi` (繋ぎ) | Group-join class fragments — dormant until the parent stamps `data-group` at runtime.                            |
| `ugoki` (動き)   | Motion — CSS transition fragments and Framer Motion enter / exit configs.                                        |
| `kokkaku` (骨格) | Skeleton placeholder dimensions per component — chrome-, variant-, and colour-stripped.                          |

## Rules

- **One concern per module.** If a new fragment crosses axes, split
  rather than overload an existing module.
- **No `defineRecipe()`.** Kiso emits class fragments and token
  maps; the variants axis is declared at the kata surface.
- **Seal with `as const`.** Kata derive their prop types from kiso
  shapes — widening here propagates everywhere.
- **Compose, don't fork.** A kata or genkei that re-derives a token
  already in kiso is a defect; fold it back into the source module.
