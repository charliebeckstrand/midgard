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
    core/                     # cn, colorMatrix, createContext, Link
    primitives/               # Reusable building blocks (Polymorphic, Overlay, ControlFrame, etc.)
    recipes/                  # Design token layers (katachi, nuri, take, kage, etc.)
    hooks/                    # Shared hooks (useControllable, useOverlay, useIsDesktop, etc.)
    components/<name>/        # Each component lives here
```

## Component directory structure

Every component lives in `src/components/<name>/` with these files:

| File | Purpose | Required |
|------|---------|----------|
| `component.tsx` | The React component(s) | Always |
| `variants.ts` | Re-exports recipe, variant types, and slots from katachi | When the component has visual variants |
| `index.ts` | Barrel file re-exporting everything | Always |
| `context.ts` | React context (createContext or raw) | Only when sub-components need shared state |
| `slots.tsx` | Panel slot components via `createPanelSlots` | Only for panel-like components (dialog, sheet, drawer) |

For components with multiple distinct sub-components (e.g. dialog has `dialog.tsx` + `confirm.tsx` + `slots.tsx`), name the main component file after the component instead of `component.tsx`.

---

## Step-by-step instructions

### 0. Audit existing components for composition (REQUIRED — do this first)

**Before writing any code, analyze whether the component can be built by composing existing components.** This is the most common mistake: reinventing behavior (overlays, inputs, buttons, motion, keyboard handling) that already ships as a component in this package.

Follow this reuse hierarchy — always prefer the highest level that applies:

1. **Compose existing components** (`Dialog`, `Input`, `Button`, `Popover`, `Listbox`, `Sheet`, `Drawer`, …) — the full list is under *Existing components* below
2. **Use primitives** (`Overlay`, `ControlFrame`, `Polymorphic`, `TouchTarget`, `createPanelSlots`, …) only when no component fits
3. **Use recipes/hooks** (`katachi`, `ugoki`, `useIsDesktop`, `useOverlay`, …) only when no primitive fits
4. **Write raw markup + Tailwind** only as a last resort

**Mandatory composition audit.** Before Step 1, answer these in your head (or out loud if non-obvious):

- Does the component render in a modal/overlay surface? → **Compose `Dialog`, `Sheet`, `Drawer`, or `Popover`.** Do not reach for `Overlay` + `motion` + `ugoki` directly unless you're building a brand-new overlay primitive.
- Does it contain a text input? → **Compose `Input` or `Textarea`.** Do not render raw `<input>` with custom recipe classes.
- Does it contain an action trigger? → **Compose `Button`.** Do not render styled `<button>` elements.
- Does it show a list of selectable options? → **Compose `Listbox`, `Combobox`, or `Menu`.** Do not reimplement keyboard navigation or option rendering.
- Does it need panel slots (title, description, body, actions)? → **Reuse `createPanelSlots`** (see `Dialog`, `Sheet`, `Drawer` for reference).
- Does it need polymorphic `href`/`as` behavior? → **Use `Polymorphic`.**
- Does it need a controlled/uncontrolled state pair? → **Use `useControllable`.**

If the answer to any of the above is yes and you find yourself writing `<Overlay>`, `motion.div`, `role="dialog"`, raw `<input>`, raw `<button>`, or a new `*PanelVariants` that mirrors an existing one — **stop and compose the existing component instead**.

**Worked example — CommandPalette.** A command palette is "a dialog that contains a search input and a list". The correct implementation is ~80 lines that wrap `<Dialog>` + `<DialogBody>` + `<Input>` and layer keyboard navigation on top. An earlier attempt duplicated `Dialog`'s overlay, motion, panel variants, and re-styled a raw `<input>` — doubling the line count and drifting from the design system. Do not repeat that mistake.

**When a new katachi recipe is NOT needed.** If every visual element comes from a composed component, you do not need a new recipe, variants file, or katachi registration. Skip Steps 1–4 and go straight to `component.tsx`. Only introduce a recipe when the component owns genuinely new styling (a new surface, a new layout arrangement, a new slot) that no existing recipe covers.

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

Example (component with variant + color + size — uses `tv()` + `colorMatrix`):
```ts
import { tv, type VariantProps } from 'tailwind-variants'
import { colorMatrix } from '../../core/recipe'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { take } from '../take'

