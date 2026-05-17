# ui:audit

TRIGGER when: the user asks to audit, check, review, or scan a UI component (or every component in a frontend package); asks "is this component getting messy", "any bugs in this component", "what should I split", "what should I consolidate", "what's wrong with this component". Also auto-eligible after `/ui:component:compose` creates a new component.

Compares UI source files against the per-component health baseline (sibling-calibrated thresholds + `[layout-heuristics]` + `[framework-discipline]`). Deviations are reported as `file:line`-anchored entries grouped by severity. Reads source only — no dev server, no test run, no headless browser.

A run that finds no deviations reports PASS and emits no table. The audit's job is to confirm the baseline; on a mature, frequently-audited package, PASS is the expected outcome, not the exception. Typical invocation names a single component; without a target, sweeps every component and ranks only those that deviated.

**Scope boundaries:**

- Cross-component duplication clusters, layering violations, dead exports, stale `TODO` markers → `/audit:refactor`.
- Accessibility → `/audit:a11y`.
- Demo-file drift → `/ui:docs:audit`.

When a finding would be better expressed at one of those scopes, name the sibling skill in the suggested fix and move on.

**Canonical sources cited by handle:**

- `[layout-heuristics]` and `[framework-discipline]` — defined in `/ui:component:compose`. This skill detects violations against those statements.

## Arguments

$ARGUMENTS

Recognized hints:
- A path or component name → audit that scope. **Typical case.**
- `--changed` → audit only files in `git diff --name-only` (staged + unstaged).
- `--top N` → in suite or changed mode, show only the top N worst offenders (default 10).
- No arguments → audit every component under each frontend package's `componentsDir` and rank worst offenders.

---

## 1. Load the Manifest

Read `./manifest.json`. If missing, stop and tell the user to run `/repo:manifest` first — never generate the manifest yourself.

Filter `packages` to `isFrontend: true` and `framework` in (`react`, `next`). If none, stop and tell the user the project has no frontend packages to audit.

Per qualifying package:

- `framework` — gates Next-specific checks.
- `componentsDir` — default scope when no argument and no diff.
- `primitivesDir` — so split suggestions land in the right directory.
- `hooksDir` — so extract-to-hook suggestions target the right place.
- `conventions.principles` — observed when weighting findings (a principle like "build from small, composable pieces" promotes split candidates).

---

## 2. Resolve scope

In priority order:

1. **Explicit path or component name** from `$ARGUMENTS` → audit just that (wins over `--changed`).
2. **`--changed`** → `git diff --name-only HEAD` plus unstaged. Keep `.tsx` / `.jsx` files under a frontend package's `componentsDir` or `primitivesDir`.
3. **No argument** → audit every file under each frontend package's `componentsDir` and rank worst offenders.

If a target name resolves to multiple matches, list them and ask which to audit.

Record the **mode** for output:
- `single` — one component or one path supplied.
- `changed` — `--changed` supplied.
- `suite` — no argument; ranks the whole suite.

---

## 3. Parse the targets

Parse `.tsx` / `.jsx` with a TypeScript/Babel JSX AST. Regex is not sufficient for prop-surface, branch, or split checks.

Per file capture:

- Every exported component declaration with props type, hook calls, JSX root, and JSX subtree shape.
- Every local component (PascalCase function returning JSX).
- Every `useState`, `useReducer`, `useEffect`, `useMemo`, `useCallback`, `useRef`, and project-local hook call, with dep arrays and the values they read.
- Every JSX conditional (`{cond && …}`, `{cond ? a : b}`, nested ternaries).
- Every `.map()` / `.filter()` / inline render function inside JSX.

If a file fails to parse, record `blocker · parse-error` and skip remaining checks on that file.

---

## 4. Sample sibling components

Per audited component, glob the parent directory and read the **3 alphabetically-first siblings** (excluding the target). Capture:

- Median prop count across siblings (for prop-surface thresholds in 5.3).
- Dominant variant / size / color discriminator names (for naming-inconsistency findings in 5.9).
- Whether siblings extract subtrees vs inline them.
- Whether siblings push hooks into `hooksDir` vs declare inline.

Sibling median calibrates the §5.3 prop-bloat threshold.

---

## 5. Run the checks

Each check below defines one baseline condition. The check fires only when the component departs from it; a check that holds emits nothing.

A nit is not licence to fill the table. On a frequently-audited component, expect most nit-level checks to hold. Surface a nit only when it would survive a second reader's review; otherwise treat the check as held. Severity grades each deviation, not the component:

