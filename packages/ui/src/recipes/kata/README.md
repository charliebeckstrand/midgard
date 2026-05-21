# Kata 型 - Forms

Per-component recipes. One file per `src/components/<name>/`.

## Boundary

`kata/` is internal — omitted from `package.json` `exports` and not
re-exported from `src/recipes/index.ts`. Components consume kata via
relative path: `from '../../recipes/kata/<name>'`. A kata composes
freely from the substrate ([`kiso/`](../kiso/README.md)) and
[`genkei/`](../genkei/README.md); sideways composition between kata
is forbidden — shared concerns promote to `genkei/` instead. The
contract is pinned by
`src/__tests__/recipes/boundary/recipe-boundary.test.ts`.

## Shape

Every kata exports the recipe as `k`, built via `defineRecipe(...)`.
The kata's `defaults` resolves `size` from any enclosing Density
context. Slots declared in the `slots:` field attach to the recipe as
direct properties — consumers reach them as `k.title`.

Sub-recipes that aren't the primary entry get named exports alongside
`k` (`item`, `bubble`, `track`, …). Plain-data kata without variants
export `k` as an object literal.

Filenames are `<name>.ts`, matching the component folder.

## Families

Several kata share archetypes that live in `genkei/` rather than being
duplicated.

| Family  | Members                                                                                                  | Archetype                                                                                              |
| ------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Control | `input`, `textarea`, `listbox`, `combobox`, `date-picker`, `checkbox`, `radio`, `switch`, `ControlFrame` | `genkei/control` — frame, surface, field reset, size, icon, affix, resets, check.                        |
| Option  | `combobox`, `listbox`, `select`                                                                          | `genkei/option` — base / size / content / label / description for select rows.                           |
| Panel   | `dialog`, `drawer`, `sheet`, `inspector`                                                                 | `genkei/panel` — title / description / header / body / actions / close slots via `definePanelRecipe`.    |
| Popover | `popover`, `combobox`, `listbox`, `date-picker`                                                          | `genkei/popover` — trigger / portal / panel for floating overlays anchored to a trigger.                 |

See [genkei/README.md](../genkei/README.md) for each archetype's wire
format and slot inventory.

## Rules

- **Compose, don't redefine.** A kata that reinvents a recipe already
  in the substrate or `genkei/` is a defect — fold it into the existing
  module.
- **No sideways imports.** If two kata need the same fragment, promote
  the shared concern to `genkei/`.
- **Variants earn their axis.** Add a variant axis when ≥2 components
  or call sites need it. Single-use variants stay inline.
