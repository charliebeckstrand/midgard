# typescript:audit

TRIGGER when: the user asks to audit, check, review, or scan TypeScript — a specific file, a package, or the whole repo. Asks "is this idiomatic", "any TS smells", "tighten the types in X", "is `any` anywhere", "audit our TypeScript". Pass a target name or path for the per-file mode; pass nothing for the project-wide sweep.

You are running a static audit against `.ts` / `.tsx` files. The audit produces severity-sorted, file:line-anchored findings. It does **not** run tests or the type-checker — this is source analysis only. For change-driven gating (staged diff, newly-created files) the right skill is `/typescript:review`; for periodic clean-up and per-file polish, this is the right skill.

## Arguments

$ARGUMENTS

Recognized hints:
- A file path → audit that single file.
- A directory path → audit every `.ts` / `.tsx` under it.
- A package name from the manifest → audit every TS file in that package.
- `--changed` → audit only TS files in `git diff --name-only HEAD` (staged + unstaged).
- No arguments → audit every TS file in every package (the sweep).

---

## 0. Load the Manifest

Read `./manifest.json`. If the file does not exist, stop and tell the user to run `/repo:manifest` first — do not generate the manifest yourself; only `/postmortem` and `/premortem` create it. Treat a successful load as background context: never mention the manifest or the load to the user — no "loading the manifest", no status line at all.

From the manifest, capture:

- `packages[*].path` and `packages[*].name` — used to map files to packages.
- `packages[*].framework` — `react` / `next` / `library` / `node`. Gates the TSX-specific checks in section 3.8.
- `packages[*].linter` — `biome` / `eslint` / `null`. Drives which findings the linter already catches, so the audit does not duplicate them.
- `packages[*].testRunner` — used to recognize test-file contexts where some patterns (e.g. `as any` in a mock) are acceptable.
- `conventions.principles` — declared rules that override the universal defaults referenced from `/typescript:review`.
- `conventions.vocabularyGlossary` — use the project's terms in findings.

If a package has `framework: null` and `linter: null`, the audit still runs against universal TypeScript principles — only the project-specific overrides differ.

---

## 1. Resolve scope

In priority order:

1. **Explicit path or package** from `$ARGUMENTS` → audit only that.
2. **`--changed`** → take `git diff --name-only HEAD` plus unstaged. Keep only `.ts` / `.tsx` files.
3. **No argument** → enumerate every `.ts` / `.tsx` in every package's source root.

Exclude in every mode: `node_modules/`, `.next/`, `dist/`, `build/`, generated declaration files (`*.d.ts` that are not hand-written), and any path the project's `.gitignore` excludes.

---

## 2. Sample sibling conventions

For the per-file mode, read **one sibling file** in the same directory before running the checks. Capture:

- `type` vs `interface` — the project picks one; flag deviations.
- Export style — named-only vs `export default`.
- Where types live — colocated, in a sibling `types.ts`, or inline.
- Generic naming — `T` / `TFoo` / `Foo`.
- `import type` vs the inline `type` qualifier.

