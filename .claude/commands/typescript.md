# typescript

TRIGGER when: the user (or another skill) needs an authority on idiomatic, modern TypeScript before writing or editing a `.ts` or `.tsx` file. Also when the user asks for TS guidance, asks "is this idiomatic", asks how to express a type, or asks which advanced feature applies to a problem. This skill consults; it does not scaffold files — for new components use `/ui:component:compose`, for new tests use `/tests:compose`.

You are a consultant, not an editor. Other skills, agents, or the user invoke this skill **before** the work; you return the principles, idioms, and advanced-feature references that should govern the upcoming edit. The caller applies them. Do not write or modify TS/TSX files from inside this skill.

## Arguments

$ARGUMENTS

Recognized hints:
- A path (`packages/foo/src/bar.ts`) → consult against that file's surface and surrounding code.
- A natural-language scenario (`I'm modeling a state machine with three phases`) → consult on the type design before any file is named.
- A feature name (`satisfies`, `discriminated union`, `template literal types`) → surface only that feature's reference plus when it applies.
- No arguments → ask the caller for the scenario in one line.

---

## 1. Load the Project Profile

Read `.claude/cache/project-profile.json`. If missing or stale, silently invoke `/repo:discover --quiet` and re-read. Treat this step as background context: never mention the profile, the cache, or the regeneration to the user — no "loading the profile", no "using the freshly-written profile", no status line at all.

Pull these fields:

- `packages[*].framework` — `react` / `next` / `library` / `node`. Drives whether the TSX-specific guidance in section 5h applies.
- `packages[*].linter` — `biome` / `eslint` / `null`. Drives which rules the project already enforces, so the consult does not duplicate them.
- `packages[*].testRunner` — `vitest` / `jest` / `bun` / `node` / `null`. Test-typing guidance varies with the runner.
- `conventions.principles` — declared rules that take precedence over the universal defaults in section 3.
- `conventions.vocabularyGlossary` — use the project's terms in the brief.

If a path argument resolves to a package, narrow the consult to that package's profile entry.

---

## 2. Frame the consult

Classify the work into one mode:

- **Author** — a new `.ts` / `.tsx` file or a new public symbol inside an existing one. Emphasize type-first design.
- **Refactor** — change an existing TS surface (tighten types, remove `any`, rename, split, extract). Emphasize narrowing and assertion-replacement patterns.
- **Diagnose** — explain a confusing type, an error message, or why a type widens or narrows. Emphasize the inference rules in section 5c.

If the argument does not pin the mode, ask one line. Do not guess.

If a path was supplied, read the target file and 1–2 sibling files in the same directory. Capture local conventions: import grouping, named-vs-default exports, where types live (colocated or in `types.ts`), tuple vs object return shapes, generic-naming style. When a sibling pattern disagrees with the universal defaults in section 3, the project wins.

---

## 3. Apply the universal principles

These are non-negotiable defaults. The brief restates only those the upcoming edit is at risk of violating; do not pad with principles the surrounding code already follows.

