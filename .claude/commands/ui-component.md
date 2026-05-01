# Create UI Component

TRIGGER when: the user asks to create, add, build, or scaffold a new UI component in `packages/ui`.

You are creating a new component inside the `packages/ui` package of this monorepo. Follow the architecture, conventions, and patterns described below exactly.

## Arguments

$ARGUMENTS

---

## Skip recommend

The following components are explicitly out of scope for this library. If the user asks to create one, stop and explain that it is on the skip-recommend list rather than scaffolding it. Do not propose them in related workflows (e.g. `/ui-component-recommend`).

- **rating** — star/score inputs are not needed.
- **color-picker** — color selection UI is not needed.
- **otp** — one-time-password / PIN input is not needed.
- **avatar-group** — already expressible through composing `Avatar`; no dedicated component.
- **gauge** — already expressible through `Progress`; no dedicated component.
- **context-menu** — already expressible through `Menu`; no dedicated component.

Keep this list in sync here; `/ui-component-recommend` references it so excluded components never surface as suggestions.

---

## Package structure

```
packages/ui/
  package.json
  tsup.config.ts
  src/
    index.ts                  # Re-exports cn, colorVariants, createContext, Link, LinkProvider, useLink
    core/                     # cn, createContext, recipe helpers (colorVariants, defineColors, mode)
    primitives/               # Reusable building blocks (Polymorphic, Overlay, ControlFrame, createPanel, Link, etc.)
    recipes/                  # Design token layers (Tier 1 atoms → Tier 2 behaviours → Tier 3 surfaces → Tier 4 kata)
    hooks/                    # Shared hooks (useControllable, useFloatingUI, useRoving, etc.)
    components/<name>/        # Each component lives here
    docs/                     # Demo system (docs/demos/<name>.tsx, docs/components/example.tsx, etc.)
    __tests__/components/     # <name>.test.tsx per component
```

## Component directory structure

Every component lives in `src/components/<name>/` with these files:

| File | Purpose | Required |
|------|---------|----------|
| `<name>.tsx` | The React component(s) — named after the component (`badge.tsx`, `alert.tsx`, `tree.tsx`) | Always |
| `variants.ts` | Re-exports recipe, variant types, and slot object from kata | When the component has visual variants or slot classes |
| `index.ts` | Barrel file re-exporting all public API | Always |
| `context.ts` | Shared state via the typed `createContext` helper from `core` | Only when sub-components need shared state |
| `<name>-<slot>.tsx` | Sub-component files (e.g. `card-header.tsx`, `alert-title.tsx`) | For compound components with multiple sub-components |
| `slots.tsx` | Panel slot components via `createPanel` | Only for panel-like components (dialog, sheet, drawer) |

Some older simple components still use `component.tsx` — new components should use the `<name>.tsx` naming to match the current convention (seen in `alert/alert.tsx`, `tree/tree.tsx`, `card/card.tsx`, etc.).

---

## Step-by-step instructions

### 0. Audit existing components for composition (REQUIRED — do this first)

**Before writing any code, analyze whether the component can be built by composing existing components.** This is the most common mistake: reinventing behavior (overlays, inputs, buttons, motion, keyboard handling) that already ships as a component in this package.

Follow this reuse hierarchy — always prefer the highest level that applies:

1. **Compose existing components** (`Dialog`, `Input`, `Button`, `Popover`, `Listbox`, `Sheet`, `Drawer`, `Box`, `Stack`, `Flex`, …) — the full list is under *Existing components* below
2. **Use primitives** (`Overlay`, `ControlFrame`, `Polymorphic`, `TouchTarget`, `createPanel`, …) only when no component fits
3. **Use recipes/hooks** (`kata`, `ugoki`, `useFloatingPanel`, `useRoving`, …) only when no primitive fits
4. **Write raw markup + Tailwind** only as a last resort

**Mandatory composition audit.** Before Step 1, answer these in your head (or out loud if non-obvious):

