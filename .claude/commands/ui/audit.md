# ui:audit

TRIGGER when: the user asks to audit, check, review, or scan a UI component (or every component in a frontend package); asks "is this component getting messy", "any bugs in this component", "what should I split", "what should I consolidate", "what's wrong with this component". Also auto-eligible after `/ui:component:compose` creates a new component, to verify the scaffold sits within the component-health envelope.

You are running a static, per-component health audit against the project's UI source files. The audit produces file:line-anchored findings sorted by severity. It reads source only — no dev server, no test run, no headless browser.

The typical invocation names a single component. When no target is given, the audit sweeps every component in the project and surfaces the **worst offenders** — components ranked by severity-weighted finding count — so the user gets a triage list, not an alphabetical wall of text.

This skill is **component-internal**. Cross-component duplication clusters, layering violations, dead exports, and stale `TODO` markers belong to `/audit:refactor`; accessibility belongs to `/audit:a11y`; demo-file drift belongs to `/ui:docs:audit`. When a finding here would be better expressed at one of those scopes, name the sibling skill in the suggested fix and move on.

## Arguments

$ARGUMENTS

Recognized hints:
- A path or component name → audit that scope. **Typical case.**
- `--changed` → audit only files in `git diff --name-only` (staged + unstaged).
- `--top N` → when running suite-wide, show only the top N worst offenders (default 10).
- No arguments → audit every component under each frontend package's `componentsDir` and rank worst offenders.

---

## 1. Load the Project Profile

Read `.claude/cache/project-profile.json`. If missing or stale, silently invoke `/repo:discover --quiet` and re-read. Treat this step as background context: never mention the profile, the cache, or the regeneration to the user — no "loading the profile", no "using the freshly-written profile", no status line at all.

Filter `packages` to those with `isFrontend: true` and `framework` in (`react`, `next`). If none, stop and tell the user the project has no frontend packages to audit.

For each qualifying package, pull:

