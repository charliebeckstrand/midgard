# repo:manifest

TRIGGER when: the user asks to discover, profile, fingerprint, or summarize the project, the stack, the conventions, or the workspace. Also invoked by `/postmortem` and `/premortem` to create or refresh `./manifest.json` when those lifecycle skills detect it is missing or invalidated.

You are producing a single canonical **Manifest** that downstream skills consume instead of each re-deriving the same facts. The Manifest is a JSON document tracked at `./manifest.json` (committed to the repo). Other skills read this file at the top of their flow and stop with a "run `/repo:manifest`" message if it is absent — they never generate it themselves.

This skill is optimized for a **Turborepo monorepo with Next.js apps and (optionally) shared React packages** and produces its richest output for that shape. It degrades gracefully on other setups: when `turbo.json` is absent it sets `monorepo.tool` to `null` and records a note, and frameworks outside `next` / `react` resolve to `node` or `null`. It does not attempt to detect Nx/Lerna metadata.

## Arguments

$ARGUMENTS

Recognized flags:
- `--quiet` — write the Manifest silently; emit only the path, no markdown summary.

---

## How to discover

Every invocation regenerates the Manifest end-to-end. There is no freshness short-circuit — staleness is detected by `/postmortem` against the working diff, not by this skill. Callers that want to skip work when the Manifest is already current should check existence themselves before invoking.

### 1. Read repository-level inputs

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

### 2. Resolve packages

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

### 3. Assemble the Manifest

Compose the final object. Schema:

```jsonc
{
  "version": 1,
  "generatedAt": "<ISO 8601 UTC>",
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

### 4. Write the Manifest

Write the Manifest pretty-printed to `./manifest.json` at the repo root. The file is tracked in git — when invoked from `/postmortem`'s diff-driven refresh, the caller is responsible for staging the updated file so it ships in the same commit as the change that invalidated it.

### 5. Summarize for the user

Print this section only when `--quiet` was **not** passed.

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

## Example Manifest

### Turbo + Next monorepo with a shared React design system (pnpm)

```jsonc
{
  "version": 1,
  "generatedAt": "2030-01-01T00:00:00Z",
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

- The Manifest must reflect **only what was observed**. Never invent fields. Use `null` and `[]` liberally.
- Run filesystem reads in parallel where independent. A typical run completes in under a few seconds.
- Do not interpret the manifest (e.g. recommend changes) here. Discovery is read-only. Other skills consume the manifest and decide what to do.
- If the repo has zero packages with a `package.json`, emit a manifest with `packages: []` and a `notes` entry explaining why, and stop.
