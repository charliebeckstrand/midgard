# Kata 型 - Forms

One file per unit — usually `src/components/<name>/`, sometimes
`src/primitives/<name>/` when the primitive needs its own recipe surface.

## Boundary

`kata/` is internal — omitted from `package.json` `exports` and not
re-exported from `src/recipes/index.ts`. **Kata is the only recipe
funnel for consumers**: every value a component or primitive reads
from the design system flows through its kata. Consumers reach kata
via relative path: `from '../../recipes/kata/<name>'`. A kata composes
freely from the substrate ([`kiso/`](../kiso/README.md)) and
[`genkei/`](../genkei/README.md), and imports the recipe engine
directly from [`core/recipe`](../../core/recipe). Sideways composition
between kata is forbidden — shared concerns promote to `genkei/`
instead. The contract is pinned by
`src/__tests__/recipes/boundary/recipe-boundary.test.ts`,
`src/__tests__/components/boundary/component-recipe-boundary.test.ts`,
and
`src/__tests__/primitives/boundary/primitive-recipe-boundary.test.ts`.

When a component and primitive share the same UI surface (e.g.
`components/popover/` and `primitives/popover/PopoverPanel`), one
kata serves both — `kata/popover.ts` exposes flat slots
(`k.trigger`, `k.portal`, `k.text`, `k.panel`) that both consumers
read.

## Shape

Every kata exports exactly one runtime value, `k`. The shape `k` takes
depends on whether the component has a variants axis:

- **Recipe-shaped kata** — `k` is a `defineRecipe(...)` callable, used
  as `k({ variant, size, … })`. Slots and sibling sub-recipes attach
  as direct properties (`k.title`, `k.thumb`) via the
  `defineRecipe(config, extras)` form. Default size resolves from any
  enclosing Density context.
- **Object-literal kata** — `k` is a plain object. Used when the
  component has no top-level variants axis but still needs a curated
  surface (slot fragments, sub-recipes, motion configs, skeleton
  data). Recipes for individual slots are inner `defineRecipe(...)`
  callables: `k.button({ size })`, `k.panel({ surface })`.

Type exports sit alongside (`type FooVariants = VariantPropsOf<typeof
k>` or `VariantPropsOf<typeof k.button>`).

When a component reads kiso fragments directly (a skeleton-using file
reading `kokkaku.<name>`, a motion-using file reading `ugoki.<thing>`,
a popover-content-shape file reading the genkei `popover` slots), the
kata absorbs those reads through `k` — `k.skeleton`, `k.motion`,
`k.content` are the established slot names. The component imports
only its kata; the kiso / genkei reach stops at the kata file.

Filenames are `<name>.ts`, matching the component folder.

## Families

Several kata share archetypes that live in `genkei/` rather than being
duplicated.

| Family  | Members                                                                                                  | Archetype                                                                                                                            |
| ------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Control | `input`, `textarea`, `listbox`, `combobox`, `date-picker`, `checkbox`, `radio`, `switch`, `control`      | `genkei/control` — frame · surface · input · density · size · affix · resets · check.                                                |
| Panel   | `dialog`, `drawer`, `sheet`                                                                              | `genkei/panel` — `definePanelRecipe` factory builds title / description / header / body / actions / close slots from `narabi.panel`. |
| Popover | `popover`, `combobox`, `listbox`, `date-picker`                                                          | `genkei/popover` — trigger / portal positioning + panel slot bundle (base, surface, glass, ring, motion).                            |
| Segment | `segment`, `tabs`                                                                                        | `genkei/segment` — control / item size maps + indicator colour fragments.                                                            |
| Slider  | `slider`, `slider-range`                                                                                 | `genkei/slider` — `--slider-fill` / `--slider-track` CSS-variable bundle per colour.                                                 |

See [genkei/README.md](../genkei/README.md) for each archetype's wire
format and slot inventory.

## Rules

- **Compose, don't redefine.** A kata that reinvents a recipe already
  in the substrate or `genkei/` is a defect — fold it into the existing
  module.
- **No sideways imports.** Kata never import from sibling kata.
  Shared fragments promote to `genkei/` (≥2 kata) or `kiso/`. When a
  component renders as two kata (Tab is both `tab` and `segment`),
  the archetype promotes to genkei and both kata import from it —
  the component still reads from a single `k`. `import { k as <name> }`
  in a component is a signal the archetype belongs in `genkei/`.
- **Variants earn their axis.** Add a variant axis when ≥2 components
  or call sites need it. Single-use variants stay inline.
