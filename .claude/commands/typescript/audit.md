# typescript:audit

TRIGGER when: the user asks to audit, check, review, or scan TypeScript — a specific file, a package, or the whole repo. Asks "is this idiomatic", "any TS smells", "tighten the types in X", "is `any` anywhere", "audit our TypeScript". Pass a target name or path for per-file mode; pass nothing for the project-wide sweep.

Compares `.ts` / `.tsx` files against the principles in `/typescript:review`. Deviations are reported as `file:line`-anchored entries grouped by severity. Does **not** run tests or the type-checker — source analysis only. A run that finds no deviations reports CLEAN and emits no entries; CLEAN is the goal, not the exception.

Principles live in `/typescript:review` sections 5 (universal) and 6 (advanced features). This skill detects violations; it does not restate them.

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

Read `./manifest.json`. If missing, stop and tell the user to run `/repo:manifest` first — never generate the manifest yourself.

Per package, capture:

- `path`, `name` — map files to packages.
- `framework` — gates TSX-specific checks (3.8).
- `linter` — `biome` / `eslint` / `null`. Drives which findings the linter already catches; the audit does not duplicate them.
- `testRunner` — used to recognize test-file contexts where some patterns (e.g. `as any` in a mock) are acceptable.
- `conventions.principles` — declared overrides on the universal defaults in `/typescript:review` section 5.

If a package has `framework: null` and `linter: null`, the audit still runs against universal principles — only the project-specific overrides differ.

---

## 1. Resolve scope

In priority order:

1. **Explicit path or package** from `$ARGUMENTS` → audit only that.
2. **`--changed`** → `git diff --name-only HEAD` plus unstaged. Keep only `.ts` / `.tsx`.
3. **No argument** → every `.ts` / `.tsx` in every package's source root.

Exclude in every mode: `node_modules/`, `.next/`, `dist/`, `build/`, generated declaration files (`*.d.ts` that are not hand-written), and any `.gitignore`d path.

---

## 2. Sample sibling conventions

For per-file mode, read up to 3 sibling files in the same directory before checking. Require a 2-of-3 match before flagging convention drift in 3.9. Capture:

- `type` vs `interface`.
- Export style — named-only vs `export default`.
- Where types live — colocated, in a sibling `types.ts`, or inline.
- Generic naming — `T` / `TFoo` / `Foo`.
- `import type` vs the inline `type` qualifier.

For the sweep, derive the dominant convention per-package (most common pattern in the source root) and flag deviations within that package.

---

## 3. Run the checks

Each category cites the canonical principle in `/typescript:review`. A check fires only when the code violates the principle (or reaches for a heavier alternative when the catalog covers the simpler form). A check that holds emits nothing.

Low severity is a gate, not a quota. A Low-severity finding earns its row only when it would survive a second reader's review — otherwise treat the check as held.

### 3.1 Type holes

Flag:

- `as any` and `as unknown as X`.
- `// @ts-ignore` and `// @ts-expect-error` without an inline justification on the line above.
- `<T>x` angle-bracket casts in `.tsx` files (TSX-incompatible). In `.ts` files, flag only when a sibling uses the `as` form.
- The non-null assertion `!` where a narrowing guard would apply.

Severity: **High** in exported surface or library code; **Medium** in app code without justification; **Low** in test files mocking a third-party shape.

Cites `/typescript:review` 5 "Narrow with control flow, not casts".

### 3.2 `any` leaks

Flag every:

- Explicit `any` parameter, return type, generic bound, or property.
- Implicit `any` inferred from a missing annotation on an exported function. Surface only when `linter: null` or when `tsconfig.strict` is false in the package.

Severity: **High** in exported surface; **Medium** elsewhere.

Cites `/typescript:review` 5 "Prefer `unknown` to `any`".

### 3.3 Missed narrowings

Flag:

- `as T` immediately after a `typeof` / `in` / `instanceof` / discriminant check — the cast is redundant; narrowing already happened.
- A `boolean`-returning guard function whose call site narrows via reassignment, where the function should be typed `x is T` or `asserts x is T`.

Severity: **Medium**. Cites `/typescript:review` 5 "Type predicates carry the contract".

### 3.4 Enums

Flag every `enum` declaration. Replacement: an `as const` object or a literal-string union.

```ts
const Status = { idle: 'idle', loading: 'loading', error: 'error' } as const
type Status = (typeof Status)[keyof typeof Status]
```

