# typescript:format

TRIGGER when: format, tidy, align, or normalize TypeScript. Opt in casually — name a file to format only that file, a directory or list of paths to batch-format, or nothing at all to format the staged diff. Also when `/postmortem` chains here ahead of `/typescript:review`.

Apply the repo's TypeScript structural conventions to `.ts` / `.tsx` — the ones Biome doesn't see: `type` over `interface`, named-only exports, vertical breathing between statements, `'use client'` placement, JSDoc shape, constant naming. Auto-applies the mechanical fixes; surfaces the rest as findings.

This skill writes code. Use `/typescript:review` for PASS / BLOCK gating on the same surface.

---

## Arguments

$ARGUMENTS

Recognized hints:

- No argument → **diff mode**. Format the staged diff (or `git diff HEAD` when nothing is staged). Used by `/postmortem`.
- A path to a `.ts` / `.tsx` file → **file mode**. Format that one file and stop.
- A directory → **dir mode**. Format every `.ts` / `.tsx` directly inside (non-recursive; pass explicit paths for recursion).
- Multiple paths, any mix of files and directories, space-separated → **multi mode**. Each path expands as above; the union formats in one pass.
- `--dry-run` → run every check, write nothing, report the diff that *would* apply.
- `--only=<biome|structure|surface>` → restrict to one phase (see §3). Stacks: `--only=biome --only=structure`.

---

## 0. Manifest

Read `./manifest.json`. If missing, halt with a pointer to `/repo:manifest`.

Per package, capture:

| Field | Use |
|---|---|
| `path`, `name` | map files to packages |
| `framework` | gates TSX-specific structural rules |
| `linter` (`biome` / `eslint` / `null`) | drives the auto-format invocation in §3a |
| `scripts.lint` | the auto-format command per package |
| `conventions.principles` | observed when classifying violations |

Plus top-level: `packageManager`, `monorepo.tool`. Substitute `<pm>` accordingly.

Also read any `CLAUDE.md` in each touched package's directory tree — these own constant-naming and file-naming rules cited in §4.

---

## 1. Collect the surface

### Diff mode

```bash
git diff --cached --name-only
git diff --cached
```

If nothing is staged, fall back to `git diff HEAD --name-only`; tell the user formatting is running against unstaged changes.

Filter to `.ts` / `.tsx`. Empty surface → stop.

### File / dir / multi mode

Expand the paths to a deduped list of `.ts` / `.tsx`. Skip `node_modules/`, `.next/`, `dist/`, `build/`, generated `*.d.ts`.

---

## 2. Map files to packages

For each file, find the longest `packages[*].path` that prefixes it. Files outside any package still get phase §3a (Biome) and §3b (structure), but skip package-specific rules (constant naming, file naming).

---

## 3. The three phases

Phases run in order. Each phase reports `clean` (nothing to do), `applied` (edits written), or `blocked` (a non-mechanical concern surfaced).

### 3a. Biome auto-fix (mechanical)

For each touched package whose `linter` is `biome`, run the package's `scripts.lint` with `--write`:

```
<pm> --filter=<pkg> exec biome check --write --config-path=<root> <files>
```

For root-level files (no package), run from the repo root: `<pm> exec biome check --write <files>`.

Biome handles, per `biome.json`:

- Tabs, 100-char width.
- Single quotes.
- `semicolons: 'asNeeded'` — no trailing semicolons.
- `organizeImports: 'on'` — sorts and groups imports.
- Recommended lint rules.

If `linter` is `null` or `eslint`, skip §3a for that package and tell the user.

### 3b. Structural fixes (auto-apply when safe)

Per file, apply these in order. Each rewrite is mechanical; if a rewrite cannot be made safely (ambiguity, declaration merging, default export with external consumers), surface it under §3c instead.

| Rule | Auto-fix | Skip-and-surface condition |
|---|---|---|
| **R1. `'use client'` placement** — if the directive appears, it must be the first non-blank statement, single-quoted, followed by one blank line. Move it; collapse stray blank lines. | yes | never (always mechanical) |
| **R2. `interface` → `type`** — single-declaration interfaces become `type X = { … }`. Preserve extends as intersection: `interface A extends B {}` → `type A = B & { … }`. | yes | declaration merging detected (two `interface` declarations with the same name in scope, or a `declare interface` used for module augmentation) — keep, surface as advisory |
| **R3. Vertical breathing** — default to one blank line between adjacent statements at function-body / block scope and between adjacent top-level declarations. The exception is **visual rhyming**: if two adjacent lines share a left-justified prefix that visually aligns (same opening keyword *and* a shared leading-identifier prefix — see §5e), pack them. Imports always pack (Biome owns the block). Collapse runs of 2+ blanks to 1. | yes | inside object / array / JSX literals — leave untouched |
| **R4. Default export → named** — for `export default function Foo() {}` and `export default class Foo {}`, rewrite to `export function Foo() {}` (or `export class`). | yes — when no external consumer exists | any consumer outside the file uses `import Foo from '...'` — surface in §3c (rename requires consumer updates; route to `/typescript:migrate rename`) |
| **R5. JSDoc shape** — a single-line JSDoc is `/** Text. */` on one line. A multi-line JSDoc opens with `/**` on its own line, every middle line begins ` * `, closes with ` */` on its own line. No blank lines inside. | yes (reshape only) | never auto-create JSDoc; missing JSDoc is surfaced as advisory in §3c |

