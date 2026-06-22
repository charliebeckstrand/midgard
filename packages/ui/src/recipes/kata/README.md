# Kata 型 — Form

> **Scope:** per-unit recipes. One file per unit — usually `src/components/<name>/`, sometimes `src/primitives/<name>/` when the primitive needs its own recipe surface.

## 1. Boundary

`kata/` is internal — omitted from `package.json` `exports` and not re-exported from `src/recipes/index.ts`. **Kata is the only recipe funnel for consumers, and the only layer that touches kiso**: every value a component or primitive reads from the design system flows through its kata, and every kiso token reaches the system through a kata. Consumers reach kata via relative path: `from '../../recipes/kata/<name>'`. Sideways composition between kata is forbidden — shared concerns promote by role: shared *data* to a kiso semantic bundle, shared *wiring* to a katakana bridge. The contract is pinned by `recipe-boundary.test.ts` and the component / primitive recipe-boundary tests; the full boundary-test list lives in [`../README.md`](../README.md#3-boundary).

The three ways a kata reaches the layers below — a katakana bridge, `defineRecipe` directly, or a `kiso/<archetype>` bundle directly — are described in [`../README.md`](../README.md#2-direction). All three compose [`kiso/`](../kiso/README.md) freely for tokens.

When a component and primitive share the same UI surface (e.g. `components/popover/` and `primitives/popover/PopoverPanel`), one kata serves both — `kata/popover.ts` exposes flat slots (`k.trigger`, `k.portal`, `k.text`, `k.panel`) that both consumers read.

## 2. Shape

Every kata exports exactly one runtime value, `k`. The shape `k` takes depends on how the kata reaches the recipe layer:

- **Archetype kata** (`k = bridge.<archetype>(tokens, {...})`) — the kata reads the token bundle from `kiso/<archetype>` and hands it to the bridge, which builds and returns the `k` surface. The bridge owns the recipe construction; the kata supplies the tokens and per-call overlays.
- **Recipe-shaped kata** (`k = defineRecipe(...)`) — `k` is a `defineRecipe(...)` callable, used as `k({ variant, size, … })`. Slots and sibling sub-recipes attach as direct properties (`k.title`, `k.thumb`) via the `defineRecipe(config, extras)` form. Default size resolves from any enclosing Density context.
- **Object-literal kata** (`k = { … }`) — `k` is a plain object. Used when the component has no top-level variants axis but still needs a curated surface (slot fragments, sub-recipes, motion configs, skeleton data). Recipes for individual slots are inner `defineRecipe(...)` callables: `k.button({ size })`, `k.panel({ surface })`.

Type exports sit alongside, derived from the concrete result — `type FooVariants = VariantProps<typeof k>` (or `VariantProps<typeof k.button>`). Archetype kata derive theirs the same way, since the bridge is generic over the tokens and exposes no standalone variant type — e.g. `export type InputVariants = VariantProps<typeof k>`.

When a component would read kiso tokens directly (`kokkaku.<name>` for skeletons, `ugoki.<thing>` for motion, the popover bundle for popover content), the kata re-exposes them as `k.skeleton`, `k.motion`, `k.content`. The component imports only its kata; the reach into kiso and katakana stops there.

Filenames are `<name>.ts`, matching the component folder.

## 3. Families

Several kata share archetypes whose tokens live in [`kiso/<archetype>`](../kiso/README.md) and whose wiring lives in a [`katakana`](../katakana/README.md) bridge. The kata reads the token bundle and hands it to the bridge; it is a thin call site. The archetype → bridge → kata-member mapping is the [katakana Modules table](../katakana/README.md#4-modules); the token-composition view (which primitives each bundle composes, and which kata reach it) is the [kiso Semantic tier table](../kiso/README.md).

Kata that need only a subset of a semantic bundle reach `kiso/<archetype>` directly — see [`../README.md`](../README.md#2-direction) for the subset list and the [katakana](../katakana/README.md) and [kiso](../kiso/README.md) READMEs for the full archetype contracts.

## 4. Rules

- **Compose, don't redefine.** A kata that reinvents a recipe already in a katakana bridge or a kiso bundle is a defect — fold it into the existing module.
- **No sideways imports.** Kata never import from sibling kata. Shared concerns promote by role: shared *data* to a kiso semantic bundle, shared *wiring* to a katakana bridge. `import { k as <name> }` in a component is a signal the archetype belongs in a bridge.
- **Variants earn their axis.** Add a variant axis when ≥2 components or call sites need it. Single-use variants stay inline.
- **Header when non-obvious.** Open a kata with a summary doccomment only when its structure isn't self-evident from the body — it serves more than one unit, sources a non-standard token (inline `mode()` colours rather than an `iro` palette), bridges or composes another recipe, or groups slots non-trivially. A canonical recipe-shaped matrix (`variant × color × size`) needs none; the header is the signal that something here is worth reading first.

---

**See also:** [`../README.md`](../README.md), [`../../../REFERENCE.md`](../../../REFERENCE.md).
