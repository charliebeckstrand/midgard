# Recipes

> **Scope:** the design layer of the `ui` package. Data lives in Kiso (tokens), the shared structure of a family in Kumi (groups), and application in Kata (per-unit). All three layers are internal: `package.json` `exports` does not list `./recipes`, and the barrel re-exports types only.

## 1. Layers

| Layer | Role | What |
|---|---|---|
| [Kiso 基礎: Tokens](./kiso/README.md) | Data | The token families: `dan` · `hannou` · `iro` · `ji` · `kasane` · `kokkaku` · `narabi` · `omote` · `sen` · `shaku` · `sou` · `tsunagi` · `ugoki` · `zu`. Each family has a Japanese name, and each key under it has an English name. |
| [Kumi 組: Groups](./kumi/README.md) | Structure | The shared structure of a family of units: slots, axes, and defaults in the shape of a unit. A unit extends its group. Reads kiso and the recipe engine. |
| [Kata 型: Form](./kata/README.md) | Application | Per-unit recipes: the funnel for components and primitives. |

The recipe engine (`defineKata`, `defineGroup`, `definePalette`), the color axis (`colors`, `Color`), and the `mode` authoring helper live in [`core/recipe/`](../core/recipe). Files in `kumi` and `kata` import them directly.

## 2. Direction

Dependencies point one way: `kata → kumi → kiso`, and `kata → kiso`. A kata and a group read kiso through its barrel (`from '../kiso'`). Components and primitives funnel through their kata (`from '../../recipes/kata/<name>'`), so kata is the single curated surface for each unit.

A kata takes one of three forms:

- **A unit that extends a group** (`defineKata({ extends: <group>, … })`), when the kata is a member of a family, such as Input, Listbox, Checkbox, or Dialog. The unit gets each slot, axis, and default of the group, and adds its own.
- **A unit with no group** (`defineKata({ … })`), when the kata has slots or axes that no other kata shares, such as Button.
- **A sheet** (a plain object), when the kata has no axis: it holds only motion configs or skeleton data, or it is a sheet of class lists that many files read with no call, such as Chart, Map, and Grid. The kata composes kiso tokens itself.

The config of a unit is the recipe of its root slot, `base`. `slots` holds only the child slots, and a child slot with no axes can be only its classes:

```ts
import { narabi } from '../kiso'
import { input } from '../kumi/control'

const { flex } = narabi

export const k = defineKata({
  extends: input,
  slots: { field: [flex.row, 'text-start'] },
})
```

A child slot can hold child slots of its own under `slots` (§4 rule 2).

A unit has a `bare` output, in which each slot is `''`. A component resolves its slots with `useSlots(unit, props)`, which gives the bare output under `HeadlessProvider`.

## 3. Boundary

Cross-layer value imports are forbidden. The barrel `index.ts` re-exports foundational types only (`Color` and `Ma`), so consumers can derive prop unions without threading the type through their kata. No runtime value passes through the barrel.

These pin the contract:

- `__tests__/boundary/recipe-boundary.test.ts`: the barrel is types-only, and `package.json` `exports` never lists `./recipes`.
- `__tests__/boundary/kiso-families-boundary.test.ts`: the kiso barrel exports each family and no other value, and a kata or a group reads kiso through the barrel only.
- `biome.json`, the overrides of `components`, `structure`, `layouts`, `modules`, and `primitives`: a consumer imports no module of kumi or kiso, so each value arrives through its kata. The `hooks` override also keeps kata and kumi out of a hook.
- `biome.json`, the `recipes/kiso/**` override: kiso never reaches upward into kumi, kata, components, primitives, layouts, hooks, or providers.
- `biome.json`, the `recipes/kumi/**` override: kumi reads kiso and the recipe engine, and never reaches upward into kata, components, primitives, layouts, hooks, or providers.
- `check-types`: the `recipes` barrel exports types alone, so under `verbatimModuleSyntax` a value import from it does not compile. `core/recipe` does not export `defineRecipe`, so a kata builds each recipe as a unit with `defineKata`.
- `.biome/plugins/no-value-import-from-sibling-kata.grit`: a kata imports no value from a sibling kata.

## 4. Key names

The keys of a kata surface, a kiso family, and a group follow one pattern, so a reader finds a part by its scope. The rules:

1. **One word for each key.** A compound name nests under the part that it belongs to: `bar.rail`, not `barRail`.
2. **The part holds its children.** A part with children is an object, and its own classes are `base`: `bar: { base, rail }`. The root part of a kata is `base` too. In a `defineKata` unit, the config itself is the root slot `base`, and each other part is a key of `slots`. A slot with children holds them under its own `slots`: `slots: { chevron: { base, slots: { spacer } } }` gives `k().chevron.base` and `k().chevron.spacer`.
3. **One element, one key.** Keys that always go on the same element merge into one key. A key that adds to a part in some states only nests under that part: `trigger: { base, cursor }`.
4. **A config stays whole.** A motion config, a per-color record, and a step map are leaves. Do not put a child key in one.
5. **A kata exports `k`, its scale, and its types.** The scale is `scale`, or `scale.<part>` when the kata has two (`scale.bar`, `scale.gauge`).

In `dan`, a ramp nests under the unit that reads it, then the part or the side: `space.box.bottom`, `space.tab.vertical.x`, `size.menu.max`.

Two names keep their form. A key that names a component with a name of two words keeps the name of the component (`colorPanel`, `datePicker`). A key that mirrors a public prop or a library term keeps that name, such as the `stickyHeader` axis, which mirrors the prop of `SidebarLayout`.

## 5. Simplicity

These four rules apply to each layer. They keep a look short to read: each value has one name, and each slot reads in one file.

1. **One name for one value.** Give each value one name. An alias stays only when it ties two files together, such as a kata and its skeleton form, so that the two cannot drift apart.
2. **A token holds a choice.** A token holds a choice: a ramp, a light and dark pair, or a set of classes that go together. A token that only renames one Tailwind class adds a name and no choice. Write the class.
3. **A fragment lives with its readers.** A fragment that one kata reads stays in that kata. A fragment that two kata or more read goes in kiso, or in a kumi group when it builds a part. Today a density ramp is the exception: `size-scale-boundary.test.ts` keeps each ramp in `dan`.
4. **A state lives in the kata.** A component gives its kata each state as a prop or a data attribute. It does not pick classes by state in JSX.

---

**See also:** [`../../REFERENCE.md`](../../REFERENCE.md), [`../../README.md`](../../README.md).
