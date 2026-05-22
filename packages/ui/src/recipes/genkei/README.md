# Genkei 原型 - Archetypes

Multi-element, multi-state archetypes shared by ≥2 kata.

## Boundary

`genkei/` is internal — omitted from `package.json` `exports` and
not re-exported from `src/recipes/index.ts`. **Genkei is strictly
the cross-kata sharing layer**: a genkei exists only when ≥2 kata
read the same archetype. Kata consume genkei via relative path:
`from '../genkei/<name>'`. A genkei composes
[`kiso/`](../kiso/README.md) and sibling genkei freely, and imports
the recipe engine directly from [`core/recipe`](../../core/recipe).
Sideways composition between [`kata/`](../kata/README.md) is
forbidden — shared concerns promote here instead. Genkei never reach
upward into components, primitives, layouts, hooks, or providers.

Primitives do not consume genkei. They consume their own kata —
the same funnel components use. A primitive that needs a single
kiso fragment is served by a kata that wraps that fragment; a
primitive that needs a shared archetype reads the archetype through
its kata, which imports the genkei. The recipe flow is linear:

    kiso → genkei → kata → consumer (component or primitive)

The contract is pinned by
`src/__tests__/recipes/boundary/genkei-boundary.test.ts`,
`src/__tests__/components/boundary/component-recipe-boundary.test.ts`,
and
`src/__tests__/primitives/boundary/primitive-recipe-boundary.test.ts`.

## Shape

Genkei export their surface under a descriptive named binding —
`control`, `popover`, `segment`, `slider`, `kasane` — matching the
file name. Kata are routinely multi-genkei (combobox reads both
control and popover, for instance), so a uniform `g` export would
force `g as <name>` aliasing at every multi-import site. Descriptive
names let kata import each genkei directly:

    import { control } from '../genkei/control'
    import { popover } from '../genkei/popover'

    const { field, density, size } = control
    const { trigger, portal, panel } = popover

This mirrors how kata's single `k` export works for components and
primitives (1:1, so a single name is enough) and acknowledges that
genkei is the many-to-many sharing layer.

## Wire format

Every value on a genkei export is a class fragment (`string[]`) or a
map of fragments (`Record<string, string[]>`). **`defineRecipe()` is
never invoked inside genkei** — it is called only at the kata public
surface, where the variants axis is declared.

A single wire format lets any kata compose any genkei export with no
translation between fragment-arrays and `defineRecipe()`-callables.

Filenames are `<name>.ts`, matching the module's named export.

## Modules

| Module    | Concern                                                                                                                                                                                                                                | Consumers                                                                                                 |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `control` | Field archetype: frame + surface + field reset + size + icon + affix + resets + check. Composes `kasane` for the chrome.                                                                                                               | `input`, `textarea`, `listbox`, `combobox`, `date-picker`, `checkbox`, `radio`, `switch`, `control` (ControlFrame primitive). |
| `kasane`  | The signature 4-layer chrome (inset / hover / focus / validation rings).                                                                                                                                                               | `genkei/control` (internal).                                                                                |
| `popover` | Floating overlay archetype — shared `trigger` / `portal` / `panel` fragments plus motion / surface / glass / ring class fragments for any kata that pops a floating panel anchored to a trigger.                                       | `popover`, `combobox`, `listbox`, `date-picker`.                                                          |
| `segment` | Segmented-control archetype — `control` / `item` size maps plus `indicator` colour fragments shared by the standalone `<Segment>` and `<Tabs variant="segment">`.                                                                      | `segment`, `tabs`.                                                                                        |
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
  kata consumer stays inline. Promotion is earned by duplication
  across ≥2 kata. A primitive that needs styling is served by its
  own kata, not a single-consumer genkei.
- **No `defineRecipe()`.** Genkei emits class fragments and fragment
  maps; the variants axis is declared at the kata surface.
- **Compose, don't fork.** A genkei that re-derives a token already
  in [`kiso/`](../kiso/README.md) is a defect; fold the duplication
  back into kiso.