- Does the component render in a modal/overlay surface? → **Compose `Dialog`, `Sheet`, `Drawer`, or `Popover`.** Do not reach for `Overlay` + `motion` + `ugoki` directly unless you're building a brand-new overlay primitive.
- Does it contain a text input? → **Compose `Input` or `Textarea`.** Do not render raw `<input>` with custom recipe classes.
- Does it contain an action trigger? → **Compose `Button`.** Do not render styled `<button>` elements.
- Does it show a list of selectable options? → **Compose `Listbox`, `Combobox`, or `Menu`.** Do not reimplement keyboard navigation or option rendering.
- Does it need panel slots (title, description, body, actions)? → **Use `createPanel`** (see `dialog/slots.tsx` for reference).
- Does it need a surface with padding/background/border props? → **Compose `Box`** or `Card` rather than re-styling a div.
- Does it need polymorphic `href`/`as` behavior? → **Use `Polymorphic`.**
- Does it need a controlled/uncontrolled state pair? → **Use `useControllable`.**
- Does it need floating positioning (popovers, menus, tooltips)? → **Use `useFloatingUI` / `useFloatingPanel`.**

If the answer to any of the above is yes and you find yourself writing `<Overlay>`, `motion.div`, `role="dialog"`, raw `<input>`, raw `<button>`, or a new kata recipe that mirrors an existing one — **stop and compose the existing component instead**.

**Worked example — CommandPalette.** A command palette is "a dialog that contains a search input and a list". The correct implementation is ~80 lines that wrap `<Dialog>` + `<DialogBody>` + `<Input>` and layer keyboard navigation on top. Do not duplicate `Dialog`'s overlay, motion, or panel recipe.

**When a new kata recipe is NOT needed.** If every visual element comes from a composed component, you do not need a new recipe, variants file, or kata registration. Skip Steps 1–4 and go straight to the component file. Only introduce a recipe when the component owns genuinely new styling (a new surface, a new layout arrangement, a new slot) that no existing recipe covers.

### Size system (sun) and the Concentric / Attached wrappers

**Architecture in progress.** The recipe system is migrating from a 4-tier model to a 3-layer one (`ryū → waku → kata`). The legacy tier docs further down still apply to existing kata; new components and migrated kata should use the new pieces below.

**`sun` (寸) — the size spine.** Lives in `src/recipes/ryu/sun.ts`. A single recipe that bundles every property scaling together (text + leading, padding, gap, inner radius, icon size) per step `sm` / `md` / `lg`. Each field is a Tailwind 4 token *name* — never a classname or `var()` string.

```ts
import { classes, sun } from '../ryu/sun'

// In a kata's `tv()`, spread the helper's output per size variant:
const size = {
  sm: [classes('sm').text, classes('sm').padding, classes('sm').gap, classes('sm').rounded, classes('sm').icon],
  md: [classes('md').text, classes('md').padding, classes('md').gap, classes('md').rounded, classes('md').icon],
  lg: [classes('lg').text, classes('lg').padding, classes('lg').gap, classes('lg').rounded, classes('lg').icon],
}
```

Domain overrides are allowed when geometry constrains them (a checkbox is square, a slider has hit-area padding) — pull from `sun` where possible, override what doesn't fit.

**`<Concentric>` — the nested-radius wrapper.** Lives in `src/components/concentric/`. Wraps a child container and renders the outer radius via the formula `outer = inner + padding`, exposed as CSS variables (`--ui-radius-inner`, `--ui-padding`). Use it in container components (Card, Dialog, Sheet, Drawer, Popover) so children automatically get visually-balanced corners.

```tsx
import { Concentric, useConcentric } from 'ui/concentric'

<Concentric size="md">
  <Button>Inner content</Button>
</Concentric>
```

Descendants can read the active size via `useConcentric()` and adjust their own appearance.

**`<Attached>` — the attached-items wrapper.** Lives in `src/components/attached/`. Stamps `data-attached={start|middle|end|only}` and `data-attached-orientation={horizontal|vertical}` onto each child. Participating kata read these attributes via `tsunagi.base` (in `src/recipes/ryu/tsunagi.ts`) to drop their inner radii and overlap by 1 px so adjacent borders don't double. Composes with `<Concentric>` (size inherits when omitted). Uses Tailwind 4 logical properties (`rounded-s-*` / `rounded-e-*`) for RTL safety.

```tsx
import { Attached } from 'ui/attached'
import { tsunagi } from '../ryu/tsunagi'

// In a participating kata's tv() base array:
const button = tv({ base: [..., ...tsunagi.base], variants: { ... } })

// In a consumer:
<Attached>
  <Button>Cut</Button>
  <Button>Copy</Button>
  <Button>Paste</Button>
</Attached>
```

