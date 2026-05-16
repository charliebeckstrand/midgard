# Kata 型 - Forms

Per-component recipes. One file per `src/components/<name>/`.

## Boundary

`kata/` is internal — omitted from `package.json` `exports` and not
re-exported from `src/recipes/index.ts`. Components consume kata via
relative path: `from '../../recipes/kata/<name>'`. A kata composes
freely from `ryu/` and `waku/`; sideways composition between kata is
forbidden — shared concerns are promoted to `waku/` instead. The
contract is pinned by
`src/__tests__/recipes/internal-boundary.test.ts`.

## Shape

Every kata file ends in one of two exports:

- A `tv()` call producing a variants-aware recipe. The kata's
  `defaultVariants` resolves `size` from any enclosing concentric
  context.
- A plain slots object — `{ root: '...', label: '...', … }` — when the
  component has no variants.

Filenames are `<name>.ts`, matching the component folder name.

## Families

Several kata share archetypes that live in `waku/` rather than being
duplicated.

| Family  | Members                                                                                                  | Archetype                                                                                              |
| ------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Control | `input`, `textarea`, `listbox`, `combobox`, `date-picker`, `checkbox`, `radio`, `switch`, `ControlFrame` | `waku/control` — frame, surface, field reset, size, icon, affix, resets, check.                        |
| Panel   | `dialog`, `drawer`, `sheet`, `inspector`                                                                 | `waku/panel` — title / description / header / body / actions / close slots via `definePanelRecipe`.    |
| Popover | `popover`, `combobox`, `listbox`, `date-picker`                                                          | `waku/popover` — trigger / portal / panel for floating overlays anchored to a trigger.                 |
| Option  | `combobox`, `listbox`, `select`                                                                          | `waku/option` — base / size / content / label / description for select rows.                           |

See [waku/README.md](../waku/README.md) for each archetype's wire
format and slot inventory.

## Rules

- **Compose, don't redefine.** A kata that reinvents a recipe already
  in `ryu/` or `waku/` is a defect — fold it into the existing module.
- **No sideways imports.** If two kata need the same fragment, promote
  the shared concern to `waku/`.
- **Variants earn their axis.** Add a variant axis when ≥2 components
  or call sites need it. Single-use variants stay inline.
