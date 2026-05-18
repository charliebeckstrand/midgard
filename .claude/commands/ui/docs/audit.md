# ui:docs:audit

TRIGGER when: audit, check, review, or scan the project's component docs / demos / stories — "are the docs in sync", "any stale demos", "does every component have a docs page". Auto-eligible after `/ui:component:compose` creates a new component and the project has a docs system.

Compare component docs files against the docs baseline (coverage + required exports + example-wrapper discipline + prop-surface sync). Report deviations as `file:line` entries by severity. CLEAN runs emit no table.

With a target, audits that target; without one, sweeps every demo file and ranks only those that deviated.

## Arguments

$ARGUMENTS

- A component name → audit only that component's docs file.
- A path → audit a specific docs file or subdirectory.
- `--changed` → audit docs files in `git diff --name-only` (staged + unstaged), plus docs for components whose source changed.
- `--top N` → in suite or changed mode, show top N worst offenders (default 10).
- No arguments → audit every docs file in every frontend package, plus check for components missing a docs file.

---

## 1. Manifest

Read `./manifest.json`. If missing, halt with a pointer to `/repo:manifest`.

Filter `packages` to `isFrontend: true` and `framework` in (`react`, `next`). If none qualify, halt — no frontend with docs to audit.

Per qualifying package, capture:

| Field | Use |
|---|---|
| `componentsDir` | source of truth for which components exist |
| `framework` | determines whether `'use client'` is meaningful |

---

## 2. Locate the docs system

Mirrors `/ui:docs:compose`'s discovery step:

- A `docs/` (or `docs/demos/`, `stories/`, `examples/`, `playground/`) directory under each frontend package.
- A Storybook config (`.storybook/`).
- A docs entry point that registers demos via `import.meta.glob` or an explicit registry.

For each frontend package with no docs system, record one package-level finding (`package <name> has no docs system`) and skip remaining checks for that package.

For packages with a docs system, capture:

- **Demos directory** (e.g. `packages/ui/src/docs/demos`).
- **Registry file** (`index.ts` or `registry.ts`, if not glob-based).
- **Example-wrapper component** (e.g. `docs/components/example.tsx`).
- Whether the project ships a **code-derivation walker** (`deriveCode` / `extractCode` / similar).
- **List of valid categories** — parse `categoryOrder` (canonical source). If absent, skip §4.2 category-validity check and record one package-level finding: `no canonical category list found`.
- **Controls helpers** under `docs/components/` (size picker, variant picker, etc.) so the audit can flag reinvented controls.
- **Meta convention** — sample 2-3 sibling demos; record whether `export const meta` is the local convention.

---

## 3. Resolve scope

Priority order:

1. Explicit component name or path → audit that.
2. `--changed` → `git diff --name-only HEAD` plus unstaged. Keep:
   - Docs files under the demos directory.
   - Component source files whose docs file should be re-audited (look up matching demo by name).
3. No argument → every file in the demos directory, plus the coverage check (§4.1) against every component in `componentsDir`.

Record the mode: `single` / `changed` / `suite`.

---

## 4. Checks

Each check defines one baseline. A check that holds emits nothing. A nit earns its row only when it would survive a second reader's review.

