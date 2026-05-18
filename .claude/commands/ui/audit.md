# ui:audit

TRIGGER when: audit, check, review, or scan a UI component (or every component in a ui package); "any bugs in this component", "what should I split", "what should I consolidate". Auto-eligible after `/ui:component:compose` creates a new component.

Compare UI source against the per-component health baseline (sibling-calibrated thresholds + `[layout-heuristics]` + `[framework-discipline]`). Report deviations as `file:line` entries by severity. Source-only — no dev server, no test run, no headless browser.

CLEAN runs emit no table. The audit confirms the baseline; on a mature, frequently-audited package, CLEAN is the expected outcome. Typical invocation names a single component; without a target, sweeps every component and ranks only those that deviated.

**Scope boundaries** (sibling skill owns the finding):

| Concern | Sibling |
|---|---|
| Cross-component duplication, layering violations, dead exports, stale TODOs | `/audit:refactor` |
| Accessibility | `/audit:a11y` |
| Demo-file drift | `/ui:docs:audit` |

**Canonical sources cited by handle:**

- `[layout-heuristics]` and `[framework-discipline]` — defined in `/ui:component:compose`. This skill detects violations.

## Arguments

$ARGUMENTS

- A path or component name → audit that scope. **Typical case.**
- `--changed` → audit only files in `git diff --name-only` (staged + unstaged).
- `--top N` → in suite or changed mode, show top N worst offenders (default 10).
- No arguments → audit every component under each frontend `componentsDir` and rank worst offenders.

---

## 1. Manifest

Read `./manifest.json`. If missing, halt with a pointer to `/repo:manifest`.

Filter `packages` to `isFrontend: true` and `framework` in (`react`, `next`). If none qualify, halt — no frontend to audit.

Per qualifying package:

| Field | Use |
|---|---|
| `framework` | gates Next-specific checks |
| `componentsDir` | default scope when no arg, no diff |
| `primitivesDir` | so split suggestions land in the right directory |
| `hooksDir` | so extract-to-hook suggestions target the right place |
| `conventions.principles` | weights findings (a principle like "build from small, composable pieces" promotes split candidates) |

---

## 2. Resolve scope

Priority order:

1. Explicit path or component name → audit just that (wins over `--changed`).
2. `--changed` → `git diff --name-only HEAD` plus unstaged. Keep `.tsx` / `.jsx` files under a frontend package's `componentsDir` or `primitivesDir`.
3. No argument → audit every file under each frontend `componentsDir`; rank worst offenders.

If a name resolves to multiple matches, list them and ask which.

Record the mode: `single` / `changed` / `suite`.

---

## 3. Parse targets

Parse `.tsx` / `.jsx` with a TypeScript/Babel JSX AST. Regex is not sufficient for prop-surface, branch, or split checks.

Per file capture:

- Every exported component declaration with props type, hook calls, JSX root, and JSX subtree shape.
- Every local component (PascalCase function returning JSX).
- Every `useState`, `useReducer`, `useEffect`, `useMemo`, `useCallback`, `useRef`, and project-local hook call, with dep arrays and the values they read.
- Every JSX conditional (`{cond && …}`, `{cond ? a : b}`, nested ternaries).
- Every `.map()` / `.filter()` / inline render function inside JSX.

If a file fails to parse, record `blocker · parse-error` and skip remaining checks.

---

## 4. Sample sibling components

Per audited component, glob the parent directory and read the **3 alphabetically-first siblings** (excluding the target). Capture:

- Median prop count across siblings (calibrates §5.3 prop-bloat threshold).
- Dominant variant / size / color discriminator names (for naming-inconsistency findings in §5.9).
- Whether siblings extract subtrees vs inline them.
- Whether siblings push hooks into `hooksDir` vs declare inline.

---

## 5. Checks

Each check defines one baseline. A check that holds emits nothing.

A nit earns its row only when it would survive a second reader's review. On a frequently-audited component, expect most nits to hold.