Severity: **High** (enums are explicitly forbidden — `/typescript:review` 5 "No `enum`").

### 3.5 Mutability

Flag:

- Module-level mutable arrays or objects exported without `readonly` / `as const`.
- Public function parameters typed as mutable arrays where read-only would suffice.
- A returned array typed as mutable (`T[]`) when callers do not need to mutate it.

Severity: **Medium**. Cites `/typescript:review` 5 "Readonly by default for shared data".

### 3.6 Type duplication

Flag parallel `type` / `interface` definitions of the same shape in two files. Point to both occurrences; propose the canonical home (colocate with the function that owns the shape; the consumer imports it).

Severity: **Medium**. Cites `/typescript:review` 5 "One canonical home for a type".

### 3.7 Advanced-feature opportunities

Flag patterns where a feature from `/typescript:review` section 6 would replace a heavier construct. Cite the feature handle so the caller can re-request its catalog entry.

- `satisfies` — widening pattern that `satisfies` would have prevented (typically `const x: T = { ... }` losing the literal type).
- `never`-exhaustiveness — hand-rolled exhaustiveness check without a `never` assignment in the default branch.
- `Awaited<T>` — `Promise<T>` unwrap conditional reinventing `Awaited`.
- Template literal types — string-key `Record` that could be constrained (e.g. routes that should be `` `/${string}` ``).
- Type predicates — `boolean`-returning runtime check that should be a predicate.
- Branded types — a "string but not really" surface (an id, a timestamp) that branding would distinguish.

Severity: **Low** by default — upgrades, not violations. Bump to **Medium** when the heavier form hides a live bug — a widened literal wrong at runtime, a missing exhaustiveness check that let a new variant through.

### 3.8 TSX-specific (only when the file's package `framework` is `react` or `next`)

Flag:

- `JSX.IntrinsicElements['div']` where `React.ComponentPropsWithoutRef<'div'>` would do.
- `React.FC<Props>` when sibling components in the package do not use it.
- `default export` on a component file when sibling components use named exports.
- A `PropsWithChildren<P>` wrapper where `children?: React.ReactNode` inline would be clearer.

Severity: **Low** (convention-level). Cites `/typescript:review` section 6 (TSX-specific patterns).

### 3.9 Convention drift

Flag deviations from the sibling-sampled or package-dominant convention captured in section 2:

- `type` vs `interface` mismatch.
- Export-style mismatch (default vs named).
- `import type` vs inline `type` qualifier drift (skip if `linter` enforces `@typescript-eslint/consistent-type-imports` or its Biome equivalent).
- Generic-naming mismatch.

Severity: **Low**.

### 3.10 Constant naming and placement

Skip when no `## Constant naming` section exists in a CLAUDE.md within the audited package's directory tree.

Flag module-level `const` declarations whose casing or placement violates the rule — e.g. a `Record<>` lookup table named `UPPER_SNAKE` when the rule reserves that casing for primitives, or a magic number defined inline in a component when the rule wants it in a sibling `-constants.ts`.

Severity: **Low**. Cites the package's `## Constant naming` rule; do not restate it.

---

## 4. Produce findings

Lead with the verdict. If no check fired, report **CLEAN** in one line and stop — no header, no categories.

Otherwise, header:

```
<N> files audited · <M> findings (high: H · medium: M · low: L)
```

Then by mode:

- **Per-file mode** — findings inline, severity-sorted (High → Medium → Low), each as `file:line` plus a one-line fix.
- **Sweep mode** — group by category. Per category, list the worst 10 findings with `file:line` anchors and one-line fixes; cite the total count above the list. Order categories by `(High × 3 + Medium × 2 + Low × 1)`.

---

## Rules

- Audits, does not edit. The verdict is the deliverable; findings are evidence.
- CLEAN is the expected outcome on a healthy file. Do not manufacture Low-severity findings to justify a non-empty report.
- Surface a finding only when the principle is violated — not every `as` is wrong. Flag unjustified ones.
- Project principles in `conventions.principles` override the universal defaults. State the override whenever one fires.
- Skip what the linter already enforces. The `linter` field tells you what to skip.
- `/typescript:review` handles staged-diff and new-file gating — do not re-implement its role here.
- Don't pad. CLEAN is one line. Each finding is `file:line` plus a one-line fix.
- Fabricated identifiers in examples only — never a real project symbol.