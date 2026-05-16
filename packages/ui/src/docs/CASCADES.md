# Cascade contracts

Every size-aware component resolves its final `size` through a single hook — `useResolvedSize` from `primitives/concentric.ts`. Every leaf is:

```ts
const resolvedSize = useResolvedSize(size)
```

The Concentric provider tree encodes priority. Each size-broadcasting surface writes a `<ConcentricProvider>`, and innermost-wins (standard React context semantics) handles everything: a Button inside an Input affix slot inherits the affix step; a form field inside `<Control size="sm">` inherits the control size; a Spinner inside `<Button size="lg">` inherits the button size; a `<StatusDot>` inside `<Avatar size="lg">` inherits the avatar size. No call-site `??` composition.

The hook is generic on the caller's size type so each component keeps its narrower `Step` / `Size` / `Ma` typing. Concentric's value is `Ma` (the widest broadcaster's type); out-of-range values reaching a narrower consumer fall through to the consumer's variant `defaultVariants`.

## Broadcasters

Every size-broadcasting surface writes Concentric:

| Surface | Concentric value |
| --- | --- |
| `<Card>`, `<Drawer>`, `<Group>`, `<Popover>`, `<Density>` | the surface's resolved size |
| `<Control size>` | the control's size (only when set) |
| `<Input>` (affix slot only) | one step down — `sm → xs`, `md → sm`, `lg → md` |
| `<SelectTrigger>` | same as Input affix |
| `<Button>` (descendants only) | the button's resolved size |
| `<Avatar>`, `<AvatarGroup>` | the avatar's size |

`<Density>` continues to also write the legacy `<DensityProvider>` so consumers that key off the "compact / snug / loose" vocabulary (currently none in-package after the table refactor) can still find it.

## Consumers

```ts
useResolvedSize(size)        // explicit prop wins; otherwise nearest Concentric ancestor; otherwise 'md'
useResolvedSize()            // pure ambient read (no explicit), defaults to 'md'
useResolvedSize<Size>(size)  // explicit caller type — Button / Badge / Avatar typed as Size or Ma
```

That's the entire API. No role-specific chains.

## Layout primitives — opt-in concentric pickup

`box`, `flex`, `stack`, `grid` keep their direct `useConcentric()` reads. Their `p` / `gap` is `Ma` or `Responsive<Ma>` (wider than the hook's `T extends Ma` constraint allows for the responsive forms), and Box/Flex specifically treat `undefined` as "no style applied" — which the hook's `'md'` fallback would clobber.

## Ambient flags

Boolean cascades, read at the leaf:

- **`useGlass()`** — `true` inside `<Glass>`. Form fields and Button switch to the glass variant when no explicit variant is passed. Surface chrome (Popover, Dialog, etc.) takes a `glass` prop and consumers pass `useGlass()` through.
- **`useSkeleton()`** — `true` inside `<Skeleton>`. Sized leaf controls render a `<Placeholder>` shaped from `kokkaku` instead of their real markup.

They don't compose into the size resolution — they short-circuit to a different render path.

## What does **not** cascade

- **Color** — always explicit. There is no ambient color context. Any component-pair that needs colour matching (e.g. `Alert` + its close `Button`) passes the color through props.
- **`variant` on Button** — Button doesn't read `control?.variant`. Only Input / Textarea do, because they're direct Control children.
- **Dialog / Drawer / Sheet variants** — these are independent compounds, not part of the Control family.

## Why context

Concentric flows through arbitrary wrappers (Frame, Stack, custom layouts) without prop-drilling. Surfaces and broadcasters set it without their descendants having to know.

The `<Control>` context is special: it's also the data bridge between `<Field>` (label, help, errors, validation) and the underlying form field, so it carries id, validity, disabled state, etc. — not just size. Its size leg is mirrored into Concentric so size consumers don't need to read Control directly.

## Adding a new component

1. Resolve size with `useResolvedSize(size)`. That's it for the typical case.
2. If the component is a layout primitive that wants the "no contextual size → no style" semantic instead of `'md'` fallback, read `useConcentric()` directly (see Box/Flex).
3. If the component **broadcasts** a size for its descendants — a new surface, an affix-like slot, etc. — wrap its children in `<ConcentricProvider value={{ size }}>`.
