# Code Cadence MCP server

Sibling of `code-quality`. Where `code-quality` finds defects (speed, stability,
correctness), cadence takes code that is *technically fine but over-granular or
non-idiomatic* and moves it toward the simplest idiomatic form that still
preserves behaviour and readability. It does not re-implement a parser or the
gates: detection and codemods run on the `ui` workspace's own `ts-morph` /
`typescript`, and `cadence_implement` proves every edit with the repo's Biome /
tsc / vitest gates.

v1 covers **React 19 only** — the documentation KB carries React 18/19 deeply,
while its TypeScript articles lag at v5, so TS rules wait until the sources can
back them.

## Tools

| Tool | Kind | What it does |
| --- | --- | --- |
| `cadence_review` | static | Finds over-granular / non-idiomatic React 19 patterns over named `paths` (files or dirs) or a git-changed sweep. Non-mutating; each finding carries the idiom, a KB citation, and whether it is a mechanical **codemod** (→ `cadence_implement`) or an **escalation** (→ `cadence_diagnose`). |
| `cadence_diagnose` | static | For an escalation finding, explains why the idiom does not drop in mechanically and proposes the restructuring — split the component, lift the fetch, add a Suspense/error boundary — rather than forcing it. |
| `cadence_implement` | runs gates | Applies the mechanical codemods to a file, formats with Biome, then proves the change with Biome + tsc + the related vitest suite. Rolls back if the gate fails, so nothing broken lands. |

## Where it sits next to code-quality and /simplify

`code-quality` owns **defects**; cadence owns **form**. `/simplify` is the quick,
diff-scoped first pass; cadence is the rigorous, source-backed escalation behind
it — it enforces a mechanical idiom consistently, and when an idiom is *not*
viable it diagnoses why and proposes the redesign instead of forcing a rewrite.

## Rules

A rule is a declarative entry in [`rules.mjs`](rules.mjs):

- `category` — `over-granular | inconsistent | non-idiomatic | over-abstracted`
- `authority` — `framework | repo | general`; **framework idiom wins** (repo
  convention yields to it unless it has a strong reason).
- `source` — the documentation-KB citation (`technology` / `version` / `topic` /
  `anchor`) backing the idiom, so it is defensible and current rather than a
  local preference.
- `kind` — `codemod` (mechanical, behaviour-preserving → `cadence_implement`) or
  `escalation` (needs judgement/redesign → `cadence_diagnose`).
- `detect` / `apply` / `diagnose` — AST predicate, in-place codemod, and
  escalation report. They receive the `ts-morph` module so rules never resolve it.
- `fixtureDir` — the before/after pair under `fixtures/` that pins the rule.

`apply`'s anti-conditions (`viableWhen` and the readability floor) are what keep a
rule from golfing code below readability: a codemod only fires where the idiom is
unambiguously equivalent; everything else escalates.

## Tested morals

Every rule ships a before/after fixture under `fixtures/<source>/<rule>/`. Run
them with Node's built-in test runner — no extra tooling:

```bash
node --test .mcp-servers/code-cadence/rules.test.mjs
```

A mechanical rule must turn `input.tsx` into `output.tsx` (compared
whitespace-normalised, since Biome owns final formatting in the real pipeline).
An escalation rule must fire and produce a diagnosis. A rule is not real until its
fixture passes.

## Workspace requirement

The server *loads* on a fresh clone (a pure-Node inline MCP stdio runtime). But
its analysis resolves `ts-morph` / `typescript` from `packages/ui`, and the verify
gate shells out to Biome / tsc / vitest, so the workspace must be installed (the
repo's normal `pnpm install`). When `ts-morph` is missing the tools fail with a
clear message rather than a stack trace.
