# typescript:review

TRIGGER when: `/postmortem` routes here because the staged diff contains `.ts` / `.tsx` changes. Also when `/ui:component:compose`, `/tests:compose`, or another caller finishes writing a new `.ts` / `.tsx` file and needs the new surface vetted before handing control back. Also when the user asks to "review my diff", "review this TS file", "check this before I commit".

Review TypeScript code — a staged diff (postmortem path) or one or more newly-created files (post-creation path) — against the project's tests, type-checker, and the principles below. Produces a PASS / BLOCK verdict; the commit (diff mode) or the handoff (file mode) does not proceed until PASS.

## Arguments

$ARGUMENTS

Recognized hints:
- No argument → **diff mode**. Review the staged diff (or `git diff HEAD` when nothing is staged). Used by `/postmortem`.
- A path to a `.ts` / `.tsx` file → **file mode**. Review that newly-created file. Used by `/ui:component:compose` and `/tests:compose`.
- A directory → **file mode**, expanded to every `.ts` / `.tsx` directly inside (non-recursive; callers needing recursion must list files explicitly).

---

## 0. Load the Manifest

Read `./manifest.json`. If missing, stop and tell the user to run `/repo:manifest` first — never generate the manifest yourself.

Per package, capture:

- `path`, `name` — map files to packages.
- `framework` — gates TSX-specific entries in section 6h.
- `linter` — `biome` / `eslint` / `null`. Drives which rules the project already enforces, so the review does not duplicate them.
- `testRunner` — drives test-typing expectations.
- `scripts.test` — exists or not.
- `scripts.check-types` (or `typecheck`) — exists or not.

Plus top-level: `packageManager`, `monorepo.tool`, `conventions.principles`. This skill assumes Turborepo; when `monorepo.tool` differs, substitute each `<pm> turbo <task> --filter=<pkg>` invocation below with the package's direct script call (`<pm> --filter=<pkg> run <script>`).

Project principles in `conventions.principles` override the universal defaults in section 5. State the override in the finding whenever one fires.

---

## 1. Collect the surface

### Diff mode

```bash
git diff --cached --name-only
git diff --cached
```

If nothing is staged, fall back to `git diff HEAD --name-only` and `git diff HEAD`, and tell the user the review is running against unstaged changes because nothing is staged.

Empty diff → stop.

### File mode

Read every target file in full. Also read **one sibling file** in the same directory to capture local conventions (type-vs-interface, export style, generic naming, where types live).

---

## 2. Map files to packages

For each `.ts` / `.tsx` file in the surface, find the longest `packages[*].path` that prefixes the file. Collect the unique set of affected packages.

Files outside any package (root configs, top-level docs) are skipped from the test and type-check runs — they still get reviewed in section 7.

---

## 3. Run tests for the touched packages

Run the smallest test command that still covers the diff. For each touched package whose `scripts.test` is set, pick by runner:

- **vitest** —
  - *Diff mode:* `<pm> --filter=<pkg> exec vitest run --changed`. Walks the dep graph from `git status` and runs tests that transitively import a changed file.
  - *File mode:* `<pm> --filter=<pkg> exec vitest related --run <file>...`. Runs every test that imports the given file.
  - If the diff touches a fan-out file (`recipes/`, `core/`, `primitives/`, a barrel) the scoped run widens to the full suite — let it.
