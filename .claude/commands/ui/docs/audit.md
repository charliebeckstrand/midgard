# ui:docs:audit

TRIGGER when: the user asks to audit, check, review, or scan the project's component docs / demos / stories; asks "are the docs in sync", "any stale demos", "does every component have a docs page", "run the docs audit". Also auto-eligible after `/ui:component:compose` creates a new component and the project has a docs system.

You are running a static audit against the project's component docs files. The audit produces file:line-anchored findings sorted by severity. It does **not** boot a docs dev server — this is source analysis only.

## Arguments

$ARGUMENTS

Recognized hints:
- A component name → audit only that component's docs file.
- A path → audit a specific docs file or subdirectory.
- `--changed` → audit only docs files in `git diff --name-only` (staged + unstaged), plus docs for components whose source changed.
- No arguments → audit every docs file in every frontend package, plus check for components missing a docs file.

---

## 1. Load the Project Profile

Read `.claude/cache/project-profile.json`. If missing or stale, silently invoke `/repo:discover --quiet` and re-read. Treat this step as background context: never mention the profile, the cache, or the regeneration to the user — no "loading the profile", no "using the freshly-written profile", no status line at all.

Filter `packages` to those with `isFrontend: true` and `framework` in (`react`, `next`). If none, stop and tell the user the project has no frontend packages with docs to audit.

For each qualifying package, pull:

- `componentsDir` — the source of truth for which components exist.
- `framework` — `react` or `next`. Determines whether `'use client'` is meaningful.
- `conventions.vocabularyGlossary` — for cross-referencing section titles against the project's vocabulary.

---

## 2. Locate the docs system

Apply the same discovery as `/ui:docs:compose` section 1:

- A `docs/` (or `docs/demos/`, `stories/`, `examples/`, `playground/`) directory under each frontend package.
- A Storybook config (`.storybook/`).
- A docs entry point that registers demos via `import.meta.glob` or an explicit registry.

For each frontend package with no docs system, record a single package-level finding ("package `<name>` has no docs system") and skip the rest of the audit for that package.

For packages with a docs system, capture:

- The **demos directory** (e.g. `packages/ui/src/docs/demos`).
- The **registry file** (the `index.ts` or `registry.ts` that lists demos, if not glob-based).
- The **example-wrapper component** (typically `docs/components/example.tsx` or similar).
- Whether the project ships a **code-derivation walker** (search for an exported `deriveCode` / `extractCode` / similar utility).
- The **list of valid categories** (parse a `categoryOrder` array or scan all existing `meta.category` values).
- The **controls helpers** under `docs/components/` (size picker, variant picker, etc.) so the audit can flag reinvented controls.

---

## 3. Resolve scope

In priority order:

1. **Explicit component name or path** from `$ARGUMENTS` → audit just that.
2. **`--changed`** → take `git diff --name-only HEAD` plus unstaged. Keep:
   - Docs files under the demos directory.
   - Component source files whose docs file should be re-audited (look up the matching demo by name).
3. **No argument** → audit every file in the demos directory, **and** run the "coverage" check (section 4.1) against every component in `componentsDir`.

---

## 4. Run the checks

For each parsed docs file, run every applicable check. Each check produces zero or more findings.

Severity legend:

- **blocker** — broken docs (won't render, wrong component, missing required export). Blocks the audit.
- **warning** — meaningful drift (component prop removed, category invalid, override out of sync). Surfaces in the report but doesn't block.
- **nit** — style or coverage hint (could compose more, missing edge-case example). Suggested fix only.

### 4.1. Coverage

- **blocker** — `componentsDir` has a component that has no matching demo file in the docs directory. Skip components on the project's exclusion list (read from `CLAUDE.md`, `AGENTS.md`, or the docs registry's own skip list).
- **warning** — a demo file exists for a component that no longer exists in `componentsDir`.
- **nit** — a demo file has fewer than 2 `<Example>` blocks (likely under-documented for any non-trivial component).

### 4.2. Required exports

Parse each demo file. For every demo:

- **blocker** — no default export (or default export is not a function returning JSX).
- **blocker** — the default export does not render the project's example-wrapper at least once (the file is decorative, not a docs page).
- **warning** — missing `export const meta = { … }` when sibling demos have it.
- **warning** — `meta.category` is not one of the discovered valid categories (or not in `categoryOrder` if the project uses one).

### 4.3. Example-wrapper usage

For each `<Example>` (or whatever wrapper the project uses):

