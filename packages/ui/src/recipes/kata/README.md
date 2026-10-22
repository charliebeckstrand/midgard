# Kata 型: Form

> **Scope:** per-unit recipes. One file per unit: usually `src/components/<name>/`, sometimes `src/primitives/<name>/` when the primitive needs its own recipe surface. A layout takes `<name>-layout.ts`, so `sidebar-layout.ts` and the Sidebar component's `sidebar.ts` do not collide.

## 1. Boundary

`kata/` is internal: it is omitted from `package.json` `exports` and not re-exported from `src/recipes/index.ts`. **Kata is the only recipe funnel for consumers**: each value that a component or a primitive reads from the design system flows through its kata. A kata reads kiso through its barrel, and it reads its group from kumi. Consumers reach kata via relative path: `from '../../recipes/kata/<name>'`. Sideways composition between kata is forbidden. Shared concerns promote by role: shared *tokens* to a kiso family, and shared *structure* to a kumi group. `recipe-boundary.test.ts` pins the `exports` omission and the types-only barrel. The `no-value-import-from-recipes-barrel` and `no-value-import-from-sibling-kata` Biome plugins pin the kata funnel and the ban on value imports between kata. A type-only import between kata carries no value, so it is allowed; `status.ts` takes its dot variants from `swatch.ts` that way. `chart.ts` and `map.ts` share their palette, inks, and motion through the kiso [`zu`](../kiso/README.md#3-families) family. The full list of boundary tests and lint rules lives in [`../README.md`](../README.md#3-boundary).

The three ways a kata builds a unit (a unit that extends a [`kumi`](../kumi/README.md) group, a unit with no group, or `defineRecipe` directly) are in [`../README.md`](../README.md#2-direction). Each of them composes the tokens of [`kiso/`](../kiso/README.md).

When a component and primitive share the same UI surface (e.g. `components/popover/` and `primitives/popover/PopoverPanel`), one kata serves both: `kata/popover.ts` is one unit, and both consumers read its slots (`base`, `trigger`, `portal`, `content`, `body`).

## 2. Shape

Each kata exports its runtime surface as `k`, and its `scale` when it has one. The shape `k` takes depends on how the kata reaches the recipe layer:

- **Recipe-shaped kata** (`k = defineRecipe(...)`): `k` is a `defineRecipe(...)` callable, used as `k({ variant, size, … })`. Slots and sibling sub-recipes attach as direct properties (`k.title`, `k.thumb`) via the `defineRecipe(config, extras)` form. A density-native kata has no size axis: its stepped classes take the step of the nearest density scope.
- **Unit kata** (`k = defineKata(config, extras)`): one unit holds each part of the component as a slot. The config is the recipe of the root slot `base`: its classes, its axes, its `palette`, and its `compound` rules. `slots` holds the child slots, and a child slot with no axes can be only its classes. Each slot declares only the axes that change it. The slots share one set of props, and `defaults` holds the default of each prop once. A call returns the class string of each slot, so a component reads `k({ orientation }).list`. A unit that `extends` a group of [`kumi`](../kumi/README.md) gets the slots, axes, defaults, and extras of the group, and adds its own. A slot that changes at a viewport breakpoint declares that axis under `responsive`. The prop then takes a value or a map of values by breakpoint (`Responsive<T>`), and the slot takes the classes of each value behind the prefix of its breakpoint. Below the first breakpoint of a map, the `initial` value holds, or the default of the axis when the map names no `initial` value. A compound rule can read a responsive axis. At each breakpoint that a map names, the rule applies behind the prefix of that breakpoint when each of its conditions holds for the values there. This is the target shape of each kata. The `bare` output of a unit has each slot empty: `useSlots(k, props)` gives it under `HeadlessProvider`, so a component does not read the headless flag for its classes.
- **Object-literal kata** (`k = { … }`): `k` is a plain object. Used when the component has no top-level variants axis but still needs a curated surface (slot fragments, sub-recipes, motion configs, skeleton data). Recipes for individual slots are inner `defineRecipe(...)` callables: `k.button({ size })`, `k.panel({ surface })`.

Type exports sit alongside, derived from the concrete result: `type FooVariants = VariantProps<typeof k>` (or `VariantProps<typeof k.button>`). 
`VariantProps` maps the axes of the recipe, so no declaration holds the TSDoc of an axis. When the recipe or its group sets a default for an axis, the type declares that axis again. The new declaration has a description and a `@defaultValue` tag that equals the default. It keeps the type of the recipe:

```ts
export type InputVariants = Omit<VariantProps<typeof k>, 'variant'> & {
	/** The surface of the control: `default` fills it, and `outline` draws a border with no fill. @defaultValue 'default' */
	variant?: VariantProps<typeof k>['variant']
}
```

The docs read the tag, so each component that uses the type shows the default. A component that applies a different default declares the axis again with its own tag, as `CommandPalette` does for `width`. `default-value-boundary.test.ts` compares the tags with `recipe.config.defaults`. It fails when a defaulted axis has no tag, when a tag and its default are different, or when an axis with no default has a tag.

The same rule applies to the props of each public component. Each default that a user of the component gets is a `@defaultValue` tag on the declaration of the prop. The gate reads the components through the TS 7 checker and fails on these conditions:

- A destructured default (`{ size = 'md' }` in the parameter, or `const { size = 'md' } = props` in the body) does not have one tag that equals it. A constant with a primitive value reads as that value. Another name reads as the name or as `{@link name}`.
- A fallback on an optional prop with no destructured default (`ariaLabel ?? 'Rating'`, or `props.format ?? 'hex'`) does not have one tag that equals it. The fallback must be a literal or a `const` at the top level of a module. The result of the `??` must be the value of the prop at that place: a JSX attribute or child, a property, or a variable. A fallback in a call argument, in a destructure, or in the fallback of another `??` is a default of that computation.
- A prop that the component gives unset to a recipe axis with a default does not have one tag that equals the recipe default. This rule also reads the recipes that no exported type reaches.
- The TSDoc of the component has a `@defaultValue` tag. Put the tag on the prop.

The gate does not read the `data-*` props, because the docs do not show them. It reads only the body of the component. Thus it does not read the tag of a default that a hook or a factory applies. Examples are the `aspectRatio` of the cartesian charts and the `size` of a sized `createSkeleton` component. An optional flag that is off when it is unset has the tag `false`. The gate does not read these flags.

When a component would read kiso tokens directly (`kokkaku.<name>` for skeletons, `ugoki.<thing>` for motion, the popover bundle for popover content), the kata re-exposes them as `k.skeleton`, `k.motion`, `k.content`. The component imports only its kata; the reach into kiso and kumi stops there.

Filenames are `<name>.ts`, matching the component folder.

## 3. Families

A family of units that share a structure extends one group. The framed controls extend `control`, `input`, `list`, or `picker` from [`kumi/control`](../kumi/README.md). The check controls, the sliders, the modal panels, and the rows of a list each have a group too. The [kumi groups table](../kumi/README.md#3-groups) lists each group and its units.

## 4. Rules

- **Compose, don't redefine.** A kata that reinvents a group of kumi or a token of kiso is a defect. Fold it into the existing module.
- **No sideways imports.** Kata never import values from sibling kata. A type-only import is allowed (§1). Shared concerns promote by role: shared *tokens* to a kiso family, and shared *structure* to a kumi group. `import { k as <name> }` in a component is a signal that the structure belongs in a group.
- **Variants earn their axis.** Add a variant axis when ≥2 components or call sites need it. Single-use variants stay inline.
- **Keys by part.** Name each key of `k` by the rules in [`../README.md`](../README.md#4-key-names): one word for each key, and a part with children is an object whose own classes are `base`.
- **Header when non-obvious.** Open a kata with a summary doccomment only when its structure isn't self-evident from the body: it serves more than one unit, sources a non-standard token (inline `mode()` colors rather than an `iro` palette), extends a group or composes another recipe, or groups slots non-trivially. A canonical recipe-shaped matrix (`variant × color × size`) needs none; the header is the signal that something here is worth reading first.

---

**See also:** [`../README.md`](../README.md), [`../../../REFERENCE.md`](../../../REFERENCE.md).
