# Recipes

Design-token recipes for the UI package. Each recipe captures one design
concern as reusable Tailwind class fragments. Components compose recipes;
they don't reinvent them.

## Naming

Recipes use Japanese names. The point is that each name covers exactly one
concern — `iro` is colour, `ji` is typography, `ma` is spacing, and so on —
so that consumers don't have to ask "where do I look for this?".

## Tier system

Recipes are organised into four tiers. **A recipe can only import from the
tiers below it.** This keeps the dependency graph one-directional and
prevents the cross-cutting tangles that earlier iterations grew.

### Tier 1 — Atomic tokens

Pure, self-contained design tokens. No cross-recipe imports.

| Recipe | Concern |
| ------ | ------- |
| `iro`     | colour (text, border, background) |
| `ji`      | typography (size, weight, leading) |
| `ma`      | spacing scale |
| `maru`    | radius |
| `sen`     | lines (borders, rings, dividers, focus rings, forced-colors) |
| `take`    | sizing (icon, panel, control) |
| `kumi`    | layout primitives (flex direction / align / justify / gap) |

### Tier 2 — Behaviours

Compose Tier 1 tokens into reusable behavioural fragments.

| Recipe | Concern |
| ------ | ------- |
| `sawari`  | interaction feedback (hover, press, selection, disabled, glass-item) |
| `ugoki`   | motion (CSS transitions + Framer Motion configs) |
| `narabi`  | list / item layout |

### Tier 3 — Surfaces

Higher-level surface chrome. May compose from Tier 1 + 2.

| Recipe | Concern |
| ------ | ------- |
| `omote`   | surfaces (panel backgrounds, blur, elevation) |
| `kokkaku` | skeletons (loading placeholders, per-component shapes) |

### Tier 4 — Components

Component-specific recipes live in `kata/`. They compose freely from
Tiers 1–3 but never sideways from each other except through shared
internal kata files (prefixed with `_`).

The control family (`input`, `textarea`, `listbox`, `combobox`,
`datepicker`, `checkbox`, `radio`, `switch`, and the `ControlFrame`
primitive) shares `kata/_control.ts` as the single source of truth for
frame, surface, field, size, icon, affix, resets, and check styles.

## Rules

- **No sideways imports inside a tier.** If two tier-1 recipes need the
  same value, the value belongs in one of them — pick the more obvious
  home and import from there.
- **No upward imports.** A tier-1 recipe may not import from tier 2; a
  tier-2 recipe may not import from tier 3; etc.
- **Extract on the second use site, not the first.** A duplicate fragment
  with two consumers earns a shared kata; with one, it stays inline.
- **A new shared concern = a new entry in an existing recipe.** Only add
  a brand-new recipe when the concern doesn't fit any existing one.
