# Genkei 原型 - Archetypes

Multi-element, multi-state archetypes shared by ≥2 kata.

## Boundary

`genkei/` is internal — omitted from `package.json` `exports` and
not re-exported from `src/recipes/index.ts`. Kata consume genkei via
relative path: `from '../genkei/<name>'`. A genkei composes
[`kiso/`](../kiso/README.md) and sibling genkei freely; sideways
composition between [`kata/`](../kata/README.md) is forbidden and
shared concerns promote here instead. The contract is pinned by
`src/__tests__/recipes/boundary/genkei-boundary.test.ts`.

## Wire format

Every genkei export is a class fragment (`string[]`) or a map of
fragments (`Record<string, string[]>`). **`defineRecipe()` is never
invoked inside genkei** — it is called only at the kata public
surface, where the variants axis is declared.

A single wire format lets any kata compose any genkei export with no
translation between fragment-arrays and `defineRecipe()`-callables.
The panel family preserves `VariantProps<typeof X>` inference via
the `definePanelRecipe` factory: callers pass their `defineRecipe()`
results as generics, and the factory forwards them unchanged while
emitting fragments for the zero-variant slots.

Filenames are `<name>.ts`, matching the module's named export.

## Modules

| Module    | Concern                                                                                                                                                                                                                                | Consumers                                                                                                 |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `control` | Field archetype: frame + surface + field reset + size + icon + affix + resets + check. Composes `kasane` for the chrome.                                                                                                               | `input`, `textarea`, `listbox`, `combobox`, `date-picker`, `checkbox`, `radio`, `switch`, `ControlFrame`. |
| `kasane`  | The signature 4-layer chrome (inset / hover / focus / validation rings).                                                                                                                                                               | `genkei/control`, and any kata that wants the layered overlay.                                              |
| `option`  | Option-row archetype — `base` (shared) + `size` map + `content` / `label` / `description` fragments for select-like rows.                                                                                                              | `primitives/option`, consumed by `combobox`, `listbox`, `select` via `createSelectOption`.                |
| `panel`   | Floating panel archetype — a `definePanelRecipe` factory that builds title / description / header / body / actions / close slot recipes around the caller's `panel` (and optional `backdrop`) `defineRecipe()` recipes. Backed by `narabi.panel`. | `dialog`, `drawer`, `sheet`, `inspector`.                                                                 |
| `popover` | Floating overlay archetype — shared `trigger` / `portal` / `panel` class fragments for any component that pops a floating panel anchored to a trigger.                                                                                 | `popover`, `combobox`, `listbox`, `date-picker`, `primitives/popover`.                                    |
| `slider`  | Slider palette — the `--slider-fill` / `--slider-track` CSS-variable bundle per colour. Promoted because both kata read the same variables despite painting through different selector surfaces (native pseudo vs custom DOM).         | `slider`, `slider-range`.                                                                                 |

## kasane (重ね) — the signature primitive

Most ring chromes swap a single ring's colour to express focus and
validation. `kasane` stacks four layers on a single element so the
states compose without conflict:

1. **Outer ring** (`kasane.base` — a solid
   `ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700`) — the resting
   border. Hard-coded rather than composed from `sen.ringInset` so
   adjacent rings in a group can overlap by 1 px without
   alpha-stacking into a darker join.
2. **`::before` inset fill** — paints the surface 1 px inside the
   outer ring.
3. **`::after` overlay** — invisible at rest; gains a 2 px ring on
   focus (`focus-within` / `data-open`).
4. **Validation overlay** — `data-invalid` / `data-warning` /
   `data-valid` recolour the outer ring and the `::after` overlay,
   taking precedence over the focus colour.

The full stack is `kasane.all`. Individual layers are exported as
`kasane.{base,inset,overlay,hover,focus,validation,disabled}` so a
custom field can opt into a subset — focus + validation without
disabled, for example.

`kasane`'s layered chrome is the named identity of the library — it
gives components a coherent feel without a heavyweight component
shell.

## Rules

- **Two consumers, or it doesn't belong here.** A fragment with one
  kata consumer stays inline. Promotion is earned by duplication.
- **No `defineRecipe()`.** Genkei emits class fragments and fragment
  maps; the variants axis is declared at the kata surface.
- **Compose, don't fork.** A genkei that re-derives a token already
  in [`kiso/`](../kiso/README.md) is a defect; fold the duplication
  back into kiso.
