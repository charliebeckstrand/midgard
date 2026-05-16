# ui:docs:compose

TRIGGER when: the user asks to create, add, write, or scaffold a docs page, demo, or example file for a UI component. Also runs automatically when `/ui:component:compose` finishes creating a new component and the project has a docs system.

Create a single docs/demo file next to the project's other component docs. The repo is a Turborepo with Next.js apps and (usually) one or more shared React component packages. The exact docs system (Storybook MDX, hand-rolled Vite playground, `import.meta.glob`-driven registry, etc.) varies per project — discover, then match.

The docs page demonstrates the component's **API surface** — variants, sizes, states, common compositions — in a form the project's code-derivation tooling (if any) can parse into copy-paste snippets. Optimize for that consumer.

## Arguments

$ARGUMENTS

Component name (e.g. `Button`, `command-palette`). Match the casing the rest of the docs use.

---

## 0. Load the Manifest

Read `./manifest.json`. If missing, stop and tell the user to run `/repo:manifest` first — never generate the manifest yourself.

Pull:

- `packages[*]` — pick the package owning the component (longest-prefix match on `componentsDir`). If multiple frontend packages exist and the user did not disambiguate, ask.
- `framework` — `react` or `next`; determines whether the demo needs `'use client'`.
- `componentsDir` — source of truth for importable components.
- `primitivesDir`, `hooksDir`, `tokensDir` — what the docs can compose alongside the target component.

---

## 1. Locate the docs system

In order of signal strength:

1. A `docs/` (or `docs/demos/`, `stories/`, `examples/`, `playground/`) directory under the package.
2. A Storybook config (`.storybook/`).
3. An MDX directory referenced by the docs site config.
4. An `import.meta.glob` call referencing a demos directory (search `demos/*.tsx` / `examples/*.tsx` patterns in docs entry points).

Capture:

- **Demo file path** the new file should occupy (e.g. `packages/ui/src/docs/demos/<name>.tsx`).
- **Registry mechanism** — glob auto-discovery, an explicit `index.ts` registry, or Storybook CSF auto-titles.
- **Example-wrapper** — `<Example>`, `<Story>`, `<Demo>`, `<Showcase>`. Read its props.
- **Code-derivation walker** — search for `deriveCode` / `extractCode` / similar. If present, the wrapper auto-generates the "Show code" block; if not, expects an explicit `code` prop. If a specific capability (helper extraction in 3c, collapse in 3b) can't be confirmed from the walker's source, treat it as absent.

If no signal fires, stop and ask where docs live — never guess.

---

## 2. Sample sibling docs files

Read **2–3 existing demos**:

- One **simple** (e.g. `badge`, `stack`, `divider`) — minimum shape.
- One **interactive** with `useState` and a controls helper (e.g. `button`, `accordion`) — variant/size pickers.
- One **complex** with multiple sub-helpers or an explicit `code` override (e.g. `toast`, `dialog`) — escape hatches.

Extract:

