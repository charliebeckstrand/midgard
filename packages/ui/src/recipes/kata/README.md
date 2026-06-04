# Kata 型 — Form

> **Scope:** per-unit recipes. One file per unit — usually `src/components/<name>/`, sometimes `src/primitives/<name>/` when the primitive needs its own recipe surface.

## 1. Boundary

`kata/` is internal — omitted from `package.json` `exports` and not re-exported from `src/recipes/index.ts`. **Kata is the only recipe funnel for consumers, and the only layer that touches kiso**: every value a component or primitive reads from the design system flows through its kata, and every kiso token reaches the system through a kata. Consumers reach kata via relative path: `from '../../recipes/kata/<name>'`. Sideways composition between kata is forbidden — shared concerns promote by role: shared *data* to a kiso semantic bundle, shared *wiring* to a katakana bridge. The contract is pinned by `src/__tests__/recipes/boundary/recipe-boundary.test.ts`, `src/__tests__/components/boundary/component-recipe-boundary.test.ts`, and `src/__tests__/primitives/boundary/primitive-recipe-boundary.test.ts`.

A kata reaches the layers below in one of three ways:

- **Through a katakana bridge** (`katakana.<archetype>(tokens, overlay)`) when the kata matches an archetype shape (input, textarea, checkbox, dialog, …). The kata reads the token bundle from `kiso/<archetype>` and hands it to the bridge, which owns the variant axes and the standard slot wiring.
- **Through `defineRecipe` directly** (`from '../../core/recipe'`) when the kata doesn't fit any archetype (button, alert, card, code, …), composing kiso tokens itself.
- **Through `kiso/<archetype>` directly** when the kata needs a subset of a semantic bundle without the bridge (combobox / listbox / date-picker use control's input / density / size; dialog / drawer / sheet / box use panel's surface / layout; slider / slider-range share the slider colour table).

All three reaches compose [`kiso/`](../kiso/README.md) freely for tokens.

When a component and primitive share the same UI surface (e.g. `components/popover/` and `primitives/popover/PopoverPanel`), one kata serves both — `kata/popover.ts` exposes flat slots (`k.trigger`, `k.portal`, `k.text`, `k.panel`) that both consumers read.

## 2. Shape

Every kata exports exactly one runtime value, `k`. The shape `k` takes depends on how the kata reaches the recipe layer:

- **Archetype kata** (`k = katakana.<archetype>(tokens, {...})`) — the kata reads the token bundle from `kiso/<archetype>` and hands it to the bridge, which builds and returns the `k` surface. The bridge owns the recipe construction; the kata supplies the tokens and per-call overlays.
- **Recipe-shaped kata** (`k = defineRecipe(...)`) — `k` is a `defineRecipe(...)` callable, used as `k({ variant, size, … })`. Slots and sibling sub-recipes attach as direct properties (`k.title`, `k.thumb`) via the `defineRecipe(config, extras)` form. Default size resolves from any enclosing Density context.
- **Object-literal kata** (`k = { … }`) — `k` is a plain object. Used when the component has no top-level variants axis but still needs a curated surface (slot fragments, sub-recipes, motion configs, skeleton data). Recipes for individual slots are inner `defineRecipe(...)` callables: `k.button({ size })`, `k.panel({ surface })`.

Type exports sit alongside (`type FooVariants = VariantProps<typeof k>` or `VariantProps<typeof k.button>`). Archetype kata may also re-export the bridge's variant type — e.g. `export type { ControlVariants as InputVariants } from '../katakana'`.

When a component would read kiso tokens directly (`kokkaku.<name>` for skeletons, `ugoki.<thing>` for motion, the popover bundle for popover content), the kata re-exposes them as `k.skeleton`, `k.motion`, `k.content`. The component imports only its kata; the reach into kiso and katakana stops there.

Filenames are `<name>.ts`, matching the component folder.

## 3. Families

Several kata share archetypes whose tokens live in [`kiso/<archetype>`](../kiso/README.md) and whose wiring lives in a [`katakana`](../katakana/README.md) bridge. The kata reads the token bundle and hands it to the bridge; it is a thin call site.

| Family  | Members                                                                                                  | Bridge                                                                                                                                 |
| ------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Control | `input`, `textarea`                                                                                      | `katakana.control(control, …)` — kasane chrome + `default` / `outline` / `glass` surface vocabulary + density + size + affix.         |
| Check   | `checkbox`, `radio`                                                                                      | `katakana.check(control, …)` — `check.surface` chrome + visually-hidden native input + colour-axis-driven checked overlay.            |
| Popover | `popover`                                                                                                | `katakana.popover(popover, …)` — trigger / portal positioning + panel slot bundle (base, surface, glass, ring, motion).               |
| Segment | `segment`, `tabs` (via `k.segment`)                                                                      | `katakana.segment(segment)` — control + item recipes + indicator fragment.                                                            |
| Panel   | `dialog`, `drawer`, `sheet`                                                                              | `katakana.panel(panel, …)` — wraps caller-supplied `panel` (and optional `backdrop`) recipes with the standard title / description / header / body / actions / close slot bundle. |

Kata that need only a subset of a semantic bundle (combobox / listbox / date-picker / select — control's input / density / size without the full chrome) reach `kiso/<archetype>` directly. See the [katakana](../katakana/README.md) and [kiso](../kiso/README.md) READMEs for the full archetype contracts.

## 4. Rules

- **Compose, don't redefine.** A kata that reinvents a recipe already in a katakana bridge or a kiso bundle is a defect — fold it into the existing module.
- **No sideways imports.** Kata never import from sibling kata. Shared concerns promote by role: shared *data* to a kiso semantic bundle, shared *wiring* to a katakana bridge. `import { k as <name> }` in a component is a signal the archetype belongs in a bridge.
- **Variants earn their axis.** Add a variant axis when ≥2 components or call sites need it. Single-use variants stay inline.

---

**See also:** [`../README.md`](../README.md), [`../../../REFERENCE.md`](../../../REFERENCE.md).