- **blocker** — missing `title` prop.
- **blocker** — empty `children` (the example renders nothing).
- **warning** — explicit `code` override present, but `children` only uses tagged components — the walker would derive the same snippet; drop the override.
- **warning** — explicit `code` override references a component not imported into the file, or a hook the file doesn't use (override drifted from the code).
- **nit** — `actions=` slot present without any interactive state in the demo (controls do nothing).

### 4.4. Code-derivation friendliness

These checks only run when the project has a code-derivation walker (section 2).

- **warning** — an `<Example>`'s top-level children include a locally-defined wrapper component (PascalCase function defined in the same file) that the walker would render as opaque. Acceptable only if the project has the helper-extraction plugin and the wrapper is a top-level helper.
- **warning** — an iteration (`.map()` returning JSX) inside an `<Example>` whose children don't have an explicit `key={…}`. The walker can't collapse iterated runs without a stable key signal.
- **nit** — an `<Example>` whose children are wrapped in raw `<div className="…">` rather than the project's layout primitives. The walker treats the wrapper as transparent, but the derived snippet reads better with a named primitive.
- **nit** — repeated literal blocks (3+ near-identical sibling components without a `.map()`) that could be expressed as iteration.

### 4.5. Prop-surface sync

For each demo, parse the matching component source (look up by name → `componentsDir/<name>.tsx` or `componentsDir/<name>/<name>.tsx`):

- **warning** — the demo references a prop that no longer exists on the component (removed, renamed).
- **warning** — the demo references a literal variant / size / color value that's no longer in the component's variant union (typo or removed enum member).
- **nit** — the component has a documented variant / size / color value that has no example demonstrating it.
- **nit** — the component has a boolean state prop (`disabled`, `loading`, `readonly`, `invalid`) with no matching `<Example>` section.

### 4.6. Controls reuse

- **warning** — the demo defines a local variant/size/color picker inline when a shared controls helper exists under `docs/components/` for the same axis. Replace with the shared component.

### 4.7. Authoring conventions

- **nit** — `'use client'` directive present in a demo with no hooks, event handlers, or browser APIs (and sibling demos drop it in that case).
- **nit** — `'use client'` directive missing in a demo that uses `useState` / `useEffect` / event handlers in a Next-consuming package.
- **nit** — variant/size/color array declared without `as const`, widening the type unnecessarily.
- **nit** — controls picker bound to state that no `<Example>` actually consumes.

### 4.8. Registry hygiene

When the project uses an explicit registry (not glob auto-discovery):

- **blocker** — a demo file exists but isn't registered.
- **blocker** — a registry entry points at a demo file that doesn't exist.
- **warning** — registry entries out of alphabetical order (or out of the project's declared order).

---

## 5. Report

Group findings by file, then by severity within each file. Lead with blockers, then warnings, then nits. For every finding, include:

- `file:line` anchor (the line where the offending construct lives).
- One-line description of what's wrong.
- One-line concrete fix (e.g. "import `SizeListbox` from `../components/size-listbox` and replace the inline `<Listbox>`").

End with a roll-up:

```
Audited: N docs files across M packages
Findings: <B> blocker · <W> warning · <N> nit
Coverage: <X>/<Y> components have docs (<percent>%)
```

If the audit ran with `--changed` and the diff is empty, say so and exit cleanly.

---

## 6. Offer to fix

After presenting findings, ask whether the user wants the auto-fixable ones applied. Auto-fixable means:

- Missing `export const meta = { category: '…' }` — propose a category based on the component's neighbors.
- `'use client'` mismatch — add or drop the directive.
- Inline picker that has a shared equivalent — swap to the shared component.
- Demo file missing entirely — invoke `/ui:docs:compose <name>` for each missing component.

Never auto-rewrite the `<Example>` body itself — that's a judgment call about which axes to demonstrate.

---

## Important

- The audit reads source only. Never boot a dev server, never run the project's build, never write to the docs files without the user's explicit go-ahead.
- The `componentsDir` is the source of truth for what components exist. Never rely on a memorized list.
- When the project's docs system doesn't match any signal in section 2, surface that and stop — don't invent a docs convention.
- Honor exclusion lists declared in `CLAUDE.md` / `AGENTS.md` / the docs registry's own skip list. A component on the exclusion list is not a coverage gap.
- Use the project's vocabulary (pulled from `conventions.vocabularyGlossary` in the profile) when naming axes and categories in the report.
