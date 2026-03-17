# SRA — Slot Recipe Architecture

A CSS architecture for component libraries built on Tailwind CSS + React. Invented for Midgard.

SRA solves the problem that existing methodologies (BEM, ITCSS, CUBE CSS) were designed for
flat stylesheets, not component-driven trees. It gives you:

- **Identity** — every element in the DOM knows what it is
- **Relationships** — parents style children through slots, not class name coupling
- **Variants** — component behavior is expressed as data attributes, styled with CSS selectors
- **Recipes** — shared styling patterns are arrays of classes, composed with spread

## The Three Layers

### 1. Slots — structural identity (`data-slot`)

Every meaningful element declares what it _is_ within its parent:

```
data-slot="icon"         — decorative icon
data-slot="label"        — primary text
data-slot="description"  — secondary/helper text
data-slot="control"      — interactive form element
data-slot="title"        — heading within a panel
data-slot="body"         — main content area
data-slot="actions"      — action button row
data-slot="divider"      — visual separator
```

Slots answer: "What role does this element play in its container?"

A `data-slot="label"` inside a SidebarItem is the same concept as a `data-slot="label"` inside a
DropdownItem or a CheckboxField. The parent decides how to style it.

**Slot vocabulary is small and shared.** The same ~15 slot names cover the entire library.
Components compose from the same parts.

### 2. Recipes — shared styling patterns

Recipes are plain arrays of Tailwind classes exported from `recipes/`. They encode
design decisions that apply across many components:

```typescript
// recipes/icon.ts — one source of truth for icon sizing
export const iconSlot = [
  '*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0',
  'sm:*:data-[slot=icon]:size-4',
]
```

Recipes are consumed by spreading into class lists:

```typescript
const classes = cn(
  ...iconSlot,                    // shared sizing
  '*:data-[slot=icon]:fill-current', // component-specific color
)
```

Recipe hierarchy:
- **Token recipes** — colors, spacing scales, typography (`colors.ts`)
- **Slot recipes** — how a slot type is styled (`icon.ts`, `control.ts`)
- **Pattern recipes** — shared behavioral styles (`item.ts`, `overlay.ts`)
- **Component recipes** — CVA definitions with variants (`button/variants.ts`)

### 3. Attributes — state and variant expression (`data-*`)

State and variant information lives in the DOM as data attributes, styled with CSS:

```
data-current             — active navigation item
data-checked             — toggled on
data-disabled            — non-interactive
data-invalid             — validation failed
data-selected            — chosen option
data-icon-only           — contains only an icon (auto-detected)
```

Attributes answer: "What state is this element in?"

**Why data attributes instead of class names?**
- CSS can select ancestors: `group-data-checked:bg-blue-600`
- CSS can detect children: `has-[[data-slot=icon]]:pl-10`
- DOM is inspectable without knowing class name conventions
- State is semantic, not visual — `data-checked` not `bg-blue-600`

## Composition Rules

### Parent styles children through slots

A parent component targets its children using `*:data-[slot=X]` selectors.
Children never know how they'll be styled — they just declare their slot.

```typescript
// SidebarItem styles its icon children
'data-current:*:data-[slot=icon]:fill-zinc-950'

// Field styles spacing between label and control
'[&>[data-slot=label]+[data-slot=control]]:mt-3'
```

### Auto-detection with :has()

Components can react to their own content without props:

```typescript
// Icon-only items become square (no label → no text, just icon)
'[&:has([data-slot=icon]):not(:has([data-slot=label]))]:aspect-square'

// Input adjusts padding when icon is present
'has-[[data-slot=icon]:first-child]:[&_input]:pl-10'
```

### State propagates through groups

Tailwind's `group-data-*` pattern lets state flow from parent to descendant:

```typescript
// Parent: <button data-checked>
// Child inherits: group-data-checked:bg-blue-600
// Grandchild: group-data-checked:opacity-100
```

### Recipes compose, not inherit

Recipes are arrays spread into `cn()`. There is no class hierarchy or specificity chain.
Components pick the recipes they need:

```typescript
const classes = cn(
  ...iconSlot,           // icon sizing
  ...menuItemBase,       // item interaction
  'px-3 py-2',          // component-specific spacing
)
```

## Shared Vocabulary

### Standard Slots

