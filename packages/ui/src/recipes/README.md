## Recipes

Design-token recipes for the UI package. Components compose them; they
don't reinvent them.

| Layer                               | What                                                     |
| ----------------------------------- | -------------------------------------------------------- |
| [Kata 型 - Forms](./kata/README.md) | Per-component recipes built on the engine. Internal.     |
| [Waku 枠 - Frames](./waku/README.md) | Multi-element archetypes shared by ≥2 kata. Internal.   |

The substrate (iro · ji · ma · narabi · omote · sawari · sen · take ·
tsunagi · ugoki · kokkaku) and the recipe engine (`defineRecipe`,
`palette`) live alongside in [`core/recipe/`](../core/recipe).