export const badge = tv({
  base: ['group inline-flex w-fit items-center', 'font-medium'],
  variants: {
    variant: {
      solid: [maru.roundedMd, 'border border-transparent'],
      soft: [maru.roundedMd, 'border border-transparent'],
      outline: [maru.roundedMd, 'border'],
      plain: [maru.roundedMd, 'border border-transparent'],
    },
    color: { zinc: '', red: '', amber: '', green: '', blue: '' },
    size: take.badge,
  },
  compoundVariants: [
    ...colorMatrix('solid', nuri.solid),
    ...colorMatrix('soft', nuri.soft),
    ...colorMatrix('outline', nuri.outline),
    ...colorMatrix('plain', nuri.text),
  ],
  defaultVariants: { variant: 'soft', color: 'zinc', size: 'md' },
})

export type BadgeVariants = VariantProps<typeof badge>
```

Example (component with variant but no color — uses `tv()` directly):
```ts
import { tv, type VariantProps } from 'tailwind-variants'
import { kage } from '../kage'
import { maru } from '../maru'

export const accordion = tv({
  base: 'flex flex-col',
  variants: {
    variant: {
      separated: 'gap-2',
      bordered: ['overflow-hidden', maru.rounded, ...kage.border, 'divide-y divide-zinc-950/10', 'dark:divide-white/10'],
      plain: ['divide-y divide-zinc-950/10', 'dark:divide-white/10'],
    },
  },
  defaultVariants: { variant: 'separated' },
})

export type AccordionVariants = VariantProps<typeof accordion>
```

Example (component with slots — separate `tv()` recipes + a plain `slots` object):
```ts
import { tv, type VariantProps } from 'tailwind-variants'
import { colorMatrix } from '../../core/recipe'
import { kage } from '../kage'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { sumi } from '../sumi'
import { take } from '../take'

export const alert = tv({
  base: ['flex w-fit', 'gap-2 px-4 py-3.5', take.text.sm, maru.rounded],
  variants: {
    variant: {
      solid: ['border border-transparent', kage.shadow],
      soft: ['border border-transparent'],
      outline: ['border'],
      plain: ['border border-transparent'],
    },
    color: { zinc: '', red: '', amber: '', green: '', blue: '' },
  },
  compoundVariants: [
    ...colorMatrix('solid', nuri.solid),
    ...colorMatrix('soft', nuri.soft),
    ...colorMatrix('outline', nuri.outline),
    ...colorMatrix('plain', nuri.text),
  ],
  defaultVariants: { variant: 'soft', color: 'zinc' },
})

/** Slot classes for sub-elements — plain object, not tv(). */
export const slots = {
  icon: 'shrink-0',
  content: 'flex flex-col flex-1 min-w-0',
  title: 'text-base/6 font-semibold',
  description: 'leading-loose',
  actions: 'mt-2 flex items-center gap-1',
}