Write the edits. Re-run Biome (`§3a`) on touched files to settle import ordering and any drift the structural pass introduced.

### 3c. Non-mechanical concerns (surface only)

Read every file in the surface for these. Auto-fixing any of them risks behavior change, breaking call sites, or requires a design decision. Surface as **BLOCK** when listed, **advisory** otherwise.

**BLOCK:**

- **`enum` declaration.** Forbidden. Route: `/typescript:migrate enum-to-const`. Cite `file:line`.
- **`as any`, `as unknown as X`** with no inline `//` or JSDoc justification on the preceding or trailing line. Route: `/typescript:migrate any-to-unknown`, or refactor with a type predicate.
- **`@ts-ignore` / `@ts-expect-error`** with no inline justification.
- **Default export from a `.ts` / `.tsx` source file** (not `.d.ts`, not a test mock) — when R4 couldn't auto-fix because external consumers exist. Cite the consumer count.
- **Constant naming / placement** violating the package's `## Constant naming` rule (read from the package's nearest `CLAUDE.md`). Example: `packages/ui/CLAUDE.md` reserves `UPPER_SNAKE_CASE` for primitive magic values and `camelCase` for keyed lookup tables; a `Record<…, string>` named `BUTTON_SIZES` violates the rule. Cite the rule's location.
- **Filename / export-name mismatch** in `packages/ui` (the `component-filename-boundary.test.ts` would fail anyway). For new files: rename the file or the export. Never extend the test's `ALLOWLIST`.

