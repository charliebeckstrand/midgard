# ui:component:compose

TRIGGER when: the user asks to create, add, build, or scaffold a new UI component for the project's component library.

Create a new component inside whatever package houses this project's UI library. The repo is a Turborepo with Next.js apps and (usually) one or more shared React component packages. Within that scope the structure, vocabulary, and styling system vary per project — discover them before writing code, then match what you find.

`[layout-heuristics]` and `[framework-discipline]` (bottom) are cited by handle from `/ui:audit` and other consumers; keep them tight. The rest of the skill is workflow.

## Arguments

$ARGUMENTS

---

## 0. Load the Manifest

Read `./manifest.json`. If missing, stop and tell the user to run `/repo:manifest` first — never generate the manifest yourself.

Per package, capture:

- `path`, `name`, `isFrontend` — pick the target package. If multiple frontend packages exist and the user did not disambiguate, ask. Default to the one whose `package.json#name` matches the user's hint, or to the only `isFrontend: true` package if there's exactly one.
- `framework` — `react` or `next`. Both use React + JSX; Next adds the `'use client'` directive convention.
- `componentsDir` — where the new component goes. If `null`, stop and ask the user where to place the component.
- `primitivesDir`, `hooksDir`, `tokensDir` — what's available for reuse.
- `testLayout` — used when scaffolding the matching test.
- `conventions.principles` — observe declared rules (layering, naming, dependency direction).

---

## 1. Discover styling and authoring conventions

The Manifest gives you structure; you still need to learn **how** components are written here. Run these reads in parallel:

### 1a. Detect the styling system

Inspect the target package's `package.json` (resolved through the manifest). Known deps:

| Dep | System |
| --- | --- |
| `tailwind-variants` or `cva` | variant recipe library |
| `vanilla-extract` | typed CSS-in-TS with sprinkles |
| `stitches` / `@stitches/react` | runtime CSS-in-JS |
| `styled-components` / `emotion` | tagged-template CSS-in-JS |
| `tailwindcss` only (no variant lib) | utility classes via a `cn`-style helper |
| `*.module.css` files in `componentsDir` | CSS Modules |

If none of these signals fires, lean on the section 1b sibling reads to decide the styling system.

### 1b. Sample sibling components

Read **1–2 existing components** in the target `componentsDir`. Extract:

- File naming (`Button.tsx` vs `button.tsx` vs `button/index.tsx`).
- Folder-per-component vs single file.
- Sub-component placement (separate files vs inline).
- Where variant/recipe logic lives (sibling `variants.ts`, colocated, or in `tokensDir`).
- Export style (named vs default, `export function` vs `export const`).
- Barrel/index conventions.
- The project's `cn`-equivalent: `clsx`, `classnames`, `cva`, `tailwind-merge`, or a local helper.
- Whether components carry a stable DOM marker (`data-slot` / `data-part` / similar).

When siblings disagree, prefer the most recent (highest mtime).

Section 3 follows what 1b finds; don't default to the most-decomposed shape when siblings are simpler.

### 1c. Detect design tokens / recipes

If `tokensDir` is set, read its `index.*` and one representative token file. Note the categories the project exposes (colors, typography, spacing, radii, motion, etc.) so you can compose them instead of inventing literals.

### 1d. Note whether a docs system exists

Look for: a `docs/` directory under the package, a Storybook config (`.storybook/`), an MDX directory, a `playground/`, or auto-discovery via `import.meta.glob`. Authoring docs is **not** this skill's job — `/ui:docs:compose` owns it. Record presence; delegate in 3g.

---

## 2. Composition-first audit (REQUIRED — before writing)

The single most common scaffolding mistake is reinventing behavior that already exists. Before writing code, walk this hierarchy and prefer the highest level that applies:

1. **Compose existing components** in `componentsDir`.
2. **Use primitives** in `primitivesDir`.
3. **Use recipes / tokens / hooks** in `tokensDir` and `hooksDir`.
4. **Write raw markup + styling** only as a last resort.

### Mandatory audit questions

If the answer is "yes", **compose the existing piece instead of inventing one**:

- Renders in a modal / overlay surface? → compose the existing dialog/sheet/drawer/popover.
- Contains a text input? → compose the existing `Input`/`Textarea` equivalent.
- Contains a clickable action? → compose the existing `Button` equivalent.
- Renders a list of selectable options with keyboard navigation? → compose the existing `Listbox`/`Combobox`/`Menu`.
- Needs a surface with padding/border/background props? → compose the existing `Box`/`Card`/`Surface`.
- Needs controlled-or-uncontrolled state? → use the project's `useControllable` equivalent (search `hooksDir`).
- Needs floating positioning? → use the project's floating-positioning hook (search `hooksDir`).

If none apply and styling is fully covered by composition, **skip the recipe / variants step** in section 3 — the new component is a thin assembly file.

A "command palette" composes `<Dialog>`, `<Input>`, and `<Listbox>` (or equivalents). It doesn't re-implement overlays, motion, or option rendering.

---

## 3. Scaffold the component

Output decisions follow `[layout-heuristics]` (see bottom of this file). When sibling components agree, match them. When they disagree, fall back to the heuristics.

### 3a. File layout

Apply `[layout-heuristics]`. Surface divergence to the user when siblings consistently violate even the fallback heuristics; ask whether to follow the legacy convention or set a new one.

### 3b. Variants / recipe

If the component owns genuinely new styling that isn't expressible through composition, create the variant recipe in the location your sibling components use. Inline if siblings inline; sibling `variants.ts` if siblings split; `tokensDir` if siblings centralize.

**Example — `tailwind-variants` recipe with size and tone variants, plus a slots map for compound sub-elements.** Adjust to the styling system you detected.

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

If `tokensDir` exposes pre-built tone/size/spacing helpers, **compose them** instead of literal values:

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

If `tokensDir` contains a registry/barrel that re-exports every recipe (typically `recipes.ts` or `index.ts`), register the new recipe there.

### 3c. Component file

Apply `[framework-discipline]` for `'use client'`, `forwardRef`, and DOM-marker decisions.

**Example — React functional component using a `cn` helper, variant recipe, polymorphic element pattern if siblings use one.**

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

**Compound component with sub-parts in sibling files** (when siblings ship that way):

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

**Size inheritance via context** (when siblings use `<Provider>` / `useEnclosing()`). Resolution order: explicit prop → context → recipe default.

```tsx
import { useSize } from '@/components/size-provider'

export function Widget({ size, ...rest }: WidgetProps) {
  const inherited = useSize()
  const resolved = size ?? inherited ?? 'md'
  return <div className={widget({ size: resolved })} {...rest} />
}
```

Always merge `className` with computed classes — never overwrite.

### 3d. Context (only if sub-components share state)

For compound components whose sub-parts need access to common state, use the project's typed context helper if one exists (search `primitivesDir` and `hooksDir`). Otherwise use React's native `createContext`.

```ts
import { createSafeContext } from '@/utils/context'

export type WidgetContextValue = { isOpen: boolean; setOpen: (v: boolean) => void }

export const [WidgetProvider, useWidget] = createSafeContext<WidgetContextValue>('Widget')
```

### 3e. Barrel / index file

If the project uses per-component folders with `index.*` barrels:

```ts
export { Widget, type WidgetProps } from './widget'
export { WidgetHeader, type WidgetHeaderProps } from './widget-header'
export { type WidgetVariants } from './variants'
```

If components are single files with no folder, skip.

### 3f. Package / module export entry

If the target package exposes per-component subpath exports in `package.json#exports` (skip if the existing entry is a single wildcard like `"./*"`), add one alphabetically:

```jsonc
"./widget": {
  "types": "./src/components/widget/index.ts",
  "default": "./src/components/widget/index.ts"
}
```

If the package only exposes a root entry, append to the root barrel.

### 3g. Demo / docs file

If section 1d found a docs system:

```
/ui:docs:compose <ComponentName>
```

That skill reads the same Manifest, samples sibling docs files, and produces a docs page. Do not author the docs file inline.

If no docs system, skip.

### 3h. Tests

Always create a test file. Delegate:

```
/tests:compose <ComponentName>
```