For group components that own additional concerns (keyboard nav, roving tabindex), import the `useAttached(children, orientation)` hook directly instead of the wrapper.

**When to reach for which:**

- New kata with a `size` variant → consume `sun` via `classes()`.
- Container component that wraps rounded children with padding → use `<Concentric>` for the outer.
- Group of adjacent items meant to read as one shape → use `<Attached>` and add `tsunagi.base` to the participating kata's base array.
- One-off corner radius, one-off padding, one-off `flex-row` → write Tailwind directly. Don't reach for `maru`/`ma`/`kumi` for single-utility lookups.

### 1. Create the kata recipe (if the component needs styling)

Add a new file at `src/recipes/kata/<name>.ts`.

**Three shapes exist in the codebase — pick the simplest that fits:**

- **Plain slots object** (no variants) — e.g. `kata/card.ts`, `kata/tree.ts`. Just export a `const <name> = { ... }` where each key is a slot (`base`, `header`, `title`, etc.). No `tv()`, no types.
- **Single `tv()` recipe** — when the component has variants (and optionally color/size). Export the `tv()` call plus its `VariantProps` type.
- **`tv()` + slots object** — when a component has both variants and additional slot classes (e.g. `kata/alert.ts`). Export both the `tv()` recipe and a plain `slots` object.
- **Multiple `tv()` recipes** — when root + sub-components each have their own variants (e.g. `kata/accordion.ts` exports `accordion` + `accordionItem`).

**Compose from lower-tier recipes:**

Tier 1 (atomic tokens):
- **`iro`** — color (`iro.text.*`, `iro.bg.*`, `iro.palette.{solid,soft,outline,plain}` — each palette exposes `bg`, `text`, `hover`, `ring` slots keyed by color)
- **`ji`** — typography (`ji.size.*`, `ji.weight.*`, `ji.tracking.*`, `ji.family.*`)
- **`kumi`** — layout scaffolding (`kumi.gap.*`, `kumi.direction.*`, `kumi.align.*`, `kumi.justify.*`, `kumi.center`)
- **`ma`** — padding / margin (`ma.p.*`, `ma.px.*`, `ma.py.*`, `ma.m.*`, …)
- **`maru`** — border-radius (`maru.rounded.{none,xs,sm,md,lg,xl,full}`)
- **`sen`** — lines: borders / rings / dividers / focus / forced-colors (`sen.border`, `sen.ring`, `sen.ringInset`, `sen.borderSubtle`, `sen.divider`, `sen.focus.{ring,inset,offset,outline,indicator,lifted}`, `sen.forced.{outline,text,focus,control,icon}`)
- **`take`** — dimension scales (`take.icon.*`, `take.avatar.*`, `take.panel.*`, `take.popup.*`, …) — **density presets (button/compact/etc) now live inside their component's kata recipe, not `take`**

Tier 2 (behaviours):
- **`narabi`** — sibling arrangement (`narabi.field`, `narabi.toggle`, `narabi.group`, `narabi.item`, `narabi.description`, `narabi.panel`, `narabi.slide`)
- **`sawari`** — interaction feedback (`sawari.item`, `sawari.nav`, `sawari.disabled`)
- **`ugoki`** — motion: CSS transitions + Framer Motion configs (`ugoki.css.{opacity,transform,duration}`, `ugoki.spring`, `ugoki.reveal`, `ugoki.popover`, `ugoki.overlay`, `ugoki.toast`, `ugoki.tooltip`, `ugoki.collapse`, `ugoki.panel`, `ugoki.inspector`)

Tier 3 (surfaces):
- **`omote`** — surface chromes (`omote.surface`, `omote.panel.{bg,chrome,base}`, `omote.popover`, `omote.glass`, `omote.backdrop.{base,glass}`, `omote.content`, `omote.tint`, `omote.skeleton`, `omote.blur.{sm,md,lg}`)
- **`kokkaku`** — skeleton placeholder dimensions per component

Tier 4 (components):
- **`kata`** — per-component styling (the recipes you are building). The control family (input, textarea, listbox, combobox, datepicker, checkbox, radio, switch, ControlFrame) shares `kata/_control` as the single source of truth for frame, surface, field, size, icon, affix, resets, and check styles. The panel family (dialog, drawer, sheet, inspector) shares `kata/_panel` (`definePanelRecipe`) for the slot surface (title, description, header, body, actions, close).

