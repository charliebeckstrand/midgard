# Density Variants — Design Plan — 2026-09-27

How a component follows ambient density without reading context and without leaving the static tier. Density is a Tailwind variant, the same kind of ambient condition as `dark:` or `md:`. A kata writes each step as a literal class, and the DOM selects the step. The rest of the plan is the order in which components move onto the variants.

## Thesis

Density lives in React context (`primitives/density`). A component must be a client component to read it, and [`REFERENCE.md`](../../REFERENCE.md) §2 bars the static tier from context. So Badge, Card, Heading, Text, Table, Kbd, Avatar, and the other static atoms ignore `DensityProvider` and take `md` unless a caller passes `size`.

§2 already names the way out: ambient styling crosses the boundary through the DOM. The recipes already name the rule for Tailwind: a variant must appear in source, not at runtime. The design keeps both rules. It adds no generator and no recipe field.

## The contract

- A **scope** is an element with `data-density="xs|sm|md|lg|xl"`. The `DensityProvider` wrapper writes one with the step of its level. A component with an explicit `size` writes one on its own element. The element is then its own nearest scope, and its subtree follows it.
- A **kata** writes each step under the variant of that step: `density-sm:p-2 density-md:p-3 density-lg:p-4`. A step is not a recipe axis, so the class string of a component is the same at each size. `size` changes only the attribute. Shared ramps with a ring-compensated stop go through kiso (`kasane.padding.pxRamp`), because the formula lives there.
- The element takes the step of the **nearest scope**, itself included. Outside each scope, `density-md` applies, so a kata writes no separate base class for md.
- A **plain utility** wins over each step. A consumer `className` therefore wins with no `!`, inside a scope and on a pinned leaf. A kata that must fix a property at each step writes a plain class. A default that a density class must replace uses `density-any`, which ranks below each step (the Placeholder height).
- A **sized static host** (Card, Table) also opens a `DensityScope` context scope, so client children take the same step.
- **Client components** keep context. Grid, Chart, Sparkline, Menu, and Tabs need density as a JS value. A client scope opener writes both the attribute and the context, so the two channels agree.

## How the variants rank

[`tailwind.css`](../../tailwind.css) loads a Tailwind plugin, [`variants.ts`](../../src/core/density/variants.ts), which defines `density-xs` to `density-xl` from `densitySteps` in `core/density`. So the steps have one source for the types and for the CSS. The depth of a match is the number of scopes on the path to the element, the element itself included. Each rung matches one depth, and it sits in a nested cascade layer of `utilities` with the number of that depth. The nearest scope gives the deepest match, and a later layer wins, so the nearest scope wins. A plain utility is in `utilities` itself, and it outranks each nested layer.

Rejected:

- An ancestor selector alone (`[data-density=sm] &`) does not respect nesting. Source order wins, not proximity.
- `@scope` gives proximity, but Firefox ships it after the browser floor (Chrome 111, Firefox 128, Safari 16.4). Container style queries have the same problem.
- CSS custom properties inherit by proximity, but they move styling out of Tailwind classes.
- A recipe field that builds `density-*` rows at runtime needs a generated class list for the Tailwind scanner. It also keeps two ways to select a step: a recipe axis for `size`, and the variants for the scope.

## Costs accepted

- **Depth cap.** The variants stop at a depth of 6 scopes. Past that, an outer scope can win. The trees in the repository stay under the cap.
- **Layer order.** Tailwind emits the nested layers in the order of first use. The plugin adds the rungs of each variant from depth 1 up, so the order is correct. A `@layer` order statement does not help: Tailwind moves it after the utilities.
- **Pinning cascades.** `<Card size="sm">` makes its subtree `sm`. That is the intent for sections and static leaves. A host that wants a child one step down (the control affix) must open a scope with the lower step on the slot.
- **Portals.** A portal breaks the DOM chain, and context does not. A static leaf inside a portaled surface follows the surface's scope only if the surface writes `data-density`.

## Increments

Increment 1 landed in #1482. [`2026-09-27-DENSITY-ENGINE-PLAN.md`](2026-09-27-DENSITY-ENGINE-PLAN.md) replaces increments 2 to 5.

1. **Variants and pilot.** The plugin, `tailwind.css`, and its `ui/tailwind.css` export, imported by `shared/globals.css`, the docs entry, and the browser suite. `DensityProvider` writes the step. Badge, BadgeSkeleton, Card and its sections, the Table cells, Icon, and LoadingSpinner move onto the variants. A LoadingSpinner follows the scope of its Badge, so the Badge spinner projection goes. `density-scope.test.tsx` checks nesting, self scopes, and consumer overrides in Chromium.
2. **Scope openers.** Client hosts that open a `Density` context scope also write `data-density`: Group, InputFrame, the Control primitive, and the portaled surfaces (Menu, Popover, Listbox, Combobox, DatePicker, Color, Drawer). The control affix slot opens a scope one step down, and the Badge affix rule in `REFERENCE.md` §2 goes.
3. **Host projections.** Icon and LoadingSpinner carry their own steps. A client host whose icon step equals its own step (Button, Nav, Sidebar) drops its projection when it writes `data-density`. A projection stays only for a bare icon element and for a deliberate step-down.
4. **Static families.** One pull request each: Heading and Text, Kbd and Code, Avatar and StatusDot, DescriptionList and Stat, Alert and Banner. Each moves its skeleton with it.
5. **Client families.** Style-only readers (Progress, DatePickerFooter, the Control primitive) drop their hooks. The rest move their classes onto the variants and keep context only for JS values.
6. **Optional: pre-paint scope.** `AppearanceScript` writes the stored step to `data-density` on `<html>`, so a stored density applies before hydration.

## Out of scope

- `Grid` projects a compact step onto the icons and badges of its cells (`kata/grid.ts`, `condensed.icon` and `condensed.badge`). The `sm` scope of the table already gives that step to an unsized leaf, so the rules now change only a leaf with an explicit `size`. Decide whether to remove them when increment 2 lands.
- The `useDensity` and `useDensityNullable` TSDoc names Box, Flex, Stack, and Grid as nullable readers. None of them reads density now.
- `kasane` holds each ring-compensated stop as a literal map. A Tailwind `@utility` for the formula would let a kata write `density-sm:px-ring-1.5` and drop the maps. That is a separate decision.