| Severity | Meaning |
|---|---|
| **blocker** | broken component (won't render, references missing props, hook violates Rules of Hooks) |
| **warning** | meaningful smell (prop bloat, SRP violation, dead branch, mirrored state, conditional tangle) |
| **nit** | style or hygiene hint |

### 5.1. Complexity and size

- **warning** — file > **400 lines** or exported component function > **150 lines**.
- **warning** — cyclomatic-complexity proxy > **12** (count `if` / `else if` / `switch case` / `?:` / `&&` / `||` in the function body).
- **nit** — JSX tree deeper than **6 levels** in a single render path.
- **nit** — more than **8** hook calls in a single component. Suggests extracting state into a custom hook.

### 5.2. Single-responsibility violations

- **warning** — renders two or more **unrelated subtrees** (distinct conceptual regions, no shared state, no shared props).
- **warning** — manages **unrelated state slices** (state variables never read together, never updated together, no dependency between effects).
- **warning** — mixes **data fetching + transformation + rendering** when the project has a data layer (a `useQuery`-style hook in siblings, or a fetcher in `hooksDir`).

### 5.3. Prop-surface bloat

- **warning** — prop count > **1.5×** the sibling median (from §4). With fewer than 2 siblings, fall back to a hard threshold of **15 props**.
- **warning** — more than **4 boolean props**. Suggest a discriminated union (`status: 'idle' | 'loading' | 'error' | 'success'`) or compound-component split.
- **warning** — two or more props that always **co-vary** in every visible call site. Suggest merging into one object prop or one discriminated union.
- **nit** — props **passed straight through** to a single child with no logic between. Suggest spreading or removing the wrapper.

### 5.4. Unused props and dead variants

- **blocker** — prop declared in the props type but **never read** inside the component.
- **warning** — a variant / size / color value in a union type that **no branch** handles. Dead variant.
- **warning** — a branch whose discriminator value is **not in the declared union**. Stale branch.
- **nit** — prop with a default value that **equals** the value used everywhere. Drop the default or the prop.

### 5.5. Conditional-rendering smells

- **warning** — nested ternary chains **3 levels deep** or more in JSX. Suggest a lookup map, a discriminated-union render switch, or named sub-components.
- **warning** — `{cond && <Foo/>}` chains where multiple siblings depend on overlapping conditions. Suggest a single guarded section.
- **warning** — **render function** (function returning JSX) declared **inline inside the component body** and called once. Inline the JSX or extract a real component.
- **nit** — fragment soup: 3+ adjacent `<>…</>` fragments at the same depth.
- **nit** — `return null` as a guard when an **early return** at the top of the function would replace it.

### 5.6. State and effect smells

- **warning** — `useState` initialized from a prop and **never updated** other than to mirror it in `useEffect`. Mirrored state.
- **warning** — `useState` for a value **derived** from other props or state, kept in sync via `useEffect`. Replace with `useMemo` or compute inline.
- **warning** — `useEffect` whose body **only calls `setState`** based on synchronously-available values. Almost always a `useMemo`.
- **warning** — `useEffect` with a dep array that **reads stale closures** (a value the effect reads that's not in deps).
- **nit** — 4+ `useState` calls in a single component. Suggests `useReducer` or extraction.

### 5.7. Split candidates

Triggered when **all three** hold:

1. File > **300 lines** or component function > **120 lines**.
2. A contiguous JSX subtree of **30+ lines** has a clean dependency boundary (reads only a small subset of parent props/state; no sibling subtree depends on it).
3. The extracted piece has a name the project vocabulary already suggests (panel, header, list, summary, row, cell, item — pulled from sibling component names).

Report one **warning** per candidate. Cite:

- Line range of the extractable subtree.
- Minimal prop interface the extracted component would expose.
- Proposed name and target directory (`componentsDir` vs `primitivesDir`, picked from §4 signals).

### 5.8. Consolidate candidates

A pair (or cluster) in the same directory is a consolidate candidate when **all three** hold:

1. JSX root structures match **≥70%** (same outer elements, prop spread shape, children layout) after normalizing identifiers and string literals.
2. Prop surfaces overlap **≥70%** and the delta is expressible as a single discriminator (variant, boolean, slot).
3. Imported from the same caller package, used in mutually-exclusive places (a flag, route, or feature gate decides which renders).

Report one **warning** per cluster. Cite each candidate's `file:line`, the proposed unified prop interface, and the discriminator.

Don't propose consolidation across packages — that's `/audit:refactor`.

### 5.9. Naming inconsistencies (within a component)

- **nit** — different names for the **same boolean concept** (`isOpen` / `open` / `visible`).
- **nit** — different names for the **same handler concept** (`onChange` and `onValueChange` for the same event).
- **nit** — component name diverges from the package's dominant casing convention.
- **nit** — module-level `const` whose casing or placement contradicts the package's `## Constant naming` rule (e.g. `packages/ui/CLAUDE.md`). Cite the rule's location; don't restate it. Skip when no such rule exists.

### 5.10. Comment and marker rot

- **nit** — comments referencing props, branches, or callers that no longer exist.
- **nit** — `TODO` / `FIXME` / `HACK` markers older than **6 months** (`git blame` for age; skip when blame is unavailable or the file is untracked). Prefer `/audit:refactor` for repo-wide stale-marker passes; flag here only when the marker sits inside the component being audited and is directly relevant to a separate finding above.

### 5.11. Layout drift (cites `[layout-heuristics]` in `/ui:component:compose`)

Detect deviations from the dominant sibling pattern; fallback heuristics apply when siblings disagree. A pattern counts as established when at least 2 of the 3 sampled siblings agree; with fewer agreeing, skip these checks. Flag only when the audited component diverges from the established sibling pattern — package-wide convention drift belongs to `/audit:refactor`.

- **warning** — siblings ship one component per file, but the audited file declares **two or more nontrivial** exported PascalCase components. Nontrivial: own state or > 20 JSX lines (more than a thin wrapper, a single-line `createSlot`, or a type-aliased projection over a shared primitive). Trivial multi-exports fall under `[layout-heuristics]`'s "truly trivial helpers stay inline" carve-out and don't fire. Suggest splitting each nontrivial export.
- **warning** — a type declared inline in the audited file is imported by a sibling file in the same directory. Cross-file imports earn a colocated `types.ts` regardless of sibling pattern. Cite both `file:line`s.
- **warning** — siblings keep custom hooks in their own files, but the audited file declares a `use*` hook (function whose name starts with `use` and itself calls a React hook) inline. Suggest a sibling `use-<name>.ts`; lift to `hooksDir` when reusable beyond this component.
- **nit** — a non-exported PascalCase helper component declared inside the audited file is nontrivial (own state, > 20 JSX lines) and could earn its own file.

### 5.12. Framework smells (cites `[framework-discipline]` in `/ui:component:compose`)

Only on packages whose `framework` is `react` or `next`.

- **warning** — `forwardRef` whose ref parameter is **never forwarded** to a DOM element or child component.
- **warning** — `'use client'` directive on a component with no hooks, no event handlers, no browser APIs.
- **warning** — `'use client'` directive **missing** in a component using hooks or event handlers, in a Next-consuming package.
- **nit** — `useMemo` / `useCallback` memoizing a trivially cheap computation (literal, identity expression, single property access).

---

## 6. Markdown report

Lead with the verdict.

| Verdict | When |
|---|---|
| **CLEAN** | no deviations — Audit Summary only; stop |
| **DEVIATIONS PRESENT** | only warnings/nits |
| **FAIL** | any blocker |

If `--changed` and the diff is empty, say so and exit.

Score for ranking: `(blockers × 5) + (warnings × 2) + (nits × 1)`.

### Audit Summary

Always emit. For non-CLEAN runs:

```
**Audit Summary**

- **Verdict:** FAIL
- **Scope:** packages/design-system (47 components audited)
- **Outside baseline:** 5
- **Findings:** 2 blockers · 12 warnings · 4 nits
- **Top deviation:** Widget — prop-surface-bloat: 4 booleans encoding one piece of state
```

For CLEAN: one line — `CLEAN · 47 components hold the baseline.`

### Mode-specific body

| Mode | Body shape |
|---|---|
| `single` | One per-component section. No ranking. |
| `changed` | Full per-component sections for components meeting the threshold below, sorted by score descending; Other deviations table for the rest. Cap total at top **10** unless `--top N`. |
| `suite` | Same shape as `changed`. Cap total at top **10** unless `--top N`. The Audit Summary's "Top deviation" line is the sweep-mode TL;DR. |

### When a component earns a full section

Stratify by severity so the narrative form is reserved for the components that warrant it:

| Component status | Output form |
|---|---|
| Any blocker (FAIL) | Full per-component section |
| Two or more warnings | Full per-component section |
| One warning, or only nits | Row in the *Other deviations* table |

Single-finding and nit-only components are well-served by a one-row entry — tying nothing together is not narrative.

### Per-component section

```
### Widget

`packages/design-system/src/components/widget/widget.tsx` · **FAIL** · 1 blocker · 4 warnings · 2 nits · score 15

**Overview.** Widget is carrying four boolean state props that encode one underlying status concept, plus an unused `onCancel` prop and a 58-line subtree (`<WidgetSummary>`) that reads only `props.total` and `props.currency`. The smells together suggest the component is past the point where one file is the right home.

**Findings.**

| Severity | Rule | Location | What's wrong |
| --- | --- | --- | --- |
| blocker | unused-prop | widget.tsx:14 | `onCancel` declared in the props type but never read inside the component |
| warning | prop-surface-bloat | widget.tsx:8 | 4 boolean props (`loading`, `disabled`, `readonly`, `invalid`) encode one piece of state |
| warning | split-candidate | widget.tsx:120-178 | 58-line subtree reads only `props.total` / `props.currency`; clean extraction boundary |
| nit | naming-drift | widget.tsx:42, widget.tsx:88 | `visible` shadows the package's `isOpen` convention |

**Suggested resolution.**

1. **Drop the unused prop.** Remove `onCancel` from `WidgetProps`, or wire it to the cancel button per its apparent intent.
2. **Collapse the boolean explosion into a discriminator:**

   ```tsx
   type WidgetProps = {
     label: string
     status?: 'idle' | 'loading' | 'disabled' | 'invalid'
   }
   ```

3. **Extract `<WidgetSummary>`** into `components/widget/widget-summary.tsx` with props `{ total, currency }`; the subtree reads no other parent state.
4. **Rename `visible` → `isOpen`** across `widget.tsx:42` and `widget.tsx:88` to match sibling components.
```

Subsection rules:

- **Status line** — pipe-separated: path · verdict · counts · score.
- **Overview** — one or two sentences tying the findings together into a narrative; don't restate them. ≤80 words.
- **Findings** — table with `Severity · Rule · Location · What's wrong`. Order by severity (blocker → warning → nit).
- **Suggested resolution** — ordered list. Each item names the action and (when concrete) shows the code or the file move. One item per finding when possible; group when two findings share a resolution.

### Other deviations table

For components that didn't earn a full section but still deviated, emit one shared table beneath the sections:

```
## Other deviations

| Component | Severity | Rule | Location | What's wrong |
| --- | --- | --- | --- | --- |
| Toolbar | warning | mirrored-state | toolbar.tsx:22 | `useState` initialized from `open` prop and mirrored via `useEffect` |
| Badge | nit | memo-noise | badge.tsx:8 | `useMemo` over a literal expression |
| Tooltip | nit | naming-drift | tooltip.tsx:14, tooltip.tsx:42 | `visible` shadows the package's `isOpen` convention |
```

One row per finding; components with multiple findings appear in multiple rows (grouped by component name). Order: by component score descending, then severity within component (warning → nit). Omit the table when no components fall into this tier.

### Roll-up (footer)

```
N components audited · K outside baseline · M deviations (B blockers · W warnings · n nits)
Split candidates: <count> · Consolidate candidates: <count>
```

---

## 7. HTML report

Always emit alongside the markdown report. Save `ui-audit-[timestamp].html` to cwd; deliver via `SendUserFile` (status `normal`, caption naming the scope). Capture one timestamp via `date +%Y%m%d-%H%M%S` at the start of this step.

Self-contained — one file, inline `<style>`, no external assets, no scripts. Must render correctly when opened directly in a browser.

Required structure, in order:

1. **Header** — `<h1>` with the scope (e.g. `UI audit · packages/design-system` for sweep, `UI audit · Widget` for single), meta line beneath with date and (if relevant) git branch in `<code>`.
2. **Headline** — large display text. Non-CLEAN: `<verdict> · <top component> · <headline finding>` (e.g. "FAIL · Widget · prop-surface-bloat: 4 booleans encoding one piece of state"). CLEAN: `CLEAN · N components hold the baseline.` Flush with the page.
3. **Audit Summary** — compact bordered panel directly under the headline. The labeled bullets from §6's Audit Summary as a clean labeled list. Skimmable in ~10 seconds.
4. **Component panels** — one `<details>` per component meeting the full-section threshold from §6 (any blocker, or two or more warnings). Collapsed by default. Each `<summary>` shows: `<span class="tag">` with the component name (uppercase, letter-spaced), severity badge, one-line headline finding. Body contains: Overview paragraph, Findings table, Suggested resolution `<ol>`. In `suite` mode, cap at top **N** by score (default 10, split across panels + the table below).
5. **Other deviations** — single HTML table mirroring §6's Other deviations table (component / severity / rule / location / what's wrong). Renders below the component panels. Omit entirely when no components fall into this tier.
6. **Footer** — muted, centered: `UI audit · N components · K outside baseline · M deviations. Run /ui:audit <component> for a single-component drill-down.`

Required styling (mirror `/council`'s palette):

- Inline `<style>` only. CSS custom properties for theme colors. `@media (prefers-color-scheme: light)` block providing a light-mode palette; default palette dark.
- System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
- Centered content column, `max-width: 880px`, padding `48px 28px 80px`.
- Headline: ≥1.6× body, generous line-height, flush with the page.
- Audit Summary: compact bordered panel with subtle background, slightly tighter line-height.
- Verdict tag in the headline: distinct background per verdict (CLEAN = green-tinted, DEVIATIONS PRESENT = amber-tinted, FAIL = red-tinted). The Headline block uses a border accent in the matching color.
- Component `<details>` panels: bordered, rounded, custom `+`/`−` indicator on the right of the summary (suppress the default marker via `summary::-webkit-details-marker { display: none }` and `list-style: none`). Body separated from summary by a top border. Severity badge in the summary uses the same color tinting as the verdict tag.
- Findings table: zebra-striped rows. Severity column uses the color tint.
- Suggested resolution `<ol>`: numbered with the project's accent color; `<pre>` blocks inside use a subtle panel background.
- Code spans (`<code>`) get a subtle panel background and rounded corners.
- No emoji. No images. No external fonts.

After writing the file, deliver via `SendUserFile`.

---

## 8. Offer next steps

Ask which findings to act on. Auto-actionable:

| Finding | Action |
|---|---|
| Split candidate approved | invoke `/ui:component:compose` for the new component, then point at the line range to lift |
| Consolidate candidate approved | propose the unified prop interface as a diff (no auto-apply) |
| Dead variant or unused prop approved | propose the removal as a diff |

Never apply changes automatically.

Hand off when out of scope:

| Finding | Sibling |
|---|---|
| Duplication across files | `/audit:refactor` |
| Accessibility-only | `/audit:a11y` |
| Demo / docs drift | `/ui:docs:audit` |
| Missing tests for a split or consolidated component | `/tests:compose` once applied |

---

## Worked examples (fabricated)

### Prop-surface bloat (boolean explosion)

Before:

```tsx
type WidgetProps = {
  label: string
  disabled?: boolean
  loading?: boolean
  readonly?: boolean
  invalid?: boolean
}
```

Finding: `warning · prop-surface-bloat · widget.tsx:8 · collapse disabled/loading/readonly/invalid into one status discriminator; only one is ever truthy at a time`

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

Finding: `warning · split-candidate · widget.tsx:120-178 · extract <WidgetSummary> with props { total, currency } into components/widget/widget-summary.tsx; the subtree reads no other parent state`

### Mirrored state

Before:

```tsx
export function Widget({ value }: { value: string }) {
  const [current, setCurrent] = useState(value)

  useEffect(() => setCurrent(value), [value])

  return <span>{current}</span>
}
```

Finding: `warning · mirrored-state · widget.tsx:2 · drop the current state; read value directly`

---

## Rules

- Read source; never edit.
- The verdict is the deliverable; deviations are evidence. CLEAN is a successful run. Don't manufacture nits.
- Calibrate against sibling components (§4) before flagging size or prop-surface; blanket thresholds are fallback.
- Split / consolidate findings must cite line range and minimal prop interface.
- In `suite` mode: rank, then truncate.
- `[layout-heuristics]` and `[framework-discipline]` live in `/ui:component:compose`. Surface violations; don't restate.
