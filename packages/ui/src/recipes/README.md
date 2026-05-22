# Recipes

The design layer of the UI package.

| Layer                                          | Reach    | What                                                                                                                       |
| ---------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| [Kiso 基礎 - Foundation](./kiso/README.md)     | Internal | Substrate tokens — iro · ji · ma · narabi · omote · hannou · sen · shaku · sun · tsunagi · ugoki · kokkaku.                |
| [Genkei 原型 - Archetypes](./genkei/README.md) | Internal | Multi-element archetypes — fragments shared by ≥2 kata.                                                                    |
| [Kata 型 - Forms](./kata/README.md)            | Internal | Per-unit recipes — the funnel components and primitives both read.                                                         |

The recipe engine (`defineRecipe`, `palette`, `merge`), the colour axis
(`colors`, `Color`), and the `mode` / `shades` authoring helpers live in
[`core/recipe/`](../core/recipe). They are imported directly by the kata,
genkei, and `layouts/*/variants.ts` files that author recipes — they no
longer flow through this folder's barrel.

## Funnels

The recipe flow is linear: `kiso → genkei → kata → consumer`.

- **Components and primitives** alike funnel through their kata —
  `from '../../recipes/kata/<name>'`. Kata is the single curated
  surface for every unit.
- **Kata** compose `kiso/` (and `genkei/` when an archetype is
  shared by ≥2 kata) directly.
- **Genkei** compose `kiso/` and sibling genkei.

Cross-layer value imports are forbidden. The barrel `index.ts` re-exports
foundational types only (`Step` / `Ma` / `Color` / `Ji` / `GroupOrientation`
/ `GroupPosition` / `SunStep`) so consumers can derive prop unions without
threading the type through their kata. No runtime value passes through the
barrel.

The contract is pinned by:

- `__tests__/recipes/boundary/recipe-boundary.test.ts` — barrel is types-only; `package.json` `exports` never lists `./recipes`.
- `__tests__/components/boundary/component-recipe-boundary.test.ts` — components import values only via `recipes/kata/<name>`.
- `__tests__/primitives/boundary/primitive-recipe-boundary.test.ts` — primitives import values only via `recipes/kata/<name>`.
- `__tests__/recipes/boundary/kata-boundary.test.ts` — `defineRecipe` is invoked only in `recipes/kata/*` and `layouts/*/variants.ts`.
- `__tests__/recipes/boundary/genkei-boundary.test.ts` — genkei never reach upward into components, primitives, or layouts.
