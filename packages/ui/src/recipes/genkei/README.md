# Genkei 原型 - Archetypes

The raw class-fragment data layer for archetypes consumed by ≥2
applicators or kata.

## Boundary

`genkei/` is internal — omitted from `package.json` `exports` and
not re-exported from `src/recipes/index.ts`. Two reach patterns are
sanctioned:

- **Katakana applicators** (the common path) — each katakana entry
  imports its archetype's fragments from a same-named genkei
  (`katakana/control` reads `genkei/control`, `katakana/popover` reads
  `genkei/popover`, …) and wraps them in a callable applicator
  function.
- **Kata that need a fragment subset** (the escape hatch) — combobox,
  listbox, date-picker, select read `genkei/control` directly for the
  input / density / size fragments without taking the full control
  chrome. Slider and slider-range read `genkei/slider` directly for
  the colour CSS-variable bundle.

A genkei composes [`kiso/`](../kiso/README.md) and sibling genkei
freely, and imports the recipe engine directly from
[`core/recipe`](../../core/recipe). Genkei never reach upward into
katakana, kata, components, primitives, layouts, hooks, or providers —
upward reaches invert the dependency direction and would create a
cycle with katakana. The contract is pinned by
`src/__tests__/recipes/boundary/genkei-boundary.test.ts`,
`src/__tests__/components/boundary/component-recipe-boundary.test.ts`,
and `src/__tests__/primitives/boundary/primitive-recipe-boundary.test.ts`.

## Shape

Genkei export their surface under a descriptive named binding —
`control`, `popover`, `segment`, `slider` — matching the file name.
Applicators and kata import each genkei directly:

    import { control } from '../genkei/control'
    import { popover } from '../genkei/popover'

    const { input, density, size, surface, affix } = control
    const { trigger, portal, panel } = popover

This mirrors how kata's single `k` export works for components and
primitives (1:1, so a single name is enough) and acknowledges that
genkei is the many-to-many sharing layer.

## Wire format

Every value on a genkei export is a class fragment (`string[]`) or a
map of fragments (`Record<string, string[]>`). **`defineRecipe()` is
never invoked inside genkei** — it is called only at the katakana
applicator layer or at the kata public surface, where the variants
axis is declared.

A single wire format lets any applicator or kata compose any genkei
export with no translation between fragment-arrays and
`defineRecipe()`-callables.

Filenames are `<name>.ts`, matching the module's named export.

## Modules

| Module    | Concern                                                                                                                                                                                                                                | Consumers                                                                                                 |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `control` | Field archetype: frame + surface + input + density + size + affix + resets + check. Composes `kasane` (kiso) for the chrome.                                                                                                          | `katakana/control`, `katakana/check`; `kata/combobox`, `kata/listbox`, `kata/date-picker`, `kata/select`, `kata/control`, `kata/switch` (subset reaches). |
| `popover` | Floating overlay archetype — shared `trigger` / `portal` / `panel` fragments plus motion / surface / glass / ring class fragments for any kata that pops a floating panel anchored to a trigger.                                       | `katakana/popover`; `kata/combobox`, `kata/listbox`, `kata/date-picker` (subset reaches).                |
| `segment` | Segmented-control archetype — `control` / `item` size maps plus `indicator` colour fragments shared by the standalone `<Segment>` and `<Tabs variant="segment">`.                                                                      | `katakana/segment`.                                                                                       |
| `slider`  | Slider palette — the `--slider-fill` / `--slider-track` CSS-variable bundle per colour. Promoted because both kata read the same variables despite painting through different selector surfaces (native pseudo vs custom DOM).         | `kata/slider`, `kata/slider-range`.                                                                       |

The signature 4-layer chrome `kasane` lives in [`kiso/`](../kiso/README.md)
— it's a flat fragment map with no archetype logic, so it sits with the
other substrate primitives (`omote`, `sen`) rather than here.

## Rules

- **Two consumers, or it doesn't belong here.** A fragment with one
  applicator or kata consumer stays inline. Promotion is earned by
  duplication.
- **No `defineRecipe()`.** Genkei emits class fragments and fragment
  maps; the variants axis is declared at the katakana applicator layer
  or at the kata surface.
- **Compose, don't fork.** A genkei that re-derives a token already
  in [`kiso/`](../kiso/README.md) is a defect; fold the duplication
  back into kiso.
- **No upward reaches.** Genkei composes downward only (kiso, sibling
  genkei). Reaching into katakana or kata would create a cycle with
  the applicators that import from here.
