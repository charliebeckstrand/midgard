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

`ConcentricProvider` / `useConcentric` (in `primitives/concentric.ts`)
carries the ambient size step through the tree. Surfaces opt in by
rendering the provider themselves — `<Card>`, `<Drawer>`, `<Popover>`,
and `<Group>` all broadcast their resolved `size` this way. Border
radii follow the same nesting: `outer = inner + padding`.

`<Group>` (in `components/group/`) also joins adjacent children by
stamping `data-group={start|middle|end|only}`; participating kata
consume `tsunagi.base` to drop their inner radii. When `size` is
omitted, the group inherits from any enclosing concentric context.

Components like `Button`, `Checkbox`, and `Radio` read `useConcentric()`
to default their `size` prop. Resolution order: explicit prop, then
`useConcentric()`, then component-specific context, then the kata's
`defaultVariants`.

## Spacing and radius

`ma` names compile to first-class Tailwind utilities (`p-md`, `gap-lg`,
`rounded-lg`) — write them inline in `tv()` recipes. Off-scale values
go inline too (`'gap-0.5'`, `'p-3.5'`, `'rounded-2xl'`).
