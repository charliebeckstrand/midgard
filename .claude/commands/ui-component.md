# Create UI Component

TRIGGER when: the user asks to create, add, build, or scaffold a new UI component in `packages/ui`.

You are creating a new component inside the `packages/ui` package of this monorepo. Follow the architecture, conventions, and patterns described below exactly.

## Arguments

$ARGUMENTS

---

## Package structure

```
packages/ui/
  package.json
  tsup.config.ts
  src/
    index.ts                  # Re-exports core utilities only
    core/                     # cn, colorCva, colorKeys, compoundColors, createContext, Link
    primitives/               # Reusable building blocks (Polymorphic, Overlay, FormControl, etc.)
    recipes/                  # Design token layers (katachi, nuri, take, kage, etc.)
    hooks/                    # Shared hooks (useControllable, useOverlay, useIsDesktop, etc.)
    components/<name>/        # Each component lives here
```

## Component directory structure

Every component lives in `src/components/<name>/` with these files:

| File | Purpose | Required |
|------|---------|----------|
| `component.tsx` | The React component(s) | Always |
| `variants.ts` | CVA variant definitions using recipes | When the component has visual variants |
| `index.ts` | Barrel file re-exporting everything | Always |
| `context.ts` | React context (createContext or raw) | Only when sub-components need shared state |
| `slots.tsx` | Panel slot components via `createPanelSlots` | Only for panel-like components (dialog, sheet, drawer) |

For components with multiple distinct sub-components (e.g. dialog has `dialog.tsx` + `confirm.tsx` + `slots.tsx`), name the main component file after the component instead of `component.tsx`.

---

## Step-by-step instructions

### 1. Create the katachi recipe (if the component needs styling)

Add a new file at `src/recipes/katachi/<name>.ts`.

**Pattern** — compose from lower-tier recipes:
- **`kage`** (Tier 1) — borders, shadows, rings, dividers
- **`ki`** (Tier 1) — focus rings and indicators
- **`maru`** (Tier 1) — border-radius (`rounded`, `roundedMd`, `roundedFull`)
- **`sumi`** (Tier 1) — text/ink colors (`text`, `textMuted`, `textError`)
- **`yasumi`** (Tier 1) — disabled states
- **`nuri`** (Tier 1) — color fills (`solid`, `soft`, `outline`, `text`, `buttonSolid`, etc.)
- **`take`** (Tier 1) — sizing/density tokens (`px`, `py`, `gap`, `text`, `control`, `button`, etc.)
- **`omote`** (Tier 2) — surfaces/backgrounds (`panel`, `popover`, `backdrop`, `surface`)
- **`sawari`** (Tier 2) — hover/press/selection responses (`item`, `nav`, `tab`)
- **`narabi`** (Tier 2) — layout arrangement (`field`, `toggle`, `panel`, `placement`)
- **`katachi`** (Tier 3) — the component forms you are building

Example (simple component with variant + color + size):
```ts
import { maru } from '../maru'
import { nuri } from '../nuri'
import { take } from '../take'

export const badge = {
  base: 'group inline-flex items-center font-medium',
  variant: {
    solid: {
      base: ['border border-transparent', maru.roundedMd],
      color: nuri.solid,
    },
    soft: {
      base: ['border border-transparent', maru.roundedMd],
      color: nuri.soft,
    },
  },
  size: take.badge,
  defaults: { variant: 'soft' as const, color: 'zinc' as const, size: 'md' as const },
}
```

Example (simple component without color variants):
```ts
import { kage } from '../kage'
import { maru } from '../maru'
import { sumi } from '../sumi'

export const card = {
  base: ['overflow-hidden', maru.rounded],
  variant: {
    solid: ['bg-zinc-100 dark:bg-zinc-800', kage.border],
    outline: [kage.border],
  },
  header: ['px-5 pt-5 pb-0', sumi.text],
  title: 'text-base/6 font-semibold',
  description: ['mt-1 text-sm/5', sumi.textMuted],
  body: 'px-5 py-5',
  footer: ['px-5 pt-0 pb-5', 'flex items-center gap-3'],
  defaults: { variant: 'solid' as const },
}
```

Then register it in `src/recipes/katachi/index.ts`:
- Import the new recipe
- Add it to the `katachi` object (alphabetical order)

### 2. Add sizing tokens to `take` (if needed)

If your component needs size variants not covered by existing `take` entries (`button`, `badge`/`chip` via `compact`, `control`, `avatar`, `panel`, `popup`), add a new size map in `src/recipes/take/` and export it from the `take` object.

