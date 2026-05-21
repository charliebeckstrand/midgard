# Recipes

The design layer of the UI package.

| Layer                                          | Reach    | What                                                                                                  |
| ---------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| [Kiso 基礎 - Foundation](./kiso/README.md)     | Public   | Substrate tokens — iro · ji · ma · narabi · omote · hannou · sen · shaku · tsunagi · ugoki · kokkaku. |
| [Genkei 原型 - Archetypes](./genkei/README.md) | Internal | Multi-element archetypes shared by ≥2 kata.                                                           |
| [Kata 型 - Forms](./kata/README.md)            | Internal | Per-component recipes — one file per `src/components/<name>/`.                                        |

The recipe engine (`defineRecipe`, `palette`, `merge`), the colour axis
(`colors`, `Color`), and the `mode` / `shades` authoring helpers live in
[`core/recipe/`](../core/recipe) and are re-exported from this barrel.
