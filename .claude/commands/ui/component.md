# Create UI Component

TRIGGER when: the user asks to create, add, build, or scaffold a new UI component for the project's component library.

You are creating a new component inside whatever package houses this project's UI library. The repo is a Turborepo with Next.js apps and (usually) one or more shared React component packages. Within that scope the structure, vocabulary, and styling system still vary per project — discover them before writing code, then match the conventions you find.

## Arguments

$ARGUMENTS

---

## 0. Load the Project Profile

Read `.claude/cache/project-profile.json`. If it is missing, stale (per the freshness rules in `/discover`), or the relevant fields are `null`, invoke `/discover --quiet` to refresh it, then re-read.

From the profile, pull the fields this skill uses:

- `packages[*]` — pick the target package. If multiple packages have `componentsDir`, ask the user which one (default to the one whose `package.json#name` matches the user's hint, or to the only package where `isFrontend` is `true` if there's exactly one).
- `framework` — `react` or `next` for component-bearing packages. Both use React + JSX; Next adds the `'use client'` directive convention.
- `componentsDir` — where the new component goes.
- `primitivesDir`, `hooksDir`, `tokensDir` — what's available for reuse.
- `testLayout` and `testHelpersDir` — used when scaffolding the matching test.
- `conventions.vocabularyGlossary` — surface this in user-facing summaries so the scaffold speaks the project's language.
- `conventions.principles` — observe declared rules (layering, naming, dependency direction).

If the target package has no `componentsDir`, stop and ask the user where to place the component before continuing.

---

## 1. Discover styling and authoring conventions

The Project Profile gives you structure; you still need to learn **how** components are written in this project. Run these reads in parallel:

### 1a. Detect the styling system

Inspect the target package's `package.json` (or `devDependencies` resolved through the profile). The presence of a known dep determines the styling approach:

| Dep | System |
| --- | --- |
| `tailwind-variants` or `cva` (class-variance-authority) | variant recipe library |
| `vanilla-extract` | typed CSS-in-TS with sprinkles |
| `stitches` / `@stitches/react` | runtime CSS-in-JS |
| `styled-components` / `emotion` | tagged-template CSS-in-JS |
| `tailwindcss` only (no variant lib) | utility classes via a `cn`-style helper |
| `*.module.css` files present in `componentsDir` | CSS Modules |

If none of these signals fires, read 1–2 sibling components before assuming — Next.js projects often invent their own conventions.

### 1b. Sample sibling components

Read **1–2 existing components** in the target `componentsDir`. From them, extract:

- File naming (`Button.tsx` vs `button.tsx` vs `button/index.tsx`).
- Whether each component owns a folder or is a single file.
- Whether sub-components live in separate files or inline.
- Where variant/recipe logic lives (sibling `variants.ts`? colocated in the same file? in `tokensDir`?).
- Export style (named vs default, `export function` vs `export const`).
- Barrel/index conventions.
- The project's `cn`-equivalent: search for `clsx`, `classnames`, `cva`, `tailwind-merge`, or a local helper.
- Whether components carry a `data-slot` / `data-part` / similar marker.

If sibling components disagree, prefer the most recent (highest mtime) — it represents the current convention.

### 1c. Detect design tokens / recipes

If the profile's `tokensDir` is set, read its `index.*` and one representative token file. Note the categories the project exposes (colors, typography, spacing, radii, motion, etc.) so you can compose them instead of inventing literals.

### 1d. Check for a demo or docs system

Look for one of: a `docs/` directory under the package, a Storybook config (`.storybook/`), an MDX directory, a `playground/`, or auto-discovery via `import.meta.glob` patterns. If the project has a demo system, every new component must include a demo file at the discovered location.

---

## 2. Composition-first audit (REQUIRED — do this before writing)

The single most common scaffolding mistake is reinventing behavior that already exists in the library. Before writing any code, walk this hierarchy and prefer the highest level that applies:

1. **Compose existing components** in `componentsDir`.
2. **Use primitives** in `primitivesDir` (if any).
3. **Use recipes / tokens / hooks** in `tokensDir` and `hooksDir`.
4. **Write raw markup + styling** only as a last resort.

### Mandatory audit questions