### 3. Add color tokens to `nuri` (if needed)

If your component needs a unique color palette not covered by existing `nuri` entries (`solid`, `soft`, `outline`, `text`, `buttonSolid`, `buttonSoft`, `buttonOutline`, `buttonPlain`, `buttonGhost`, `checkbox`, `radio`, `switch`), define new color tokens via `defineColors` in `src/recipes/nuri/` and export from the `nuri` object.

### 4. Create `variants.ts`

Use CVA (`class-variance-authority`) to wire katachi tokens into variant functions.

**Pattern for components with variant + color**:
```ts
import { cva, type VariantProps } from 'class-variance-authority'
import { colorKeys, compoundColors } from '../../core'
import { katachi } from '../../recipes'

const k = katachi.<name>

type Variant = keyof typeof k.variant
type Color = keyof (typeof k.variant)['solid']['color']

const variantBase = Object.fromEntries(
  Object.entries(k.variant).map(([key, { base }]) => [key, base]),
) as unknown as Record<Variant, string | string[]>

const variantColors = Object.fromEntries(
  Object.entries(k.variant).map(([key, { color }]) => [key, color]),
) as Record<Variant, Record<Color, string | string[]>>

export const <name>Variants = cva(k.base, {
  variants: {
    variant: variantBase,
    color: colorKeys(k.variant.solid.color),
    size: k.size,
  },
  compoundVariants: compoundColors(variantColors),
  defaultVariants: k.defaults,
})

export type <Name>Variants = VariantProps<typeof <name>Variants>
```

**Pattern for components with simple variants (no color)**:
```ts
import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.<name>

export const <name>Variants = cva(k.base, {
  variants: {
    variant: k.variant,
  },
  defaultVariants: k.defaults,
})

export type <Name>Variants = VariantProps<typeof <name>Variants>
```

**Pattern for color-only components** (like checkbox, switch):
```ts
import { colorCva, type ColorCvaVariants } from '../../core'
import { katachi } from '../../recipes'

const k = katachi.<name>

export const <name>Variants = colorCva(k.base, nuri.<name>)
export type <Name>Variants = ColorCvaVariants
```

### 5. Create `component.tsx`

Follow these conventions:
- Import `cn` from `../../core`
- Import recipes from `../../recipes` when accessing slot classes directly (e.g., `katachi.<name>.header`)
- Import primitives from `../../primitives` as needed (`Polymorphic`, `FormControl`, `Overlay`, `TouchTarget`, etc.)
- Import variant functions from `./variants`
- Use `data-slot="<name>"` on the root element (kebab-case for compound slots like `card-header`)
- Accept `className?: string` and merge with `cn(variantFn({ ...variants }), className)`
- Spread remaining props onto the root element
- Export named function components (no default exports)
- Export prop types explicitly
- Add `'use client'` directive only when the component uses hooks, event handlers, or motion

**Simple component** (presentational, polymorphic):
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

**Compound component** (with sub-components using slot classes from katachi):
```tsx
import { cn } from '../../core'
import { katachi } from '../../recipes'
import { type <Name>Variants, <name>Variants } from './variants'

const k = katachi.<name>

export type <Name>Props = <Name>Variants & {
  className?: string
  children?: React.ReactNode
}

export function <Name>({ variant, className, children }: <Name>Props) {
  return (
    <div data-slot="<name>" className={cn(<name>Variants({ variant }), className)}>
      {children}
    </div>
  )
}

export type <Name>HeaderProps = { className?: string; children?: React.ReactNode }

export function <Name>Header({ className, children }: <Name>HeaderProps) {
  return (
    <div data-slot="<name>-header" className={cn(k.header, className)}>
      {children}
    </div>
  )
}
// ... additional sub-components for each slot
```

**Interactive component** (with overlays, motion, state):
```tsx
'use client'

import { motion } from 'motion/react'
import { cn } from '../../core'
import { Overlay } from '../../primitives'
import { ugoki } from '../../recipes'
import { type <Name>Variants, <name>Variants } from './variants'

// ... component implementation
```

### 6. Create `context.ts` (if needed)

For sharing state between parent and sub-components:
```ts
'use client'

import { createContext, useContext } from 'react'

type <Name>Context = { /* shared state */ }

const <Name>Context = createContext<<Name>Context | undefined>(undefined)

export const <Name>Provider = <Name>Context.Provider

export function use<Name>Context(): <Name>Context | undefined {
  return useContext(<Name>Context)
}
```

Or use the typed `createContext` helper from core:
```ts
import { createContext } from '../../core'

export const [<Name>Provider, use<Name>] = createContext<<Name>ContextType>('<Name>')
```

