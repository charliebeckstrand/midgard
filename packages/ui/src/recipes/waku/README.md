# Waku (枠) — Frames

Compound chrome shared by ≥2 components. Each module here is a multi-element
or multi-state archetype that several kata depend on.

## Wire format

Every waku export is a class fragment (`string[]`) or a map of fragments
(`Record<string, string[]>`). **`tv()` is never invoked inside waku** — it is
called only at the kata public surface, where the variants axis is declared.

Why this matters: a single wire format means any kata can compose any waku
export without translating between fragment-arrays and `tv()`-callables. The
panel family preserves `VariantProps<typeof X>` inference via the
`definePanelRecipe` factory — callers pass their own `tv()` results in as
generics, and the factory forwards them unchanged while emitting fragments
for the zero-variant slots.

## Modules

| Module    | Concern                                                 | Consumers |
| --------- | ------------------------------------------------------- | --------- |
| `kasane`  | The signature 4-layer chrome (inset / hover / focus / validation rings) | Used internally by `waku/control`; available to any kata that wants the layered overlay. |
| `control` | Field archetype: frame + surface + field reset + size + icon + affix + resets + check. Composes `kasane` for the chrome. | `input`, `textarea`, `listbox`, `combobox`, `datepicker`, `checkbox`, `radio`, `switch`, `ControlFrame` |
| `panel`   | Floating panel archetype: a `definePanelRecipe` factory that builds the title/description/header/body/actions/close slot recipes around the caller's `panel` (and optional `backdrop`) tv() recipes. Backed by `narabi.panel`. | `dialog`, `drawer`, `sheet`, `inspector` |
| `popover` | Floating overlay archetype: shared `trigger` / `portal` / `panel` class fragments for any component that pops a floating panel anchored to a trigger. | `popover`, `combobox`, `listbox`, `date-picker`, `primitives/popover` |

## kasane (重ね) — the named signature primitive

Most libraries build a single ring around a control and swap its colour for
focus / validation. kasane uses a four-layer stack on a single element so the
states compose without conflict:

1. **Outer ring** (`kasane.base` — a solid `ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700`) — the resting border. Hard-coded rather than composed from `sen.ringInset` so adjacent rings in a group can overlap by 1 px without alpha-stacking into a darker join.
2. **`::before` inset fill** — paints the surface 1 px inside the outer ring.
3. **`::after` overlay** — invisible at rest; gains a 2 px ring on focus
   (`focus-within` / `data-open`).
4. **Validation overlay** — `data-invalid` / `data-warning` / `data-valid`
   recolour both the outer ring and the `::after` overlay, taking precedence
   over the focus colour.

The whole stack is `kasane.all`. Individual layers are exported as
`kasane.{base,inset,overlay,hover,focus,validation,disabled}` so a custom
field can opt into a subset (e.g. focus + validation without disabled).

The concentric `outer = inner + padding` formula and `kasane`'s layered
chrome are the two named identity elements of this library — together they
make components feel coherent without resorting to a heavyweight component
shell.
