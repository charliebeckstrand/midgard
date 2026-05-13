# typescript:review

TRIGGER when: `/postmortem` routes here because the staged diff contains `.ts` / `.tsx` changes — this skill is the logic-risk gate in the postmortem chain. Also when `/ui:component:compose`, `/tests:compose`, or another caller finishes writing a new `.ts` / `.tsx` file and needs the new surface vetted before handing control back. Also when the user asks to "review my diff", "review this TS file", "check this before I commit".

You are reviewing TypeScript code — either a staged diff (postmortem path) or one or more newly-created files (post-creation path) — against the project's tests, type-checker, and the TypeScript principles below. The review produces a PASS / BLOCK verdict; until it returns PASS the commit (diff mode) or the handoff (file mode) does not proceed.

## Arguments

$ARGUMENTS

Recognized hints:
- No argument → **diff mode**. Review the staged diff (or `git diff HEAD` when nothing is staged). Used by `/postmortem`.
- A path to a `.ts` / `.tsx` file → **file mode**. Review that single newly-created file. Used by `/ui:component:compose` and `/tests:compose` after they write a new TS file.
- A directory → **file mode**, expanded to every `.ts` / `.tsx` directly inside.

---

## 0. Load the Manifest

Read `./manifest.json`. If the file does not exist, stop and tell the user to run `/repo:manifest` first — do not generate the manifest yourself; only `/postmortem` and `/premortem` create it. Treat a successful load as background context: never mention the manifest or the load to the user — no "loading the manifest", no status line at all.

From the manifest, capture:

- `packageManager` — `pnpm` / `yarn` / `npm` / `bun`.
- `monorepo.tool` — `turbo` or another tool. This skill assumes Turborepo; fall back to running each touched package's scripts directly when the tool differs.
- `packages[*].path` and `packages[*].name` — used to map files to packages.
- `packages[*].scripts.test` — exists or not, per package.
- `packages[*].scripts.check-types` (or `typecheck`) — exists or not, per package.
- `packages[*].framework` — `react` / `next` / `library` / `node`. Gates the TSX-specific entries in section 6h.
- `packages[*].linter` — `biome` / `eslint` / `null`. Drives which rules the project already enforces, so the review does not duplicate them.
- `packages[*].testRunner` — `vitest` / `jest` / `bun` / `node` / `null`. Drives test-typing expectations.
- `conventions.principles` — declared rules that override the universal defaults in section 5.
- `conventions.vocabularyGlossary` — use the project's terms in findings.

---

## 1. Collect the surface

### Diff mode

```bash
git diff --cached --name-only
git diff --cached
```

If nothing is staged, fall back to `git diff HEAD --name-only` and `git diff HEAD`, and tell the user the review is running against unstaged changes because nothing is staged.

If the diff is empty, stop — there's nothing to review.

### File mode

Read every target file in full. There is no diff; the entire file is the surface. Also read **one sibling file** in the same directory to capture local conventions (type-vs-interface, export style, generic naming, where types live).

---

## 2. Map files to packages

For each `.ts` / `.tsx` file in the surface, find the longest `packages[*].path` from the manifest that prefixes the file. Collect the unique set of affected package names.

Skip files outside any package (root configs, top-level docs) when scoping the test and type-check runs — they still get reviewed in section 7.

---

## 3. Run tests for the touched packages

Build the test command using Turbo:

```
<pm> turbo test --filter=<pkg-1> --filter=<pkg-2>
```

Pass one `--filter` per touched package in a single command. Substitute `<pm>` with the `packageManager` from the manifest. Only include packages whose manifest entry has `scripts.test` set.

For every test file present in the diff itself (diff mode) or every newly-created test file (file mode), confirm:

- The test still passes.
- The test wasn't deleted, marked `.skip` (`it.skip`, `describe.skip`, `test.skip`, framework equivalent), or weakened (assertions removed, `expect` calls deleted, real assertions replaced with no-ops).

A weakened test counts as a blocking finding even when the suite is green.

---

## 4. Type-check the touched packages

If any touched package's manifest entry has `scripts.check-types` (or `typecheck`) set, run the equivalent Turbo command:

```
<pm> turbo check-types --filter=<pkg-1> --filter=<pkg-2>
```

Use whichever name (`check-types` vs `typecheck`) the touched packages declare in their scripts. Any type error blocks the verdict. If no touched package exposes a type-check script, note it and move on.

---

## 5. Apply the universal TypeScript principles

These are non-negotiable defaults. Surface a finding only when the upcoming or just-written code violates one; do not pad with principles the surrounding code already follows.