`/tests:compose` reads the same Manifest and produces a test matching the project's conventions.

### 3i. TypeScript review

Before declaring done, invoke `/typescript:review` against every `.ts` / `.tsx` file this skill (and its delegates) wrote:

```
/typescript:review <component-folder-or-file-path>
```

Surface BLOCK findings to the user.

---

## Reference: `[layout-heuristics]`

Cited by `/ui:audit` 5.11 and any future skill that detects or prevents layout drift.

**Match the dominant sibling pattern in the target directory.** When sampling siblings, observe:

1. **Component granularity** — one component per file, or sub-components bundled inside the top-level file?
2. **Type colocation** — shared types in a colocated `types.ts`, or kept inline next to the owning component?
3. **Hook placement** — custom `use*` hooks in their own files (colocated or in `hooksDir`), or declared inside component files?

**Fallback heuristics when siblings disagree or are too few:**

- **Sub-components** earn their own file when they're nontrivial (own state, more than a handful of JSX lines, or reused). Truly trivial single-use helpers stay inline.
- **A shared `types.ts`** is worth creating when **two or more** files in the component's folder need the same type. Do not pre-create one for types only one file uses.
- **Custom hooks** belong in their own files when they're nontrivial or reusable beyond the component. Small one-liners coupled to a single component stay inline.

Split where the boundary is clear and the pieces earn separation.

**When siblings consistently violate even the fallback heuristics** (every sibling inlines everything, every sibling over-splits), surface the divergence and ask whether to follow the legacy convention or set a new one. Do not silently pick either.

---

## Reference: `[framework-discipline]`

Cited by `/ui:audit` 5.12 and any future skill that detects or prevents framework smells.

**`'use client'`** — add **only** when the component uses hooks, event handlers, or browser APIs, and only in packages whose `framework` is `next` or that are consumed by Next server components. Match the convention of sibling components. Never add it to a component that has none of these.

**`forwardRef`** — when declared, the ref must be forwarded to a DOM element or to a child component that accepts a ref. A `forwardRef` whose ref parameter is never used is a smell.

**Stable DOM markers** — components carry a stable marker (`data-slot`, `data-part`, `data-component`) only when sibling components do. Match the project's convention; do not introduce markers unilaterally.

**`className` merge** — always merge incoming `className` with computed classes through the project's `cn` helper. Never overwrite or drop.

**Memoization (`useMemo` / `useCallback`)** — apply only when the computation is non-trivial. Memoizing a literal, an identity expression, or a single property access is noise and may itself be the smell `/ui:audit` 5.12 flags.

---

## Checklist

Before declaring done:

- [ ] **Composition audit complete.** Every existing component, primitive, or hook that could have been reused was reused.
- [ ] **File layout matches `[layout-heuristics]`** against the target directory's siblings.
- [ ] **Framework discipline matches `[framework-discipline]`** — `'use client'` is present iff needed, `forwardRef` (if used) actually forwards, `className` merges through the project's helper.
- [ ] The variant/recipe (if any) composes the project's tokens rather than literal values.
- [ ] File names, exports, and DOM markers match the sibling components you sampled.
- [ ] Barrel/index, package-exports map, and any registry are updated.
- [ ] A docs file exists at the discovered location, produced via `/ui:docs:compose` (when the project has a docs system).
- [ ] A test file exists at the discovered location, produced via `/tests:compose`.
- [ ] `/typescript:review` returned PASS on every new file.
- [ ] No unused imports, no dead code.
- [ ] Diff read as a reviewer: if the new component is longer than the closest existing analog, justify the size or shrink it by composing more.

---

## Important

- The Manifest is the source of truth for paths, framework, and toolchain. Never hard-code those facts.
- If a manifest field is `null` and the user's request doesn't disambiguate, ask before guessing.
- Project-specific exclusion lists ("don't scaffold a `rating` here") live in `CLAUDE.md` or `AGENTS.md`. Honor them; do not bake an exclusion list into this skill.
- The `[layout-heuristics]` and `[framework-discipline]` blocks are the canonical source for those conventions. When updating them, update only here — consumer skills cite by handle.