# Recipes

> **Scope:** the design layer of the `ui` package. Data lives in Kiso (tokens), structure in Katakana (the bridge), application in Kata (per-unit). All three layers are internal — `package.json` `exports` does not list `./recipes`, and the barrel re-exports types only.

## 1. Layers

| Layer | Role | What |
|---|---|---|
| [Kiso 基礎 — Tokens](./kiso/README.md) | Data | Two tiers of design tokens: **primitive** atoms (`iro` · `ji` · `ma` · `narabi` · `omote` · `hannou` · `sen` · `shaku` · `sun` · `tsunagi` · `ugoki` · `kokkaku` · `kasane`) and **semantic** archetype bundles (`control` · `popover` · `segment` · `panel` · `slider`) composed from them. |
| [Katakana 片仮名 — Bridge](./katakana/README.md) | Structure | Pure functions that receive a kiso token bundle and wire it into a recipe surface. Imports only the recipe engine — **never kiso values**. |
| [Kata 型 — Form](./kata/README.md) | Application | Per-unit recipes — the funnel for components and primitives, and **the only layer that touches kiso**. |

The recipe engine (`defineRecipe`, `definePalette`, `merge`), the colour axis (`colors`, `Color`), the `mode` / `shades` authoring helpers, and the bridge helpers (`applyRecipe`, `ApplicatorReturn`) live in [`core/recipe/`](../core/recipe). Files in `katakana`, `kata`, and `layouts/*/variants.ts` import them directly.

## 2. Direction

Dependencies point one way: `kata → kiso` (tokens) and `kata → katakana` (structure); the bridge receives tokens by argument and never reaches back into kiso. Components and primitives funnel through their kata (`from '../../recipes/kata/<name>'`); kata is the single curated surface for every unit.

A kata reaches the layers below in one of three ways:

- **Through a bridge** (`bridge.<archetype>(tokens, overlay)`) when the kata matches an archetype shape (input, textarea, checkbox, dialog, …). The kata reads the token bundle from `kiso/<archetype>` and hands it to the bridge, which owns the variant axes and slot wiring.
- **Through `defineRecipe` directly** (`from '../../core/recipe'`) when the kata doesn't fit any archetype (button, alert, card, code, …), composing kiso tokens itself.
- **Through `kiso/<archetype>` directly** when the kata needs a *subset* of a semantic bundle without the bridge (combobox / listbox / date-picker use control's input / density / size; dialog / drawer / sheet / box use panel's surface / layout; slider / slider-range share the slider colour table).

The alias problem dissolves because the bridge is namespaced: a kata imports the token bundle under its bare archetype name and the bridge as `bridge.<archetype>`.

```ts
import { control } from '../kiso/control'   // tokens (bare name)
import { bridge } from '../katakana'        // the bridge layer
export const k = bridge.control(control, { base: 'block', slots: { … } })
```

## 3. Boundary

Cross-layer value imports are forbidden. The barrel `index.ts` re-exports foundational types only (`Step` / `Ma` / `Color` / `Ji` / `GroupOrientation` / `GroupPosition` / `SunStep`) so consumers can derive prop unions without threading the type through their kata. No runtime value passes through the barrel.

The contract is pinned by:

- `__tests__/boundary/recipe-boundary.test.ts` — barrel is types-only; `package.json` `exports` never lists `./recipes`.
- `__tests__/boundary/kiso-boundary.test.ts` — kiso never reaches upward into katakana, kata, components, primitives, layouts, hooks, or providers.
- `__tests__/boundary/katakana-purity-boundary.test.ts` — katakana imports nothing from kiso (neither values nor types).
- `__tests__/boundary/kata-boundary.test.ts` — `defineRecipe` is invoked only in `recipes/kata/*`, `recipes/katakana/*`, and `layouts/*/variants.ts`.
- `__tests__/boundary/component-recipe-boundary.test.ts` — components import values only via `recipes/kata/<name>`.
- `__tests__/boundary/primitive-recipe-boundary.test.ts` — primitives import values only via `recipes/kata/<name>`.

---

**See also:** [`../../REFERENCE.md`](../../REFERENCE.md), [`../../README.md`](../../README.md).
