# Recipes

The design layer of the UI package.

| Layer                                          | Reach    | What                                                                                                                       |
| ---------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| [Kiso 基礎 - Foundation](./kiso/README.md)     | Internal | Substrate tokens — iro · ji · ma · narabi · omote · hannou · sen · shaku · sun · tsunagi · ugoki · kokkaku · kasane.       |
| [Genkei 原型 - Archetypes](./genkei/README.md) | Internal | Raw class-fragment data for the archetypes — control · popover · segment · slider.                                         |
| [Katakana 片仮名 - Applicators](./katakana/README.md) | Internal | Function-shaped applicators that wrap genkei fragments into ready-to-use recipes for kata that match an archetype.   |
| [Kata 型 - Forms](./kata/README.md)            | Internal | Per-unit recipes — the funnel components and primitives both read.                                                         |

The recipe engine (`defineRecipe`, `palette`, `merge`), the colour axis
(`colors`, `Color`), the `mode` / `shades` authoring helpers, and the
applicator helpers (`applyRecipe`, `defineApplicator`, `ApplicatorReturn`)
live in [`core/recipe/`](../core/recipe). They are imported directly by
the kata, katakana, genkei, and `layouts/*/variants.ts` files that
author recipes — they no longer flow through this folder's barrel.

## Funnels

Components and primitives funnel through their kata:
`from '../../recipes/kata/<name>'`. Kata is the single curated surface
for every unit.

Kata reach the layers below in one of three ways:

- **Through an applicator** (`from '../katakana/<archetype>'`) when the
  kata matches an archetype shape (input, textarea, checkbox, dialog, …).
  The applicator owns the variant axes and the standard slot wiring.
- **Through `defineRecipe` directly** (`from '../../core/recipe'`) when
  the kata doesn't fit any archetype (button, alert, card, code, …).
- **Through `genkei/*` directly** when the kata needs a *subset* of an
  archetype's fragments without the full chrome (combobox / listbox /
  date-picker use control's input / density / size; slider / slider-range
  share the slider colour table).

Each katakana applicator imports its archetype's fragments from
`genkei/*` (e.g. `katakana/control` reads `genkei/control`). Each
applicator and kata composes `kiso/` directly for substrate tokens.
Genkei composes `kiso/` and sibling genkei.

Cross-layer value imports are forbidden. The barrel `index.ts` re-exports
foundational types only (`Step` / `Ma` / `Color` / `Ji` / `GroupOrientation`
/ `GroupPosition` / `SunStep`) so consumers can derive prop unions without
threading the type through their kata. No runtime value passes through the
barrel.

The contract is pinned by:

- `__tests__/recipes/boundary/recipe-boundary.test.ts` — barrel is types-only; `package.json` `exports` never lists `./recipes`.
- `__tests__/components/boundary/component-recipe-boundary.test.ts` — components import values only via `recipes/kata/<name>`.
- `__tests__/primitives/boundary/primitive-recipe-boundary.test.ts` — primitives import values only via `recipes/kata/<name>`.
- `__tests__/recipes/boundary/kata-boundary.test.ts` — `defineRecipe` is invoked only in `recipes/kata/*`, `recipes/katakana/*`, and `layouts/*/variants.ts`.
- `__tests__/recipes/boundary/genkei-boundary.test.ts` — genkei never reach upward into katakana, kata, components, primitives, or layouts.
