# Density Variants — Design Plan — 2026-09-27

How a static leaf follows ambient density without reading context and without leaving the static tier. The mechanism is three Tailwind custom variants whose selectors rank by the depth of the scope. The rest of the plan is the order in which components move onto them.

## Thesis

Density lives in React context (`primitives/density`). A component must be a client component to read it, and [`REFERENCE.md`](../../REFERENCE.md) §2 bars the static tier from context. So Badge, Card, Heading, Text, Table, Kbd, Avatar, and the other static atoms ignore `DensityProvider` and take `md` unless a caller passes `size`. Density was only partly wired, and the only way to wire more of it was to turn static leaves into client components.

§2 already names the way out: ambient styling crosses the boundary through the DOM. The problem is the nested case. A scope inside a scope must win over the outer one, in CSS alone, inside the browser floor (Chrome 111, Firefox 128, Safari 16.4).

## Why depth-ranked variants

- An ancestor selector (`[data-density=sm] &`) does not respect nesting. Inside an `lg` scope inside an `sm` scope, both rules match at the same specificity, and source order wins.
- `@scope` gives proximity, and container style queries could key on a value, but Firefox ships neither at the floor.
- CSS custom properties inherit by proximity, but they move styling out of Tailwind classes. Rejected: Tailwind owns the CSS.

Each `density-*` variant is a list of selectors, one for each depth from 1 to 6. The depth-n selector puts n-1 `[data-density]` ancestors above the `[data-density=<step>]` scope. The innermost scope above an element matches the deepest selector, which has the highest specificity. An outer scope can match only shallower selectors, so the innermost scope wins at any depth up to the cap. `density-scope.test.tsx` checks this in Chromium.

The variants live in [`tailwind.css`](../../tailwind.css), exported as `ui/tailwind.css`. It holds variants only. `shared/globals.css` imports it, so both apps get it with no change. The docs entry and the browser suite import it by path.

## The contract

- A **scope** is an element with `data-density="sm|md|lg"`: the `DensityProvider` wrapper, a Card with `size`, a Table with `density`. A scope opener that also wraps client children writes the `Density` context too, so the two channels agree.
- A **recipe with a `densityAxis`** follows the nearest scope when a caller omits that axis. `defineRecipe` keeps the classes of the default step as the base and adds a `density-<step>:` row for each step: the axis row plus the compound rules of that step that match the other axes. The md row is not redundant: it resets an outer `sm` or `lg` scope under an inner `md` one. Outside any scope, no row matches, and the leaf renders at its default. A component passes its `size` prop through, undefined or not, and does not branch.
- An **explicit `size`** pins the step: the leaf emits its fixed classes and no rows.
- Tailwind scans whole class literals, and the engine builds the rows at runtime. `density-classes.test.ts` lists every row class of every kata and pins the list in `src/recipes/density.generated.txt` with a file snapshot. `ui/tailwind.css` names that file with `@source`, so every app that imports the variants also generates the rows. `pnpm density` writes the list again after a recipe change, and the test fails in CI when the list is stale.
- Client components keep context. Grid, Chart, Sparkline, Menu, and Tabs need density as a JS value.

## Costs accepted

- **Depth cap.** The variants count every `data-density` ancestor, not only the ones that change the step. Past six nested scopes, the two innermost can tie, and source order decides. The trees in the repository stay under the cap. CSS output grows with the cap, but only for utilities that carry a `density-*` variant.
- **Specificity.** A density row outranks a plain class. Inside a scope, a consumer `className` on an unsized leaf (`p-6` on a Card) loses to the row. The consumer passes `size`, or uses `!`. tailwind-merge cannot resolve the conflict, because the classes sit on different variants.
- **Portals.** A portal breaks the DOM chain, and context does not. A static leaf inside a portaled surface follows the surface's scope only if the surface writes `data-density`.

## Increments

1. **Variants, engine, and pilot.** `tailwind.css` and its export, `densityAxis` in `defineRecipe` with the generated class list, `data-density` as a `Step` on `DensityProvider` (it wrote the friendly level before), and a scope on a sized Card and on a Table with `density`. Badge, the Card frame, and the Table padding projection opt in. The Table projection now carries an md row, so a consumer padding `className` on a cell takes `!` at every step. The browser nesting test.
2. **Scope openers.** The client hosts that open a `Density` scope write `data-density` on their own root: Group, InputFrame, the Control primitive, and the portaled surfaces (Menu, Popover, Listbox, Combobox, DatePicker, Color, Drawer). A host can skip the attribute when its step equals the parent's, which keeps the real depth low.
3. **Static families.** One pull request each: Heading and Text, Kbd and Code, Avatar and StatusDot, DescriptionList and Stat, Alert and Banner. Each kata adds `densityAxis`, each component passes its `size` through, and `pnpm density` updates the list.
4. **Style-only client reads.** Progress, DatePickerFooter, and the Control primitive read density for classes only. They move to rows and drop the hook.
5. **Optional: pre-paint scope.** `AppearanceScript` writes the stored step to `data-density` on `<html>`, so a stored density applies to static leaves before hydration.

## Out of scope

- `Grid` projects a compact step onto cell badges (`kata/grid.ts`, `projection.badge`). The condensed table now opens an `sm` scope, so a cell Badge follows it through its rows, and the projection is redundant for font size. Remove it when the static families land.
- The `useDensity` and `useDensityNullable` TSDoc names Box, Flex, Stack, and Grid as nullable readers. None of them reads density now.
