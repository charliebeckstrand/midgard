# ui:docs:compose

TRIGGER when: create, add, write, or scaffold a docs page, demo, or example file for a UI component. Runs automatically when `/ui:component:compose` finishes creating a new component and the project has a docs system.

Create a single docs/demo file matching the project's docs system. The system (Storybook MDX, Vite playground, `import.meta.glob`-driven registry) varies — discover, then match.

Demonstrate the component's **API surface** — variants, sizes, states, common compositions — in a form the project's code-derivation tooling (if any) can parse into copy-paste snippets.

## Arguments

$ARGUMENTS

Component name (e.g. `Button`, `command-palette`). Match the casing the rest of the docs use.

---

## 0. Manifest

Read `./manifest.json`. If missing, halt with a pointer to `/repo:manifest`.

Pull:

| Field | Use |
|---|---|
| `packages[*]` | pick the package owning the component (longest-prefix match on `componentsDir`). With multiple frontend packages and no disambiguation, ask. |
| `framework` | `react` or `next`; the demo needs `'use client'` only when the docs site itself ships an RSC tree. Pure CSR docs (Vite SPA, Storybook) never need it, even when `framework: next`. |
| `componentsDir` | source of truth for importable components |
| `primitivesDir`, `hooksDir`, `tokensDir` | what the docs can compose alongside the target |

---

## 1. Locate the docs system

In order of signal strength:

1. `docs/` (or `docs/demos/`, `stories/`, `examples/`, `playground/`) under the package.
2. Storybook config (`.storybook/`).
3. MDX directory referenced by the docs site config.
4. `import.meta.glob` call referencing a demos directory (search `demos/*.tsx` / `examples/*.tsx` in docs entry points).

Capture:

- **Demo file path** the new file should occupy (e.g. `packages/ui/src/docs/demos/<name>.tsx`).
- **Registry mechanism** — glob auto-discovery, an explicit `index.ts` registry, or Storybook CSF auto-titles.
- **Example wrapper** — `<Example>`, `<Story>`, `<Demo>`, `<Showcase>`. Read its props.
- **Code-derivation walker** — search for `deriveCode` / `extractCode` / similar. When present, the wrapper auto-generates the "Show code" block; when absent, it expects an explicit `code` prop. When a specific capability (helper extraction in §3c, collapse in §3b) can't be confirmed from the walker's source, treat it as absent.

No signal fires → ask where docs live; never guess.

---

## 2. Sample sibling docs files

Read 2–3 existing demos:

- One **simple** (e.g. `badge`, `stack`, `divider`) — minimum shape.
- One **interactive** with `useState` and a controls helper (e.g. `button`, `accordion`) — variant/size pickers.
- One **complex** with multiple sub-helpers or an explicit `code` override (e.g. `toast`, `dialog`) — escape hatches.

Extract:

- File extension and casing (almost always `<name>.tsx` matching the component's kebab-case identifier).
- Default export shape (usually `export default function <Name>Demo() { … }`).
- **Meta export** — most projects expose `export const meta = { category: '…' }`. Drives sidebar grouping.
- **Example wrapper's props** — usually some combination of `title`, `actions`, `prefix`, `preview`, `footer`, `code`, `children`.
- **Controls helpers** — variant/size/color pickers usually live as shared components under `docs/components/`. Reuse; don't reinvent.
- **`'use client'` discipline** — the directive only carries meaning inside an RSC tree. If the docs site is a CSR Vite SPA or Storybook, drop it. If the docs site IS RSC-rendered, match the sibling that uses similar React features.
- **Section ordering** — typically variants → colors/tones → sizes → states (loading/disabled) → compound examples.
- **Formatting** — match formatter output, not your preference.

When siblings disagree, prefer the most recent (highest mtime).

---

## 3. Author derive-code-friendly examples

The whole point is rendered output **and** the source for the exact snippet that produced it. Author every example so the walker can produce a clean one.

### 3a. Use real component tags inside the wrapper

The walker matches build-time-tagged components from the project's barrels:

- Put the actual `<Button>` / `<Dialog>` / etc. inside the example, not a locally-defined wrapper like `<MyButtonRow />` — opaque to the walker unless the project has helper extraction.
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

Walkers typically collapse runs of 3+ identical iterated siblings to a single representative. The explicit `key={variant}` is the signal. When the project's walker collapses, lean into it.

### 3c. Author state in a sub-helper when the snippet would otherwise be noisy

When the example needs `useState` and the project has helper extraction (top-level PascalCase helpers tagged with their full source as `__code`), extract:

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

The walker reads `__code` and renders the helper's source in the derived snippet. Confirm the project ships this plugin before relying on it; otherwise inline the state.

### 3d. Use the explicit `code` escape hatch only when needed

When the example renders something the walker can't see — a hook call like `useToast()`, an external screenshot — supply an explicit `code` prop:

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

Honor sibling conventions from §2.

### 4a. Imports

Grouped by origin, alphabetized within each group:

```tsx
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/button'
import { Flex } from '../../components/flex'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'
import { SizeListbox } from '../components/size-listbox'
import { VariantListbox } from '../components/variant-listbox'
```

Add `'use client'` only when the docs site renders demos inside an RSC tree. CSR docs (Vite SPA, Storybook) never need it. Match siblings.

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
    <>
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
    </>
  )
}
```

### 4d. Choose which sections to write

Walk the component's prop surface (read the source). One section per meaningful axis. No more.

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

When the project has shared controls under the docs directory from §1 (size pickers, variant pickers, color pickers, value steppers), import and use them instead of writing fresh `<select>` elements inline. They keep docs visually consistent and typically render through the project's components, participating in code derivation cleanly.

---

## 5. Register the docs file (if required)

| Mechanism | Action |
|---|---|
| Glob-based registry | dropping the file in `demos/` is enough |
| Explicit registry (`docs/registry.ts`) | add an entry matching the surrounding style |
| Storybook | CSF auto-titles when the file follows the configured glob |
| MDX docs | add to the docs site's nav config if it has one |

Check the registry's sort order. Most projects sort alphabetically; some respect `meta.category` and a `categoryOrder` array.

---

## 6. Verify

Before declaring done:

- When the user is running the docs dev server, navigate to the new page; the route should be reachable and every example should render without console errors. Otherwise rely on the type-check and snapshot/derived-code check below.
- Confirm the derived snippet for each example matches the rendered JSX.
- When the project has a docs test (a snapshot of `deriveCode` output, an a11y axe pass, a render smoke test), run it.
- When the docs file uses `code` overrides, confirm each matches what the example would emit on its own; when they agree, drop the override.

---

## Checklist

- [ ] File lives at the docs directory §1 discovered.
- [ ] File extension and casing match sibling demos.
- [ ] If siblings expose `export const meta = { category: '…' }`, it matches an existing category (and is in `categoryOrder` if used).
- [ ] `'use client'` matches sibling demos (and is absent when the docs site is CSR-only).
- [ ] Label/control pairs use `useId()` (or rely on the project's field-context auto-wiring) instead of hard-coded `id` strings.
- [ ] Default export is named `<Name>Demo`, wraps content in the project's outermost layout primitive.
- [ ] Every `<Example>` has a `title`; interactive controls live in `actions=`.
- [ ] Each iteration loop uses an explicit `key={…}`.
- [ ] Stateful examples are extracted into PascalCase helpers when the project has helper extraction; otherwise inlined.
- [ ] Explicit `code` override is used only where derivation would be wrong, and matches the rendered output.
- [ ] Controls helpers reused from `docs/components/` instead of reinvented.
- [ ] The docs entry is reachable from the docs sidebar / nav.
- [ ] No unused imports, no dead code.

---

## Rules

- The docs file's job is to demonstrate the API surface, not to recite internals. When a section doesn't teach the reader something they can act on, cut it.
- Trust the code-derivation walker. Fighting it creates two sources of truth that drift.
- Never propose changes to the docs walker, the example wrapper, or any shared docs infrastructure from inside this skill. When a component genuinely can't be documented with the existing tooling, surface as a finding and let the user decide.
