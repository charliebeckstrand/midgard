# ui:docs:compose

TRIGGER when: the user asks to create, add, write, or scaffold a docs page, demo, or example file for a UI component. Also runs automatically when `/ui:component:compose` finishes creating a new component and the project has a docs system.

You are creating a single docs/demo file that lives next to the project's other component docs. The repo is a Turborepo with Next.js apps and (usually) one or more shared React component packages. The exact docs system (Storybook MDX, a hand-rolled Vite playground, an `import.meta.glob`-driven registry, etc.) varies per project — discover the conventions, then match them.

The docs page exists to demonstrate the component's **API surface** — variants, sizes, states, common compositions — in a form that the project's code-derivation tooling (if any) can parse into copy-paste snippets. Optimize for that consumer, not for prose.

## Arguments

$ARGUMENTS

The argument is the component name (e.g. `Button`, `command-palette`). Match whatever casing the rest of the docs use.

---

## 0. Load the Manifest

Read `./manifest.json`. If the file does not exist, stop and tell the user to run `/repo:manifest` first — do not generate the manifest yourself; only `/postmortem` and `/premortem` create it. Treat a successful load as background context: never mention the manifest or the load to the user — no "loading the manifest", no status line at all.

From the manifest, pull:

- `packages[*]` — pick the package owning the component (longest-prefix match on `componentsDir`). If multiple frontend packages exist and the user did not disambiguate, ask.
- `framework` — `react` or `next`; determines whether the demo needs `'use client'`.
- `componentsDir` — the source of truth for which components are importable.
- `primitivesDir`, `hooksDir`, `tokensDir` — what the docs can compose alongside the target component.
- `conventions.vocabularyGlossary` — use the project's terms in section titles ("Variants", "Tones", "Surfaces", whatever the project actually calls them).

If the target package has no docs system at all (see section 1), stop and tell the user — this skill has nothing to compose against.

---

## 1. Locate the docs system

Look, in order, for the strongest signal of where docs live:

