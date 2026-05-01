# Recipes

Design-token recipes for the UI package. Each recipe captures one design
concern as reusable Tailwind class fragments. Components compose recipes;
they don't reinvent them.

## Naming

Recipe-layer modules use Japanese names — each name covers exactly one
concern (`iro` is colour, `ji` is typography, `ma` is spacing, and so on)
so that consumers don't have to ask "where do I look for this?". This
naming rule is **internal-only**: client-facing components, hooks, and
props use English (`<Concentric>`, `useGroup`, `size`).

## Layout

```
recipes/
  ryu/    — currents: cross-cutting tokens and compounds
  kata/   — forms: per-component recipes
```

Future: `waku/` (frames) for the layered chrome primitives — promotion
of `kata/_control.ts` and `kata/_panel.ts` is in progress.

## Layer 1 — 流 (ryū) "Currents"

Cross-cutting design decisions. Each module either bundles 2+ co-occurring
properties or owns a single-axis scale that the rest of the system points
into. Lives in `ryu/`.

| Module | Concern |
| ------ | ------- |
| `sun`     | size system: text + leading, padding, gap, inner radius, icon — by step (sm/md/lg). The spine. |
| `iro`     | colour palettes (`palette.{solid,soft,outline,plain}`) plus semantic text/bg roles |
| `ji`      | typography (size+leading bundled, weight, tracking, family) |
| `omote`   | surface chromes (panel/popover/glass/backdrop bundles) |
| `sawari`  | interaction states (hover/press/disabled compounds with motion) |
| `ugoki`   | motion (CSS transitions + Framer Motion presets) |
| `kokkaku` | per-component skeleton placeholder shapes |
| `narabi`  | sibling/slot layout (panel slots, list items, toggle/group, field) |
| `tsunagi` | group join selectors (used by `<Group>`) |
| `maru`    | radius scale (substrate, used mainly via `sun`) |
| `ma`      | spacing scale (substrate) |
| `kumi`    | gap scale (substrate; direction/align/justify removed — use Tailwind directly) |
| `sen`     | lines (borders, rings, dividers, focus, forced-colors compounds) |
| `take`    | dimension scales (icon, avatar, panel, popup, …) |

Composition flows freely within `ryu/`. The ordering above is rough — `sun`
is the most common entry point for size-aware kata.

## Layer 2 — 型 (kata) "Forms"

Per-component recipes in `kata/`. One `tv()` per component (or a plain
slots object when there are no variants). A kata may compose freely from
`ryu/` but never sideways from another kata except through shared internal
kata files (prefixed with `_`).

The control family (`input`, `textarea`, `listbox`, `combobox`,
`datepicker`, `checkbox`, `radio`, `switch`, and the `ControlFrame`
primitive) shares `kata/_control.ts` as the single source of truth for
frame, surface, field, size, icon, affix, resets, and check styles. The
panel family (`dialog`, `drawer`, `sheet`, `inspector`) shares
`kata/_panel.ts` for slot surfaces.

## Wrapper components

Two client-facing wrappers compose with the recipe layer:

- `<Concentric>` (in `components/concentric/`) — provides a size context
  and renders an outer container whose border-radius follows the
  concentric formula `outer = inner + padding`. Descendants inherit the
  size via `useConcentric()`.
- `<Group>` (in `components/group/`) — joins adjacent children by
  stamping `data-group={start|middle|end|only}`. Participating kata
  consume `tsunagi.base` to drop their inner radii. Composes with
  `<Concentric>` (size inherits).

Components like Button, Checkbox, Radio read `useConcentric()` to default
their `size` prop. The resolution order is: explicit prop, then
`useConcentric()`, then any component-specific context, then the kata's
`defaultVariants`.

## Rules

- **Extract on the second use site, not the first.** A duplicate fragment
  with two consumers earns a shared module; with one, it stays inline.
- **A new shared concern = a new entry in an existing module.** Only add
  a brand-new module when the concern doesn't fit any existing one.
- **One-off utilities go inline.** Don't reach for `maru`/`ma`/`kumi` to
  look up a single Tailwind class. Use Tailwind directly. The substrate
  scales exist to be referenced *systematically* (via `sun` or by kata
  size variants), not as a name layer over Tailwind.
