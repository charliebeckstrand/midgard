# Discover the Project

TRIGGER when: the user asks to discover, profile, fingerprint, or summarize the project, the stack, the conventions, or the workspace; also auto-invoked by other skills when their cache read misses or is stale.

You are producing a single canonical **Project Profile** that downstream skills consume instead of each re-deriving the same facts. The profile is a JSON document written to `.claude/cache/project-profile.json`. Other skills read this file at the top of their flow.

This skill assumes the project is a **Turborepo monorepo with Next.js apps and (optionally) shared React packages**. It does not attempt to handle Nx/Lerna monorepos, Vue/Svelte/Solid frameworks, or non-Turbo setups — those paths are out of scope.

## Arguments

$ARGUMENTS

Recognized flags:
- `--quiet` — refresh the cache silently; emit only the cache path, no markdown summary.
- `--force` — refresh the cache even if it is fresh.

---

## How to discover

### 1. Decide whether to refresh

Read `.claude/cache/project-profile.json` if it exists.

The cache is **fresh** when **all** of the following hold:
- `generatedAt` is less than 24 hours ago.
- For every entry in `sourceMtimes`, the live mtime of that file matches the recorded value.
- `--force` was not passed.

If the cache is fresh, emit the existing profile and stop. Otherwise continue.

### 2. Read repository-level inputs

Run these in parallel:

- **Lockfile** in the repo root → resolve `packageManager`:
  | File | Manager |
  | --- | --- |
  | `pnpm-lock.yaml` | `pnpm` |
  | `yarn.lock` | `yarn` |
  | `package-lock.json` | `npm` |
  | `bun.lockb` | `bun` |
  Multiple lockfiles → pick the most recently modified and note the others in `notes`.

- **Workspace config** → confirm Turbo and capture the workspace globs:
  - `turbo.json` must exist (this skill assumes Turbo). If it's missing, add a `notes` entry warning the user and continue with `monorepo.tool: null`.
  - Capture the `workspaces` glob list from `pnpm-workspace.yaml#packages` or `package.json#workspaces` — whichever the repo uses.

