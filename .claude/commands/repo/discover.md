# repo:discover

TRIGGER when: the user asks to discover, profile, fingerprint, or summarize the project, the stack, the conventions, or the workspace; also auto-invoked by other skills when their cache read misses or is stale.

You are producing a single canonical **Project Profile** that downstream skills consume instead of each re-deriving the same facts. The profile is a JSON document written to `.claude/cache/project-profile.json`. Other skills read this file at the top of their flow.

This skill is optimized for a **Turborepo monorepo with Next.js apps and (optionally) shared React packages** and produces its richest output for that shape. It degrades gracefully on other setups: when `turbo.json` is absent it sets `monorepo.tool` to `null` and records a note, and frameworks outside `next` / `react` resolve to `library`, `node`, or `null`. It does not attempt to detect Nx/Lerna metadata or Vue/Svelte/Solid framework specifics.

## Arguments

$ARGUMENTS

Recognized flags:
- `--quiet` — refresh the cache silently; emit only the cache path, no markdown summary.
- `--force` — refresh the cache even if it is fresh.

---

## How to discover

### 1. Decide whether to refresh

Read `.claude/cache/project-profile.json` if it exists. If the file is missing or unparseable, treat the cache as stale and continue to step 2.

The cache is **fresh** when **all** of the following hold:
- `version` equals the value this skill emits (currently `1`).
- `generatedAt` is less than 24 hours ago.
- Every path in `sourceMtimes` still exists and its live mtime exactly matches the recorded value.
- No file the skill **would record on a fresh run** is present today but absent from `sourceMtimes`. In practice: probe the conventions doc list (`CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, `README.md`) and the pre-commit / CI config locations; if any present file is not in `sourceMtimes`, the cache is stale.
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
  | `bun.lock` | `bun` |
  | `bun.lockb` | `bun` |
  Multiple lockfiles → pick the most recently modified and note the others in `notes`.

- **Workspace config** → confirm Turbo and capture the workspace globs:
  - When `turbo.json` exists, set `monorepo.tool` to `turbo`. When it is missing, set `monorepo.tool` to `null` and record a note — downstream skills that need the richer Turbo metadata will detect the absence themselves.
  - Capture the `workspaces` glob list from `pnpm-workspace.yaml#packages` or `package.json#workspaces` — whichever the repo uses.

- **Conventions docs** → read these if present, in this order: `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, `README.md`. From each, extract:
  - One-line summaries of any declared **principles** (architecture rules, code-style rules, dependency rules).
  - A **vocabulary glossary**: any project-specific terms (folder/recipe/primitive names) defined or repeatedly referenced, with a 1-sentence gloss inferred from context.
  - Any **mandatory skill bindings** declared (statements like "always use `/foo` when …").

- **Pre-commit hook config**:
  | File | Tool |
  | --- | --- |
  | `lefthook.yml` or `lefthook.yaml` | `lefthook` |
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
- `scripts` — always emit all five keys (`test`, `lint`, `check-types`, `build`, `dev`). Copy the value verbatim from `package.json#scripts`; use `null` when the key is absent. If the package uses `typecheck` instead of `check-types`, normalize it under `check-types`.
- `componentsDir` — first existing directory, in this order: `src/components/`, `src/ui/`, `app/components/`, `lib/components/`, `components/`; else `null`.
- `primitivesDir` — first existing directory, in this order: `src/primitives/`, `src/atoms/`, `src/core/components/`; else `null`.
- `hooksDir` — first existing directory, in this order: `src/hooks/`, `src/use/`; else `null`.
- `tokensDir` — first existing directory, in this order: `src/recipes/`, `src/tokens/`, `src/theme/`, `src/styles/tokens/`; else `null`.
- `testLayout` — list files matching `**/*.{test,spec}.{ts,tsx,js,jsx}` under the package, exclude `node_modules` and `dist`, and inspect up to 2 (most recently modified first):
  - Co-located next to source → `sibling`.
  - Located under a `__tests__/` directory → `mirror`.
  - No matching files → `null`.
  - When the two samples disagree, pick whichever shape is more common across the full list; if still tied, prefer `sibling`.
- `testHelpersDir` — directory containing a `helpers.ts` / `test-utils.ts` / `setup.ts` referenced from existing tests; else `null`.
- `isFrontend` — `true` when any of `*.tsx` / `*.jsx` / `index.html` exist under the package; else `false`.

### 4. Assemble the profile

Record an mtime entry in `sourceMtimes` for **every** file actually read across steps 2 and 3 — repo-root lockfiles, workspace and turbo configs, conventions docs, pre-commit and CI configs, and each package's `package.json`. Files that were probed but did not exist are not recorded; their later appearance is handled by the freshness check in step 1.

Compose the final object. Schema:

```jsonc
{
  "version": 1,
  "generatedAt": "<ISO 8601 UTC>",
  "sourceMtimes": {
    "package.json": "<ISO 8601>",
    "CLAUDE.md": "<ISO 8601>",
    "packages/ui-kit/package.json": "<ISO 8601>",
    "apps/web/package.json": "<ISO 8601>"
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
        "test": null,
        "lint": "biome check .",
        "check-types": null,
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
  "notes": [
    "Both pnpm-lock.yaml and package-lock.json present; chose pnpm by mtime.",
    "Package apps/web declares no test script."
  ]
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

Print this section only when `--quiet` was **not** passed. `--force` is orthogonal: it controls cache invalidation, not output, so `--force` alone still prints the summary, and `--quiet --force` refreshes silently.

Emit a compact markdown summary (~15 lines):

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

End with: `Run /repo:discover --force to refresh; downstream skills will reuse this file.`

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
    "CLAUDE.md": "2029-12-29T22:00:00Z",
    "lefthook.yml": "2029-11-02T17:00:00Z",
    "packages/design-system/package.json": "2029-12-29T22:00:00Z",
    "apps/storefront/package.json": "2029-12-30T08:00:00Z"
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
        "build": "tsup",
        "dev": null
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
        "test": null,
        "lint": "biome check .",
        "check-types": null,
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