Walk through these. If the answer is "yes", **compose the existing piece instead of inventing one**:

- Does the component render in a modal / overlay surface? → compose the project's existing dialog/sheet/drawer/popover.
- Does it contain a text input? → compose the project's `Input`/`Textarea` equivalent.
- Does it contain a clickable action? → compose the project's `Button` equivalent.
- Does it render a list of selectable options with keyboard navigation? → compose the project's `Listbox`/`Combobox`/`Menu` equivalent.
- Does it need a surface with padding/border/background props? → compose the project's `Box`/`Card`/`Surface` equivalent.
- Does it need controlled-or-uncontrolled state? → use the project's `useControllable` equivalent (search `hooksDir` for one before writing your own).
- Does it need floating positioning? → use the project's floating-positioning hook (search `hooksDir` for one).

If none of the audit questions apply and the styling is also fully covered by composition, **skip the recipe / variants step** in section 3 — the new component is just a thin assembly file.

### Worked example

A "command palette" is "a dialog containing a search input and a keyboard-navigated list". The correct implementation composes `<Dialog>`, `<Input>`, and `<Listbox>` (or the project's equivalents) — roughly 50–100 lines. It does **not** re-implement overlays, motion, or option rendering. Apply the same lens to every new component.

---

## 3. Scaffold the component

Honor the conventions you discovered in section 1. The exact filenames, extensions, and import paths depend on the project; the **shape** below is universal.

### 3a. Variants / recipe (only if needed)

If the component owns genuinely new styling that isn't expressible through composition, create the variant recipe in the location your sibling components use (e.g. a colocated `variants.ts`, a file under `tokensDir`, or inline).

**Generic example — `tailwind-variants` recipe with size and tone variants, plus a slots map for compound sub-elements.** Adjust to the styling system you detected.

```ts
import { tv, type VariantProps } from 'tailwind-variants'

export const widget = tv({
  base: 'inline-flex items-center gap-2',
  variants: {
    tone: {
      neutral: 'bg-neutral-100 text-neutral-900',
      accent: 'bg-accent-500 text-white',
    },
    size: {
      sm: 'px-2 py-1 text-sm',
      md: 'px-3 py-1.5 text-base',
      lg: 'px-4 py-2 text-lg',
    },
  },
  defaultVariants: { tone: 'neutral', size: 'md' },
})

export type WidgetVariants = VariantProps<typeof widget>

export const widgetSlots = {
  icon: 'shrink-0',
  label: 'truncate',
}
```

If the project's `tokensDir` exposes pre-built tone/size/spacing helpers, **compose them** instead of writing literal values:

```ts
import { tokens } from '@/tokens'

export const widget = tv({
  base: ['inline-flex items-center', tokens.gap.md],
  variants: {
    size: {
      sm: [tokens.text.sm, tokens.padding.sm],
      md: [tokens.text.md, tokens.padding.md],
    },
  },
})
```

If the project owns a registry/barrel that lists every recipe (you'll see it in `tokensDir`), register the new recipe there in the same style.

### 3b. Component file

**Generic example — React functional component using a `cn` helper, variant recipe, and the project's polymorphic element pattern if one exists.**

```tsx
import { cn } from '@/utils/cn'
import { widget, type WidgetVariants } from './variants'

export type WidgetProps = WidgetVariants & {
  className?: string
  children?: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function Widget({ tone, size, className, children, ...rest }: WidgetProps) {
  return (
    <div data-slot="widget" className={cn(widget({ tone, size }), className)} {...rest}>
      {children}
    </div>
  )
}
```

**Generic example — compound component with sub-parts in sibling files.**

```tsx
// widget-header.tsx
import { cn } from '@/utils/cn'
import { widgetSlots } from './variants'

export type WidgetHeaderProps = { className?: string } & React.ComponentPropsWithoutRef<'div'>

export function WidgetHeader({ className, children, ...rest }: WidgetHeaderProps) {
  return (
    <div data-slot="widget-header" className={cn(widgetSlots.header, className)} {...rest}>
      {children}
    </div>
  )
}
```

**Generic example — size inheritance via a context provider.** Use this when the project has an `<EnclosingProvider>` / `useEnclosing()` pattern (you'll spot it in sibling components). The resolution order is: explicit prop → context → recipe default.

```tsx
import { useSize } from '@/components/size-provider'

export function Widget({ size, ...rest }: WidgetProps) {
  const inherited = useSize()
  const resolved = size ?? inherited ?? 'md'
  return <div className={widget({ size: resolved })} {...rest} />
}
```

Conventions to match from the sibling components you sampled:

- File naming and extension.
- `'use client'` — when the target is a Next.js app or a shared package consumed by Next server components, add this directive **only** when the component uses hooks, event handlers, or browser APIs. Match the convention of sibling components.
- Named exports vs default exports.
- Whether prop types are exported alongside the component.
- Whether components carry a stable DOM marker (`data-slot`, `data-part`, `data-component`).
- How `className` merges with computed classes — always merge, never overwrite.

### 3c. Context (only if sub-components share state)

For compound components whose sub-parts need access to common state, use the project's typed context helper if one exists (search `primitivesDir` and `hooksDir` for a `createContext`-style factory). Otherwise use React's native `createContext`.

```ts
import { createSafeContext } from '@/utils/context'

export type WidgetContextValue = { isOpen: boolean; setOpen: (v: boolean) => void }

export const [WidgetProvider, useWidget] = createSafeContext<WidgetContextValue>('Widget')
```

### 3d. Barrel / index file

If the project uses per-component folders with `index.*` barrels, mirror that pattern:

```ts
export { Widget, type WidgetProps } from './widget'
export { WidgetHeader, type WidgetHeaderProps } from './widget-header'
export { type WidgetVariants } from './variants'
```

If the project keeps components as single files with no folder, skip this step.

### 3e. Package / module export entry

If the target package exposes per-component subpath exports in `package.json#exports`, add one alphabetically:

```jsonc
"./widget": {
  "types": "./src/components/widget/index.ts",
  "default": "./src/components/widget/index.ts"
}
```

If the package only exposes a single root entry, append the new component to the root barrel instead.

### 3f. Demo / docs file

If section 1d found a demo system, create the matching file at the discovered location. Use the same authoring style you saw in 1–2 existing demos (component composition, layout helpers from the project, the project's `Example` / `Story` wrapper, etc.). Demonstrate the API surface — variants, sizes, common compositions — not every permutation.

If the project has no demo system, skip this step.

### 3g. Tests

Always create a test file for the new component. Delegate to `/testing`:

```
/testing <ComponentName>
```

`/testing` reads the same Project Profile, infers the right location and runner, and produces a test that matches the project's conventions.

---

## Checklist

Before declaring the component done, confirm:

- [ ] **Composition audit complete.** Every existing component, primitive, or hook that could have been reused was reused. No reinvented overlays, no raw `<button>`/`<input>` where the project ships a styled equivalent, no parallel recipes that mirror an existing one.
- [ ] The variant/recipe (if any) composes the project's tokens rather than literal values.
- [ ] File names, exports, and DOM markers match the sibling components you sampled.
- [ ] The `className` prop is accepted and merged through the project's `cn` helper (or equivalent).
- [ ] `'use client'` is present **only** when needed (hooks, event handlers, browser APIs) and matches sibling-component conventions.
- [ ] Barrel/index, package-exports map, and any registry/glossary are updated.
- [ ] A demo file exists at the discovered location (when the project has a demo system).
- [ ] A test file exists at the discovered location, produced via `/testing`.
- [ ] No unused imports, no dead code.
- [ ] Diff read as a reviewer: if the new component is longer than the closest existing analog, justify the size or shrink it by composing more.

---

## Important

- The Project Profile is the source of truth for paths, framework, and toolchain. Never hard-code those facts.
- If a profile field is `null` and the user's request doesn't disambiguate, ask before guessing.
- Project-specific exclusion lists ("don't scaffold a `rating` here", etc.) live in `CLAUDE.md` or `AGENTS.md`. Honor whatever you find there; do not bake an exclusion list into this skill.
- When the project's vocabulary differs from the generic examples above (e.g. it calls them "blocks" not "components", or has its own term for "recipe"), use the project's term in user-facing text. Pull that vocabulary from `conventions.vocabularyGlossary` in the profile.