- **Conventions docs** → read these if present, in this order: `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, `README.md`. From each, extract:
  - One-line summaries of any declared **principles** (architecture rules, code-style rules, dependency rules).
  - A **vocabulary glossary**: any project-specific terms (folder/recipe/primitive names) defined or repeatedly referenced, with a 1-sentence gloss inferred from context.
  - Any **mandatory skill bindings** declared (statements like "always use `/foo` when …").

- **Pre-commit hook config**:
  | File | Tool |
  | --- | --- |
  | `lefthook.yml` | `lefthook` |
  | `.husky/` | `husky` |
  | `.pre-commit-config.yaml` | `pre-commit` |
  | `lint-staged` field in `package.json` | augments whichever tool is present |
  Parse the chosen file to list the **gates** (e.g. `lint`, `type`, `test`) that actually run.

- **CI config** (`.github/workflows/*.{yml,yaml}`, `.gitlab-ci.yml`, `.circleci/config.yml`, `circle.yml`) → resolve `ci.provider` and list the job names. Do not parse step contents.

### 3. Resolve packages

If the repo is a monorepo, expand each `workspaces` glob to concrete directories. Otherwise the only package is the repo root.

For each package, **read its `package.json`** and **glob 1-deep into `src/`** (or the package root if no `src/`) to produce a package record. Run packages in parallel.

Per-package fields:

- `name` — from `package.json#name`, or the directory basename if unnamed.
- `path` — relative to repo root.
- `framework` — pick the strongest signal from `dependencies` + `devDependencies`:
  | Dep present | Framework |
  | --- | --- |
  | `next` | `next` |
  | `react` (no `next`) | `react` |
  | none of the above and `main`/`exports` points at JS | `library` |
  | none and entrypoint runs on Node | `node` |
  | otherwise | `null` |
- `testRunner` — `vitest` / `jest` / `bun` / `node` (detected from devDeps and/or `scripts.test`); `null` if no test infrastructure.
- `linter` — `biome` / `eslint`; `null` if absent.
- `scripts` — copy `test`, `lint`, `check-types` (or `typecheck`), `build`, `dev` verbatim from `package.json#scripts`. Omit keys that do not exist.
- `componentsDir` — first match of `src/components/`, `src/ui/`, `app/components/`, `lib/components/`, `components/`; else `null`.
- `primitivesDir` — first match of `src/primitives/`, `src/atoms/`, `src/core/components/`; else `null`.
- `hooksDir` — first match of `src/hooks/`, `src/use/`; else `null`.
- `tokensDir` — first match of `src/recipes/`, `src/tokens/`, `src/theme/`, `src/styles/tokens/`; else `null`.
- `testLayout` — examine up to 2 existing test files:
  - Co-located next to source → `sibling`.
  - Mirrored under a sibling `__tests__/` tree → `mirror`.
  - Neither (or no tests) → `null`.
- `testHelpersDir` — directory containing a `helpers.ts` / `test-utils.ts` / `setup.ts` referenced from existing tests; else `null`.
- `isFrontend` — `true` when any of `*.tsx` / `*.jsx` / `index.html` exist under the package; else `false`.

### 4. Assemble the profile

Compose the final object. Schema:

```jsonc
{
  "version": 1,
  "generatedAt": "<ISO 8601 UTC>",
  "sourceMtimes": {
    "package.json": "<ISO 8601>",
    "CLAUDE.md": "<ISO 8601>"
    // every file read in step 2 appears here
  },
  "repoRoot": "/abs/path/to/repo",
  "packageManager": "pnpm",
  "monorepo": {
    "tool": "turbo",
    "workspaces": ["packages/*", "apps/*"]
  },
  "packages": [
    {
      "name": "ui-kit",
      "path": "packages/ui-kit",
      "framework": "react",
      "testRunner": "vitest",
      "linter": "biome",
      "scripts": {
        "test": "vitest run",
        "lint": "biome check .",
        "check-types": "tsc --noEmit",
        "build": "tsup",
        "dev": "tsup --watch"
      },
      "componentsDir": "src/components",
      "primitivesDir": "src/primitives",
      "hooksDir": "src/hooks",
      "tokensDir": "src/theme",
      "testLayout": "mirror",
      "testHelpersDir": "src/__tests__/helpers",
      "isFrontend": true
    },
    {
      "name": "web",
      "path": "apps/web",
      "framework": "next",
      "testRunner": null,
      "linter": "biome",
      "scripts": {
        "lint": "biome check .",
        "build": "next build",
        "dev": "next dev"
      },
      "componentsDir": "app/components",
      "primitivesDir": null,
      "hooksDir": "app/hooks",
      "tokensDir": null,
      "testLayout": null,
      "testHelpersDir": null,
      "isFrontend": true
    }
  ],
  "preCommit": {
    "tool": "lefthook",
    "gates": ["lint", "type", "test"]
  },
  "ci": {
    "provider": "github-actions",
    "jobs": ["lint", "test", "build"]
  },
  "conventions": {
    "files": ["CLAUDE.md", "AGENTS.md"],
    "principles": [
      "Shared packages must not import from application code.",
      "Each commit represents one logical change."
    ],
    "vocabularyGlossary": {
      "Slot": "named region inside a composite component",
      "Recipe": "variant-aware styling factory"
    },
    "mandatorySkills": [
      { "skill": "/ui:component:compose", "trigger": "asked to create a UI component" }
    ]
  },
  "notes": []
}
```

Field rules:
- Every field is **required**; use `null` when a value is genuinely absent.
- `notes` collects any heuristic warnings (e.g. multiple lockfiles, conflicting framework signals).
- Never emit project-specific facts unless they were actually discovered. Do not fabricate vocabulary entries.

### 5. Write the cache

Ensure `.claude/cache/` exists (create it if not). Write the profile pretty-printed to `.claude/cache/project-profile.json`.

The cache directory is gitignored. Do not commit it.

### 6. Summarize for the user

Unless `--quiet` was passed, print a compact markdown summary (~15 lines):

```md
**Project Profile** — refreshed at <timestamp>

- Package manager: <pm>
- Monorepo: <tool> (<N> packages)
- Frameworks: <comma-separated set across packages>
- Test runners: <comma-separated set>
- Pre-commit gates: <list or "none">
- CI: <provider>, <N> jobs
- Conventions docs: <comma-separated filenames>
- Cache: `.claude/cache/project-profile.json`
```

End with: `Run /discover --force to refresh; downstream skills will reuse this file.`

---

## Example profile

### Turbo + Next monorepo with a shared React design system (pnpm)

```jsonc
{
  "version": 1,
  "generatedAt": "2030-01-01T00:00:00Z",
  "sourceMtimes": {
    "package.json": "2029-12-31T09:11:00Z",
    "turbo.json": "2029-12-31T09:11:00Z",
    "pnpm-workspace.yaml": "2029-12-15T10:00:00Z",
    "CLAUDE.md": "2029-12-29T22:00:00Z"
  },
  "repoRoot": "/home/dev/acme",
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
        "lint": "biome check .",
        "check-types": "tsc --noEmit",
        "build": "tsup"
      },
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
        "lint": "biome check .",
        "build": "next build",
        "dev": "next dev"
      },
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
    },
    "mandatorySkills": []
  },
  "notes": []
}
```

---

## Important

- The profile must reflect **only what was observed**. Never invent fields. Use `null` and `[]` liberally.
- Run filesystem reads in parallel where independent. A typical run completes in under a few seconds.
- Do not interpret the profile (e.g. recommend changes) here. Discovery is read-only. Other skills consume the profile and decide what to do.
- If the repo has zero packages with a `package.json`, emit a profile with `packages: []` and a `notes` entry explaining why, and stop.
