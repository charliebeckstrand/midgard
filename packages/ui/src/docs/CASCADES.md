# Cascade contracts

Three independent context primitives carry size-related concerns through the tree. Each has one job; consumers compose them at the call site.

## `Density` — the universal Step cascade

`packages/ui/src/primitives/density.tsx` carries a two-axis token keyed on `Step` (`'sm' | 'md' | 'lg'`):

```ts
type DensityToken = {
  density: Step  // padding + gap (breathing room)
  size:    Step  // text + icon  (visual heft)
}
```

The axes inherit independently — `<Density density="sm">` shrinks spacing without touching font size; `<Density size="lg">` bumps text and icon without re-padding. Cascade is per-axis innermost-wins.

Read with `useDensity()`. Returns the diagonal `'md'` preset when no provider is in the tree. Component leaves with their own `size` prop compose at the call site:

```ts
const inherited = useDensity()
const token = size ? DENSITY_PRESETS[size] : inherited
```

Component leaves with no `size` prop just destructure: `const { size } = useDensity()`.

**Broadcasters** (write `<Density>` for their descendants):

| Surface | Token shape |
| --- | --- |
| `<Card>`, `<Drawer>`, `<Popover>`, `<Group>`, `<Calendar>` | the surface's resolved token |
| `<Listbox>` / `<Combobox>` popover panel | the trigger's resolved token (re-broadcast across the portal boundary) |
| `<Tabs>` | the wrapper's resolved size, propagated through `useTabsContext` |
| `<Density>` | the user-facing API |

## `Affix` — the narrow Ma cascade for wider-scale slots

`packages/ui/src/primitives/affix.ts` carries `Ma | null` (`'xs' | 'sm' | 'md' | 'lg' | 'xl'`). Used by the few surfaces whose descendants legitimately need a value outside the `Step` floor:

- **Control affix slots** (`<Input>` prefix / suffix, `<SelectTrigger>` chevron) broadcast a stepped-down value — `'xs'` at `'sm'` — so icons and small buttons render tighter than the host.
- **`<Button>`** broadcasts its own resolved size so loading spinners and prefix/suffix icons inherit the button's `Ma` size, including `'xs'` and `'xl'` that the `Step`-typed Density cascade can't carry.

Read with `useWideSize(explicit?)` — resolves `explicit ?? Affix ?? Density.size`. Used by Button, Icon, and Spinner; nothing else needs the wider scale.

## `Concentric` — reserved for nested-radius math

`packages/ui/src/primitives/concentric.ts` is preserved for its original geometric purpose: surfaces that nest visually (Card inside Card, Drawer containing Popover) declare their radius + padding, and inner surfaces compute their own inner-fitting radius as `outer_radius - outer_padding`. The provider + hook are exported; the type is minimal until that lands.

## Adding a new component

1. **Step-only consumer:** `useDensity()`. Compose `size ?? inherited.size` at the call site.
2. **Ma-aware consumer** (your size prop is wider than Step): `useWideSize(size)`. Returns explicit → Affix → Density.size.
3. **Broadcaster** that wants descendants to inherit a different size than the surrounding cascade: wrap children in `<Density density={...} size={...}>` or the `<DensityScope scale={size}>` sugar.
4. **Slot that needs to project a sub-Step value to wider-scale descendants** (rare — Input affix is the canonical case): wrap in `<AffixProvider value={maValue}>`.

## What does **not** cascade

- **Color** — always explicit. There is no ambient color context. Any component pair that needs colour matching (e.g. `<Alert>` + its close `<Button>`) passes the color through props.
- **`variant` on Button** — Button doesn't read `control?.variant`. Only Input / Textarea do, because they're direct Control children.
- **Dialog / Drawer / Sheet variants** — these are independent compounds, not part of the Control family.

## Layout primitives — opt-in concentric pickup

`box`, `flex`, `stack`, `grid` historically read `useConcentric()` directly for the "no contextual size → no style applied" semantic (their `p` / `gap` is `Responsive<Ma>`, wider than the hook's constraint and undefined-friendly). With Concentric now reserved for the nested-radius cascade, those reads will move to `useDensity()` when the layout primitives are next touched; the behaviour is unchanged because the layout primitives' undefined-friendly composition happens at the prop level, not the cascade.

## Ambient flags

Boolean cascades, read at the leaf:

- **`useGlass()`** — `true` inside `<Glass>`. Form fields and Button switch to the glass variant when no explicit variant is passed. Surface chrome (Popover, Dialog, etc.) takes a `glass` prop and consumers pass `useGlass()` through.
- **`useSkeleton()`** — `true` inside `<Skeleton>`. Sized leaf controls render a `<Placeholder>` shaped from `kokkaku` instead of their real markup.

They don't compose into the size resolution — they short-circuit to a different render path.

## Why context

Density flows through arbitrary wrappers (Frame, Stack, custom layouts) without prop-drilling. Surfaces and broadcasters set it without their descendants having to know.

The `<Control>` context is special: it's also the data bridge between `<Field>` (label, help, errors, validation) and the underlying form field, so it carries id, validity, disabled state, etc. — not just size.
