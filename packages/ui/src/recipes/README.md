# Recipes

> **Scope:** the design layer of the `ui` package. Data lives in Kiso (tokens), structure in Katakana (the bridge), application in Kata (per-unit). All three layers are internal — `package.json` `exports` does not list `./recipes`, and the barrel re-exports types only.

## 1. Layers

| Layer | Role | What |
|---|---|---|
| [Kiso 基礎 — Tokens](./kiso/README.md) | Data | Two tiers of design tokens: **primitive** atoms (`dan` · `iro` · `ji` · `ma` · `narabi` · `omote` · `hannou` · `sen` · `shaku` · `sou` · `tsunagi` · `ugoki` · `kokkaku` · `kasane` · `kara`) and **semantic** archetype bundles (`control` · `popover` · `segment` · `panel` · `slider` · `zu`) composed from them. |
| [Katakana 片仮名 — Bridge](./katakana/README.md) | Structure | Pure functions that receive a kiso token bundle and wire it into a recipe surface. Imports only the recipe engine — **never kiso values**. |
| [Kata 型 — Form](./kata/README.md) | Application | Per-unit recipes — the funnel for components and primitives, and **the only layer that touches kiso**. |

The recipe engine (`defineRecipe`, `definePalette`), the color axis (`colors`, `Color`), the `mode` / `shades` authoring helpers, and the bridge helpers (`applyRecipe`, `ApplicatorReturn`) live in [`core/recipe/`](../core/recipe). Files in `katakana` and `kata` import them directly.

## 2. Direction

Dependencies point one way: `kata → kiso` (tokens) and `kata → katakana` (structure); the bridge receives tokens by argument and never reaches back into kiso. Components and primitives funnel through their kata (`from '../../recipes/kata/<name>'`); kata is the single curated surface for every unit.

A kata reaches the layers below in one of three ways:

- **Through a bridge** (`bridge.<archetype>(tokens, overlay)`) when the kata matches an archetype shape (input, textarea, checkbox, drawer, …). The kata reads the token bundle from `kiso/<archetype>` and hands it to the bridge, which owns the variant axes and slot wiring.
- **Through `defineRecipe` directly** (`from '../../core/recipe'`) when the kata doesn't fit any archetype (button, alert, card, code, …), composing kiso tokens itself.
- **Through `kiso/<archetype>` directly** when the kata needs a *subset* of a semantic bundle without the bridge (combobox / listbox / date-picker use control's reset / density; dialog / drawer / sheet / box use panel's surface / layout; slider / slider-range share the slider color table).

The alias problem dissolves because the bridge is namespaced: a kata imports the token bundle under its bare archetype name and the bridge as `bridge.<archetype>`.

```ts
import { control } from '../kiso/control'   // tokens (bare name)
import { bridge } from '../katakana'        // the bridge layer
export const k = bridge.control(control, { base: 'block', slots: { … } })
```

## 3. Boundary

Cross-layer value imports are forbidden. The barrel `index.ts` re-exports foundational types only (`Color` / `ExtendedColor` / `PaletteColor` / `Ma` / `Step` / `GroupOrientation` / `GroupPosition`) so consumers can derive prop unions without threading the type through their kata. No runtime value passes through the barrel.

The contract is pinned by:

- `__tests__/boundary/recipe-boundary.test.ts` — barrel is types-only; `package.json` `exports` never lists `./recipes`.
- `biome.json`, the `recipes/kiso/**` override — kiso never reaches upward into katakana, kata, components, primitives, layouts, hooks, or providers.
- `biome.json`, the `recipes/katakana/**` override — katakana imports nothing from kiso (neither values nor types).
- `.biome/plugins/no-unsanctioned-define-recipe.grit` — `defineRecipe` is invoked only in `recipes/kata/*` and `recipes/katakana/*`.
- `.biome/plugins/no-value-import-from-recipes-barrel.grit` — components, structure, modules, primitives, and layouts import no value from the `recipes` barrel, so each value arrives through `recipes/kata/<name>`.
- `.biome/plugins/no-value-import-from-sibling-kata.grit` — a kata imports no value from a sibling kata.

## 4. Key names

The keys of a kata surface, a kiso bundle, and a bridge result follow one pattern, so a reader finds a part by its scope. The rules:

1. **One word for each key.** A compound name nests under the part that it belongs to: `bar.rail`, not `barRail`.
2. **The part holds its children.** A part with children is an object, and its own classes are `base`: `bar: { base, rail }`. The root part of a kata is `base` too.
3. **One element, one key.** Keys that always go on the same element merge into one key. A key that adds to a part in some states only nests under that part: `trigger: { base, cursor }`.
4. **A recipe can nest.** A recipe that a kata calls holds a nested part in a slot group, and the engine merges each entry: `slots: { close: { base, line } }` gives `k.close.base`.
5. **A config stays whole.** A motion config, a per-color record, and a step map are leaves. Do not put a child key in one.
6. **A kata exports `k`, its scale, and its types.** The scale is `scale`, or `scale.<part>` when the kata has two (`scale.bar`, `scale.gauge`).

In `dan`, a ramp nests under the unit that reads it, then the part or the side: `space.box.bottom`, `space.tab.pill.x`, `size.menu.max`.

Two names keep their form. A key that names a component with a name of two words keeps the name of the component (`colorPanel`, `datePicker`, `scrollArea`). A key that mirrors a public prop or a library term keeps that name, such as the `stickyHeader` axis, which mirrors the prop of `SidebarLayout`.

---

**See also:** [`../../REFERENCE.md`](../../REFERENCE.md), [`../../README.md`](../../README.md).