### 7. Create `index.ts`

Re-export all public API:
```ts
export { <Name>, type <Name>Props } from './component'
export { type <Name>Variants, <name>Variants } from './variants'
```

For compound components, export all sub-components and their prop types.

### 8. Register the package export

Add an entry to `package.json` under `"exports"`:
```json
"./<name>": {
  "types": "./src/components/<name>/index.ts",
  "default": "./src/components/<name>/index.ts"
}
```

Place it in alphabetical order among the existing component exports.

### 9. Create the demo page

Add a new file at `src/docs/demos/<name>.tsx`. This is **required** for every new component.

The demo system is auto-discovered — `app.tsx` uses `import.meta.glob('./demos/*.tsx', { eager: true })` so simply creating the file registers it in the sidebar.

**Structure:**
- Export a `meta` object with a `category` field
- Export a default function `<Name>Demo`
- Use the `Example` component to wrap each demo section
- Use the `code` tagged template literal for code snippets
- Import components from their relative path (`../../components/<name>`)
- Import `code` from `../code` and `Example` from `../example`

**Categories** (pick the most appropriate):
`'Base'` | `'Forms'` | `'Data Display'` | `'Feedback'` | `'Overlay'` | `'Navigation'` | `'Layout'` | `'Other'`

**Interactive controls** (optional, for demos that switch variants/sizes):
- `VariantListbox` from `../variant-listbox` — dropdown to switch between variant values
- `SizeListbox` from `../size-listbox` — dropdown to switch between size values

**Pattern — simple presentational component:**
```tsx
import { <Name> } from '../../components/<name>'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: '<Category>' }

export default function <Name>Demo() {
  return (
    <div className="space-y-8">
      <Example
        title="Default"
        code={code`
          import { <Name> } from 'ui/<name>'

          <<Name>>Example</<Name>>
        `}
      >
        <<Name>>Example</<Name>>
      </Example>
    </div>
  )
}
```

**Pattern — component with variant + color:**
```tsx
'use client'

import { useState } from 'react'
import { <Name> } from '../../components/<name>'
import { code } from '../code'
import { Example } from '../example'
import { VariantListbox } from '../variant-listbox'

export const meta = { category: '<Category>' }

const variants = ['solid', 'soft', 'outline'] as const
const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function <Name>Demo() {
  const [variant, setVariant] = useState<(typeof variants)[number]>('solid')

  return (
    <div className="space-y-8">
      <Example
        title="Variants"
        code={code`
          import { <Name> } from 'ui/<name>'

          ${variants.map((v) => `<<Name> variant="${v}">${cap(v)}</<Name>>`)}
        `}
      >
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => (
            <<Name> key={v} variant={v}>{v}</<Name>>
          ))}
        </div>
      </Example>
      <Example
        title="Colors"
        actions={<VariantListbox variants={variants} value={variant} onChange={setVariant} />}
        code={code`
          import { <Name> } from 'ui/<name>'

          ${colors.map((c) => `<<Name> variant="${'${variant}'}" color="${c}">${cap(c)}</<Name>>`)}
        `}
      >
        <div className="flex flex-wrap gap-2">
          {colors.map((c) => (
            <<Name> key={c} variant={variant} color={c}>{c}</<Name>>
          ))}
        </div>
      </Example>
    </div>
  )
}
```

**Pattern — compound component:**
```tsx
import { <Name>, <Name>Header, <Name>Body } from '../../components/<name>'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: '<Category>' }

export default function <Name>Demo() {
  return (
    <div className="space-y-8">
      <Example
        title="Basic"
        code={code`
          import { <Name>, <Name>Header, <Name>Body } from 'ui/<name>'

          <<Name>>
            <<Name>Header>Title</<Name>Header>
            <<Name>Body>Content</<Name>Body>
          </<Name>>
        `}
      >
        <<Name>>
          <<Name>Header>Title</<Name>Header>
          <<Name>Body>Content</<Name>Body>
        </<Name>>
      </Example>
    </div>
  )
}
```

**Pattern — interactive/overlay component:**
```tsx
import { useState } from 'react'
import { Button } from '../../components/button'
import { <Name> } from '../../components/<name>'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Overlay' }

export default function <Name>Demo() {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-8">
      <Example
        title="Default"
        code={code`
          import { <Name> } from 'ui/<name>'
          import { Button } from 'ui/button'

          <Button onClick={() => setOpen(true)}>Open <Name></Button>
          <<Name> open={open} onClose={() => setOpen(false)}>
            ...
          </<Name>>
        `}
      >
        <Button onClick={() => setOpen(true)}>Open <Name></Button>
        <<Name> open={open} onClose={() => setOpen(false)}>
          ...
        </<Name>>
      </Example>
    </div>
  )
}
```

