# Ryu 流 - Currents

Cross-cutting design tokens and compounds. Each module owns a
single-axis scale or bundles co-occurring properties.

## Boundary

`ryu/` is the public substrate layer; the barrel at
`src/recipes/index.ts` re-exports its modules for external consumers.
Composition flows freely inside `ryu/`; kata and waku both pull from
here.

## Modules

| Module    | Concern                                                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sun`     | Size system: text + leading, padding, gap, inner radius, icon — by step (sm/md/lg). The spine; the most common entry point for size-aware kata.                     |
| `iro`     | Colour palettes (`palette.{solid,soft,outline,plain}`) plus semantic text/bg roles.                                                                                 |
| `ji`      | Typography size scale — font-size with line-height bundled. Weight, tracking, and family use Tailwind directly.                                                     |
| `omote`   | Surface chromes (panel / popover / glass / backdrop bundles).                                                                                                       |
| `sawari`  | Interaction states (hover / press / disabled compounds with motion).                                                                                                |
| `ugoki`   | Motion — CSS transitions plus Framer Motion presets.                                                                                                                |
| `kokkaku` | Per-component skeleton placeholder shapes.                                                                                                                          |
| `narabi`  | Sibling / slot layout (panel slots, list items, toggle / group, field).                                                                                             |
| `tsunagi` | Group join selectors — consumed by `<Group>`.                                                                                                                       |
| `ma`      | Spacing vocabulary — `xs/sm/md/lg/xl` token names projected to Tailwind utilities (`p-md`, `gap-lg`, `mt-xs`) via `@utility` from `--step-*` tokens in `theme.css`. |
| `sen`     | Lines — borders, dividers, rings, focus indicators, forced-colors compounds.                                                                                        |
| `take`    | Dimension scales (icon, avatar, panel, scrollArea, combobox, listbox, mark).                                                                                        |

## Size cascade

`Density` / `useDensity` (in `primitives/density.tsx`) carries the
ambient two-axis token (`density` for padding+gap, `size` for
text+icon) through the tree. Surfaces broadcast it themselves —
`<Card>`, `<Drawer>`, `<Popover>`, `<Group>`, and `<Density>` all
write the resolved token for their descendants.

`<Group>` (in `components/group/`) also joins adjacent children by
stamping `data-group={start|middle|end|only}`; participating kata
consume `tsunagi.base` to drop their inner radii. When `size` is
omitted, the group inherits from any enclosing Density context.

Components like `Checkbox` and `Radio` read `useDensity()` to default
their `size` prop. Wider-scale components (`Button`, `Icon`, `Spinner`)
read `useWideSize()` instead — it composes the Affix primitive
(`primitives/affix.ts`) for slot-context broadcasts that go below the
`Step` floor (`'xs'`). Resolution order: explicit prop, then
component-specific context (e.g. Control for form fields), then
`useDensity()` / `useWideSize()`, then the kata's `defaultVariants`.

## Spacing and radius

`ma` names compile to first-class Tailwind utilities (`p-md`, `gap-lg`,
`rounded-lg`) — write them inline in `tv()` recipes. Off-scale values
go inline too (`'gap-0.5'`, `'p-3.5'`, `'rounded-2xl'`).
