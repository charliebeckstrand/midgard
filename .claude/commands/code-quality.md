# Code Quality

TRIGGER when: the user asks to review, check, audit, or ensure code quality on changed or new code — or invokes this skill directly after writing code.

You are reviewing recently changed TypeScript/TSX code in this monorepo for formatting, lint compliance, type safety, and idiomatic modern TypeScript. Your goal is to catch issues that slip past automated tooling and fix them.

## Arguments

$ARGUMENTS

---

## Step-by-step instructions

### 1. Identify changed files

Run `git diff --name-only HEAD` to find unstaged changes. If there are no unstaged changes, run `git diff --name-only HEAD~1` to review the last commit. If the user specified files or a commit range, use that instead.

Filter to `.ts` and `.tsx` files only. Ignore generated files (`dist/`, `.next/`, `node_modules/`).

### 2. Run automated checks

Run these commands and collect their output:

```sh
pnpm biome check --config-path=. <files>
pnpm check-types
```

If either command reports errors, fix them before proceeding to the manual review. Formatting and lint errors caught by Biome are non-negotiable — resolve every one.

### 3. Review for disallowed patterns

Read every changed file and flag any occurrence of the following. These are **hard rules** — fix every violation found, do not merely warn:

#### Non-null assertions (`!`)

```ts
# Disallowed
user!.name
items[0]!.id
document.getElementById('root')!

# Fix: narrow the type properly
if (user) user.name
items[0]?.id
const root = document.getElementById('root')
if (!root) throw new Error('Missing root element')
```

The only exception is in `.d.ts` declaration files where `!` is part of definite assignment (`declare` context).

#### Explicit `any`

```ts
# Disallowed
function parse(input: any) {}
const data = response as any
let cache: Record<string, any>

# Fix: use a specific type, `unknown`, or a generic
function parse(input: unknown) {}
const data = response as ApiResponse
let cache: Record<string, CacheEntry>
```

Zero tolerance. `any` defeats the type system. Use `unknown` and narrow, or define a proper type.

#### Untyped `catch` blocks used unsafely

```ts
# Disallowed
catch (err) {
  console.log(err.message) // err is `unknown`, not `Error`
}

# Fix: narrow first
catch (err) {
  const message = err instanceof Error ? err.message : String(err)
  console.log(message)
}
```

#### TypeScript `enum`

```ts
# Disallowed
enum Status { Active, Inactive }

# Fix: use a union type
type Status = 'active' | 'inactive'

# Or a const object when you need runtime values
const Status = { Active: 'active', Inactive: 'inactive' } as const
type Status = (typeof Status)[keyof typeof Status]
```

This project does not use enums. Prefer discriminated unions or const objects.

#### `React.FC` / `React.FunctionComponent`

```ts
# Disallowed
const Button: React.FC<ButtonProps> = ({ children }) => { ... }

# Fix: use a function declaration with typed parameters
function Button({ children }: ButtonProps) { ... }
```

This project uses function declarations with inline or imported prop types.

### 4. Review for idiomatic patterns

Read the changed code and check for these **soft rules**. Fix issues that clearly improve the code; flag borderline cases to the user:

#### Prefer `import type` for type-only imports

```ts
# Before
import { User, getUserName } from './types'
// User is only used as a type annotation

# After
import type { User } from './types'
import { getUserName } from './types'
```

If an import is used only in type positions (type annotations, interfaces, generics), it must use `import type`. This is enforced by `verbatimModuleSyntax` in tsconfig.

#### Prefer optional chaining and nullish coalescing

```ts
# Before
const name = user && user.profile && user.profile.name
const port = config.port !== undefined && config.port !== null ? config.port : 3000

# After
const name = user?.profile?.name
const port = config.port ?? 3000
```

#### Prefer `const` over `let` when the binding is never reassigned

Scan for `let` declarations where the variable is assigned once and never mutated. Change them to `const`.

#### Avoid unnecessary type assertions (`as`)

```ts
# Suspicious
const name = getValue() as string  // Why isn't getValue() typed correctly?

# Acceptable
const data = (await res.json()) as ApiResponse  // External boundary — no type info
const defaults = { variant: 'soft' as const }   // Literal narrowing
```

`as const` is always fine. `as` at system boundaries (API responses, JSON parsing) is acceptable. `as` used to silence the compiler within internal code is a sign of a type design problem — fix the types instead.

#### Prefer early returns over deep nesting

```ts
# Before
function process(input: string | null) {
  if (input) {
    if (input.length > 0) {
      return transform(input)
    }
  }
  return null
}

# After
function process(input: string | null) {
  if (!input?.length) return null
  return transform(input)
}
```

#### Avoid boolean coercion traps

```ts
# Risky — 0 and '' are falsy but may be valid values
if (count) { ... }

# Explicit
if (count != null) { ... }
if (count !== 0) { ... }
```

Flag cases where a falsy check might swallow valid values like `0`, `''`, or `false`.

#### Prefer modern iteration

```ts
# Before
for (let i = 0; i < items.length; i++) { result.push(transform(items[i])) }

# After
const result = items.map(transform)
```

Use `.map()`, `.filter()`, `.flatMap()`, `.find()`, `for...of` over index-based loops. Only keep index loops when the index itself is needed beyond array access.

### 5. Check component conventions (if UI code changed)

If any files under `packages/ui/src/components/` changed, additionally verify:

- **`data-slot` attribute** present on root elements
- **`className` merging** uses `cn()` from core, not string concatenation
- **Props are spread** onto the root element (`{...props}`)
- **`'use client'`** directive present only when the component uses hooks, event handlers, or motion — not on purely presentational components

### 6. Report and fix

For each issue found:
1. Fix it directly in the file
2. After all fixes, re-run `pnpm biome check --config-path=. <files>` to ensure your changes don't introduce formatting drift

Summarize what you fixed in a short list, grouped by category (formatting, lint, type safety, idiom).

---

## Important

- Always read files before editing. Never guess at surrounding code.
- Preserve the existing code style — tabs, no semicolons, single quotes. Biome enforces this; do not fight the formatter.
- Do not refactor beyond what's needed. A quality check is not a refactoring pass. If you spot a larger design issue, mention it but don't fix it unless asked.
- Do not add comments, docstrings, or type annotations to code that wasn't changed. Only touch lines that have actual quality issues.
- When in doubt about a soft rule, ask the user rather than making a judgment call.
