# Waku 枠 - Frames

Multi-element, multi-state archetypes shared by ≥2 kata.

## Boundary

`waku/` is internal — omitted from `package.json` `exports` and not
re-exported from `src/recipes/index.ts`. Kata consume waku via relative
path. The contract is pinned by
`src/__tests__/recipes/internal-boundary.test.ts`.

## Wire format

Every waku export is a class fragment (`string[]`) or a map of
fragments (`Record<string, string[]>`). **`tv()` is never invoked
inside waku** — it is called only at the kata public surface, where
the variants axis is declared.

A single wire format means any kata can compose any waku export
without translating between fragment-arrays and `tv()`-callables. The
panel family preserves `VariantProps<typeof X>` inference via the
`definePanelRecipe` factory — callers pass their `tv()` results as
generics, and the factory forwards them unchanged while emitting
fragments for the zero-variant slots.

## Modules

| Module    | Concern                                                                                                                                                                                                                                | Consumers                                                                                                 |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `control` | Field archetype: frame + surface + field reset + size + icon + affix + resets + check. Composes `kasane` for the chrome.                                                                                                               | `input`, `textarea`, `listbox`, `combobox`, `date-picker`, `checkbox`, `radio`, `switch`, `ControlFrame`. |
| `kasane`  | The signature 4-layer chrome (inset / hover / focus / validation rings).                                                                                                                                                               | `waku/control`, and any kata that wants the layered overlay.                                              |
| `option`  | Option-row archetype — `base` (shared) + `size` map + `content` / `label` / `description` fragments for select-like rows.                                                                                                              | `primitives/option`, consumed by `combobox`, `listbox`, `select` via `createSelectOption`.                |
| `panel`   | Floating panel archetype — a `definePanelRecipe` factory that builds title / description / header / body / actions / close slot recipes around the caller's `panel` (and optional `backdrop`) `tv()` recipes. Backed by `narabi.panel`. | `dialog`, `drawer`, `sheet`, `inspector`.                                                                 |
| `popover` | Floating overlay archetype — shared `trigger` / `portal` / `panel` class fragments for any component that pops a floating panel anchored to a trigger.                                                                                 | `popover`, `combobox`, `listbox`, `date-picker`, `primitives/popover`.                                    |

## kasane (重ね) — the signature primitive

Most libraries build a single ring around a control and swap its
colour for focus and validation. `kasane` uses a four-layer stack on a
single element so the states compose without conflict:

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
   `data-valid` recolour both the outer ring and the `::after`
   overlay, taking precedence over the focus colour.

The whole stack is `kasane.all`. Individual layers are exported as
`kasane.{base,inset,overlay,hover,focus,validation,disabled}` so a
custom field can opt into a subset (e.g. focus + validation without
disabled).

`kasane`'s layered chrome is the named identity element of this
library — it makes components feel coherent without resorting to a
heavyweight component shell.
