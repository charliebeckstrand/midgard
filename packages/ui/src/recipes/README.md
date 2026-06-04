# Recipes

> **Scope:** the design layer of the `ui` package. Variants funnel through Kiso (atoms) → Katakana (archetypes) → Kata (per-unit). All three layers are internal — `package.json` `exports` does not list `./recipes`, and the barrel re-exports types only.

## 1. Layers

| Layer | Reach | What |
|---|---|---|
| [Kiso 基礎 — Foundation](./kiso/README.md) | Internal | The atomic utility-class concerns of the design system (`iro` · `ji` · `ma` · `narabi` · `omote` · `hannou` · `sen` · `shaku` · `sun` · `tsunagi` · `ugoki` · `kokkaku` · `kasane`). No archetypes — every fragment here is a single atomic axis. |
| [Katakana 片仮名 — Archetypes](./katakana/README.md) | Internal | One sub-folder per archetype (`control` · `popover` · `segment` · `panel` · `slider`), each owning its shared class-fragment data **and** the applicator that wraps it. |
| [Kata 型 — Form](./kata/README.md) | Internal | Per-unit recipes — the funnel for components and primitives. |

The recipe engine (`defineRecipe`, `definePalette`, `merge`), the colour axis (`colors`, `Color`), the `mode` / `shades` authoring helpers, and the applicator helpers (`applyRecipe`, `defineApplicator`, `ApplicatorReturn`) live in [`core/recipe/`](../core/recipe). Files in `katakana`, `kata`, and `layouts/*/variants.ts` import them directly.

## 2. Funnels

Components and primitives funnel through their kata: `from '../../recipes/kata/<name>'`. Kata is the single curated surface for every unit.

Kata reach the layers below in one of three ways:

- **Through an applicator** (`from '../katakana'`) when the kata matches an archetype shape (input, textarea, checkbox, dialog, …). The applicator owns the variant axes and the standard slot wiring.
- **Through `defineRecipe` directly** (`from '../../core/recipe'`) when the kata doesn't fit any archetype (button, alert, card, code, …).
- **Through `katakana/<archetype>` directly** when the kata needs a *subset* of an archetype's fragments without the full chrome (combobox / listbox / date-picker use control's input / density / size; dialog / drawer / sheet / box use panel's surface / layout; slider / slider-range share the slider colour table).

Each archetype folder's `index.ts` exports the fragment bundle under the archetype name; its `applicator.ts` exports the callable applicator. The applicator composes the folder's own fragments plus kiso atoms. Kiso modules compose siblings within kiso only.

## 3. Boundary

Cross-layer value imports are forbidden. The barrel `index.ts` re-exports foundational types only (`Step` / `Ma` / `Color` / `Ji` / `GroupOrientation` / `GroupPosition` / `SunStep`) so consumers can derive prop unions without threading the type through their kata. No runtime value passes through the barrel.

The contract is pinned by:

- `__tests__/recipes/boundary/recipe-boundary.test.ts` — barrel is types-only; `package.json` `exports` never lists `./recipes`.
- `__tests__/recipes/boundary/kiso-boundary.test.ts` — kiso never reaches upward into katakana, kata, components, primitives, layouts, hooks, or providers.
- `__tests__/recipes/boundary/kata-boundary.test.ts` — `defineRecipe` is invoked only in `recipes/kata/*`, `recipes/katakana/*`, and `layouts/*/variants.ts`.
- `__tests__/components/boundary/component-recipe-boundary.test.ts` — components import values only via `recipes/kata/<name>`.
- `__tests__/primitives/boundary/primitive-recipe-boundary.test.ts` — primitives import values only via `recipes/kata/<name>`.

---

**See also:** [`../../REFERENCE.md`](../../REFERENCE.md), [`../../README.md`](../../README.md).