| Severity | Meaning |
|---|---|
| **blocker** | broken docs (won't render, wrong component, missing required export) |
| **warning** | meaningful drift (prop removed, category invalid, override out of sync) |
| **nit** | style or coverage hint |

### 4.1. Coverage

- **blocker** — `componentsDir` has a component with no matching demo file. Skip exclusions in `CLAUDE.md` / `AGENTS.md` / the docs registry's own skip list.
- **warning** — demo file exists for a component no longer in `componentsDir`.
- **nit** — demo file has fewer than 2 `<Example>` blocks for a component that exports 2+ variants or a `size` prop.

### 4.2. Required exports

- **blocker** — no default export (or default export is not a function returning JSX).
- **blocker** — default export does not render the project's example-wrapper at least once.
- **warning** — missing `export const meta = { … }` when sibling demos have it.
- **warning** — `meta.category` is not in `categoryOrder` (when the project ships one).

### 4.3. Example-wrapper usage

Per `<Example>` (or the project's equivalent):

- **blocker** — missing `title` prop.
- **blocker** — empty `children`.
- **warning** — explicit `code` override present, but `children` only uses tagged components — the walker would derive the same snippet. Drop the override.
- **warning** — explicit `code` override references a component not imported into the file, or a hook the file doesn't use.
- **nit** — `actions=` slot present without any interactive state in the demo.

### 4.4. Code-derivation friendliness

Only when the project ships a code-derivation walker.

- **warning** — `<Example>` top-level children include a locally-defined wrapper (PascalCase function in the same file); the walker renders it opaque. Skip when the project supports helper extraction and the wrapper is a top-level helper.
- **warning** — iteration inside an `<Example>` whose children don't have an explicit `key={…}`. The walker can't collapse iterated runs without a stable key.
- **nit** — `<Example>` children wrapped in raw `<div className="…">` rather than the project's layout primitives.
- **nit** — repeated literal blocks (3+ near-identical sibling components without a `.map()`) that could be iteration.

### 4.5. Prop-surface sync

Parse the matching component source:

- **warning** — demo references a prop no longer on the component (removed, renamed).
- **warning** — demo references a literal variant / size / color value no longer in the component's variant union.
- **nit** — component has a documented variant / size / color value with no example demonstrating it.
- **nit** — component has a boolean state prop (`disabled`, `loading`, `readonly`, `invalid`) with no matching `<Example>` section.

### 4.6. Controls reuse

- **warning** — demo defines a local variant/size/color picker inline when a shared controls helper exists under `docs/components/` for the same axis. Replace with the shared component.

### 4.7. Authoring conventions

- **nit** — `'use client'` directive in a demo with no hooks, event handlers, or browser APIs (and sibling demos drop it).
- **nit** — `'use client'` directive missing in a demo using `useState` / `useEffect` / event handlers in a Next-consuming package.
- **nit** — variant/size/color array declared without `as const`.
- **nit** — controls picker bound to state no `<Example>` consumes.

### 4.8. Registry hygiene

When the project uses an explicit registry (not glob auto-discovery):

- **blocker** — demo file exists but isn't registered.
- **blocker** — registry entry points at a demo file that doesn't exist.
- **warning** — registry entries out of alphabetical order (or out of the project's declared order).

---

## 5. Output

Lead with the verdict.

| Verdict | When |
|---|---|
| **CLEAN** | no deviations — entire report; stop |
| **DEVIATIONS PRESENT** | only warnings/nits |
| **FAIL** | any blocker |

If `--changed` and the diff is empty, say so and exit.

Score for ranking: `(blockers × 5) + (warnings × 2) + (nits × 1)`.

Branch on mode:

- **`single`** — one section, full findings table.
- **`changed`** — one section per changed demo, sorted by score descending. Cap at top **10** unless `--top N`.
- **`suite`** — Deviation summary table first (top 10 by score; baseline-holders omitted; ties broken by lowest `file:line`), then full per-demo sections for the top-N. List the rest: `Remaining demos with deviations: N (M deviations total). Run /ui:docs:audit <component> to inspect.`

Deviation summary table:

```
| Rank | Demo | Location | Blockers | Warnings | Nits | Score | Headline finding |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | widget | packages/ui/src/docs/demos/widget.tsx | 1 | 3 | 2 | 13 | unused-code-override: code block references hook not used in demo |
```

Per-demo section (all modes): group findings by severity. Per finding: `file:line` + one-line description + one-line concrete fix.

Roll-up:

```
N docs files audited across M packages · K outside baseline
Deviations: <B> blocker · <W> warning · <I> nit
Coverage: <X>/<Y> components have docs (<percent>%)
```

---

## 6. Offer to fix

Ask whether to apply auto-fixable items:

| Finding | Fix |
|---|---|
| Missing `export const meta = { category: '…' }` | propose a category based on neighbors |
| `'use client'` mismatch | add or drop the directive |
| Inline picker with a shared equivalent | swap to the shared component |
| Demo file missing entirely | invoke `/ui:docs:compose <name>` |

Never auto-rewrite the `<Example>` body — choosing which axes to demonstrate is a judgment call.

---

## Rules

- Source analysis only. Never boot a dev server, never run the project's build, never write to docs files without explicit go-ahead.
- The verdict is the deliverable; deviations are evidence. CLEAN is a successful run. Don't manufacture nits.
- `componentsDir` is the source of truth for what components exist. Never rely on a memorized list.
- When the project's docs system doesn't match any signal in §2, surface that and stop — don't invent a docs convention.
- Honor exclusion lists in `CLAUDE.md` / `AGENTS.md` / the docs registry's own skip list.
- In `suite` mode: rank, then truncate.