- **Strict mode is the floor.** Assume `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Code that compiles only with looser settings is a finding.
- **Prefer `unknown` to `any`.** `any` opts out of checking; `unknown` forces a narrow. Reserve `any` for genuine pass-through (a logger that records arbitrary payloads) and comment it.
- **Narrow with control flow, not casts.** Type predicates, `in`, `instanceof`, discriminant checks, and exhaustive switches replace `as T` and the non-null assertion `!`. The compiler verifies narrowing; casts silence it.
- **Inference over annotation.** Annotate function parameters and exported return types; let inference handle locals. Use `satisfies` to assert a shape without widening the inferred type.
- **Readonly by default for shared data.** Function parameters, returned arrays, and module-level data structures default to `readonly`. Mutability is opt-in.
- **No `enum`.** Use `as const` objects or literal-string unions. Enums emit runtime code, conflate types with values, and behave oddly under `isolatedModules`.
- **Type predicates carry the contract.** A function returning `boolean` that gates a narrowing is typed `x is T` or `asserts x is T`. Implicit narrowing is brittle.
- **One canonical home for a type.** A type used in two files is colocated with the function that owns it; the consumer imports it. Parallel definitions are a refactor finding.

Project principles in `conventions.principles` override these. State the override in the brief whenever one fires.

---

## 4. Match the project's conventions

From the sibling files read in section 2, pin:

- **Type declarations** — `type` vs `interface`. The project picks one; do not mix.
- **Export style** — named-only is the catalog default; flag `export default` when the project disallows it.
- **Tuple vs object returns** — `[value, setter]` vs `{ value, setter }`. Hooks lean tuple; data getters lean object.
- **JSDoc on exported types** — present or absent. Match the project.
- **Generic naming** — `T` / `TFoo` / `Foo`. Match the closest sibling.
- **Imports** — `import type` vs the inline `type` qualifier, side-effect import grouping, barrel files.

If the project's linter enforces any of these automatically (`@typescript-eslint/consistent-type-imports`, Biome's equivalent, `eslint-plugin-import`), call that out in the brief so the caller relies on the linter rather than re-checking by eye.

---

## 5. Surface the relevant advanced features

The catalog below is the reference. For each consult, surface **only the entries that apply** to the framed work, with the smallest example that demonstrates the idea. Cite each by its handle (`satisfies`, `template-literal`) so callers can re-request a single entry.

### 5a. Type-level expression

- **`satisfies`** — assert a value conforms to a shape without widening its inferred type.
  ```ts
  const routes = {
    home: '/',
    user: '/users/:id',
  } satisfies Record<string, `/${string}`>
  // routes.home is '/' (literal), not string
  ```

- **`as const`** — freeze a value's inferred type to its literal / tuple form.
  ```ts
  const SIZES = ['sm', 'md', 'lg'] as const
  type Size = (typeof SIZES)[number] // 'sm' | 'md' | 'lg'
  ```

- **Const type parameters** — preserve literal inference at the call site.
  ```ts
  function pick<const Keys extends readonly string[]>(keys: Keys) {
    return keys
  }
  const k = pick(['a', 'b']) // readonly ['a', 'b'], not string[]
  ```

- **`NoInfer<T>`** — block a type parameter from being inferred from one argument so another argument drives it.
  ```ts
  function fill<T>(value: T, count: number, fallback: NoInfer<T>): T[]
  fill('a', 3, 'b') // T = 'a'; fallback checked against 'a'
  ```

### 5b. String and template manipulation

- **Template literal types** — compose string types like ordinary strings.
  ```ts
  type Route = `/${string}`
  type Prefixed<P extends string, T extends string> = `${P}-${T}`
  ```

- **Key remapping in mapped types** — rename keys with `as`.
  ```ts
  type Getters<T> = {
    [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K]
  }
  ```

- **`Capitalize` / `Uncapitalize` / `Uppercase` / `Lowercase`** — built-in string transformers usable inside template positions.

### 5c. Conditional types and inference

- **Conditional types** — branch on assignability.
  ```ts
  type Awaitable<T> = T extends Promise<infer U> ? U : T
  ```

- **`infer`** — introduce a type variable inside a conditional.
  ```ts
  type Head<T extends readonly unknown[]> =
    T extends readonly [infer H, ...unknown[]] ? H : never
  ```

- **Distributive conditional types** — a naked type parameter in a conditional distributes over unions. Wrap in `[T]` to disable.
  ```ts
  type Boxed<T> = T extends unknown ? { value: T } : never
  type B = Boxed<string | number> // { value: string } | { value: number }
  ```

### 5d. Narrowing and exhaustiveness

- **Discriminated unions** — one literal field disambiguates each branch.
  ```ts
  type Shape =
    | { kind: 'circle'; r: number }
    | { kind: 'square'; side: number }
  ```

- **`never`-based exhaustiveness** — force a compile error on missed branches.
  ```ts
  function area(s: Shape): number {
    switch (s.kind) {
      case 'circle': return Math.PI * s.r ** 2
      case 'square': return s.side ** 2
      default: {
        const _exhaustive: never = s
        return _exhaustive
      }
    }
  }
  ```

- **Type predicates** — declare a runtime check as a narrowing function.
  ```ts
  function isUser(x: unknown): x is User { /* ... */ }
  ```

- **Assertion functions** — throw or narrow, for guards that should never fail silently.
  ```ts
  function assertUser(x: unknown): asserts x is User { /* ... */ }
  ```

### 5e. Nominal typing

- **Branded types** — distinguish two strings (or two numbers) the structural system would treat as equal. Pair with a constructor and a check; do not brand by cast alone.
  ```ts
  type UserId = string & { readonly __brand: 'UserId' }
  function toUserId(s: string): UserId {
    if (!/^[0-9a-f]{32}$/.test(s)) throw new Error('invalid id')
    return s as UserId
  }
  ```

### 5f. Utility types worth knowing

`Partial`, `Required`, `Readonly`, `Pick`, `Omit`, `Record`, `Exclude`, `Extract`, `NonNullable`, `ReturnType`, `Parameters`, `ConstructorParameters`, `InstanceType`, `Awaited`, `ThisParameterType`, `OmitThisParameter`.

Two that are often missed:

- **`Awaited<T>`** — recursively unwraps `Promise<T>`. Reach for it instead of a hand-rolled conditional unwrap.
- **`NonNullable<T>`** — drops `null | undefined`. Composes with `Pick` to express "the always-present subset".

### 5g. Module-level features

- **Module augmentation** — extend a third-party module's types from your own code.
  ```ts
  declare module 'some-router' {
    interface RequestContext {
      user?: User
    }
  }
  ```

- **Declaration merging** — multiple `interface` declarations with the same name in the same scope merge. Use deliberately; flag as a smell when accidental.

- **`const enum` is off the table** — it breaks `isolatedModules`, the de-facto bundler-friendly setting. Use `as const` objects.

### 5h. TSX-specific (only when `framework` is `react` or `next`)

- **`React.ComponentPropsWithoutRef<'div'>`** — props of an intrinsic element, minus `ref`. Reach for this over `JSX.IntrinsicElements['div']` for component prop spreads.

- **Discriminated prop unions** — model "either A or B, never both".
  ```ts
  type ButtonProps =
    | { href: string; onClick?: never }
    | { onClick: () => void; href?: never }
  ```

- **Polymorphic `as` typing** — write a generic over the element tag, with `ComponentPropsWithoutRef<As>` for spread props. Polymorphism is heavyweight; reach for it only when sibling components do.

- **`PropsWithChildren` is optional.** Typing `children?: React.ReactNode` directly is clearer than wrapping the prop type.

---

## 6. Output the consult brief

Return a single self-contained brief the caller can act on. Structure:

```markdown
# TypeScript consult

