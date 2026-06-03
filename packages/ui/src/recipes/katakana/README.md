# Katakana 片仮名 — Applicators

> **Scope:** function-shaped applicators that wrap an archetype's standard pieces into a ready-to-call surface for kata.

## 1. Boundary

`katakana/` is internal — omitted from `package.json` `exports` and not re-exported from `src/recipes/index.ts`. Kata consume katakana via relative path: `from '../katakana'`. An applicator reads its archetype's fragments from [`kiso/<archetype>`](../kiso/README.md) and composes other kiso atoms; it imports the recipe engine and the applicator helpers (`applyRecipe`, `defineApplicator`, `ApplicatorReturn`) directly from [`core/recipe`](../../core/recipe). Sideways composition between applicators is forbidden — shared concerns promote to a kiso archetype sub-folder (raw fragments) or a kiso atom (substrate). Applicators never reach upward into kata, components, primitives, layouts, hooks, or providers, and they never inline literal Tailwind class strings — every fragment is reached by name through kiso. The contract is pinned by `src/__tests__/recipes/boundary/kata-boundary.test.ts`, `src/__tests__/components/boundary/component-recipe-boundary.test.ts`, and `src/__tests__/primitives/boundary/primitive-recipe-boundary.test.ts`.

## 2. Shape

Every applicator is a function that takes an archetype's standard pieces plus the kata's per-call configuration and returns the `k` surface the kata exports. `defineApplicator` in `core/recipe` covers the common case — a single `defineRecipe` call with caller overlays — so `control` and `check` collapse to one-liner declarations. Three archetypes don't fit that shape and hand-roll instead:

- `popover` — no `defineRecipe` calls; returns a bundle of class fragments anchored by an optional caller `text` override.
- `segment` — two `defineRecipe` calls (one for the outer chrome, one for each item) wrapped in a bundle alongside the raw indicator fragment.
- `panel` — caller supplies their own `defineRecipe` results (each kata's panel has different variants); the applicator wraps them in the standard title / description / header / body / actions / close slot bundle.

Three exceptions, one architecture. See [`katakana/index.ts`](./index.ts) for details.

## 3. Modules

| Module    | Archetype                                                                                                                                        | Kata members                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `control` | Text-input branch of the Control family — frame + kasane chrome + `default` / `outline` / `glass` surface vocabulary + density + size + affix.   | `input`, `textarea`                                                       |
| `check`   | Check-input branch of the Control family — `check.surface` chrome + visually-hidden native input + colour-axis-driven checked overlay.            | `checkbox`, `radio`                                                       |
| `popover` | Floating-overlay archetype — trigger / portal positioning + panel slot bundle (base, surface, glass, ring, motion).                              | `popover` (kata)                                                          |
| `segment` | Segmented-control archetype — control + item recipes + indicator fragment.                                                                       | `segment`, `tabs` (via `k.segment`)                                       |
| `panel`   | Panel-bundle archetype — wraps caller-supplied `panel` (and optional `backdrop`) `defineRecipe(...)` results with the standard slot bundle.      | `dialog`, `drawer`, `sheet`                                               |

## 4. Rules

- **Applicators only.** The barrel surfaces functions and the variant types real consumers import. Engine primitives (`defineRecipe`, `defineColors`, `definePalette`, `VariantProps`, …) stay in `core/recipe` and kata import them from there. A kata that doesn't fit any archetype calls `defineRecipe` directly — routing it through a katakana alias would conflate the applicator layer with the recipe engine.
- **Type exports follow real consumer needs.** `control` and `segment` expose variant types because consumer components import them. `check`, `popover`, and `panel` don't — checkbox and radio compute their own variants from `VariantProps<typeof k>` (extra axes the applicator doesn't own), and panel's input shape is generic per-kata.
- **Kiso holds the data; katakana wraps it.** Each applicator imports its archetype's fragments from `kiso/<archetype>`. Don't fork the data into the applicator file — fold any duplication back into kiso.
- **Subset reaches stay on kiso.** Kata that need a *subset* of an archetype's fragments (combobox / listbox / date-picker use control's input / density / size without the full chrome) reach `kiso/<archetype>` directly. The applicator is for kata that consume the whole archetype.

---

**See also:** [`../README.md`](../README.md), [`../../../REFERENCE.md`](../../../REFERENCE.md).