- **blocker** — broken component (won't render, references missing props, hook violates Rules of Hooks).
- **warning** — meaningful smell (prop bloat, SRP violation, dead branch, mirrored state, conditional tangle).
- **nit** — style or hygiene hint.

### 5.1. Complexity and size

- **warning** — file > **400 lines**, or exported component function > **150 lines**.
- **warning** — cyclomatic-complexity proxy > **12** (count `if` / `else if` / `switch case` / `?:` / `&&` / `||` in the function body).
- **nit** — JSX tree deeper than **6 levels** in a single render path.
- **nit** — more than **8** hook calls in a single component. Suggests extracting state into a custom hook.

### 5.2. Single-responsibility violations

- **warning** — renders two or more **unrelated subtrees** (distinct conceptual regions with no shared state and no shared props).
- **warning** — manages **unrelated state slices** (state variables never read together, never updated together, no dependency between effects).
- **warning** — mixes **data fetching + transformation + rendering** when the project has a data layer (a `useQuery`-style hook in siblings, or a fetcher in `hooksDir`).

### 5.3. Prop-surface bloat

- **warning** — prop count > **1.5×** the sibling median (from section 4). When fewer than 2 siblings exist, fall back to a hard threshold of **15 props**.
- **warning** — more than **4 boolean props**. Suggest a discriminated union (`status: 'idle' | 'loading' | 'error' | 'success'`) or compound-component split.
- **warning** — two or more props that always **co-vary** in every visible call site. Suggest merging into one object prop or one discriminated union.
- **nit** — props **passed straight through** to a single child with no logic between. Suggest spreading or removing the wrapper.

### 5.4. Unused props and dead variants

- **blocker** — prop declared in the props type but **never read** inside the component.
- **warning** — a variant / size / color value declared in a union type that **no branch** handles. Dead variant.
- **warning** — a branch whose discriminator value is **not in the declared union**. Stale branch.
- **nit** — prop with a default value that **equals** the value used everywhere. Drop the default or drop the prop.

### 5.5. Conditional-rendering smells

- **warning** — nested ternary chains **3 levels deep** or more in JSX. Suggest a lookup map, a discriminated-union render switch, or named sub-components.
- **warning** — `{cond && <Foo/>}` chains where multiple siblings depend on overlapping conditions. Suggests a single guarded section.
- **warning** — **render function** (function returning JSX) declared **inline inside the component body** and called once. Inline the JSX or extract a real component.
- **nit** — fragment soup: 3+ adjacent `<>…</>` fragments at the same depth.
- **nit** — `return null` as a guard when an **early return** at the top of the function would replace it.

### 5.6. State and effect smells

- **warning** — `useState` initialized from a prop and **never updated** other than to mirror that prop in `useEffect`. Mirrored state.
- **warning** — `useState` for a value **derived** from other props or state, kept in sync via `useEffect`. Replace with `useMemo` or compute inline.
- **warning** — `useEffect` whose body **only calls `setState`** based on synchronously-available values. Almost always a `useMemo`.
- **warning** — `useEffect` with a dep array that **reads stale closures** (a value the effect reads that's not in deps).
- **nit** — 4+ `useState` calls in a single component. Suggests `useReducer` or extraction.

### 5.7. Split candidates

Triggered when **all three** hold:

1. File > **300 lines** or component function > **120 lines**.
2. A contiguous JSX subtree of **30+ lines** has a clean dependency boundary (reads only a small subset of parent props/state; no sibling subtree depends on it).
3. The extracted piece has a name the project's vocabulary already suggests (panel, header, list, summary, row, cell, item — pulled from sibling component names).

Report one `warning` per candidate. Cite:
- Line range of the extractable subtree.
- Minimal prop interface the extracted component would expose.
- Proposed name and target directory (`componentsDir` vs `primitivesDir`, picked from section 4 signals).

### 5.8. Consolidate candidates

A pair (or cluster) in the same directory is a consolidate candidate when **all three** hold:

1. JSX root structures match **≥70%** (same outer elements, prop spread shape, children layout) after normalizing identifier and string literals.
2. Prop surfaces overlap **≥70%** and the delta is expressible as a single discriminator (variant, boolean, slot).
3. Imported from the same caller package, used in mutually-exclusive places (a flag, route, or feature gate decides which renders).

Report one `warning` per cluster. Cite each candidate's `file:line`, the proposed unified prop interface, and the discriminator.

Do not propose consolidation when candidates live in different packages — that's `/audit:refactor`'s scope.

### 5.9. Naming inconsistencies (within a component)

- **nit** — different names for the **same boolean concept** (`isOpen` / `open` / `visible`).
- **nit** — different names for the **same handler concept** (`onChange` and `onValueChange` for the same event).
- **nit** — component name diverges from the package's dominant casing convention.

### 5.10. Comment and marker rot

- **nit** — comments referencing props, branches, or callers that no longer exist.
- **nit** — `TODO` / `FIXME` / `HACK` markers older than **6 months** (`git blame` for age; skip when `git blame` is unavailable or the file is untracked). Prefer `/audit:refactor` for repo-wide stale-marker passes; flag here only when the marker sits inside the component being audited and is directly relevant to a separate finding above.

### 5.11. Layout drift (cites `[layout-heuristics]` in `/ui:component:compose`)

Detects deviations from the dominant sibling pattern, with the fallback heuristics from `[layout-heuristics]` applying when siblings disagree. A pattern counts as established when at least 2 of the 3 sampled siblings agree; with fewer agreeing, skip these checks. Flag the audited component only when it diverges from the established sibling pattern — package-wide convention drift belongs to `/audit:refactor`.

- **warning** — siblings ship one component per file, but the audited file declares two or more exported PascalCase components. Suggest splitting each into its own file.
- **warning** — a type declared inline in the audited file is imported by a sibling file in the same directory. Cross-file imports earn a colocated `types.ts` regardless of sibling pattern. Cite both `file:line`s.
- **warning** — siblings keep custom hooks in their own files, but the audited file declares a `use*` hook (function whose name starts with `use` and itself calls a React hook) inline. Suggest a sibling `use-<name>.ts`; lift to `hooksDir` when reusable beyond this component.
- **nit** — a non-exported PascalCase helper component declared inside the audited file is nontrivial (own state, > 20 JSX lines) and could earn its own file.

### 5.12. Framework smells (cites `[framework-discipline]` in `/ui:component:compose`)

Only on packages whose `framework` is `react` or `next`.

- **warning** — `forwardRef` whose ref parameter is **never forwarded** to a DOM element or child component.
- **warning** — `'use client'` directive on a component that has no hooks, no event handlers, no browser APIs.
- **warning** — `'use client'` directive **missing** in a component using hooks or event handlers, in a Next-consuming package.
- **nit** — `useMemo` / `useCallback` memoizing a trivially cheap computation (literal, identity expression, single property access).

---

## 6. Output

Lead the report with the verdict (see *Verdict* below). When the verdict is PASS, that is the entire report — no per-component sections, no roll-up. The remainder of this section applies only when at least one deviation was recorded. Score for ranking deviated components is:

```
score = (blockers × 5) + (warnings × 2) + (nits × 1)
```

Branch on the mode from section 2.

### `single` mode

One section, full findings table. No ranking.

### `changed` mode

One section per changed component, sorted by score descending. Cap at top **10** unless `--top N`.

### `suite` mode

Lead with a **Deviation summary** table — components that left the baseline, ranked by deviation score, capped at top **10** (or `--top N`). Components that hold the baseline do not appear:

```
## Deviation summary

| Rank | Component | Location | Blockers | Warnings | Nits | Score | Headline finding |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Widget | packages/design-system/src/components/widget/widget.tsx | 1 | 4 | 2 | 15 | prop-surface-bloat: 4 booleans encoding one piece of state |
| 2 | Drawer | packages/design-system/src/components/drawer/drawer.tsx | 0 | 5 | 1 | 11 | split-candidate: 320-line file with two unrelated subtrees |
```

**Headline** is the highest-severity deviation for that component in one line. Ties on score break alphabetically.

Then print the full per-component sections for the top-N only, in rank order. List the remaining components below the cut as one line each:

```
Remaining components with deviations: N (M deviations total). Run `/ui:audit <component>` to inspect.
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

```
N components audited · K outside baseline · M deviations (B blockers · W warnings · n nits)
Split candidates: <count> · Consolidate candidates: <count>
```

### Verdict (lead the report)

- Any **blocker** → **FAIL**.
- Only warnings/nits → **PASS WITH DEVIATIONS**.
- No deviations recorded → **PASS**. End the report here.

If `--changed` and the diff is empty, say so and exit cleanly.

---

## 7. Offer next steps

Ask which findings to act on. Auto-actionable:

- **Split candidate** approved → invoke `/ui:component:compose` for the new component, then point at the line range to lift.
- **Consolidate candidate** approved → propose the unified prop interface as a diff. No auto-apply.
- **Dead variant** or **unused prop** approved → propose the removal as a diff.

Never apply changes automatically.

Hand off when out of scope:

- Duplication across components in different files → `/audit:refactor`.
- Accessibility-only findings → `/audit:a11y`.
- Demo or docs drift → `/ui:docs:audit`.
- Missing tests for a component being split or consolidated → `/tests:compose` once applied.

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

Before — 280-line component with two unrelated subtrees:

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

---

## Important

- Reads source; never edits.
- The audit's deliverable is the verdict. Deviations are evidence for the verdict, not the deliverable. PASS is a successful run.
- Do not manufacture nits to justify a non-empty report. On a mature `packages/ui`, expect most runs to be PASS or near-PASS; a long deviation table after a recent clean run is a signal the bar drifted, not that the code regressed.
- Calibrate against **sibling components** (section 4) before flagging size or prop-surface; the blanket threshold is a fallback.
- Split/consolidate findings must cite line range and minimal prop interface.
- In `suite` mode, **rank, then truncate**.
- `[layout-heuristics]` and `[framework-discipline]` live in `/ui:component:compose`. Surface violations; don't restate the rules.