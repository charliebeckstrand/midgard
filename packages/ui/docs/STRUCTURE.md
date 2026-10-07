# Structure

> **Quick-glance index of `ui/structure`.** These units arrange other elements on the page. They have no behavior of their own: each one maps its props to flex, grid, and spacing classes. Per-unit props and defaults live in the TSDoc and in the docs site (`pnpm --filter ui dev`). For the components that you arrange with them, see [`COMPONENTS.md`](COMPONENTS.md).

Each unit is its own entry point under `ui/structure/*`, and keeps the bare `ui/<name>` path it had before the move:

```ts
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/stack'
```

The bare paths are exact keys in `package.json` `exports`, one per unit, as for the modules. Next.js resolves only the first target of an `exports` fallback array, so the `./*` key has one target, `components/*`. A new unit adds its key beside the others, and `package-exports-boundary.test.ts` fails until it does.

Every structure unit is static, so it renders in React Server Components ([`../REFERENCE.md`](../REFERENCE.md) §2). A unit that draws a visible element or handles input, such as `divider`, `group`, or `card`, stays in [`COMPONENTS.md`](COMPONENTS.md).

## Units

| Unit | Summary |
|---|---|
| `box` | A `<div>` with padding, radius, background, and outline tokens. The padding takes the step of the nearest density scope. A `density` step makes it a density scope. |
| `container` | A centered `<div>` with a maximum width from `lg` up and horizontal padding at every width. |
| `flex` | A flex container with responsive direction, gap, alignment, and wrap. The gap takes the step of the nearest density scope. `as="span"` renders a `<span>` for phrasing content, such as the label of a button. |
| `spacer` | An empty flex item that fills the free space and pushes its siblings apart. |
| `split` | A two-pane grid with a responsive orientation and a ratio between the panes. |
| `stack` | A vertical `flex`: children stack in a column. It takes `as` from `flex`. |

---

**See also:** [`COMPONENTS.md`](COMPONENTS.md) · [`LAYOUTS.md`](LAYOUTS.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