- File extension and casing (almost always `<name>.tsx` matching the component's kebab-case identifier).
- Default export shape (usually `export default function <Name>Demo() { … }`).
- **Meta export** — most projects expose `export const meta = { category: '…' }`. Drives docs sidebar grouping.
- **Example wrapper's props** — typically some combination of `title`, `actions`, `prefix`, `preview`, `footer`, `code`, `children`.
- **Controls helpers** — variant/size/color pickers usually live as shared components under `docs/components/`. Reuse; don't reinvent.
- **`'use client'` discipline** — match sibling that uses similar React features.
- **Section ordering** — typically variants → colors/tones → sizes → states (loading/disabled) → compound examples.
- **Formatting** — match formatter output, not your own preference.

When siblings disagree, prefer the most recent (highest mtime).

---

## 3. Make the docs derive-code-friendly

The whole point is rendered output **and** the source for the exact snippet that produced it. The code-derivation walker (if any) walks the JSX inside each `<Example>` and emits a copy-paste snippet. Author every example so the walker can produce a clean one.

### 3a. Use real component tags inside the wrapper

The walker matches build-time-tagged components from the project's barrels:

- Put the **actual** `<Button>` / `<Dialog>` / etc. inside the example, not a locally-defined wrapper like `<MyButtonRow />` (opaque to the walker unless the project has helper-extraction).
- Compose with project layout primitives (`<Stack>`, `<Flex>`, `<Grid>`) instead of raw `<div>` flex utilities — the walker treats unknown wrappers as transparent, but the snippet reads better with named layout.
- Avoid one-off styling wrappers like `<div className="grid grid-cols-3">` — they vanish in the derived snippet.

### 3b. Iterate with explicit keys when you mean iteration

```tsx
<Example title="Variants">
  <Flex wrap gap="sm">
    {variants.map((variant) => (
      <Component key={variant} variant={variant}>
        {variant}
      </Component>
    ))}
  </Flex>
</Example>
```

Walkers typically collapse runs of 3+ identical iterated siblings to a single representative. The explicit `key={variant}` is the signal. If the project's walker collapses, lean into it.

### 3c. Author state in a sub-helper when the snippet would otherwise be noisy

If the example needs `useState`, and the project has **helper extraction** (top-level PascalCase helpers tagged with their full source as `__code`), extract:

```tsx
function CreateProjectDialog() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Create project</Button>
      <Dialog open={open} onOpenChange={setOpen}>…</Dialog>
    </>
  )
}

export default function DialogDemo() {
  return (
    <Example title="Create dialog">
      <CreateProjectDialog />
    </Example>
  )
}
```

The walker reads `__code` and renders the helper's source in the derived snippet. Confirm the project actually has this plugin before relying on it; otherwise inline the state.

### 3d. Use the explicit `code` escape hatch only when needed

When the example renders a side-effect-y thing the walker can't see — a hook call like `useToast()`, an external screenshot — supply an explicit `code` prop:

```tsx
<Example
  title="Persist"
  code={code`
    const { toast } = useToast()
    toast({ title: 'Saved', persist: true })
  `}
>
  <PersistToastButton />
</Example>
```

Prefer the derived snippet — every explicit `code` block is one more thing to keep in sync.

---

## 4. Compose the docs file

Honor sibling conventions from section 2.

### 4a. Imports

Grouped by origin, alphabetized within each group:

```tsx
'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/button'
import { Flex } from '../../components/flex'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'
import { SizeListbox } from '../components/size-listbox'
import { VariantListbox } from '../components/variant-listbox'
```

Drop `'use client'` when the demo has no hooks, event handlers, or browser APIs and siblings drop it.

### 4b. Meta and constants

```tsx
export const meta = { category: '<Category>' }

const variants = ['solid', 'soft', 'outline', 'plain'] as const
type Variant = (typeof variants)[number]

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const
type Color = (typeof colors)[number]
```

Use `as const` for variant/color/size arrays. Before redeclaring, grep the component file for exported `const` arrays (e.g. `BUTTON_VARIANTS`) and import them if present.

### 4c. The default export

```tsx
export default function ComponentDemo() {
  const [variant, setVariant] = useState<Variant>('solid')

  return (
    <Stack gap="xl">
      <Example title="Variants">
        <Flex wrap gap="sm">
          {variants.map((v) => (
            <Component key={v} variant={v}>{v}</Component>
          ))}
        </Flex>
      </Example>

      <Example
        title="Colors"
        actions={<VariantListbox variants={variants} value={variant} onValueChange={setVariant} />}
      >
        <Flex wrap gap="sm">
          {colors.map((c) => (
            <Component key={c} variant={variant} color={c}>{c}</Component>
          ))}
        </Flex>
      </Example>

      <Example title="Sizes">…</Example>

      <Example title="Disabled"><Component disabled>Disabled</Component></Example>
      <Example title="Loading"><Component loading>Loading</Component></Example>
    </Stack>
  )
}
```

### 4d. Choose which sections to write

Walk the component's prop surface (read the component file). Produce **one section per meaningful axis** — as many as make sense, no more.

| Axis | Title convention | Notes |
| --- | --- | --- |
| Visual variants | `Variants` | One example per variant value. |
| Color / tone | `Colors` / `Tones` | Use the project's variant-picker so the reader can flip variants while comparing colors. |
| Size | `Sizes` | One example per size; label with the project's size glossary if it has one. |
| Affordances | `With icon`, `With prefix`, `Icon only` | Show how slot/prefix/suffix props compose. |
| States | `Disabled`, `Loading`, `Readonly`, `Invalid` | One example per state. |
| Compound composition | `<Component> + <Sibling>` | Idiomatic compositions. |
| Effects | `Ripple`, `Spring`, `Glass` | Each motion/material effect gets its own example. |
| Edge cases | `Long content`, `Empty state` | When the component has a non-trivial layout response. |
| Side-effect APIs | `Persist`, `With action` | Use the `code` override here. |

Skip axes the component doesn't have. Never invent props in the docs that don't exist on the component.

### 4e. Reuse the docs controls helpers

If the project has shared controls under the docs directory discovered in §1 (size pickers, variant pickers, color pickers, value steppers), import and use them instead of writing fresh `<select>` elements inline. They keep docs visually consistent and typically render through the project's components, participating in code derivation cleanly.

---

## 5. Register the docs file (if required)

- **Glob-based registries** — dropping the file in `demos/` is enough.
- **Explicit registries** (`docs/registry.ts`) — add an entry matching the surrounding style.
- **Storybook** — CSF auto-titles when the file follows the configured glob.
- **MDX docs** — add to the docs site's nav config if it has one.

Check the registry's sort order. Most projects sort alphabetically; some respect `meta.category` and a `categoryOrder` array.

---

## 6. Verify

Before declaring done:

- If the user is running the docs dev server, navigate to the new page; the route should be reachable and every example should render without console errors. Otherwise rely on the type-check and snapshot/derived-code check below.
- Confirm the derived snippet for each example matches the rendered JSX.
- If the project has a docs test (a snapshot of `deriveCode` output, an a11y axe pass, a render smoke test), run it.
- If the docs file uses `code` overrides, confirm each matches what the example would emit on its own; if they agree, prefer dropping the override.

---

## Checklist

- [ ] File lives at the docs directory section 1 discovered.
- [ ] File extension and casing match sibling demos.
- [ ] If siblings expose `export const meta = { category: '…' }`, it matches an existing category (and is in `categoryOrder` if used).
- [ ] `'use client'` matches sibling demos.
- [ ] Default export is named `<Name>Demo`, wraps content in the project's outermost layout primitive.
- [ ] Every `<Example>` has a `title`; interactive controls live in `actions=`.
- [ ] Each iteration loop uses an explicit `key={…}`.
- [ ] Stateful examples are extracted into PascalCase helpers when the project has helper-extraction; otherwise inlined.
- [ ] Explicit `code` override is used **only** where derivation would be wrong, and matches the rendered output.
- [ ] Controls helpers reused from `docs/components/` instead of reinvented.
- [ ] The docs entry is reachable from the docs sidebar / nav.
- [ ] No unused imports, no dead code.

---

## Important

- The docs file's job is to demonstrate the **API surface**, not to recite internals. If a section doesn't teach the reader something they can act on, cut it.
- Trust the code-derivation walker. Fighting it creates two sources of truth that will drift.
- Never propose changes to the docs walker, the example wrapper, or any shared docs infrastructure from inside this skill. If a component genuinely can't be documented with the existing tooling, surface that as a finding and let the user decide.