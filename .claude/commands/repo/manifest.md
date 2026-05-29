# repo:manifest

TRIGGER when: discover, profile, fingerprint, or summarize the project, stack, conventions, or workspace. Also invoked by `/postmortem` and `/premortem` to create or refresh `./manifest.json` when those skills detect it missing or invalidated.

Produce one canonical **Manifest** that downstream skills consume instead of re-deriving. JSON at `./manifest.json` — generated here, committed so downstream skills see a stable view across the team. Other skills read this file at the top of their flow and halt with a `run /repo:manifest` message if absent.

Optimized for a **Turborepo monorepo with Next.js apps and (optionally) shared React packages**. Degrades elsewhere: when `turbo.json` is absent, `monorepo.tool` is `null`; frameworks outside `next` / `react` resolve to `node` or `null`. Nx/Lerna metadata is not detected.

## Arguments

$ARGUMENTS

- `--quiet` — write silently; emit only the path, no markdown summary.

---

## How to discover

Every invocation regenerates end-to-end. Staleness is `/postmortem`'s concern against the working diff. Callers that want to skip work when the Manifest is already current check existence themselves before invoking.

### 1. Read repository-level inputs (parallel)

**Lockfile** in the repo root → resolve `packageManager`:

| File | Manager |
| --- | --- |
| `pnpm-lock.yaml` | `pnpm` |
| `yarn.lock` | `yarn` |
| `package-lock.json` | `npm` |
| `bun.lock` | `bun` |
| `bun.lockb` | `bun` |

Multiple lockfiles → pick the most recently modified; note the rejected names in `notes`.

**Workspace config** → confirm Turbo and capture the workspace globs:

- When `turbo.json` exists, set `monorepo.tool` to `turbo`. When missing, set `null` and record a note — downstream skills that need richer Turbo metadata detect the absence themselves.
- Capture the `workspaces` glob list from `pnpm-workspace.yaml#packages` or `package.json#workspaces`.

