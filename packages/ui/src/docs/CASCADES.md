# Cascade contracts

Components read ambient state from React contexts to resolve their final props. Where a component reads from depends on its semantic role. This document is the canonical map — contributors should not have to trace imports to reconstruct it.

If you're adding a new component or changing how an existing one resolves a prop, the chain you write should match the table below for the role.

## Roles

### Form fields

Components: `input`, `textarea`, `switch`, `listbox`, `combobox`, `datepicker`, `checkbox`, `radio`.

```
final = explicit prop ?? Control ?? Concentric ?? component default
```

- **Control** (`useControl`) — provided by `<Control>`. Carries `id`, `autoComplete`, `disabled`, `invalid`, `readOnly`, `required`, `size`, `variant`. Form fields nested inside `<Control>` inherit all of these.
- **Concentric** (`useConcentric`) — a primitive in `primitives/concentric.ts`, broadcast by `<Card>` / `<Drawer>` / `<Popover>` / `<Group>`. Carries `size` only. Used as a fallback when no Control wraps the field.

Glass override on `variant`: form fields apply `variant: 'glass'` when `useGlass()` is `true` and no explicit variant is set.

### Concentric participants

Components: `button` (partly), `card-title`, `checkbox`, `radio`, `group`.

```
final = explicit prop ?? Concentric ?? component default
```

These don't sit inside a `<Control>`; they only read the top-level concentric size cascade.

### Standalone interactive: `button`

```
size    = explicit ?? Concentric ?? AffixSize
variant = explicit ?? (glass ? 'glass' : undefined)
```

Button reads AffixSize because it can be rendered as a clear/loading button **inside** an `<Input>`, where the input broadcasts its affix size to descendants. Button does **not** read Control — it isn't a form-field-inside-Control by convention.

### Cascade descendants: `spinner`, `icon`

Tiny things rendered inside larger sized controls.

```
size = explicit ?? ButtonSize ?? AffixSize ?? 'md'
```

- **ButtonSize** (`useButtonSize`) — broadcast by `<Button>` to its descendants so a Spinner or Icon inside a Button auto-scales.
- **AffixSize** (`useAffixSize`) — broadcast by `<Input>` to its affix descendants for the same reason (icons, clear buttons, loading spinners).

Both are sizes a control broadcasts to its descendants — pure broadcast, no inheritance from outer ancestors.

### Avatar family: `avatar`, `status`

```
size = explicit ?? AvatarGroupSize / AvatarSize ?? 'md'
```

- **AvatarGroupSize** — broadcast by `<AvatarGroup>` so all avatars in the stack share a size.
- **AvatarSize** — broadcast by `<Avatar>` so a `<StatusDot>` placed on the avatar inherits its size.

Same pattern as ButtonSize / AffixSize, scoped to the avatar family.

### Sub-cascades: `dl`, `timeline`

Components inside a `<Dl>` or `<Timeline>` read the parent's orientation / variant from a small ambient context. Not a general cascade — only the immediate compound's children consume these.

## Ambient flags

These cascade as boolean flags rather than as values to fall back on:

- **`useGlass()`** — `true` inside `<Glass>`. Form fields and Button switch to the glass variant when no explicit variant is passed. Surface chrome (Popover, Dialog, etc.) takes a `glass` prop and consumers pass `useGlass()` through.
- **`useSkeleton()`** — `true` inside `<Skeleton>`. Sized leaf controls render a `<Placeholder>` shaped from `kokkaku` instead of their real markup.

Both are read at the leaf level. They don't compose into the size/variant resolution chain — they short-circuit to a different render path.

## What does **not** cascade

- **Color** — always explicit. There is no ambient color context. Any component-pair that needs colour matching (e.g. `Alert` + its close `Button`) passes the color through props.
- **`variant` on Button** — Button doesn't read `control?.variant`. Only Input / Textarea do, because they're direct Control children.
- **Dialog / Drawer / Sheet variants** — these are independent compounds, not part of the Control family.

## Why context, not prop drilling

Each cascade represents a coupling that prop drilling can't reach without ceremony:

- Concentric size flows through arbitrary wrappers (Frame, Stack, layout components) to leaf controls.
- ButtonSize / AffixSize broadcasts to descendants that might be wrapped in custom layouts N levels deep.
- AvatarGroupSize same idea, scoped to the avatar family.
- Glass / Skeleton are ambient flags that affect many descendants at once.

The Control context is special: it's also the data bridge between `<Field>` (label, help, errors, validation) and the underlying form field, so it carries id, validity, disabled state, etc. — not just size.

## Adding a new component

1. Identify the role (form field, concentric participant, standalone interactive, cascade descendant, avatar family, or sub-cascade).
2. Use the chain documented above for that role. Do not invent a new chain.
3. If the component doesn't fit any role, raise it before writing the chain — a new role earns a new section here.
