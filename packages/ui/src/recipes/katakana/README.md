# Katakana 片仮名 — Archetypes

> **Scope:** the archetype layer. One sub-folder per archetype, each owning its shared class-fragment data **and** the applicator that wraps that data into a ready-to-call surface for kata.

## 1. Boundary

`katakana/` is internal — omitted from `package.json` `exports` and not re-exported from `src/recipes/index.ts`. Each archetype folder reads kiso atoms (`from '../../kiso'`) and imports the recipe engine and applicator helpers (`applyRecipe`, `defineApplicator`, `ApplicatorReturn`) from [`core/recipe`](../../core/recipe). Sideways composition between archetypes is forbidden — shared substrate promotes to a kiso atom. Archetypes never reach upward into kata, components, primitives, layouts, hooks, or providers. The contract is pinned by `src/__tests__/recipes/boundary/kata-boundary.test.ts`, `src/__tests__/components/boundary/component-recipe-boundary.test.ts`, and `src/__tests__/primitives/boundary/primitive-recipe-boundary.test.ts`.

Unlike kiso, katakana files **do** carry literal Tailwind class strings — the archetype's fragment data lives here, not in a separate substrate tier.

## 2. Folder shape

Each archetype is a sub-folder:

```
katakana/<archetype>/
  <fragment>.ts   one file per fragment (frame, surface, input, …)
  index.ts        assembles the fragment bundle, exported under the archetype name
  applicator.ts   the callable applicator(s) — omitted for fragment-only archetypes
```

The folder `index.ts` exports the fragment bundle (`export const control = { frame, surface, … }`); `applicator.ts` imports that bundle (`from '.'`) plus kiso atoms and exports the applicator. The barrel `index.ts` re-exports applicators (and the variant types real consumers import) from each `applicator.ts`.

A kata that consumes a **whole** archetype imports its applicator from the barrel (`from '../katakana'`). A kata that needs a **subset** of fragments imports the bundle from the folder (`from '../katakana/<archetype>'`). Both reaches are honest layering; neither dips into the other's namespace.

## 3. Applicator shape

Every applicator takes an archetype's standard pieces plus the kata's per-call configuration and returns the `k` surface the kata exports. `defineApplicator` in `core/recipe` covers the common case — a single `defineRecipe` call with caller overlays — so `control` and `check` collapse to one-liner declarations. Three archetypes don't fit that shape and hand-roll instead:

- `popover` — no `defineRecipe` calls; returns a bundle of class fragments anchored by an optional caller `text` override.
- `segment` — two `defineRecipe` calls (one for the outer chrome, one for each item) wrapped in a bundle alongside the raw indicator fragment.
- `panel` — caller supplies their own `defineRecipe` results (each kata's panel has different variants); the applicator wraps them in the standard title / description / header / body / actions / close slot bundle.

Three exceptions, one architecture.

## 4. Modules

| Module    | Archetype                                                                                                                                        | Applicator(s) | Kata members                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ------------------------------------------------------------------------- |
| `control` | The Control family — text-input chrome (frame + kasane chrome + `default` / `outline` / `glass` surface + density + size + affix) and the check-input branch (`check.surface` chrome + visually-hidden native input). | `control`, `check` | `input`, `textarea`; `checkbox`, `radio`                                  |
| `popover` | Floating-overlay archetype — trigger / portal positioning + panel slot bundle (base, surface, glass, ring, motion).                              | `popover`     | `popover` (kata)                                                          |
| `segment` | Segmented-control archetype — control + item recipes + indicator fragment.                                                                       | `segment`     | `segment`, `tabs` (via `k.segment`)                                       |
| `panel`   | Panel-bundle archetype — wraps caller-supplied `panel` (and optional `backdrop`) `defineRecipe(...)` results with the standard slot bundle.       | `panel`       | `dialog`, `drawer`, `sheet`                                               |
| `slider`  | Slider colour table — the `--slider-fill` / `--slider-track` CSS-variable bundle per colour. *Fragment-only — no applicator.*                     | —             | `slider`, `slider-range` (subset reach)                                   |

Subset reaches: combobox / listbox / date-picker / select / switch take `control`'s input / density / size; dialog / drawer / sheet / box take `panel`'s surface / layout; slider / slider-range take `slider`'s colour — all `from '../katakana/<archetype>'`.

## 5. Rules

- **One archetype, one folder.** Fragments and applicator live together. Don't split an archetype's data into a separate tier.
- **Kiso holds the atoms; katakana holds the archetypes.** A fragment shared by ≥2 kata as a single atomic axis belongs in kiso; multi-fragment archetype shape belongs here. Don't fork an atom into an archetype — compose it.
- **Type exports follow real consumer needs.** `control` and `segment` expose variant types because consumer components import them. `check`, `popover`, and `panel` don't — checkbox and radio compute their own variants from `VariantProps<typeof k>` (extra axes the applicator doesn't own), and panel's input shape is generic per-kata.
- **No sideways imports.** Archetypes never import each other. Shared substrate promotes to a kiso atom.

---

**See also:** [`../README.md`](../README.md), [`../../../REFERENCE.md`](../../../REFERENCE.md).