1. A `docs/` (or `docs/demos/`, `stories/`, `examples/`, `playground/`) directory under the target package.
2. A Storybook config (`.storybook/`) at the package root.
3. An MDX directory referenced by the package's docs site config.
4. An `import.meta.glob` call referencing a directory of demos (search for `demos/*.tsx` / `examples/*.tsx` patterns in the package's docs entry points).

Capture:

- The **demo file path** the new file should occupy (e.g. `packages/ui/src/docs/demos/<name>.tsx`).
- The **registry mechanism** — glob-based auto-discovery vs an explicit `index.ts` registry vs Storybook's CSF auto-titles. If the project uses an explicit registry, the new file must be registered there; if it's glob-based, dropping the file in place is enough.
- The **example-wrapper** the project uses — typically a local component like `<Example>`, `<Story>`, `<Demo>`, `<Showcase>`. Read its props and respect them.
- Whether the project ships a **code-derivation walker** (e.g. a `deriveCode` / `extractCode` utility that walks the JSX tree). If yes, the wrapper auto-generates the "Show code" block; if no, the wrapper expects an explicit `code` prop.

If none of these signals fires, stop and ask the user where docs live — never guess a location.

---

## 2. Sample sibling docs files

Read **2–3 existing demo files** in the docs directory. Pick a mix:

- One **simple** demo (e.g. `badge`, `stack`, `divider`) — captures the minimum shape.
- One **interactive** demo with `useState` and a controls helper (e.g. `button`, `accordion`) — captures how the project surfaces variant/size pickers.
- One **complex** demo with multiple sub-helpers or an explicit `code` override (e.g. `toast`, `dialog`) — captures the escape hatch.

From those files, extract:

- **File extension and casing.** Almost always `<name>.tsx` matching the component's kebab-case identifier.
- **Default export shape.** Usually `export default function <Name>Demo() { … }`.
- **Meta export.** Most projects expose `export const meta = { category: '…' }` (and sometimes `name`). The category drives the docs sidebar grouping.
- **The example wrapper's props.** Typically some combination of `title`, `actions`, `prefix`, `preview`, `footer`, `code`, `children`. Note which the project uses idiomatically.
- **The controls helpers.** Variant pickers, size pickers, color pickers — the project usually has these as shared components under `docs/components/`. Reuse them; don't reinvent.
- **The `'use client'` discipline.** Some demos start with `'use client'`, some don't — match the sibling that uses similar React features (hooks, event handlers).
- **Section ordering.** Most demos open with the primary axis (variants), then secondary (colors / tones), then sizes, then states (loading / disabled), then compound examples. Match the order the existing demos use.
- **Import grouping and tabs vs spaces.** Match the formatter output, not your own preference.

If two sibling demos disagree, prefer the most recent (highest mtime).

---

## 3. Make the docs derive-code-friendly

The whole point of a docs file is that the reader can see the rendered output **and** the source for the exact snippet that produced it. The project's code-derivation tooling (if any) walks the JSX tree inside each `<Example>` and emits a copy-paste snippet. Author every example so the walker can produce a clean snippet:

### 3a. Use real component tags inside the wrapper

The walker matches against build-time-tagged components from the project's components/primitives barrels. That means:

- Put the **actual** `<Button>` / `<Dialog>` / etc. tags inside the example, not a locally-defined wrapper like `<MyButtonRow />` (those become opaque to the walker unless the project has a helper-extraction plugin).
- Compose with the project's layout primitives (`<Stack>`, `<Flex>`, `<Grid>`) instead of raw `<div>` flex utilities — the walker treats unknown wrappers as transparent, but the snippet reads better when the layout is named.
- Avoid one-off styling wrappers like `<div className="grid grid-cols-3">` — they vanish in the derived snippet, leaving a confusing flat list.

### 3b. Iterate with explicit keys when you mean iteration

When demoing every variant or color, the conventional pattern is:

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

Code-derivation walkers typically collapse runs of 3+ identical iterated siblings to a single representative so the snippet stays short. The explicit `key={variant}` is the signal the walker looks for. If the project's walker collapses iteration, lean into it — don't unroll the loop by hand.

### 3c. Author state in a sub-helper when the snippet would otherwise be noisy

If the example needs `useState` (e.g. a controlled dialog, a stepper), and the project's docs build has a **helper extraction** plugin (it tags top-level PascalCase helpers in each demo file with their full source as `__code`), extract the stateful part into a named helper:

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

The walker reads `__code` and renders the helper's source verbatim in the derived snippet, so the reader sees the full `useState` + JSX rather than `<CreateProjectDialog />`. Confirm the project actually has this plugin (search for files that attach a `__code` property or read it) before relying on the pattern; if it doesn't, inline the state.

### 3d. Use the explicit `code` escape hatch only when needed

When the example renders a side-effect-y thing the walker can't see — a hook call like `useToast()`, a non-component setup like a CLI invocation, an external screenshot — supply an explicit `code` prop using the project's tagged-template helper (commonly `code`\`…\`):

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

Prefer the derived snippet over the override — every explicit `code` block is one more thing to keep in sync with the component's real API. Reach for the override only when the derived snippet would be wrong or empty.

---

## 4. Compose the docs file

Honor the sibling-file conventions you found in section 2. The shape below is the de-facto pattern; adjust to what the project actually does.

### 4a. Imports

Imports are grouped by origin, alphabetized within each group:

```tsx
'use client'

import { Plus } from 'lucide-react' // third-party
import { useState } from 'react'
import { Button } from '../../components/button' // project components
import { Flex } from '../../components/flex'
import { Stack } from '../../components/stack'
import { Example } from '../components/example' // docs-local helpers
import { SizeListbox } from '../components/size-listbox'
import { VariantListbox } from '../components/variant-listbox'
```

Drop `'use client'` when the demo has no hooks, event handlers, or browser APIs and sibling demos drop it too.

### 4b. Meta and constants

```tsx
export const meta = { category: '<Category>' }

const variants = ['solid', 'soft', 'outline', 'plain'] as const
type Variant = (typeof variants)[number]

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const
type Color = (typeof colors)[number]
```

Use `as const` for variant/color/size literal arrays so types stay narrow. Reuse the project's canonical lists when they exist (some projects export `BUTTON_VARIANTS` from the component file — import it instead of redeclaring).

### 4c. The default export

The default export is the demo page. It's wrapped in the project's outermost layout primitive (usually `<Stack gap="xl">`) and contains one `<Example>` per section:

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

Walk the component's prop surface (read the component file you're documenting) and produce **one section per meaningful axis**. As many as make sense — no more, no less.

Universal axes that are almost always worth showing when the component has them:

| Axis | Title convention | Notes |
| --- | --- | --- |
| Visual variants | `Variants` | One example per variant value. |
| Color / tone | `Colors` / `Tones` | Use the project's variant-picker so the reader can flip the variant while comparing colors. |
| Size | `Sizes` | One example per size; label with the project's size glossary if it has one. |
| Affordances | `With icon`, `With prefix`, `Icon only` | Show how slot/prefix/suffix props compose. |
| States | `Disabled`, `Loading`, `Readonly`, `Invalid` | One example per state. |
| Compound composition | `<Component> + <Sibling>` | Show idiomatic compositions (e.g. `Stack composed with buttons`). |
| Effects | `Ripple`, `Spring`, `Glass` | Each motion/material effect gets its own example. |
| Edge cases | `Long content`, `Empty state` | When the component has a non-trivial layout response. |
| Side-effect APIs | `Persist`, `With action` | When the component exposes imperative APIs (e.g. `useToast`); use the `code` override here. |

Skip axes the component doesn't have. Never invent props in the docs that don't exist on the component.

### 4e. Reuse the docs controls helpers

If the project has shared controls under `docs/components/` (size pickers, variant pickers, color pickers, value steppers, etc.), import and use them instead of writing fresh `<select>` elements inline. They keep the docs visually consistent and they typically render through the project's components, so they participate in code derivation cleanly.

---

## 5. Register the docs file (if required)

- **Glob-based registries** (`import.meta.glob('./demos/*.tsx')`) — dropping the file in `demos/` is enough. The new file appears in the sidebar on next dev-server reload.
- **Explicit registries** (`docs/registry.ts` or similar with a hand-maintained list) — add an entry matching the surrounding style.
- **Storybook** — CSF auto-titles when the file follows the `*.stories.tsx` naming and lives under the configured stories glob.
- **MDX docs** — add to the docs site's nav config if it has one.

Check the registry's sort order. Most projects sort alphabetically; some respect the `meta.category` and a `categoryOrder` array (in which case make sure the chosen category appears in the order list).

---

## 6. Verify

Before declaring done:

- Open the docs dev server (if one exists) and navigate to the new page. The route should be reachable from the sidebar; every example should render without console errors.
- Confirm the derived snippet for each example matches the rendered JSX. If a snippet looks wrong, the wrapper or layout choice is fighting the walker — fix the demo, not the walker.
- If the project has a docs test (a snapshot of `deriveCode` output, an a11y axe pass, or a render smoke test), run it.
- If the docs file uses `code` overrides, confirm each override matches what the example would emit on its own; if they agree, prefer dropping the override.

---

## Checklist

- [ ] File lives at the docs directory the Manifest (or section 1 discovery) points at.
- [ ] File extension and casing match sibling demos.
- [ ] `export const meta = { category: '…' }` matches one of the project's existing categories (and is in `categoryOrder` if the project uses one).
- [ ] `'use client'` directive matches sibling demos' convention.
- [ ] Default export is named `<Name>Demo`, wraps content in the project's outermost layout primitive.
- [ ] Every `<Example>` has a `title`; interactive controls live in `actions=`.
- [ ] Each iteration loop uses an explicit `key={…}` so the code-derivation walker can collapse runs.
- [ ] Stateful examples are extracted into PascalCase helpers when the project has helper-extraction; otherwise inlined.
- [ ] The explicit `code` override is used **only** where derivation would be wrong, and matches the rendered output.
- [ ] Controls helpers (`SizeListbox`, `VariantListbox`, `ColorListbox`, …) are reused from `docs/components/` instead of reinvented.
- [ ] The docs entry is reachable from the docs sidebar / nav.
- [ ] No unused imports, no dead code, no leftover `console.log` from authoring.

---

## Important

- The docs file's job is to demonstrate the **API surface**, not to recite the component's internal implementation. If a section doesn't teach the reader something they can act on, cut it.
- Trust the code-derivation walker. Fighting it (manually building snippets that duplicate what the walker would emit) creates two sources of truth and they will drift.
- Sibling demos are the source of truth for authoring style. When in doubt, copy what the most recent neighbor does.
- Never propose changes to the docs walker, the example wrapper, or any shared docs infrastructure from inside this skill. If a component genuinely can't be documented with the existing tooling, surface that as a finding and let the user decide.
- Use the project's vocabulary (pulled from `conventions.vocabularyGlossary`) in section titles so the docs feel native.