**Conventions docs** → read if present, in this order: `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, `README.md`. From each, extract:

- One-line summaries of declared **principles** (architecture, code-style, dependency rules). Cap at ~10.
- A **vocabulary glossary**: project-specific terms (folder/recipe/primitive names) defined or repeatedly referenced, with a one-sentence gloss inferred from context.

On conflict between files, the earlier file in the list wins.

**Pre-commit hook config**:

| File | Tool |
| --- | --- |
| `lefthook.yml` or `lefthook.yaml` | `lefthook` |
| `.husky/` | `husky` |
| `.pre-commit-config.yaml` | `pre-commit` |
| `lint-staged` field in `package.json` | augments whichever tool is present |

Parse the chosen file to list the **gates** (e.g. `lint`, `type`, `test`) that run.

**CI config** (`.github/workflows/*.{yml,yaml}`, `.gitlab-ci.yml`, `.circleci/config.yml`, `circle.yml`) → resolve `ci.provider` and list job names. Don't parse step contents.

### 2. Resolve packages

For a monorepo, expand each `workspaces` glob to concrete directories. Otherwise the only package is the repo root.

Per package, read `package.json` and glob 1-deep into `src/` (or the package root if no `src/`). Run in parallel.

Per-package fields:

| Field | Source / resolution |
|---|---|
| `name` | `package.json#name`, or the directory basename if unnamed |
| `path` | relative to repo root |
| `framework` | strongest signal from `dependencies` + `devDependencies`: `next` dep → `next`; `react` dep (no `next`) → `react`; none and entrypoint runs on Node → `node`; otherwise `null` |
| `testRunner` | `vitest` / `jest` / `bun` / `node` (detected from devDeps and/or `scripts.test`); `null` if no test infrastructure |
| `linter` | `biome` / `eslint`; `null` if absent |
| `scripts` | always emit all seven keys (`test`, `test:changed`, `test:related`, `lint`, `check-types`, `build`, `dev`). Copy verbatim from `package.json#scripts`; `null` when absent. Prefer `check-types`; fall back to `typecheck` if absent; ignore other aliases. `test:changed` / `test:related` are the scoped-iteration commands consumed by `/typescript:review` and `/tests:compose`. |
| `pathAliases` | the package's TypeScript path aliases. Read the package's `tsconfig.json` and the configs it `extends`; emit each `compilerOptions.paths` entry as `"<alias>": "<target>"`, collapsing the single-element target array to a string and stripping a leading `./`. A package-level `paths` block overrides an inherited one rather than merging. `null` when no alias resolves in the chain. Consumed by import-writing sessions to skip re-reading tsconfig. |
| `componentsDir` | first existing: `src/components/`, `src/ui/`, `app/components/`, `lib/components/`, `components/`; else `null` |
| `primitivesDir` | first existing: `src/primitives/`, `src/atoms/`, `src/core/components/`; else `null` |
| `hooksDir` | first existing: `src/hooks/`, `src/use/`; else `null` |
| `tokensDir` | first existing: `src/recipes/`, `src/tokens/`, `src/theme/`, `src/styles/tokens/`; else `null` |
| `testLayout` | list files matching `**/*.{test,spec}.{ts,tsx,js,jsx}` under the package (exclude `node_modules`, `dist`). Classify as `sibling` (next to source) or `mirror` (under `__tests__/`). Pick the more common; tied → `sibling`. No matches → `null`. |
| `testHelpersDir` | directory containing `helpers.ts` / `test-utils.ts` / `setup.ts` referenced from existing tests; else `null` |
| `isFrontend` | `true` when any of `*.tsx` / `*.jsx` / `index.html` exist under the package; else `false` |

### 3. Assemble the Manifest

Field rules:

- Every field is **required**; use `null` when genuinely absent.
- `notes` collects heuristic warnings (multiple lockfiles, conflicting framework signals).
- Never fabricate vocabulary entries or project-specific facts.

Schema (and a representative full output):

```jsonc
{
  "version": 1,
  "generatedAt": "2030-01-01T00:00:00Z",
  "packageManager": "pnpm",
  "monorepo": {
    "tool": "turbo",
    "workspaces": ["packages/*", "apps/*"]
  },
  "packages": [
    {
      "name": "@acme/design-system",
      "path": "packages/design-system",
      "framework": "react",
      "testRunner": "vitest",
      "linter": "biome",
      "scripts": {
        "test": "vitest run",
        "test:changed": "vitest run --changed",
        "test:related": "vitest related --run",
        "lint": "biome check .",
        "check-types": "tsc --noEmit",
        "build": "tsup",
        "dev": null
      },
      "pathAliases": { "@/*": "src/*" },
      "componentsDir": "src/components",
      "primitivesDir": "src/primitives",
      "hooksDir": "src/hooks",
      "tokensDir": "src/theme",
      "testLayout": "mirror",
      "testHelpersDir": "src/__tests__/helpers",
      "isFrontend": true
    },
    {
      "name": "@acme/storefront",
      "path": "apps/storefront",
      "framework": "next",
      "testRunner": null,
      "linter": "biome",
      "scripts": {
        "test": null,
        "test:changed": null,
        "test:related": null,
        "lint": "biome check .",
        "check-types": null,
        "build": "next build",
        "dev": "next dev"
      },
      "pathAliases": { "@/*": "app/*" },
      "componentsDir": "app/components",
      "primitivesDir": null,
      "hooksDir": "app/hooks",
      "tokensDir": null,
      "testLayout": null,
      "testHelpersDir": null,
      "isFrontend": true
    }
  ],
  "preCommit": { "tool": "lefthook", "gates": ["lint", "type"] },
  "ci": {
    "provider": "github-actions",
    "jobs": ["lint", "typecheck", "test", "build"]
  },
  "conventions": {
    "files": ["CLAUDE.md"],
    "principles": [
      "Apps depend on packages; packages never depend on apps.",
      "Tests live under __tests__/ mirroring the source tree."
    ],
    "vocabularyGlossary": {
      "Slot": "named region inside a composite component"
    }
  },
  "notes": [
    "Both pnpm-lock.yaml and package-lock.json present; chose pnpm by mtime."
  ]
}
```

### 4. Write the Manifest

Write pretty-printed to `./manifest.json` at the repo root. The file is tracked in git. When invoked from `/postmortem`'s diff-driven refresh, the caller stages the updated file so it ships in the same commit as the invalidating change. Direct user invocations leave staging to the user.

### 5. Summarize for the user

Skip this section when `--quiet` was passed.

Emit a compact markdown summary (~15 lines):

```md
**Manifest** — written at <timestamp>

- Package manager: <pm>
- Monorepo: <tool> (<N> packages)
- Frameworks: <comma-separated set across packages>
- Test runners: <comma-separated set>
- Pre-commit gates: <list or "none">
- CI: <provider>, <N> jobs
- Conventions docs: <comma-separated filenames>
- Path: `manifest.json`
```

End with: `Run /repo:manifest to regenerate; downstream skills will reuse this file.`

---

## Rules

- The Manifest reflects **only what was observed**. Never invent fields. Use `null` and `[]` liberally.
- Run filesystem reads in parallel where independent.
- Don't interpret the manifest (no recommended changes). Discovery is read-only.
- When the repo has zero packages with a `package.json`, emit a manifest with `packages: []` and a `notes` entry explaining why, then stop.