| Slot | Used in | Meaning |
|------|---------|---------|
| `icon` | Button, NavItem, SidebarItem, DropdownItem, Input | Decorative SVG icon |
| `label` | NavbarLabel, SidebarLabel, DropdownLabel, FieldLabel | Primary text content |
| `description` | DropdownDescription, FieldDescription, Dialog/Alert | Helper text |
| `control` | Input, Textarea, Select, Checkbox, Radio, Switch, FieldGroup | Interactive element |
| `title` | DialogTitle, AlertTitle | Panel heading |
| `body` | DialogBody, AlertBody | Panel content area |
| `actions` | DialogActions, AlertActions | Button row |
| `heading` | Heading, Subheading, DropdownHeading | Section heading |
| `divider` | Divider, DropdownDivider | Visual separator |
| `badge` | Badge | Status indicator |
| `section` | SidebarSection, DropdownSection | Grouped content |
| `header` | SidebarHeader, DropdownHeader | Container header |
| `footer` | SidebarFooter | Container footer |
| `shortcut` | DropdownShortcut | Keyboard shortcut |

### Standard Attributes

| Attribute | Type | Components | Meaning |
|-----------|------|-----------|---------|
| `data-current` | boolean | SidebarItem, NavbarItem, Tab | Active navigation |
| `data-checked` | boolean | Checkbox, Radio, Switch | Toggled on |
| `data-indeterminate` | boolean | Checkbox | Mixed state |
| `data-disabled` | boolean | Field, DropdownItem, Option | Non-interactive |
| `data-invalid` | boolean | Input, Textarea, Select | Validation error |
| `data-selected` | boolean | ComboboxOption, ListboxOption | Chosen |
| `data-icon-only` | boolean | Button | Auto-detected: only child is icon |

### Standard Recipes

| Recipe | File | Purpose |
|--------|------|---------|
| `iconSlot` | `recipes/icon.ts` | Icon sizing: size-5/sm:size-4, shrink-0 |
| `iconSlotIconOnly` | `recipes/icon.ts` | Icon-only margin resets |
| `menuItemBase` | `recipes/item.ts` | Interactive list item: focus, hover, disabled |
| `menuItemSlots` | `recipes/item.ts` | Menu item icon + avatar slot styles |
| `controlWrapper` | `recipes/control.ts` | Form control chrome: ring, shadow, border |
| `controlInput` | `recipes/control.ts` | Form input: border, focus ring, invalid state |
| `navItemBase` | `navbar/recipes.ts` | Navigation item: icon fill, hover, active |
| `buttonColors.*` | `recipes/colors.ts` | Button color tokens per variant |
| `badgeSolidColors.*` | `recipes/colors.ts` | Badge solid color tokens |
| `badgeSubtleColors.*` | `recipes/colors.ts` | Badge subtle color tokens |

## CSS Selector Patterns

SRA uses a small set of Tailwind selector patterns consistently:

```
*:data-[slot=X]:...           — style direct children by slot
**:data-[slot=X]:...          — style all descendants by slot
[&>[data-slot=X]+[data-slot=Y]]:... — style slot adjacency (spacing)
has-[[data-slot=X]]:...       — parent reacts to child slot presence
data-current:...              — style based on own state
group-data-checked:...        — style based on ancestor state
[&:has(...)]:not(:has(...))   — auto-detect content shape
```

## Anti-patterns

- **Don't couple by class name.** Never style a child by targeting `.sidebar-icon`.
  Use `*:data-[slot=icon]` — it works regardless of what the icon component is called.

- **Don't duplicate sizing.** Icon size is `iconSlot`. Control chrome is `controlWrapper`.
  If you're writing `size-5 sm:size-4` for an icon, you're duplicating.

- **Don't prop-drill visual concerns.** Instead of `<Button size="icon">`, auto-detect
  icon-only state with `:has()` and set `data-icon-only`.

- **Don't use state classes.** Instead of `className={current ? 'bg-blue-600' : ''}`,
  use `data-current` and let CSS handle it: `data-current:bg-blue-600`.

## File Structure

```
recipes/
  icon.ts          — icon slot sizing
  control.ts       — form control chrome
  item.ts          — menu/list item interaction
  colors.ts        — color token palettes
  overlay.ts       — backdrop/overlay styles
  motion.ts        — animation presets
  dialog.ts        — panel size tokens
  popover.ts       — anchor positioning

components/
  button/
    button.tsx     — component (auto-detects icon-only)
    variants.ts    — CVA definition (spreads iconSlot, iconSlotIconOnly)
    types.ts       — prop types

  sidebar/
    item.tsx       — component (uses navItemBase recipe, :has() detection)
    recipes.ts     — navItemBase (spreads iconSlot)
```