- `framework` — `react` or `next`. Both parse as TS/JSX; `next`-specific checks also apply.
- `componentsDir` — default scope when no argument and no diff.
- `primitivesDir` — read so split suggestions land in the right directory (a candidate that's clearly a primitive goes under `primitivesDir`, not `componentsDir`).
- `hooksDir` — read so extract-to-hook suggestions target the project's hooks directory.
- `conventions.principles` — observed when weighting findings (a principle like "build from small, composable pieces" promotes split candidates).
- `conventions.vocabularyGlossary` — use the project's terms in the report.

---

## 2. Resolve scope

In priority order:

1. **Explicit path or component name** from `$ARGUMENTS` → audit just that. This is the typical case.
2. **`--changed`** → take `git diff --name-only HEAD` plus unstaged. Keep only files under a frontend package's `componentsDir` or `primitivesDir` with extension `.tsx` or `.jsx`.
3. **No argument** → audit every file under each frontend package's `componentsDir` and rank worst offenders (see section 6).

If a target component name resolves to multiple matches (folders / files), list them and ask the user which to audit.

Record the **mode** for the output step:
- `single` — one component or one path supplied.
- `changed` — `--changed` supplied.
- `suite` — no argument, ranking the whole component suite.

---

## 3. Parse the targets

Parse `.tsx` / `.jsx` files using a TypeScript/Babel JSX AST. AST parsing is required for the prop-surface, branch, and split checks — regex is not sufficient for tracking which prop names are read, which variant branches fire, or which JSX subtrees could move.

For each target file capture:

- Every exported component declaration with its props type, hook calls, JSX root, and JSX subtree shape.
- Every local component declared in the same file (PascalCase function returning JSX).
- Every `useState`, `useReducer`, `useEffect`, `useMemo`, `useCallback`, `useRef`, and project-local hook call, with the dependency arrays and the values they read.
- Every conditional in JSX (`{cond && …}`, `{cond ? a : b}`, `{cond1 ? a : cond2 ? b : c}`).
- Every `.map()` / `.filter()` / inline render-function pattern inside JSX.

If a file fails to parse, record it as a `blocker · parse-error` finding for that file and skip the remaining checks on it.

---

## 4. Sample sibling components

For each audited component, glob its parent directory for sibling components and read up to **3** of them. Capture:

- The dominant prop-surface size (median prop count across siblings).
- The dominant variant / size / color discriminator names (so naming-inconsistency findings have a comparison set).
- Whether siblings extract subtrees into local helpers vs inline them.
- Whether siblings push hooks into `hooksDir` vs declare them inline.

The samples calibrate the thresholds — a 20-prop component in a package where every sibling has 20 props is not bloat; the same component in a package where siblings hover at 6 props is.

---

## 5. Run the checks

For each parsed component, run every applicable check. Each check produces zero or more findings.

Severity legend (canonical per `/skill:audit`):

- **blocker** — broken component (won't render, references missing props, uses a hook that violates Rules of Hooks). Blocks the audit.
- **warning** — meaningful smell (prop bloat, single-responsibility violation, dead branch, mirrored state, conditional-rendering tangle). Surfaces in the report.
- **nit** — style or hygiene hint (naming drift, comment rot, small split opportunity with low impact). Suggested fix only.

### 5.1. Complexity and size

- **warning** — component file longer than **400 lines**, or the exported component function longer than **150 lines**.
- **warning** — cyclomatic-complexity proxy on the exported component above **12**: count `if` / `else if` / `switch case` / `?:` / `&&` / `||` inside the function body.
- **nit** — JSX tree deeper than **6 levels** of nesting in a single render path.
- **nit** — more than **8** hook calls in a single component. Suggests state can be extracted into a custom hook.

### 5.2. Single-responsibility violations

- **warning** — a component renders two or more **unrelated subtrees** (distinct conceptual regions with no shared state and no shared props) that could be siblings of a parent.
- **warning** — a component manages **unrelated state slices** (state variables never read together, never updated together, no dependency between their effects). Suggests splitting into two components, or extracting one slice into a custom hook.
- **warning** — a component mixes **data fetching + transformation + rendering** when the project has a data layer (a `useQuery`-style hook present in siblings, or a fetcher in `hooksDir`). Suggests moving fetching/transformation behind a hook.

### 5.3. Prop-surface bloat

- **warning** — the component's prop count exceeds **1.5×** the median prop count of its siblings (from section 4). When siblings are too few to set a median, fall back to a hard threshold of **15 props**.
- **warning** — more than **4 boolean props** on a single component. Boolean explosion — suggest a discriminated union (`status: 'idle' | 'loading' | 'error' | 'success'`) or compound-component split.
- **warning** — two or more props that always **co-vary** in every call site the audit can see (always passed together with correlated values). Suggests merging into one object prop or one discriminated union.
- **nit** — props that are **passed straight through** to a single child element with no logic in between. Suggest spreading or removing the wrapper layer.

### 5.4. Unused props and dead variants

- **blocker** — a prop declared in the component's props type but **never read** inside the component. Either remove it or wire it up.
- **warning** — a variant / size / color value declared in a union type that **no branch** of the component handles (not in a `switch`, not in a lookup map, not in a recipe). Dead variant.
- **warning** — a branch of a `switch` / lookup map / conditional whose discriminator value is **not in the declared union**. Stale branch.
- **nit** — a prop with a default value that **equals** the value used everywhere — the default never differs from the call-site value. Either drop the default or drop the prop.

### 5.5. Conditional-rendering smells

- **warning** — nested ternary chains in JSX **3 levels deep** or more. Suggest extracting a lookup map, a discriminated-union render switch, or named sub-components.
- **warning** — `{cond && <Foo/>}` chains where multiple `cond && …` siblings depend on overlapping conditions. Suggests a single guarded section.
- **warning** — a **render function** (a function returning JSX) declared **inline inside the component body** and called once. Inline the JSX or extract a real component.
- **nit** — fragment soup: 3+ adjacent `<>…</>` fragments at the same depth that could collapse to a single fragment or a named primitive from `primitivesDir`.
- **nit** — `return null` used as a guard when an **early return** at the top of the function would short-circuit the rest of the work.

### 5.6. State and effect smells

- **warning** — `useState` initialized from a prop and **never updated** other than to mirror that prop in a `useEffect`. Mirrored state — read the prop directly.
- **warning** — `useState` for a value **derived** from other props or state, kept in sync via `useEffect`. Replace with `useMemo` or compute inline.
- **warning** — `useEffect` whose body **only calls `setState`** based on synchronously-available values. Almost always a `useMemo` or a derived expression.
- **warning** — `useEffect` with a dependency array that **reads stale closures** (a value the effect reads that's not in the deps array). Rules-of-Hooks violation in spirit.
- **nit** — 4 or more `useState` calls in a single component. Suggests `useReducer` or extraction into a custom hook in `hooksDir`.

### 5.7. Split candidates

A component is a **split candidate** when **all three** hold:

1. The file is longer than **300 lines** or the component function is longer than **120 lines**.
2. A contiguous JSX subtree of **30+ lines** has a clean dependency boundary: it reads only a small subset of the parent's props/state and no sibling subtree depends on it.
3. The extracted piece has a name the project's vocabulary already suggests (panel, header, list, summary, row, cell, item — pulled from `conventions.vocabularyGlossary` plus sibling component names).

Report as a single `warning` per candidate. Cite:
- The line range of the extractable subtree.
- The minimal prop interface the extracted component would expose.
- The proposed name and target directory (`componentsDir` vs `primitivesDir`, picked from section 4 signals).

### 5.8. Consolidate candidates

A pair (or cluster) of components in the same directory is a **consolidate candidate** when **all three** hold:

1. Their JSX root structures match **≥70%** (same outer elements, same prop spread shape, same children layout) after normalizing identifier names and string literals.
2. Their prop surfaces overlap **≥70%** and the delta is expressible as a single discriminator (a variant, a boolean, a slot).
3. They are imported from the same caller package and used in mutually-exclusive places (a flag, a route segment, a feature gate decides which one renders).

Report as one `warning` per cluster. Cite:
- Each candidate's `file:line`.
- The proposed unified prop interface.
- The discriminator (e.g. "introduce `variant: 'compact' | 'expanded'`").

Do not propose consolidation when the candidates live in different packages — that's `/audit:refactor`'s scope.

### 5.9. Naming inconsistencies (within a component)

- **nit** — a component uses different names for the **same boolean concept** (`isOpen` / `open` / `visible` for one drawer state).
- **nit** — a component uses different names for the **same handler concept** (`onChange` and `onValueChange` for two props that fire on the same event).
- **nit** — the component's own name diverges from the package's dominant casing convention (PascalCase vs kebab-case file naming, observed from section 4 samples).

### 5.10. Comment and marker rot

- **nit** — comments referencing props, branches, or callers that **no longer exist** in the file (stale guidance).
- **nit** — `TODO` / `FIXME` / `HACK` markers older than **6 months** (use `git blame` for the age). Cross-reference with `/audit:refactor` heuristic 3g and prefer that skill for repo-wide stale-marker passes; flag here only when the marker sits **inside the component being audited** and is directly relevant to a separate finding above.

### 5.11. File layout violations (vs sibling pattern)

Calibrate against the sibling sample from section 4. Determine the dominant pattern in the audited component's directory:

- **Component granularity** — do siblings ship one component per file, or bundle sub-components inside the top-level file?
- **Type colocation** — do siblings extract shared types into a colocated `types.ts`, or keep them inline?
- **Hook placement** — do siblings keep custom `use*` hooks in their own files, or declare them inside component files?

Flag the audited component only when it **diverges** from the established sibling pattern. Do not flag when the whole directory exhibits the same shape — that is package-wide convention drift and belongs to `/audit:refactor`.

- **warning** — siblings ship one component per file, but the audited file declares two or more exported PascalCase components. Suggest splitting each into its own file using the directory's casing convention.
- **warning** — a type declared inline in the audited file is imported by a sibling file in the same directory. Cross-file imports earn a colocated `types.ts` regardless of sibling pattern. Cite both `file:line` of the declaration and the `file:line` of the cross-file import.
- **warning** — siblings keep custom hooks in their own files, but the audited file declares a `use*` hook (any function whose name starts with `use` and that itself calls a React hook) inline. Suggest extracting to a sibling `use-<name>.ts`; lift to `hooksDir` instead when the hook is reusable beyond this component.
- **nit** — a non-exported PascalCase helper component declared inside the audited file is nontrivial (own state, >20 JSX lines) and could earn its own file. Trivial single-use helpers are fine inline — only flag when the helper has weight.

### 5.12. Framework smells (component-local)

Run on packages whose `framework` is `react` or `next`:

- **warning** — a component declared with `forwardRef` whose ref parameter is **never forwarded** to a DOM element or child component.
- **warning** — `'use client'` directive on a component that has no hooks, no event handlers, no browser APIs. (Cross-reference `/ui:docs:audit` 4.7; flag here only on component source, not demos.)
- **warning** — `'use client'` directive **missing** in a component using hooks or event handlers, in a Next-consuming package.
- **nit** — a component using `useMemo` / `useCallback` to memoize a value whose computation is trivially cheap (a literal, an identity expression, a single property access).

---

## 6. Output

Score each audited component with an **offender score**:

```
score = (blockers × 5) + (warnings × 2) + (nits × 1)
```

Branch on the mode recorded in section 2.

### `single` mode

Print one section for the audited component, full findings table. No ranking is necessary.

### `changed` mode

Print one section per changed component, sorted by offender score descending. Cap at the top **10** unless the user passed `--top N`.

### `suite` mode

Lead with a **Worst offenders** table, sorted by offender score descending, capped at the top **10** (or `--top N`):

```
## Worst offenders

| Rank | Component | Location | Blockers | Warnings | Nits | Score | Headline finding |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Widget | packages/design-system/src/components/widget/widget.tsx | 1 | 4 | 2 | 15 | prop-surface-bloat: 4 booleans encoding one piece of state |
| 2 | Drawer | packages/design-system/src/components/drawer/drawer.tsx | 0 | 5 | 1 | 11 | split-candidate: 320-line file with two unrelated subtrees |
```

The **Headline finding** is the highest-severity finding for that component, summarized in one line. Ties on score break alphabetically.

Then print the full per-component sections for the top-N only, in rank order. List the remaining components below the cut as one line each:

```
Below the cut: N components with M findings (run `/ui:audit <component>` to inspect).
```

### Per-component section (all modes)

```
### Widget (packages/design-system/src/components/widget/widget.tsx)

| Severity | Rule | Location | Suggested fix |
| --- | --- | --- | --- |
| blocker | unused-prop | widget.tsx:14 | remove `onCancel` from props or wire it to the cancel button |
| warning | prop-surface-bloat | widget.tsx:8 | replace `loading`, `disabled`, `readonly`, `invalid` with `status: 'idle' \| 'loading' \| 'disabled' \| 'invalid'` |
| warning | split-candidate | widget.tsx:120-178 | extract `<WidgetSummary>` into `components/widget/widget-summary.tsx` with props `{ total, currency }` |
| nit | naming-drift | widget.tsx:42, widget.tsx:88 | rename `visible` to `isOpen` to match sibling components |
```

### Roll-up

After all per-component sections, print:

```
N components audited · M findings (B blockers · W warnings · n nits)
Split candidates: <count> · Consolidate candidates: <count>
```

If any **blocker** findings exist, mark the audit as **FAIL** at the top of the report. If only warnings/nits exist, mark as **PASS WITH FINDINGS**. If nothing was found, mark as **PASS**.

If the audit ran with `--changed` and the diff is empty, say so and exit cleanly.

---

## 7. Offer next steps

After presenting findings, ask the user which to act on. Auto-actionable items:

- A **split candidate** the user approves → invoke `/ui:component:compose` for the new component, then point at the line range to lift into it.
- A **consolidate candidate** the user approves → propose the unified prop interface as a diff; do not apply without explicit go-ahead.
- A **dead variant** or **unused prop** the user approves → propose the removal as a diff.

Never apply changes automatically. Component edits are judgment calls; surface and wait.

Hand off to a sibling when the finding is out of scope:

- Duplication across **multiple components** in different files → `/audit:refactor`.
- Accessibility-only findings that slipped in → `/audit:a11y`.
- Demo or docs drift uncovered while reading the component → `/ui:docs:audit`.
- Missing tests for a component being split or consolidated → `/tests:compose` once the split/consolidate is applied.

---

## Worked examples (fabricated)

### Prop-surface bloat (boolean explosion)

Before — four booleans encoding one piece of state:

```tsx
type WidgetProps = {
  label: string
  disabled?: boolean
  loading?: boolean
  readonly?: boolean
  invalid?: boolean
}
```

Finding:

```
warning · prop-surface-bloat · widget.tsx:8 · collapse `disabled`, `loading`, `readonly`, `invalid` into one `status` discriminator; only one is ever truthy at a time
```

After:

```tsx
type WidgetProps = {
  label: string
  status?: 'idle' | 'loading' | 'disabled' | 'invalid'
}
```

### Split candidate

Before — one component, 280 lines, two unrelated subtrees:

```tsx
export function Widget(props: WidgetProps) {
  // 80 lines of header logic and JSX
  // 130 lines of summary logic and JSX (reads only props.total, props.currency)
  // 70 lines of footer logic and JSX
}
```

Finding:

```
warning · split-candidate · widget.tsx:120-178 · extract <WidgetSummary> with props { total, currency } into components/widget/widget-summary.tsx; the subtree reads no other parent state
```

After — the summary lives next to its parent and the parent renders it:

```tsx
// components/widget/widget-summary.tsx
export function WidgetSummary({ total, currency }: { total: number; currency: string }) {
  // 130 lines moved here, untouched
}

// components/widget/widget.tsx
export function Widget(props: WidgetProps) {
  // header
  <WidgetSummary total={props.total} currency={props.currency} />
  // footer
}
```

### Mirrored state

Before — `useState` shadowing a prop:

```tsx
export function Widget({ value }: { value: string }) {
  const [current, setCurrent] = useState(value)
  useEffect(() => setCurrent(value), [value])
  return <span>{current}</span>
}
```

Finding:

```
warning · mirrored-state · widget.tsx:2 · drop the `current` state; read `value` directly
```

After:

```tsx
export function Widget({ value }: { value: string }) {
  return <span>{value}</span>
}
```

---

## Important

- This skill **reads** source — it never edits. Findings are recommendations; the user decides what to fix.
- Use the project's vocabulary (`conventions.vocabularyGlossary`) and directories (`componentsDir`, `primitivesDir`, `hooksDir`) when naming and locating proposed extractions. Never invent a directory the profile does not report.
- `componentsDir` is the source of truth for what components exist. Never rely on a memorized list.
- Calibrate thresholds against **sibling components** (section 4) before flagging size or prop-surface findings. A blanket threshold is a fallback, not the default.
- Cross-component patterns belong to `/audit:refactor`. Accessibility belongs to `/audit:a11y`. Docs drift belongs to `/ui:docs:audit`. Stay in lane and hand off when a finding escapes component scope.
- A split or consolidate recommendation must cite the **line range** of the candidate subtree and the **minimal prop interface** of the extracted piece — never vague suggestions like "consider splitting this".
- In `suite` mode, **rank, then truncate**. The worst-offenders table is the deliverable; full per-component sections only appear for the top-N. A wall of findings across every component is exactly what this mode is built to avoid.
