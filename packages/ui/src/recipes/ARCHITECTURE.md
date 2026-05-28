# Recipes Architecture

Three layers. No more.

```
kiso/      foundational utility-class recipes
katakana/  applicator wiring (no utility classes)
kata/      per-component maps
```

The old `genkei/` namespace is gone. If kiso is exhaustive — every Tailwind
utility fragment lives behind a named recipe — there is nothing left for
genkei to hold.

## Roles

### kiso 基礎 — foundation

Every named utility-class recipe in the design system. Two kinds live here.
The path makes which kind explicit:

- **Atomic concerns** — one axis per module, file-per-concern.
  `iro` (colour), `ji` (typography), `ma` (spacing), `sun` (density steps),
  `shaku` (dimensions), `sen` (lines), `hannou` (interaction states),
  `tsunagi` (group joins), `ugoki` (motion).
- **Composed concerns** — sub-folder per concern when an axis splits into
  multiple coherent files. `kasane/` (layered chrome + ring-compensated
  spacing helpers), `narabi/` (slot adjacency + flex primitives),
  `omote/` (surface fills + glass).
- **Archetypes** — sub-folder per shared shape that ≥2 kata compose from.
  `control/` (the framed user-input chrome), `popover/` (floating overlay),
  `segment/` (segmented control), `panel/` (panel slot bundle),
  `slider/` (slider colour table).

Archetypes are kiso, not a separate layer. They are still
*utility-class recipes* — they emit class fragments, not `defineRecipe()`
results. The recipe engine is invoked one layer up (katakana, or kata for
non-archetype components).

`defineRecipe()` is never called inside kiso.

### katakana 片仮名 — applicator

Function-shaped wrappers around the recipe engine. Each applicator takes
an archetype's standard pieces from kiso, accepts a kata's per-call
overlay, and returns the `k` surface the kata exports.

**Wiring only.** A katakana file imports kiso recipes by name and feeds
them to `defineApplicator(...)` or `defineRecipe(...)`. It never inlines
a literal Tailwind class string. If a fragment is needed, it lives in
kiso under a name; the applicator references it by name.

Enforced by `__tests__/recipes/boundary/katakana-purity-boundary.test.ts`.

### kata 型 — form

One file per unit. The single funnel that components and primitives
import from. Each kata exports `k`, the recipe surface the component reads.

A kata composes recipes through one of three paths:

1. **Through a katakana applicator** when the kata matches an archetype
   shape (input, textarea, checkbox, dialog, …). The applicator owns the
   variant axes and standard slot wiring.
2. **Through `defineRecipe` directly** when the kata doesn't fit any
   archetype (button, alert, card, code, …).
3. **Through `kiso/<archetype>/*` directly** when the kata needs a
   *subset* of an archetype's fragments (combobox / listbox / date-picker
   take control's `input` / `density` / `size` without the full chrome;
   slider / slider-range share the slider colour table).

Skeleton dimensions and motion configs flow into the kata's `k.skeleton`
and `k.motion` slots — components read everything from `k`, never from
kiso directly.

## Reach patterns

```
component ──▶ kata ──▶ katakana ──▶ kiso
                  │
                  ├──▶ kiso/<archetype>/* (subset reach)
                  │
                  └──▶ defineRecipe + kiso (non-archetype)
```

- Components and primitives reach only kata (`from '../../recipes/kata/<name>'`).
- Kata reach kiso freely. Kata reach katakana for archetype membership.
- Katakana reaches kiso only. No literal classes, no sideways katakana
  imports.
- Kiso composes sibling kiso downward. No upward reaches.

The barrel `recipes/index.ts` is types-only — `Color`, `Ji`, `Ma`, `Step`,
`SunStep`, `GroupOrientation`, `GroupPosition`. No runtime value passes
through.

## Boundaries

Pinned by tests under `__tests__/`:

| Test | Pins |
| ---- | ---- |
| `recipes/boundary/recipe-boundary.test.ts` | Barrel is types-only; `package.json` `exports` excludes `./recipes`. |
| `recipes/boundary/kiso-boundary.test.ts` | kiso never reaches upward into katakana, kata, components, primitives, layouts, hooks, providers. |
| `recipes/boundary/kata-boundary.test.ts` | `defineRecipe` invoked only in `recipes/kata/*`, `recipes/katakana/*`, and `layouts/*/variants.ts`. |
| `recipes/boundary/katakana-purity-boundary.test.ts` | katakana files contain no literal Tailwind class strings. |
| `recipes/boundary/spacing-boundary.test.ts` | Raw `calc(--spacing(...))` confined to kasane and an allowlist. |
| `recipes/boundary/affix-compensation-boundary.test.ts` | Affix padding compensation formula across density steps. |
| `components/boundary/component-recipe-boundary.test.ts` | Components import recipe values only via `recipes/kata/<name>`. |
| `primitives/boundary/primitive-recipe-boundary.test.ts` | Primitives import recipe values only via `recipes/kata/<name>`. |
| `hooks/boundary/hook-purity-boundary.test.ts` | Top-level hooks never reach recipe internals. |

## Rules

- **One concern per kiso module.** A new fragment that crosses axes splits
  rather than overloads an existing module.
- **Composites are kata-shaped.** A "fragment" that reads three or more
  sibling kiso modules is a kata, not a kiso atom. Move it.
- **Archetypes are earned.** Two consumers, or the fragment doesn't get
  an archetype sub-folder. Single-use stays inline in the kata.
- **Katakana wires; it does not compose.** Every value in a katakana
  config is a kiso identifier. No literals.
- **No sideways imports** between katakana files. Between kata files.
  Between archetypes. Shared concerns promote.
- **Compose, don't fork.** A kata or archetype that re-derives a token
  already in a kiso atom is a defect — fold it back to source.

## What moved

The redesign collapsed the prior four-layer model
(`kiso` / `genkei` / `katakana` / `kata`) into three. Mappings:

- `genkei/control.ts` → `kiso/control/{frame, surface, input, density, size, affix, resets, check}.ts`
- `genkei/popover.ts` → `kiso/popover/{trigger, portal, panel}.ts`
- `genkei/segment.ts` → `kiso/segment/{control, item, indicator}.ts`
- `genkei/slider.ts` → `kiso/slider/color.ts`
- `omote.panel` + `narabi.panel` → `kiso/panel/{surface, layout}.ts`
- `kasane.ts` → `kasane/{layers, padding, radius, gap}.ts`
- `omote.ts` archetype chromes → respective `kiso/<archetype>/` sub-folders
- `hannou.item` / `hannou.nav` → owning kata (`menu`, `nav`)
- `kokkaku.ts` → per-kata `k.skeleton`
- `ma` raw numerals → `ma.{p,m,gap}` full-utility maps
