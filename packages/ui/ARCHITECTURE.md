# SRA — Slot Recipe Architecture

A CSS architecture for component libraries built on Tailwind CSS + React. Invented for Midgard.

SRA solves the problem that no existing methodology (BEM, ITCSS, CUBE CSS) bridges
tokens, variants, slots, and data attributes into one coherent system. It gives you:

- **Identity** — every element in the DOM knows what it is
- **Relationships** — parents style children through slots, not class name coupling
- **Variants** — component behavior is expressed as data attributes, styled with CSS selectors
- **Recipes** — shared styling patterns composed with spread, typed by concern

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

Slots answer: **"What role does this element play in its container?"**

A `data-slot="label"` inside a SidebarItem is the same concept as a `data-slot="label"` inside
a DropdownItem or a CheckboxField. The parent decides how to style it.

Slot vocabulary is small and shared. The same ~15 slot names cover the entire library.

### 2. Recipes — typed shared patterns

A recipe is a plain array of Tailwind classes that encodes a single design decision.
Recipes are **typed by concern** — each recipe addresses exactly one category of styling.

#### Recipe concerns

| Concern | What it controls | Example classes |
|---------|-----------------|-----------------|
| **Sizing** | Dimensions, padding, margins | `size-5`, `px-3`, `mt-3`, `gap-4` |
| **Color** | Fills, text, backgrounds, borders-as-color, CSS tokens | `text-zinc-950`, `fill-zinc-500`, `--btn-bg` |
| **Layout** | Position, display, flex/grid structure | `relative`, `flex`, `grid-cols-[...]`, `aspect-square` |
| **Interaction** | Hover, focus, active, disabled responses | `hover:bg-zinc-950/5`, `focus:ring-2`, `disabled:opacity-50` |
| **Motion** | Animation, transitions, durations | `duration-150`, `ease-out`, `scale: 0.95` |
| **Chrome** | Decorative surfaces, shadows, rings, pseudos | `shadow-sm`, `ring-1`, `before:bg-white`, `backdrop-blur` |

**A recipe contains classes from one concern.** When it needs multiple concerns, it
_composes_ by spreading another recipe — never by mixing concerns inline.

```typescript
// GOOD — iconSlot is pure sizing
export const iconSlot = [
  '*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0',
  'sm:*:data-[slot=icon]:size-4',
]

// GOOD — controlPadding is pure sizing
export const controlPadding =
  'px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] ...'

// GOOD — formFieldSpacing is pure sizing (slot adjacency)
export const formFieldSpacing = [
  '[&>[data-slot=label]+[data-slot=control]]:mt-3',
  '[&>[data-slot=label]+[data-slot=description]]:mt-1',
  ...
]

// GOOD — checkboxColors is pure color (CSS custom property tokens)
export const checkboxColors = {
  zinc: '[--checkbox-check:var(--color-white)] [--checkbox-checked-bg:var(--color-zinc-900)] ...',
  red:  '[--checkbox-check:var(--color-white)] [--checkbox-checked-bg:var(--color-red-600)] ...',
}
```

#### Recipe composition

Recipes compose by spreading. A compound recipe may spread recipes from different
concerns — the compound recipe itself is _not_ a single concern, but each ingredient is.

```typescript
// navItemBase is a compound recipe — it composes sizing + color + interaction
export const navItemBase = [
  ...iconSlot,                                    // sizing (composed)
  '*:data-[slot=icon]:fill-zinc-500',             // color
  'group-hover:bg-zinc-950/5',                    // interaction
  'group-hover:*:data-[slot=icon]:fill-zinc-950', // interaction × color
]
```

The composition chain forms a tree:

```
iconSlot (sizing)
  → navItemBase (compound: sizing + color + interaction)
    → NavbarItem (component: navItemBase + trailingIcon + iconOnlyDetection)
    → SidebarItem (component: navItemBase + trailingIcon + iconOnlyDetection)

iconSlot (sizing)
  → menuItemSlots (compound: sizing + color)
    → DropdownItem, ListboxOption, ComboboxOption

controlWrapper (chrome) + controlInput (color + interaction) + controlPadding (sizing)
  → Input, Textarea, Select, Combobox
```

#### What belongs in a recipe vs. inline

A class belongs in a recipe when it:
- Appears in 2+ components with the same value
- Represents a design decision (not a structural necessity)
- Would need to change system-wide if the design changed