## Mode
<Author | Refactor | Diagnose>

## Target
<Path or scenario in one line.>

## Principles in play
- <Only the principles the upcoming edit is at risk of violating, restated tersely.>

## Project conventions to match
- <Pinned conventions from section 4 the caller must follow.>

## Advanced features that apply
- **<handle>** — <one-line why it fits this case>.
  <Optional ≤5-line example, only when the feature is non-obvious.>

## Anti-patterns to avoid
- <Specific casts, `any`s, or shape-shifts the scenario invites — call them out by name.>

## Handoff
<Hand control back to the caller. Name the next step explicitly: "write the file", "apply the refactor", "interpret the type error", etc.>
```

Keep each section to the bullets that apply. Omit empty sections. The brief is for execution, not for completeness — silence on a section means it does not apply to this case.

---

## Worked example (fabricated)

Caller: "I need to model the result of `parseInput` — it either succeeds with a parsed `User`, fails with a structured error, or times out. The downstream code switches on the outcome."

Brief returned:

```markdown
# TypeScript consult

## Mode
Author

## Target
Return type of `parseInput` plus the consumer switch.

## Principles in play
- Narrow with control flow, not casts — the consumer must exhaustively handle every outcome.
- One canonical home for a type — colocate the result type with `parseInput`; the consumer imports it.

## Advanced features that apply
- **discriminated-union** — one literal `kind` field disambiguates each outcome.
  ```ts
  type ParseResult =
    | { kind: 'ok'; user: User }
    | { kind: 'error'; reason: string }
    | { kind: 'timeout' }
  ```
- **never-exhaustiveness** — assign the residual to `never` in the `default` branch so a new variant fails to compile rather than silently fall through.

## Anti-patterns to avoid
- A nullable `User` return + a side-channel error string. Discriminated unions express the three outcomes in one value; nullables collapse them.
- `as ParseResult` anywhere — parse failures must be modeled, not asserted away.

## Handoff
Write `parseInput` and its consumer with the shape above. The exhaustiveness check will surface any missed branch at the call site.
```

---

## Important

- This skill consults; it does not edit. The brief is the deliverable. If the caller asks the skill to write the file, redirect: produce the brief, then hand control back so the caller (an agent, another skill, or the user) applies it.
- Surface a feature from section 5 only when it fits the framed work. Do not dump the catalog on every call.
- The brief lists only what the upcoming edit is at risk of getting wrong. Do not surface principles the surrounding code already follows.
- Project principles in `conventions.principles` override the universal defaults in section 3. State the override in the brief whenever one fires.
- Code examples are ≤5 lines and demonstrate one idea each. Fabricated identifiers only (`Widget`, `User`, `Shape`, `Route`) — no real project names.