- **Strict mode is the floor.** Assume `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Code that compiles only with looser settings is a finding.
- **Prefer `unknown` to `any`.** `any` opts out of checking; `unknown` forces a narrow. Reserve `any` for genuine pass-through (a logger that records arbitrary payloads) and require an inline justification comment.
- **Narrow with control flow, not casts.** Type predicates, `in`, `instanceof`, discriminant checks, and exhaustive switches replace `as T` and the non-null assertion `!`. The compiler verifies narrowing; casts silence it.
- **Inference over annotation.** Annotate function parameters and exported return types; let inference handle locals. Use `satisfies` to assert a shape without widening the inferred type.
- **Readonly by default for shared data.** Function parameters, returned arrays, and module-level data structures default to `readonly`. Mutability is opt-in.
- **No `enum`.** Use `as const` objects or literal-string unions. Enums emit runtime code, conflate types with values, and behave oddly under `isolatedModules`.
- **Type predicates carry the contract.** A function returning `boolean` that gates a narrowing is typed `x is T` or `asserts x is T`. Implicit narrowing is brittle.
- **One canonical home for a type.** A type used in two files is colocated with the function that owns it; the consumer imports it. Parallel definitions are a refactor finding.

Project principles in `conventions.principles` override these. State the override in the finding whenever one fires.

---

## 6. The advanced-features catalog

Surface a feature only when the code at hand is missing it (or reaching for a heavier alternative). Cite each by its handle (`satisfies`, `discriminated-union`) so the caller can re-request a single entry. Examples are ≤5 lines and demonstrate one idea each.

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

- **Const type parameters** — preserve literal inference at the call site.
  ```ts
  function pick<const Keys extends readonly string[]>(keys: Keys) {
    return keys
  }
  ```

- **`NoInfer<T>`** — block a type parameter from being inferred from one argument so another argument drives it.

### 6b. String and template manipulation

- **Template literal types** — compose string types like ordinary strings: `` type Route = `/${string}` ``.
- **Key remapping in mapped types** — rename keys with `as` inside a mapped type.
- **`Capitalize` / `Uncapitalize` / `Uppercase` / `Lowercase`** — built-in string transformers usable inside template positions.

### 6c. Conditional types and inference

- **Conditional types** — branch on assignability: `T extends Promise<infer U> ? U : T`.
- **`infer`** — introduce a type variable inside a conditional.
- **Distributive conditional types** — a naked type parameter in a conditional distributes over unions. Wrap in `[T]` to disable.

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

- **Type predicates** — declare a runtime check as a narrowing function: `function isUser(x: unknown): x is User`.
- **Assertion functions** — `function assertUser(x: unknown): asserts x is User`.

### 6e. Nominal typing

- **Branded types** — distinguish two strings (or two numbers) the structural system would treat as equal. Pair with a constructor and a check; do not brand by cast alone.
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
- **`const enum` is off the table** — it breaks `isolatedModules`. Use `as const` objects.

### 6h. TSX-specific (only when the package `framework` is `react` or `next`)

- **`React.ComponentPropsWithoutRef<'div'>`** — props of an intrinsic element, minus `ref`. Reach for this over `JSX.IntrinsicElements['div']` for component prop spreads.
- **Discriminated prop unions** — model "either A or B, never both".
- **Polymorphic `as` typing** — write a generic over the element tag, with `ComponentPropsWithoutRef<As>` for spread props. Polymorphism is heavyweight; reach for it only when sibling components do.
- **`PropsWithChildren` is optional.** Typing `children?: React.ReactNode` directly is clearer than wrapping the prop type.

---

## 7. Review the surface

### Diff mode

Read every staged hunk and look for:

- **Broken call sites** — when a function signature, exported type, or return shape changes, grep the codebase for other callers and verify each one still compiles.
- **Weakened tests in the diff itself** — `.skip`, deleted, or stripped of assertions. A green suite hides this; only reading the diff catches it.
- **Bugs in changed logic** — off-by-one, wrong operator, swapped arguments, missing `await`, mishandled promises.
- **Null / undefined hazards** — property access on a value the type allows to be nullish, with no guard added.
- **Type holes** — `as any`, `as unknown as X`, `// @ts-ignore`, `// @ts-expect-error` without a one-line justification comment; widened return types; dropped generics.
- **Section 5 / 6 violations** in the changed code — `enum`, missed `satisfies`, hand-rolled exhaustiveness, non-null assertions where a guard applies, parallel type definitions.
- **Debug residue** — `console.log` inside a conditional, stray `debugger` behind a feature flag, generated artifacts checked in alongside source.

### File mode

Read the whole file and look for:

- **Type holes** — every `as`, `any`, `@ts-ignore`, `@ts-expect-error` must carry a one-line justification or be replaced by a narrowing.
- **Section 5 violations** — `enum`, mutable shared data, `as T` where narrowing applies, missing type predicates.
- **Section 6 opportunities** — places where `satisfies`, discriminated unions, const generics, or branded types would replace a cast or a widen-then-narrow pattern.
- **Convention drift from the sampled sibling** — `type` vs `interface`, named vs default export, where types live, generic-naming style.
- **Dead code** — unused exports, parameters, branches.

For each finding, cite `path/to/file.ts:42` and explain the concern in one sentence with the principle or feature handle. No padding.

---

## 8. Verdict

Print a one-line header:

```
<mode> · <N> files · tests <pass|fail|n/a> · types <pass|fail|n/a> · <M> findings
```

Then one of:

- **PASS** — every check green and no blocking findings. State this and hand control back to the caller. In diff mode this means the postmortem chain may proceed to commit; in file mode it means the calling skill may declare the new file done.
- **BLOCK** — list every blocking finding with `file:line` citations and a suggested fix. Refuse to run `git commit` (diff mode) or to return control as PASS (file mode) until findings are resolved or the user explicitly waives.

---

## Rules

- Never run `git commit` while findings remain open.
- Never auto-fix during the review — surface the issue, let the caller decide.
- Never skip the review because the diff or file "looks small". Trivial surfaces hide non-trivial bugs.
- Type holes (`any`, `@ts-ignore`, `as` without a guard) are blocking by default — require an inline justification comment or a refactor.
- Project principles in `conventions.principles` override the universal defaults in section 5. State the override in the finding whenever one fires.
- Don't pad the report. If there's nothing to say, say PASS in one line.
- Fabricated identifiers in examples only (`Widget`, `User`, `Shape`, `Route`) — never name a real project symbol in the catalog text.