Lower tiers never import from higher tiers.

**Example — plain slots object (no variants).** Use when styling is purely slot classes.
```ts
import { iro } from '../iro'
import { ji } from '../ji'
import { kumi } from '../kumi'

export const card = {
  header: ['px-4 pt-4 pb-0', iro.text.default],
  title: ['font-semibold', ji.size.md],
  description: [ji.size.sm, iro.text.muted],
  body: 'p-4',
  footer: ['px-4 pb-4 pt-0', 'flex items-center', kumi.gap.md],
}
```

**Example — `tv()` with variant + color + size.** Use `iro.palette.*` with `merge` to build the palette map, then pass it to `colorVariants` to generate the `color` scaffold and `compoundVariants`.
```ts
import { tv, type VariantProps } from 'tailwind-variants'
import { colorVariants } from '../../core/recipe'
import { iro, merge } from '../iro'
import { ji } from '../ji'
import { kumi } from '../kumi'

const { solid, soft, outline, plain } = iro.palette

const { color, compoundVariants } = colorVariants({
  solid: merge(solid.bg, solid.text),
  soft: merge(soft.bg, soft.text),
  outline: merge(outline.ring, outline.text),
  plain: plain.text,
})

const size = {
  xs: ['px-1 py-0.5', kumi.gap.xs, ji.size.xs, '*:data-[slot=icon]:size-3'],
  sm: ['px-1.5 py-0.5', kumi.gap.sm, ji.size.sm, '*:data-[slot=icon]:size-4'],
  md: ['px-2 py-0.5', kumi.gap.md, ji.size.md, '*:data-[slot=icon]:size-3.5'],
}

export const badge = tv({
  base: ['group inline-flex w-fit items-center', 'font-medium'],
  variants: {
    variant: {
      solid: '',
      soft: '',
      outline: 'ring-1 ring-inset',
      plain: '',
    },
    color,
    size,
  },
  compoundVariants,
  defaultVariants: { variant: 'soft', color: 'zinc', size: 'md' },
})

export type BadgeVariants = VariantProps<typeof badge>
```

**Example — variants without color.** Skip `colorVariants`; use `tv()` directly.
```ts
import { tv, type VariantProps } from 'tailwind-variants'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { sen } from '../sen'

export const accordion = tv({
  base: 'flex flex-col',
  variants: {
    variant: {
      separated: kumi.gap.sm,
      outline: ['overflow-hidden', maru.rounded.lg, ...sen.border, 'divide-y divide-zinc-950/10', 'dark:divide-white/10'],
      plain: ['divide-y divide-zinc-950/10', 'dark:divide-white/10'],
    },
  },
  defaultVariants: { variant: 'separated' },
})

export type AccordionVariants = VariantProps<typeof accordion>
```

**Example — `tv()` recipe + slots object.** Export both.
```ts
import { tv, type VariantProps } from 'tailwind-variants'
import { colorVariants } from '../../core/recipe'
import { iro, merge } from '../iro'
import { ji } from '../ji'
import { kumi } from '../kumi'
import { maru } from '../maru'

const { solid, soft, outline, plain } = iro.palette

const { color, compoundVariants } = colorVariants({
  solid: merge(solid.bg, solid.text),
  soft: merge(soft.bg, soft.text),
  outline: merge(outline.ring, outline.text),
  plain: plain.text,
})

export const alert = tv({
  base: ['flex w-fit', 'px-4 py-3.5', kumi.gap.md, ji.size.md, maru.rounded.lg],
  variants: {
    variant: {
      solid: '',
      soft: '',
      outline: 'ring-1 ring-inset',
      plain: '',
    },
    color,
  },
  compoundVariants,
  defaultVariants: { variant: 'soft', color: 'zinc' },
})

/** Slot classes for sub-elements — plain object, not tv(). */
export const slots = {
  icon: 'shrink-0',
  title: [ji.size.lg, 'font-semibold'],
  description: '',
  content: 'flex flex-col flex-1 min-w-0',
  actions: ['mt-2 flex items-center', kumi.gap.sm],
}

export type AlertVariants = VariantProps<typeof alert>
```

Then register in `src/recipes/kata/index.ts`:
- Import the new recipe
- Add it to the `kata` object (alphabetical order)