**Advisory** (surfaces but doesn't block the verdict):

- **Missing JSDoc on an exported function or type** when the file's package keeps JSDoc on its other exports. One-liner suggested; the caller decides.
- **Convention drift from a sampled sibling** — `type` vs `interface` (post-R2, only if blocked above), inline `type` qualifier vs `import type`, generic naming (single-letter `T` / `K` vs `TFoo`).
- **Declaration-merging `interface`** kept by R2 — confirm the merge is intentional.

---

## 4. Verdict

Header:

```
<mode> · <N> files · biome <clean|applied|skip> · structure <clean|applied|blocked> · surface <M blocks · K advisories>
```

Then one of:

- **CLEAN** — no edits applied, no findings. One line. Hand control back.
- **APPLIED** — edits written. List every modified file. Tell the caller to restage (`git add -u`); when invoked by `/postmortem`, the chain halts pending that restage.
- **BLOCK** — list every BLOCK finding with `file:line` and the fix or migration route. Refuse CLEAN until resolved. List advisories below; they do not gate the verdict.

Never rewrite silently. Every APPLIED verdict carries the full modified-file list.

---

## 5. Convention reference

Citations for the rules above. Read this section when a finding's rationale needs the canonical principle.

### 5a. Set by tooling (Biome / tsconfig — do not restate as findings)

- Tabs for indentation. 100-char line width. Single quotes. No trailing semicolons (`asNeeded`).
- Imports organized by Biome (`organizeImports: on`). One block per file.
- `verbatimModuleSyntax: true` enforces `import type` discipline at type-check time.
- `strict`, `noUncheckedIndexedAccess` set in `tsconfig.base.json` — code that needs looser settings is a `/typescript:review` BLOCK, not a format concern.

### 5b. Module preamble

- `'use client'` directive, when present, is the first non-blank line of the file. Single-quoted, followed by one blank line. No imports may precede it.
- Imports immediately follow. No commentary, no manual section dividers.

### 5c. Types

- **`type` aliases over `interface`.** Single-declaration interfaces convert mechanically. The only legitimate `interface` is declaration merging or module augmentation (`declare interface`) — keep those, document why.
- **No `enum`.** Use `as const` objects with `(typeof X)[keyof typeof X]` for the union, or a literal string union. `const enum` is also off the table — breaks `isolatedModules`.
- **Generic parameters: single capital letter** (`T`, `K`, `V`, `U`). Reach for `TName` only when two generics need distinguishing names *and* siblings already use the prefix form.
- **Inferred locals are not annotated.** Annotate parameters and exported return types; let inference do the rest. Reach for `satisfies` to constrain a literal without widening.

### 5d. Exports

- **Named exports only.** Default exports are tolerated in `.d.ts` ambient module shims and test-fixture mocks under `__tests__/mocks/`; nowhere else.
- **Top-level functions use `function` declarations**, not `const arrow =`. Components, hooks, and utilities all follow this.
- **One canonical home per type.** Parallel definitions in two files signal a missing `lift` — route to `/typescript:migrate lift`.

### 5e. Vertical breathing

The repo's signature style. Default to **one blank line between adjacent statements** — the reader's eye lands on one operation per beat. Blanks go between:

- Two `const` / `let` declarations.
- Two hook calls (`useState`, `useEffect`, `useCallback`).
- An early-return `if (cond) return …` and the next statement.
- A block statement (`for`, `while`, `if … { … }`) and what follows.
- A trailing `return` and what precedes it.

**The exception: visual rhyming.** Pack adjacent lines when they share a left-justified prefix that creates a visual column — same opening keyword *and* the next token shares a leading-identifier substring of three or more characters.

Examples that pack (sampled from the repo):

```ts
export const DEFAULT_ROW_HEIGHT = 44
export const DEFAULT_OVERSCAN = 10
```

```ts
export const tagSize = { sm: 'xs', md: 'sm', lg: 'md' } as const
export const tagRemoveSize = { … } as const
```

Examples that breathe:

```ts
export const BREAKPOINTS = […] as const

export type Breakpoint = (typeof BREAKPOINTS)[number]

export type Responsive<T> = T | { … }
```

```ts
export type Orientation = 'horizontal' | 'vertical'

export type ScrollOrientation = 'horizontal' | 'vertical' | 'both'
```

The first set rhymes — `DEFAULT_`, `tag` — the eye reads them as one stanza. The second set diverges immediately after the keyword (`const` vs `type`, or `Orientation` vs `ScrollOrientation` — `Scroll` breaks the alignment). Imports always pack; Biome owns that block. When in doubt, sample a sibling. Default to a blank line.

### 5f. JSDoc

- One-line JSDoc fits on one line: `/** Description. */`.
- Multi-line JSDoc opens and closes on their own lines with ` * ` middles. No blank lines inside.
- JSDoc explains the *why* or contract — not the *what* a well-named signature already conveys. If the description restates the signature, drop it.

### 5g. Constants (per `packages/ui/CLAUDE.md` § Constant naming)

- Module-level **primitives, fixed enumerations, sentinel defaults** → `UPPER_SNAKE_CASE`.
- Module-level **keyed lookup tables, config objects, initial-state shapes** → `camelCase`.
- Rule of thumb: if you'd inline it as a literal, `UPPER_SNAKE`. If you'd index into it, `camelCase`.
- Magic numbers used in two or more places lift to a sibling `<component>-constants.ts` when the package already follows that pattern (the data-table, hold-button, pagination, tag-input, tree directories model this).

### 5h. File naming (per `packages/ui/CLAUDE.md` § File naming)

Inside `packages/ui/src/components/<name>/` (and `primitives/`):

| Kind | Pattern |
|---|---|
| Main component | `<name>.tsx` |
| Sub-components | `<name>-<part>.tsx` |
| Hooks | `use-<name>-<hook>.ts` (`.tsx` only when the hook returns JSX) |
| Context | `context.ts` (`.tsx` only when exporting a JSX provider) |
| Types | `types.ts` |
| Variants | `variants.ts` |
| Slots | `slots.tsx` / `slots.ts` |
| Barrel | `index.ts` |

Every component or hook file exports a symbol whose PascalCase (or `useCamelCase`) form matches the filename. Mismatches BLOCK — the boundary test would fail anyway.

---

## Rules

- This skill writes. APPLIED means files changed on disk; cite every one.
- Never touch uncommitted work outside the surface. Diff mode formats only files in the diff; file / dir / multi modes format the explicit paths and nothing else.
- BLOCK halts the caller's chain. When invoked by `/postmortem`, BLOCK refuses to advance to extras or `/typescript:review`.
- Never auto-create JSDoc — the writer owns the words.
- Never extend the `ALLOWLIST` in `component-filename-boundary.test.ts`. Fix the file or the export.
- Don't re-run on a path that just returned CLEAN.
- Don't pad. CLEAN is one line.
- Fabricated identifiers in §5 examples only — never a real project symbol.