For the sweep, derive the dominant convention per-package (the most common pattern in the package's source root) and flag deviations within that package.

---

## 3. Run the checks

Walk every category for each file. The principles cited here are the universal defaults documented in `/typescript:review` section 5; treat that skill as the canonical statement and surface a finding only when the code at hand violates one (or reaches for a heavier alternative when section 6 of `/typescript:review` covers the simpler form).

### 3.1 Type holes

Flag:

- `as any` and `as unknown as X`.
- `// @ts-ignore` and `// @ts-expect-error` without an inline justification comment on the line above.
- `<T>x` angle-bracket casts (TSX-incompatible; the project's convention is the `as` form).
- The non-null assertion `!` where a narrowing guard would apply.

Severity: **High** when in exported surface or library code; **Medium** when in app code with no inline justification; **Low** when in a test file mocking a third-party shape.

### 3.2 `any` leaks

Flag every:

- Explicit `any` parameter, return type, generic bound, or property.
- Implicit `any` inferred from a missing annotation on an exported function (the linter usually catches this; only surface when `linter: null`).

Severity: **High** in exported surface; **Medium** elsewhere.

### 3.3 Missed narrowings

Flag:

- `as T` immediately after a `typeof` / `in` / `instanceof` / discriminant check — the cast is redundant; narrowing already happened.
- A `boolean`-returning guard function whose call site narrows via reassignment, where the function should be typed `x is T` or `asserts x is T`.

Severity: **Medium**.

### 3.4 Enums

Flag every `enum` declaration. The replacement is an `as const` object or a literal-string union.

```ts
const Status = { idle: 'idle', loading: 'loading', error: 'error' } as const
type Status = (typeof Status)[keyof typeof Status]
```

Severity: **High** (enums are explicitly forbidden in `/typescript:review` section 5).

### 3.5 Mutability

Flag:

- Module-level mutable arrays or objects exported without `readonly` / `as const`.
- Public function parameters typed as mutable arrays where a read-only signature would suffice.
- A returned array typed as mutable (`T[]`) when callers do not need to mutate it.

Severity: **Medium**.

### 3.6 Type duplication

Flag parallel `type` / `interface` definitions of the same shape in two files. The finding points to both occurrences and proposes the canonical home (colocate with the function that owns the shape; the consumer imports it).

Severity: **Medium**.

### 3.7 Advanced-feature opportunities

Flag patterns where a feature from `/typescript:review` section 6 would replace a heavier construct. Cite the feature handle so the caller can re-request its catalog entry.

- A widening pattern that `satisfies` would have prevented — typically `const x: T = { ... }` where the literal type is lost.
- A hand-rolled exhaustiveness check without a `never` assignment in the default branch.
- A `Promise<T>` unwrap conditional reinventing `Awaited<T>`.
- A string-key `Record` that template-literal types could constrain (e.g. routes that should be `` `/${string}` ``).
- A boolean-returning runtime check that should be a type predicate.
- A "string but not really" surface (an id, a timestamp) that branded types would distinguish.

Severity: **Low** by default — these are upgrades, not violations. Bump to **Medium** when the heavier form is hiding a real bug (a widened literal that's been wrong at runtime, a missing exhaustiveness check that already let a new variant slip through).

### 3.8 TSX-specific (only when the file's package `framework` is `react` or `next`)

Flag:

- `JSX.IntrinsicElements['div']` where `React.ComponentPropsWithoutRef<'div'>` would do.
- `React.FC<Props>` (when sibling components in the package do not use it).
- `default export` on a component file in a package whose sibling components use named exports.
- A `PropsWithChildren<P>` wrapper where `children?: React.ReactNode` inline would be clearer.

Severity: **Low** (convention-level).

### 3.9 Convention drift

Flag deviations from the sibling-sampled or package-dominant convention captured in section 2:

- `type` vs `interface` mismatch.
- Export-style mismatch (default vs named).
- `import type` vs inline `type` qualifier drift (skip if `linter` enforces `@typescript-eslint/consistent-type-imports` or its Biome equivalent).
- Generic-naming mismatch.

Severity: **Low**.

---

## 4. Produce findings

### Per-file mode

Print findings inline, severity-sorted (High → Medium → Low), with `file:line` citations and a one-line suggested fix per finding. Use the project's vocabulary from `conventions.vocabularyGlossary`.

### Sweep mode

Aggregate by category. For each category, print the worst 10 findings with `file:line` anchors; cite the total count above the list. Order categories by total finding count, severity-weighted.

---

## 5. Verdict

Header:

```
<N> files audited · <M> findings (high: H · medium: M · low: L)
```

Then either:

- **CLEAN** — no findings worth surfacing. State this in one line.
- A severity-sorted finding list (per-file) or category-grouped list (sweep), each with `file:line` anchors and a one-line suggested fix.

---

## Rules

- This skill audits; it does not edit. The findings are the deliverable.
- Surface a finding only when the principle is violated — not every `as` is wrong (some are justified at boundaries with an inline comment). Flag the unjustified ones.
- Project principles in `conventions.principles` override the universal defaults referenced from `/typescript:review`. State the override in the finding whenever one fires.
- Skip duplication of what the project's linter already enforces. The `linter` field tells you what to skip.
- `/typescript:review` handles staged-diff and new-file gating — do not re-implement its role here.
- Don't pad the report. CLEAN is one line. Findings are file:line + suggested fix and nothing more.
- Fabricated identifiers in examples only (`Widget`, `User`, `Shape`, `Route`) — never name a real project symbol in the catalog text.
