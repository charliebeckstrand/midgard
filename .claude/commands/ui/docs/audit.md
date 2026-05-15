# ui:docs:audit

TRIGGER when: the user asks to audit, check, review, or scan the project's component docs / demos / stories; asks "are the docs in sync", "any stale demos", "does every component have a docs page", "run the docs audit". Also auto-eligible after `/ui:component:compose` creates a new component and the project has a docs system.

Static audit of the project's component docs files. Produces `file:line`-anchored findings sorted by severity. Does **not** boot a docs dev server — source analysis only.

With no target, sweeps every demo file and surfaces the **worst offenders** ranked by severity-weighted finding count.

## Arguments

$ARGUMENTS

Recognized hints:
- A component name → audit only that component's docs file.
- A path → audit a specific docs file or subdirectory.
- `--changed` → audit only docs files in `git diff --name-only` (staged + unstaged), plus docs for components whose source changed.
- `--top N` → in suite mode, show only the top N worst offenders (default 10).
- No arguments → audit every docs file in every frontend package, plus check for components missing a docs file.

---

## 1. Load the Manifest

Read `./manifest.json`. If missing, stop and tell the user to run `/repo:manifest` first — never generate the manifest yourself. Treat a successful load as silent background context; don't mention it to the user.

Filter `packages` to `isFrontend: true` and `framework` in (`react`, `next`). If none, stop and tell the user the project has no frontend packages with docs to audit.

Per qualifying package:

- `componentsDir` — source of truth for which components exist.
- `framework` — `react` or `next`; determines whether `'use client'` is meaningful.

---

## 2. Locate the docs system

Apply the same discovery as `/ui:docs:compose` section 1:

- A `docs/` (or `docs/demos/`, `stories/`, `examples/`, `playground/`) directory under each frontend package.
- A Storybook config (`.storybook/`).
- A docs entry point that registers demos via `import.meta.glob` or an explicit registry.

For each frontend package with no docs system, record one package-level finding ("package `<name>` has no docs system") and skip remaining checks for that package.

For packages with a docs system, capture:

- The **demos directory** (e.g. `packages/ui/src/docs/demos`).
- The **registry file** (`index.ts` or `registry.ts`, if not glob-based).
- The **example-wrapper component** (typically `docs/components/example.tsx`).
- Whether the project ships a **code-derivation walker** (`deriveCode` / `extractCode` / similar).
- The **list of valid categories** (parse a `categoryOrder` array or scan all existing `meta.category` values).
- The **controls helpers** under `docs/components/` (size picker, variant picker, etc.) so the audit can flag reinvented controls.

---

## 3. Resolve scope

In priority order:

1. **Explicit component name or path** from `$ARGUMENTS` → audit just that.
2. **`--changed`** → `git diff --name-only HEAD` plus unstaged. Keep:
   - Docs files under the demos directory.
   - Component source files whose docs file should be re-audited (look up matching demo by name).
3. **No argument** → audit every file in the demos directory, **and** run the coverage check (4.1) against every component in `componentsDir`.

Record the **mode**:
- `single` — explicit target.
- `changed` — `--changed`.
- `suite` — no argument; ranks the whole demo suite.

---

## 4. Run the checks

Severity:

- **blocker** — broken docs (won't render, wrong component, missing required export).
- **warning** — meaningful drift (prop removed, category invalid, override out of sync).
- **nit** — style or coverage hint.

### 4.1. Coverage

- **blocker** — `componentsDir` has a component with no matching demo file. Skip exclusions declared in `CLAUDE.md` / `AGENTS.md` / the docs registry's own skip list.
- **warning** — a demo file exists for a component that no longer exists in `componentsDir`.
- **nit** — a demo file has fewer than 2 `<Example>` blocks for a non-trivial component.

### 4.2. Required exports

- **blocker** — no default export (or default export is not a function returning JSX).
- **blocker** — the default export does not render the project's example-wrapper at least once.
- **warning** — missing `export const meta = { … }` when sibling demos have it.
- **warning** — `meta.category` is not one of the discovered valid categories (or not in `categoryOrder` if the project uses one).

### 4.3. Example-wrapper usage

Per `<Example>` (or the project's equivalent):

- **blocker** — missing `title` prop.
- **blocker** — empty `children`.
- **warning** — explicit `code` override present, but `children` only uses tagged components — the walker would derive the same snippet. Drop the override.
- **warning** — explicit `code` override references a component not imported into the file, or a hook the file doesn't use.
- **nit** — `actions=` slot present without any interactive state in the demo.

### 4.4. Code-derivation friendliness

Only when the project has a code-derivation walker.

- **warning** — `<Example>` top-level children include a locally-defined wrapper component (PascalCase function defined in the same file) that the walker would render as opaque. Acceptable only if the project has helper-extraction and the wrapper is a top-level helper.
- **warning** — an iteration inside an `<Example>` whose children don't have an explicit `key={…}`. The walker can't collapse iterated runs without a stable key.
- **nit** — `<Example>` children wrapped in raw `<div className="…">` rather than the project's layout primitives.
- **nit** — repeated literal blocks (3+ near-identical sibling components without a `.map()`) that could be iteration.

### 4.5. Prop-surface sync

Parse the matching component source:

- **warning** — demo references a prop that no longer exists on the component (removed, renamed).
- **warning** — demo references a literal variant / size / color value no longer in the component's variant union.
- **nit** — component has a documented variant / size / color value with no example demonstrating it.
- **nit** — component has a boolean state prop (`disabled`, `loading`, `readonly`, `invalid`) with no matching `<Example>` section.

### 4.6. Controls reuse

- **warning** — demo defines a local variant/size/color picker inline when a shared controls helper exists under `docs/components/` for the same axis. Replace with the shared component.

### 4.7. Authoring conventions

- **nit** — `'use client'` directive present in a demo with no hooks, event handlers, or browser APIs (and sibling demos drop it).
- **nit** — `'use client'` directive missing in a demo using `useState` / `useEffect` / event handlers in a Next-consuming package.
- **nit** — variant/size/color array declared without `as const`.
- **nit** — controls picker bound to state that no `<Example>` actually consumes.

### 4.8. Registry hygiene

When the project uses an explicit registry (not glob auto-discovery):

- **blocker** — a demo file exists but isn't registered.
- **blocker** — a registry entry points at a demo file that doesn't exist.
- **warning** — registry entries out of alphabetical order (or out of the project's declared order).

---

## 5. Output

Score each audited demo:

```
score = (blockers × 5) + (warnings × 2) + (nits × 1)
```

Branch on the mode from section 3.

### `single` mode

One section, full findings table.

### `changed` mode

One section per changed demo, sorted by score descending. Cap at top **10** unless `--top N`.

### `suite` mode

Lead with a **Worst offenders** table, sorted by score descending, capped at top **10** (or `--top N`):

```
## Worst offenders

| Rank | Demo | Location | Blockers | Warnings | Nits | Score | Headline finding |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | widget | packages/ui/src/docs/demos/widget.tsx | 1 | 3 | 2 | 13 | unused-code-override: `code` block references hook not used in demo |
| 2 | drawer | packages/ui/src/docs/demos/drawer.tsx | 0 | 4 | 1 | 9 | controls-reuse: inline variant picker shadows `<VariantListbox>` |
```

Then print full per-demo sections for the top-N only, in rank order. List the rest below the cut:

```
Below the cut: N demos with M findings (run `/ui:docs:audit <component>` to inspect).
```

### Per-demo section (all modes)

Group findings by severity. Per finding: `file:line` + one-line description + one-line concrete fix.

### Roll-up

```
N docs files audited across M packages
Findings: <B> blocker · <W> warning · <I> nit
Coverage: <X>/<Y> components have docs (<percent>%)
```

Top-of-report status:

- Any **blocker** → **FAIL**.
- Only warnings/nits → **PASS WITH FINDINGS**.
- Nothing found → **PASS**.

If `--changed` and the diff is empty, say so and exit cleanly.

---

## 6. Offer to fix

Ask whether to apply auto-fixable items:

- Missing `export const meta = { category: '…' }` → propose a category based on neighbors.
- `'use client'` mismatch → add or drop the directive.
- Inline picker with a shared equivalent → swap to the shared component.
- Demo file missing entirely → invoke `/ui:docs:compose <name>`.

Never auto-rewrite the `<Example>` body — judgment call about which axes to demonstrate.

---

## Important

- Source analysis only. Never boot a dev server, never run the project's build, never write to docs files without explicit go-ahead.
- `componentsDir` is the source of truth for what components exist. Never rely on a memorized list.
- When the project's docs system doesn't match any signal in section 2, surface that and stop — don't invent a docs convention.
- Honor exclusion lists declared in `CLAUDE.md` / `AGENTS.md` / the docs registry's own skip list.
- In `suite` mode, **rank, then truncate**. The worst-offenders table is the deliverable.