export type AlertVariants = VariantProps<typeof alert>
```

Then register it in `src/recipes/katachi/index.ts`:
- Import the new recipe
- Add it to the `katachi` object (alphabetical order)

### 2. Add sizing tokens to `take` (if needed)

If your component needs size variants not covered by existing `take` entries (`button`, `badge`/`chip` via `compact`, `control`, `avatar`, `panel`, `popup`), add a new size map in `src/recipes/take/` and export it from the `take` object.

### 3. Add color tokens to `nuri` (if needed)

If your component needs a unique color palette not covered by existing `nuri` entries (`solid`, `soft`, `outline`, `text`, `buttonSolid`, `buttonSoft`, `buttonOutline`, `buttonPlain`, `buttonGhost`, `checkbox`, `radio`, `switch`), define new color tokens via `defineColors` in `src/recipes/nuri/` and export from the `nuri` object.

### 4. Create `variants.ts`

The `variants.ts` file is a thin re-export layer. All variant logic lives in the katachi recipe (which uses `tv()` from `tailwind-variants`). The variants file re-exports the recipe function, its type, and any slot objects under convenient aliases.

**Pattern for components with variants (with or without color)**:
```ts
export {
  type <Name>Variants,
  <name> as <name>Variants,
} from '../../recipes/katachi/<name>'
```

**Pattern for components with slots**:
```ts
export {
  type <Name>Variants,
  <name> as <name>Variants,
  slots as k,
} from '../../recipes/katachi/<name>'
```

**Pattern for components with multiple tv() recipes** (e.g. accordion with `accordion` + `accordionItem`):
```ts
export {
  type AccordionVariants,
  accordion as accordionVariants,
  type AccordionItemVariants,
  accordionItem as accordionItemVariants,
  slots as k,
} from '../../recipes/katachi/accordion'
```

### 5. Create `component.tsx`

Follow these conventions:
- Import `cn` from `../../core`
- Import slot classes as `k` from `./variants` (which re-exports the `slots` object from the katachi recipe)
- Import primitives from `../../primitives` as needed (`Polymorphic`, `ControlFrame`, `Overlay`, `TouchTarget`, etc.)
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

**Compound component** (with sub-components using slot classes):
```tsx
import { cn } from '../../core'
import { type <Name>Variants, <name>Variants, k } from './variants'

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
        title="Default"
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
          <<Name> open={open} onOpenChange={setOpen}>
            ...
          </<Name>>
        `}
      >
        <Button onClick={() => setOpen(true)}>Open <Name></Button>
        <<Name> open={open} onOpenChange={setOpen}>
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

### 10. Create the test file

This is **required** for every new component. Use the `/ui-testing` skill to create the test file:

```
/ui-testing <name>
```

The skill will create a test at `src/__tests__/components/<name>.test.tsx` following all established patterns and conventions. It reads the component source, determines which test patterns apply, writes the test, and verifies it passes.

### 11. Run code audit (REQUIRED — do this before committing)

Run the `/ui-audit-code` skill scoped to the new component:

```
/ui-audit-code <name>
```

This verifies that all files created in the previous steps follow established code patterns: barrel exports, variant wiring, component conventions, naming, imports, and test coverage. Fix any issues it finds before committing.

---

## Existing components (for reference and composition)

alert, avatar, badge, breadcrumb, button, calendar, card, checkbox, chip, combobox, datepicker, dialog, disclosure, divider, dl, drawer, dropdown, fieldset, grid, heading, icon, input, listbox, navbar, pagination, placeholder, popover, progress, radio, select, sheet, sidebar, status, switch, table, tabs, text, textarea, timeline, toast, tooltip

## Available primitives

- **Polymorphic** — renders as `<Link>` when `href` is provided, otherwise as the fallback element
- **ControlFrame** — shared wrapper for form inputs (border, focus ring, disabled)
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
- **useRovingFocus** — roving-focus keyboard navigation for 1D/2D lists (menus, steppers, calendar grids)
- **useRovingActive** — virtual-focus keyboard navigation (command palettes, comboboxes where focus must stay on an input)

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
- **`colorMatrix(variant, map, extra?)`** — generates `compoundVariants` entries for a (variant × color) pair from a nuri color map; used in `tv()` recipes
- **`createContext(name)`** — typed context factory that throws on missing provider
- **`Link` / `LinkProvider`** — polymorphic link component (defaults to `<a>`, configurable via provider)

---

## Checklist

Before finishing, verify:
- [ ] **Composition audit done (Step 0).** Every existing component that could have been composed was composed. No duplicated `Overlay` + `motion` + `ugoki` wrappers, no raw `<input>`/`<button>` where `Input`/`Button` fit, no re-implementations of keyboard nav that `Listbox`/`Combobox`/`Menu` already provide.
- [ ] **No parallel panel variants.** If the component renders in a dialog/sheet/drawer/popover, it reuses that component's `*PanelVariants` (e.g. `DialogPanelVariants`) rather than defining its own size/surface recipe.
- [ ] Katachi recipe created and registered in `katachi/index.ts` (alphabetical) — **only if the component introduces genuinely new styling not available through composition**
- [ ] `variants.ts` re-exports from the katachi recipe (variant function aliased as `<name>Variants`, slots aliased as `k`)
- [ ] `component.tsx` follows conventions (data-slot, cn, className merge, prop spreading)
- [ ] `index.ts` barrel exports all public API (components, props types, variant types, variant functions)
- [ ] `package.json` export entry added (alphabetical)
- [ ] Demo page created at `src/docs/demos/<name>.tsx` with correct `meta.category`
- [ ] Test file created via `/ui-testing` at `src/__tests__/components/<name>.test.tsx`
- [ ] Code audit passed via `/ui-audit-code <name>` — all code patterns verified
- [ ] No unused imports or dead code
- [ ] `'use client'` only added when actually needed (hooks, event handlers, motion)
- [ ] Diff read as a reviewer: if the component is longer than the closest existing analog, justify why or shrink it by composing more