### 2. Extend Tier 1 / Tier 2 recipes only if strictly needed

Most components only need to compose existing atoms. Only add a new entry to a Tier 1/2 recipe if your size/color/palette/arrangement token will be reused by another component.

- Need a dimension not covered by `take.icon/avatar/panel/popup/scrollArea/combobox/listbox`? Add a new submodule under `src/recipes/take/` and expose it in `take`.
- Need a new palette variant not in `iro.palette.{solid,soft,outline,plain}`? Discuss before adding — the palette shape is load-bearing.
- Component-local sizing presets (e.g. `button`'s `xs/sm/md/lg` density) now live **inside that component's kata recipe**, not in `take`.

### 3. Create `variants.ts`

The `variants.ts` file is a thin re-export layer. All variant logic lives in the kata recipe. Two common shapes:

**Pattern A — slots-only recipe (plain object).** Use when the recipe is just a slot map.
```ts
import { kata } from '../../recipes'

export const k = kata.<name>
```

**Pattern B — single `tv()` recipe (with optional slots).**
```ts
export {
  type <Name>Variants,
  <name> as <name>Variants,
  slots as k,  // omit if the recipe has no `slots` export
} from '../../recipes/kata/<name>'
```

**Pattern C — multiple `tv()` recipes** (root + sub-component — e.g. accordion):
```ts
export {
  type AccordionItemVariants,
  type AccordionVariants,
  accordion as accordionVariants,
  accordionItem as accordionItemVariants,
  slots as k,
} from '../../recipes/kata/accordion'
```

### 4. Create the component file

Name the file after the component: `<name>.tsx` (e.g. `badge.tsx`, `alert.tsx`, `tree.tsx`).

Conventions:
- Import `cn` from `../../core`
- Import slot classes as `k` from `./variants`
- Import primitives from `../../primitives` (`Polymorphic`, `Overlay`, `ControlFrame`, `TouchTarget`, `createPanel`, `Link`, …)
- Import hooks from `../../hooks` (`useControllable`, `useFloatingPanel`, `useRoving`, …)
- Import recipes from `../../recipes` when referencing `ugoki`, `kokkaku`, etc. directly
- Import the variant function + type from `./variants`
- Use `data-slot="<name>"` on the root element (kebab-case for compound slots like `card-header`)
- Accept `className?: string` and merge with `cn(variantFn({ ...variants }), className)`
- Spread remaining props onto the root element
- Export named function components (no default exports)
- Export prop types explicitly
- Add `'use client'` only when the component uses hooks, event handlers, or motion

**Simple presentational component (polymorphic, uses `Polymorphic`):**
```tsx
import { cn } from '../../core'
import { Polymorphic, type PolymorphicProps } from '../../primitives'
import { type <Name>Variants, <name>Variants } from './variants'

type <Name>BaseProps = <Name>Variants & {
  className?: string
}

export type <Name>Props = <Name>BaseProps & PolymorphicProps<'span'>

export function <Name>({
  variant,
  color,
  size,
  className,
  children,
  href,
  ...props
}: <Name>Props) {
  return (
    <Polymorphic
      as="span"
      dataSlot="<name>"
      href={href}
      className={cn(<name>Variants({ variant, color, size }), className)}
      {...props}
    >
      {children}
    </Polymorphic>
  )
}
```

**Compound component with slot sub-components.** The root component lives in `<name>.tsx`; each sub-component lives in its own file (e.g. `card-header.tsx`) and imports `k` from `./variants`:
```tsx
// card-header.tsx
import { cn } from '../../core'
import { k } from './variants'
import type { ComponentPropsWithoutRef } from 'react'

export type CardHeaderProps = { className?: string } & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div data-slot="card-header" className={cn(k.header, className)} {...props}>
      {children}
    </div>
  )
}
```

**Interactive component (overlays, motion, state).** Mark `'use client'`:
```tsx
'use client'

import { motion } from 'motion/react'
import { cn } from '../../core'
import { Overlay } from '../../primitives'
import { ugoki } from '../../recipes'
import { useControllable } from '../../hooks'
// ...
```

### 5. Create `context.ts` (if needed)

Use the typed `createContext` helper from core — it throws on missing provider, so consumers don't have to null-check:
```ts
'use client'

import { createContext } from '../../core/create-context'

export type <Name>ContextValue = {
  // shared state
}

export const [<Name>Provider, use<Name>] = createContext<<Name>ContextValue>('<Name>')
```

### 6. Create `index.ts`

Re-export all public API:
```ts
export { <Name>, type <Name>Props } from './<name>'
export { type <Name>Variants, <name>Variants } from './variants'
```

For compound components, export every sub-component and its prop types. For components with context, also export the context type and hook if they are part of the public API.

### 7. Register the package export

Add an entry to `packages/ui/package.json` under `"exports"`, in alphabetical order:
```json
"./<name>": {
  "types": "./src/components/<name>/index.ts",
  "default": "./src/components/<name>/index.ts"
}
```

### 8. Create the demo page

Add a new file at `src/docs/demos/<name>.tsx`. This is **required** for every new component.

The demo system is auto-discovered via `import.meta.glob('./demos/*.tsx')` in `docs/registry.ts` — creating the file registers it in the sidebar.

**Structure:**
- Export a `meta` object with a `category` field
- Export a default function `<Name>Demo`
- Wrap sections in the `Example` component from `../components/example`
- Use layout components (`Stack`, `Flex`, `Box`, `Sizer`) — do not hand-write `<div className="space-y-8">` or `<div className="flex flex-wrap gap-2">`
- `Example` automatically derives its code block from `children` via `deriveCode` — only pass an explicit `code` prop (via the `code` tagged template from `../code`) when the rendered children don't match the snippet you want to show (e.g. when the demo wraps state in a helper component)

**Categories** (from `docs/registry.ts` — `categoryOrder`):
`'Forms'` | `'Button'` | `'Input'` | `'Password'` | `'Data Display'` | `'Table'` | `'Feedback'` | `'Overlay'` | `'Navigation'` | `'Layout'` | `'Pages'` | `'Chat'` | `'Shipments'` | `'Other'`

**Interactive controls** (optional, from `../components/`):
- `VariantListbox` — dropdown to switch between variant values
- `SizeListbox` — dropdown to switch between size values
- `ColorListbox` — dropdown to switch between colors
- `ValueStepper` — numeric stepper

**Pattern — simple presentational:**
```tsx
import { <Name> } from '../../components/<name>'
import { Flex } from '../../components/flex'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: '<Category>' }

export default function <Name>Demo() {
  return (
    <Stack gap={6}>
      <Example title="Default">
        <<Name>>Example</<Name>>
      </Example>
    </Stack>
  )
}
```

**Pattern — variant + color with a listbox switcher:**
```tsx
'use client'

import { useState } from 'react'
import { <Name> } from '../../components/<name>'
import { Flex } from '../../components/flex'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'
import { VariantListbox } from '../components/variant-listbox'

export const meta = { category: '<Category>' }

const variants = ['solid', 'soft', 'outline', 'plain'] as const
const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

export default function <Name>Demo() {
  const [variant, setVariant] = useState<(typeof variants)[number]>('solid')

  return (
    <Stack gap={6}>
      <Example title="Variants">
        <Flex wrap gap={2}>
          {variants.map((v) => (
            <<Name> key={v} variant={v}>{v}</<Name>>
          ))}
        </Flex>
      </Example>

      <Example
        title="Colors"
        actions={<VariantListbox variants={variants} value={variant} onChange={setVariant} />}
      >
        <Flex wrap gap={2}>
          {colors.map((c) => (
            <<Name> key={c} variant={variant} color={c}>{c}</<Name>>
          ))}
        </Flex>
      </Example>
    </Stack>
  )
}
```

**Pattern — compound component:**
```tsx
import { <Name>, <Name>Header, <Name>Body } from '../../components/<name>'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: '<Category>' }

export default function <Name>Demo() {
  return (
    <Stack gap={6}>
      <Example title="Default">
        <<Name>>
          <<Name>Header>Title</<Name>Header>
          <<Name>Body>Content</<Name>Body>
        </<Name>>
      </Example>
    </Stack>
  )
}
```

**Pattern — interactive demo with a helper component (use `code` override so the sidebar shows the intended snippet):**
```tsx
'use client'

import { useState } from 'react'
import { Button } from '../../components/button'
import { <Name> } from '../../components/<name>'
import { Stack } from '../../components/stack'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Overlay' }

function <Name>Demo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <<Name> open={open} onOpenChange={setOpen}>...</<Name>>
    </>
  )
}

export default function Demo() {
  return (
    <Stack gap={6}>
      <Example
        title="Default"
        code={code`
          import { <Name> } from 'ui/<name>'

          <<Name> open={open} onOpenChange={setOpen}>...</<Name>>
        `}
      >
        <<Name>Demo />
      </Example>
    </Stack>
  )
}
```

**Guidelines:**
- One `Example` block per feature (variants, colors, sizes, composition)
- Use layout components (`Stack`, `Flex`, `Box`) rather than raw divs
- Keep demos concise — demonstrate the API, not every permutation
- Compose with other UI components (`Button`, `Text`, `Badge`, …) in at least one example when it makes sense
- Add `'use client'` only when the demo uses hooks

### 9. Create the test file

This is **required** for every new component. Use the `/ui-testing` skill:

```
/ui-testing <name>
```

The skill creates `src/__tests__/components/<name>.test.tsx` following all established patterns and verifies it passes.

### 10. Run code audit (REQUIRED — do this before committing)

Run `/ui-audit-code` scoped to the new component:

```
/ui-audit-code <name>
```

This verifies all files follow established code patterns: barrel exports, variant wiring, component conventions, naming, imports, and test coverage. Fix any issues it finds before committing.

---

## Existing components (for reference and composition)

accordion, address-input, alert, aspect-ratio, avatar, badge, banner, bottom-nav, box, breadcrumb, button, calendar, card, chat-message, chat-prompt, checkbox, code, collapse, column-manager, combobox, command-palette, container, control, copy-button, credit-card-input, currency-input, data-table, datepicker, dialog, divider, dl, drawer, editable-grid, fieldset, file-upload, filters, flex, form, frame, glass, grid, heading, hold-button, icon, input, inspector, json-tree, kanban, kbd, layouts, list, listbox, map, menu, nav, navbar, number-input, odometer, pagination, password-confirm, password-input, password-strength, pdf-viewer, phone-input, pivot-table, placeholder, popover, progress, query-builder, radio, resizable, scroll-area, search-input, segment, select, sheet, sidebar, signature-pad, sizer, skeleton, slider, spacer, spinner, split, stack, stat, status, stepper, switch, table, tabs, tag-input, text, textarea, timeline, toast, toc, toggle-icon-button, toolbar, tooltip, tree, zipcode-input

## Available primitives (from `src/primitives`)

- **Polymorphic** — renders as `Link` when `href` is provided, otherwise as the fallback element
- **Link / LinkProvider / useLink** — polymorphic link (defaults to `<a>`, override via provider)
- **ControlFrame** — shared wrapper for form inputs (border, focus ring, disabled)
- **Overlay** — portal + backdrop + escape-key + scroll-lock for modals
- **TouchTarget** — invisible touch-area expander for small interactive elements
- **ToggleField / ToggleGroup** — layout wrappers for checkbox/radio/switch fields
- **createPanel** — factory returning `{ Title, Description, Body, Actions }` for panel-like components (dialog, sheet, drawer). Pair with `panelTitleVariants` / `panelBodyVariants` / etc. re-exported from the same module
- **PanelA11yProvider / usePanelA11yScope / useDescriptionRegistration** — a11y wiring for panel composition
- **PopoverPanel** — pre-styled popover panel surface
- **BaseOption / OptionLabel / OptionDescription / createSelectOption** — building blocks for listbox/combobox/select options
- **ActiveIndicator / ActiveIndicatorScope / useActiveIndicator** — layout-animated active state indicator
- **ReadyReveal** — crossfade from a placeholder to real content once `ready` flips
- **CurrentProvider / useCurrent / useCurrentContext / createCurrentContent** — "current item" context for tabs / navs / steppers
- **OffcanvasContext / OffcanvasProvider / useOffcanvas** — shared context for offcanvas surfaces
- **useRipple** — tap ripple effect
- **springProps** — spreadable motion props for a press-scale spring effect

## Available hooks (from `src/hooks`)

- **useControllable** — controlled/uncontrolled state management
- **useDeferredToggle** — toggle with deferred commit
- **useDismissable** — outside-click / escape dismissal
- **useFloatingUI / useFloatingPanel** — Floating UI positioning + panel state
- **useFocusTrap** — focus trap for modal surfaces
- **useHasHover** — hover-capability detection
- **useIdScope** — ID generation for a11y relationships
- **useRoving / useInputTagKeyboard** — roving-focus keyboard navigation (replaces older `useRovingFocus`/`useRovingActive`)
- **useKeyboardSettled** — wait for keyboard activity to settle
- **useMaskedInput** — masked text input
- **useMediaQuery** — subscribe to a CSS media query
- **useMinWidth** — min-width viewport query (thin wrapper over `useMediaQuery`)
- **useOffcanvas** — offcanvas surface state
- **useScrollIntoContainer** — scroll an item into its container
- **useSortableItem / useSortableList / useSortableSensors** — drag-and-drop sorting

## Recipe tier system

| Tier | Recipe | Concern |
|------|--------|---------|
| 1 | `iro` | color (text, bg, palette) |
| 1 | `ji` | typography |
| 1 | `kumi` | layout scaffolding (gap / direction / align / justify) |
| 1 | `ma` | padding / margin |
| 1 | `maru` | border radius |
| 1 | `sen` | lines: borders / rings / dividers / focus / forced-colors |
| 1 | `take` | dimension scales |
| 2 | `narabi` | sibling arrangement |
| 2 | `sawari` | interaction feedback (hover, press, selection, disabled, glass-item) |
| 2 | `ugoki` | motion (CSS transitions + Framer Motion) |
| 3 | `omote` | surface chromes (incl. backdrop blur) |
| 3 | `kokkaku` | skeleton placeholder dimensions |
| 4 | `kata` | per-component styling (control family shares `kata/_control`, panel family shares `kata/_panel`) |

Lower tiers never import from higher tiers.

## Core utilities (from `src/core`)

- **`cn(...inputs)`** — `clsx` + `tailwind-merge`
- **`createContext<T>(name)`** — typed context factory that throws on missing provider
- **`colorVariants(map, extra?)`** — from `core/recipe`. Turns a `{ variant → palette }` map into the `color` scaffold and `compoundVariants` that `tv()` needs. Palette color keys are inferred, so passing `iro.palette.solid.*` composed via `merge` just works.
- **`defineColors(map)`** — from `core/recipe`. Builds a color-keyed class map with automatic dark-mode composition via `mode()`.
- **`mode(light, dark)`** — from `core/recipe`. Composes light + dark class fragments.
- **`merge(...maps)`** (from `recipes/iro`) — merges multiple palette slot maps into one per-color class list.

---

## Checklist

Before finishing, verify:
- [ ] **Composition audit done (Step 0).** Every existing component that could have been composed was composed. No duplicated `Overlay` + `motion` + `ugoki` wrappers, no raw `<input>`/`<button>` where `Input`/`Button` fit, no reimplementations of keyboard nav that `Listbox`/`Combobox`/`Menu` already provide.
- [ ] **No parallel panel recipes.** If the component renders inside a dialog/sheet/drawer/popover, it reuses `createPanel` + the shared panel variant exports rather than defining its own panel recipe.
- [ ] Kata recipe created and registered in `kata/index.ts` (alphabetical) — **only if the component introduces genuinely new styling not available through composition**
- [ ] `variants.ts` re-exports from the kata recipe (variant function aliased as `<name>Variants`, slots aliased as `k`). For slots-only recipes, `variants.ts` pulls from the top-level `kata` barrel: `export const k = kata.<name>`.
- [ ] Component file is named `<name>.tsx` (not `component.tsx`); compound sub-components each live in `<name>-<slot>.tsx`
- [ ] Component follows conventions (`data-slot`, `cn`, `className` merge, prop spreading, named exports, explicit prop types)
- [ ] `index.ts` barrel exports all public API (components, prop types, variant types, variant functions, context types/hooks if public)
- [ ] `package.json` export entry added (alphabetical)
- [ ] Demo page created at `src/docs/demos/<name>.tsx` with correct `meta.category`, uses `Stack`/`Flex` (not raw divs), lets `Example` auto-derive code by default
- [ ] Test file created via `/ui-testing` at `src/__tests__/components/<name>.test.tsx`
- [ ] Code audit passed via `/ui-audit-code <name>`
- [ ] No unused imports or dead code
- [ ] `'use client'` only added when actually needed (hooks, event handlers, motion)
- [ ] Diff read as a reviewer: if the component is longer than the closest existing analog, justify why or shrink it by composing more
