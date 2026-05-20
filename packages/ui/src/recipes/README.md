## Recipes

The design layer of the UI package. Components compose the recipes here
rather than reinventing them.

| Layer                                          | What                                                    |
| ---------------------------------------------- | ------------------------------------------------------- |
| [Kiso 基礎 - Foundation](./kiso)               | Substrate tokens: iro · ji · ma · narabi · omote · hannou · sen · shaku · tsunagi · ugoki · kokkaku. |
| [Genkei 原型 - Archetypes](./genkei/README.md) | Multi-element archetypes shared by ≥2 kata. Internal.   |
| [Kata 型 - Forms](./kata/README.md)            | Per-component recipes built on the engine. Internal.    |

The recipe engine (`defineRecipe`, `palette`, `merge`) lives in
[`core/recipe/`](../core/recipe) and is re-exported from this barrel.