A class stays inline when it:
- Is unique to one component's structure
- Is a one-off override or edge case
- Would break other consumers if extracted

### 3. Attributes — state and variant expression (`data-*`)

State lives in the DOM as data attributes, styled with CSS:

```
data-current             — active navigation item
data-checked             — toggled on
data-disabled            — non-interactive
data-invalid             — validation failed
data-selected            — chosen option
data-icon-only           — contains only an icon (auto-detected)
```

Attributes answer: **"What state is this element in?"**

Why data attributes instead of class names:
- CSS can select ancestors: `group-data-checked:bg-blue-600`
- CSS can detect children: `has-[[data-slot=icon]]:pl-10`
- DOM is inspectable without knowing class name conventions
- State is semantic, not visual — `data-checked` not `bg-blue-600`

## Composition Rules

### Parent styles children through slots

A parent targets its children using `*:data-[slot=X]` selectors.
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

### Extract the common, preserve the specific

When a recipe can't capture a pattern exactly, the component keeps its own version.
One inline override is better than a leaky abstraction.

```typescript
// NavbarItem has a unique trailing icon selector that the generic
// trailingIcon recipe can't express — so it stays inline
'*:not-nth-2:last:data-[slot=icon]:ml-auto ...'
```

## Vocabulary

| Term | Definition |
|------|-----------|
| **Slot** | A `data-slot` value declaring an element's role in its parent |
| **Attribute** | A `data-*` value expressing element state |
| **Recipe** | A typed array of classes encoding a single design concern |
| **Concern** | The category a recipe addresses: sizing, color, layout, interaction, motion, or chrome |
| **Extract** | Pull repeated inline classes into a named recipe |
| **Compose** | Spread one recipe into another to build compound patterns |
| **Compound** | A recipe that composes multiple concern-typed recipes |
| **Wire** | Connect a component to a recipe it should be consuming |
| **Detect** | CSS auto-discovers structure via `:has()` and slot presence |

## Standard Slots

| Slot | Used in | Meaning |
|------|---------|---------|
| `icon` | Button, NavItem, SidebarItem, DropdownItem, Input | Decorative SVG icon |
| `label` | NavbarLabel, SidebarLabel, DropdownLabel, FieldLabel | Primary text content |
| `description` | DropdownDescription, FieldDescription, Dialog/Alert/Sheet | Helper text |
| `control` | Input, Textarea, Select, Checkbox, Radio, Switch, FieldGroup | Interactive element |
| `title` | DialogTitle, AlertTitle, SheetTitle | Panel heading |
| `body` | DialogBody, AlertBody, SheetBody | Panel content area |
| `actions` | DialogActions, AlertActions | Button row |
| `heading` | Heading, Subheading, DropdownHeading | Section heading |
| `divider` | Divider, DropdownDivider | Visual separator |
| `badge` | Badge | Status indicator |
| `section` | SidebarSection, DropdownSection | Grouped content |
| `header` | SidebarHeader, DropdownHeader, SheetHeader | Container header |
| `footer` | SidebarFooter, SheetFooter | Container footer |
| `shortcut` | DropdownShortcut | Keyboard shortcut |

## Standard Attributes

| Attribute | Type | Components | Meaning |
|-----------|------|-----------|---------|
| `data-current` | boolean | SidebarItem, NavbarItem, Tab | Active navigation |
| `data-checked` | boolean | Checkbox, Radio, Switch | Toggled on |
| `data-indeterminate` | boolean | Checkbox | Mixed state |
| `data-disabled` | boolean | Field, DropdownItem, Option | Non-interactive |
| `data-invalid` | boolean | Input, Textarea, Select | Validation error |
| `data-selected` | boolean | ComboboxOption, ListboxOption | Chosen |
| `data-icon-only` | boolean | Button | Auto-detected: only child is icon |

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

- **Don't mix concerns in a recipe.** A sizing recipe should not contain colors.
  A color recipe should not contain layout. Compose instead.

- **Don't prop-drill visual concerns.** Instead of `<Button size="icon">`, auto-detect
  icon-only state with `:has()` and set `data-icon-only`.

- **Don't use state classes.** Instead of `className={current ? 'bg-blue-600' : ''}`,
  use `data-current` and let CSS handle it: `data-current:bg-blue-600`.