- **jest** — diff mode: `<pm> --filter=<pkg> exec jest --onlyChanged`. File mode: `<pm> --filter=<pkg> exec jest --findRelatedTests <file>...`.
- **bun / node** — no scoped flag. Run `<pm> turbo test --filter=<pkg>` (full package suite; bun/node test runners don't expose change-driven flags).

Substitute `<pm>` with `packageManager`. When touched packages have different runners, run each separately rather than a single `turbo test`.

For every test file in the diff itself (diff mode) or every newly-created test file (file mode), confirm:

- The test still passes.
- The test wasn't deleted, marked `.skip`, or weakened (assertions removed, `expect` calls deleted, real assertions replaced with no-ops).

A weakened test counts as a **blocking** finding even when the suite is green.

---

## 4. Type-check the touched packages

If any touched package has `scripts.check-types` (or `typecheck`), use that script name:

```
<pm> turbo <script> --filter=<pkg-1> --filter=<pkg-2>
```

Any type error blocks the verdict. If no touched package exposes a type-check script, note it and move on. Type-check is always a single invocation regardless of test runners.

---

## 5. Universal TypeScript principles

Surface a finding only when the code violates one; do not pad with principles the surrounding code already follows.

- **Strict mode is the floor.** Assume `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Code that compiles only with looser settings is a finding.
- **Prefer `unknown` to `any`.** Reserve `any` for genuine pass-through (a logger recording arbitrary payloads); require an inline justification.
- **Narrow with control flow, not casts.** Type predicates, `in`, `instanceof`, discriminant checks, and exhaustive switches replace `as T` and `!`.
- **Inference over annotation.** Annotate function parameters and exported return types; let inference handle locals. Use `satisfies` to assert a shape without widening.
- **Readonly by default for shared data.** Function parameters, returned arrays, and module-level data default to `readonly`. Mutability is opt-in.
- **No `enum`.** Use `as const` objects or literal-string unions. Enums emit runtime code, conflate types with values, behave oddly under `isolatedModules`.
- **Type predicates carry the contract.** A `boolean`-returning function that gates a narrowing is typed `x is T` or `asserts x is T`.
- **One canonical home for a type.** A type used in two files is colocated with the function that owns it; the consumer imports it. Parallel definitions are a refactor finding.

---

## 6. Advanced-features catalog

Surface a feature only when the code is missing it (or reaching for a heavier alternative). Cite each by its handle (`satisfies`, `discriminated-union`) so the caller can re-request a single entry.

### 6a. Type-level expression

- **`satisfies`** — assert a value conforms to a shape without widening its inferred type.
  ```ts
  const routes = {
    home: '/',
    user: '/users/:id',
  } satisfies Record<string, `/${string}`>
  ```

- **`as const`** — freeze a value's inferred type to its literal / tuple form.
  ```ts
  const SIZES = ['sm', 'md', 'lg'] as const
  type Size = (typeof SIZES)[number]
  ```

- **Const type parameters** — preserve literal inference at the call site: `function pick<const Keys extends readonly string[]>(keys: Keys) { return keys }`.
- **`NoInfer<T>`** — block a type parameter from being inferred from one argument so another drives it.

### 6b. String and template manipulation

- **Template literal types** — `type Route = `/${string}``.
- **Key remapping in mapped types** — rename keys with `as` inside a mapped type.
- **`Capitalize` / `Uncapitalize` / `Uppercase` / `Lowercase`** — built-in string transformers usable inside template positions.

### 6c. Conditional types and inference

- **Conditional types** — `T extends Promise<infer U> ? U : T`.
- **`infer`** — introduce a type variable inside a conditional.
- **Distributive conditional types** — a naked type parameter distributes over unions. Wrap in `[T]` to disable.

### 6d. Narrowing and exhaustiveness

- **Discriminated unions** — one literal field disambiguates each branch.
  ```ts
  type Shape =
    | { kind: 'circle'; r: number }
    | { kind: 'square'; side: number }
  ```

- **`never`-based exhaustiveness** — force a compile error on missed branches.
  ```ts
  default: {
    const _exhaustive: never = s
    return _exhaustive
  }
  ```

- **Type predicates** — `function isUser(x: unknown): x is User`.
- **Assertion functions** — `function assertUser(x: unknown): asserts x is User`.

### 6e. Nominal typing

- **Branded types** — distinguish two strings (or two numbers) the structural system treats as equal. Pair with a constructor and a check; do not brand by cast alone.
  ```ts
  type UserId = string & { readonly __brand: 'UserId' }
  ```

### 6f. Utility types worth knowing

`Partial`, `Required`, `Readonly`, `Pick`, `Omit`, `Record`, `Exclude`, `Extract`, `NonNullable`, `ReturnType`, `Parameters`, `ConstructorParameters`, `InstanceType`, `Awaited`, `ThisParameterType`, `OmitThisParameter`.

Two often-missed:

- **`Awaited<T>`** — recursively unwraps `Promise<T>`. Reach for it instead of a hand-rolled conditional unwrap.
- **`NonNullable<T>`** — drops `null | undefined`. Composes with `Pick` to express "the always-present subset".

### 6g. Module-level features

- **Module augmentation** — extend a third-party module's types from your own code via `declare module`.
- **Declaration merging** — multiple `interface` declarations with the same name in the same scope merge. Use deliberately; flag as a smell when accidental.
- **`const enum` is off the table** — breaks `isolatedModules`. Use `as const` objects.

### 6h. TSX-specific (only when the package's `framework` is `react` or `next`)

- **`React.ComponentPropsWithoutRef<'div'>`** — props of an intrinsic element, minus `ref`. Reach for this over `JSX.IntrinsicElements['div']` for component prop spreads.
- **Discriminated prop unions** — model "either A or B, never both".
- **Polymorphic `as` typing** — generic over the element tag, with `ComponentPropsWithoutRef<As>` for spread props. Heavyweight; reach for it only when sibling components do.
- **`PropsWithChildren` is optional.** `children?: React.ReactNode` inline is clearer.

---

## 7. Review the surface

### Diff mode

Read every staged hunk for:

- **Broken call sites** — when a signature, exported type, or return shape changes, grep for other callers and verify each still compiles.
- **Weakened tests in the diff** — `.skip`, deleted, or stripped of assertions. A green suite hides this; only reading the diff catches it.
- **Bugs in changed logic** — off-by-one, wrong operator, swapped arguments, missing `await`, mishandled promises.
- **Null / undefined hazards** — property access on a value the type allows to be nullish, with no guard added.
- **Type holes** — `as any`, `as unknown as X`, `// @ts-ignore`, `// @ts-expect-error` without an inline justification; widened return types; dropped generics.
- **Section 5 / 6 violations** in changed code — `enum`, missed `satisfies`, hand-rolled exhaustiveness, non-null assertions where a guard applies, parallel type definitions.
- **Debug residue** — `console.log` inside a conditional, stray `debugger` behind a feature flag, generated artifacts checked in alongside source.

### File mode

Read the whole file for:

- **Type holes** — every `as`, `any`, `@ts-ignore`, `@ts-expect-error` must carry an inline justification or be replaced by a narrowing.
- **Section 5 violations** — `enum`, mutable shared data, `as T` where narrowing applies, missing type predicates.
- **Section 6 opportunities** — places where `satisfies`, discriminated unions, const generics, or branded types would replace a cast or a widen-then-narrow.
- **Convention drift from the sampled sibling** — `type` vs `interface`, named vs default export, where types live, generic-naming style.
- **Dead code** — unused exports, parameters, branches.

Per finding: `path/to/file.ts:42` + one-sentence concern with the principle or feature handle. No padding.

---

## 8. Verdict

Header:

```
<mode> · <N> files · tests <pass|fail|n/a> · types <pass|fail|n/a> · <M> findings
```

Then one of:

- **PASS** — every check green, no blocking findings. State this and hand control back. In diff mode the postmortem chain may proceed to commit; in file mode the calling skill may declare the new file done.
- **BLOCK** — list every blocking finding with `file:line` citations and a suggested fix. Refuse to run `git commit` (diff mode) or to return PASS (file mode) until findings are resolved or the user explicitly waives.

---

## Rules

- BLOCK halts the caller's commit chain; this skill returns a verdict, never invokes `git commit`.
- Never auto-fix during the review — surface, let the caller decide.
- Never skip a review for surface size.
- Type holes (`any`, `@ts-ignore`, `as` without a guard) are **blocking by default** — require an inline justification or a refactor.
- Don't pad. PASS is one line.
- Use fabricated identifiers in catalog examples; never real project symbols.