**Guidelines:**
- Show each major feature in its own `Example` block (variants, colors, sizes, composition with other components)
- Code snippets should use the package import path (`'ui/<name>'`), not the relative path
- Keep demos concise — demonstrate the API, not every permutation
- Compose with existing components (Button, Text, Badge, etc.) in at least one example when it makes sense
- Add `'use client'` only when the demo uses `useState` or other hooks

---

## Existing components (for reference and composition)

alert, avatar, badge, breadcrumb, button, calendar, card, checkbox, chip, combobox, datepicker, dialog, disclosure, divider, dl, drawer, dropdown, fieldset, grid, heading, icon, input, listbox, navbar, pagination, placeholder, popover, progress, radio, select, sheet, shiny-text, sidebar, status, switch, table, tabs, text, textarea, timeline, toast, tooltip

## Available primitives

- **Polymorphic** — renders as `<Link>` when `href` is provided, otherwise as the fallback element
- **FormControl** — shared wrapper for form inputs (border, focus ring, disabled)
- **Overlay** — portal + backdrop + escape-key + scroll-lock for modals
- **TouchTarget** — invisible touch-area expander for small interactive elements
- **ToggleField / ToggleGroup** — layout wrappers for checkbox/radio/switch fields
- **createPanelSlots** — generates Title/Description/Body/Actions for panel-like components
- **createNavItem** — factory for sidebar/navbar navigation items
- **createSelectOption** — factory for select/listbox/combobox option rendering
- **ContentReveal** — animated content reveal with motion
- **ActiveIndicator** — layout-animated active state indicator
- **useRipple / useTap** — touch feedback primitives
- **form** — shared form class compositions (control, inputBase, hidden, check, checkSurface)

## Available hooks

- **useControllable** — controlled/uncontrolled state management
- **useOverlay** — overlay open/close state
- **useIsDesktop** — responsive breakpoint detection
- **useHasHover** — hover capability detection
- **useArrowAction** — arrow key navigation
- **useMenuKeyboard** — keyboard navigation for menus

## Recipe tier system

| Tier | Recipe | Concern | Description |
|------|--------|---------|-------------|
| 1 | `kage` | edge | Borders, shadows, rings, dividers |
| 1 | `ki` | focus | Focus rings and indicators |
| 1 | `maru` | shape | Border radius tokens |
| 1 | `sumi` | color | Text/ink colors |
| 1 | `yasumi` | disabled | Disabled opacity and cursor |
| 1 | `nuri` | color | Color fills (solid, soft, outline, etc.) |
| 1 | `take` | sizing | Sizing and density tokens |
| 2 | `omote` | surface | Backgrounds, panels, backdrops, popovers |
| 2 | `sawari` | interaction | Hover, press, selection feedback |
| 2 | `narabi` | layout | Element arrangement and slot relationships |
| 2 | `ugoki` | animation | Motion configs for enter/exit/slide |
| 3 | `katachi` | form | Complete component styling recipes |

Lower tiers never import from higher tiers. Katachi (Tier 3) composes everything below it.

## Core utilities

- **`cn(...inputs)`** — `clsx` + `tailwind-merge` for class composition
- **`colorKeys(tokenMap)`** — creates empty CVA variant entries from a nuri color token map
- **`compoundColors(mapping)`** — generates CVA compound variant entries for variant x color
- **`colorCva(base, tokenMap)`** — standalone CVA with a single color dimension
- **`createContext(name)`** — typed context factory that throws on missing provider
- **`Link` / `LinkProvider`** — polymorphic link component (defaults to `<a>`, configurable via provider)

---

## Checklist

Before finishing, verify:
- [ ] Katachi recipe created and registered in `katachi/index.ts` (alphabetical)
- [ ] `variants.ts` uses CVA with correct pattern for the variant type
- [ ] `component.tsx` follows conventions (data-slot, cn, className merge, prop spreading)
- [ ] `index.ts` barrel exports all public API (components, props types, variant types, variant functions)
- [ ] `package.json` export entry added (alphabetical)
- [ ] Demo page created at `src/docs/demos/<name>.tsx` with correct `meta.category`
- [ ] No unused imports or dead code
- [ ] `'use client'` only added when actually needed (hooks, event handlers, motion)
- [ ] Existing primitives, recipes, and hooks used where applicable (no reinventing)
