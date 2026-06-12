# Boundary enforcement via Biome

Lint-time replacement for the regex-over-source boundary tests in
`src/__tests__/*/boundary/`. Violations surface as red squiggles in the editor
(Biome LSP) and as `biome check` errors, instead of Vitest failures at commit
time. Same contracts, earlier feedback.

## Architecture

Three tiers, by what each mechanism can express:

1. **`noRestrictedImports` overrides** ([`../biome.json`](../biome.json)) — all
   directional layer rules. Each layer directory gets an override block whose
   `patterns.group` globs match forbidden import specifiers; sanctioned files
   (e.g. `core/create-context.ts`, `recipes/kata/*`) get later blocks that
   restate the rule minus the lifted restriction. Biome overrides do not
   deep-merge rule options — the last matching block that configures a rule
   wins wholesale — so every block is self-contained.
2. **GritQL plugins** (`*.grit` in this directory) — everything the built-in
   rule can't say: value-vs-type import discrimination, filename-dependent
   rules, banned identifiers, JSX + directive co-occurrence, string-literal
   content. Plugins are attached per-scope via override `plugins`; lists
   accumulate across matching overrides.
3. **Vitest** (retained) — what lint can't reach: `package.json` exports
   hygiene, filename↔export-symbol matching, and the affix-compensation
   invariant (a value-level test, not a source scan).

## Rule map

| Boundary test | Replacement |
| --- | --- |
| `hook-purity` | override `src/hooks/**` patterns |
| `primitive-purity` | override `src/primitives/**` patterns |
| `kiso-boundary` | override `src/recipes/kiso/**` patterns |
| `katakana-purity` | override `src/recipes/katakana/**` patterns (bans type imports too, as before) |
| `kata-boundary` (defineRecipe funnel) | base pattern `**/core/recipe` + `importNamePattern`, lifted in kata/katakana/layout-variants blocks |
| `create-context` | base `paths.react.importNames`, lifted in `core/create-context.ts` block |
| `component-ma` | components pattern `importNamePattern: "Ma"`, lifted in `variants.ts` block |
| `component-recipe` / `primitive-recipe` (kata funnel) | katakana/kiso globs (built-in) + `recipes-value-import.grit` (type-only barrel) |
| `component-boundary` #1 (own-kata barrel) | `component-barrel.grit` |
| `component-boundary` #2 (deep sibling main) | `sibling-main-import.grit` |
| `component-boundary` #3 ('use client') | `use-client-context.grit` |
| `data-slot` | `data-slot.grit` |
| `hook-type-name` | `use-prefixed-type.grit` |
| `spacing-boundary` | `spacing.grit` (calc allowlist lives in the plugin) |
| `recipe-boundary` #2 (barrel re-export ban) | override `src/recipes/index.ts` patterns |
| `recipe-boundary` #3 (types-only barrel) | `types-only-barrel.grit` |
| `recipe-boundary` #4 (no external `ui/recipes`) | root `biome.json` override on `apps/**` + sibling packages |
| `recipe-boundary` #1 (package.json exports) | **keep in Vitest** |
| `component-filename-boundary` | **keep in Vitest** |
| `affix-compensation-boundary` | **keep in Vitest** (value invariant, not a source scan) |

## Validation record (Biome 2.4.16)

Verified empirically before adoption:

- Zero diagnostics on the existing (test-green) tree; full-repo `biome check`
  cost moves ~1.2s → ~2.0s with all plugins on.
- One fixture violation per rule fires with the expected span; type-only
  imports, sanctioned files, own-kata re-exports, and `'use client'`-carrying
  providers all pass as negatives.
- Override cascade replaces rule options per scope (proved by the
  `variants.ts` Ma exemption); plugin lists accumulate across scopes.
- `export … from` (star, named, `type`) is covered by `noRestrictedImports`.
- GritQL: Biome CST node names (`JsImport`, `TsInterfaceDeclaration(id = $x)`,
  …) with field arguments work; `$filename`, regex captures
  (`r"…"($a, $b)`), metavariable equality, and `$program <: not contains …`
  work. Snippet metavariables do **not** bind against node lists (multi-name
  imports, interface bodies) — use node patterns, not snippets, for anything
  list-shaped. Token fields (`type_token`) are not queryable — discriminate
  `import type` by regexing the bound clause/specifier text.

## Known deltas from the test suite

- *Tightened:* kiso's upward ban now also catches `'../kata/x'` /
  `'../katakana/x'` spellings; the old regexes required `/recipes/` in the
  specifier and missed them.
- *Pre-existing gap kept:* an import of `'./recipe'` from inside `core/`
  escapes the defineRecipe funnel glob, exactly as it escaped the old regex.
- *Sub-kata depth:* `component-barrel.grit` accepts `<name>-<seg>` and
  `<name>-<seg>-<seg>` sub-kata; deeper suffixes need another arm (none exist).
- *`use client` placement:* the plugin accepts the directive anywhere in the
  module prologue rather than literally first-character.

## Invocation contract

Package lint scripts must **not** pass a relative `--config-path`: Biome
resolves override globs against the config file's directory only when the
config is auto-discovered or given as an absolute path; with a relative
`--config-path` the globs silently stop matching and every override goes
dead. Auto-discovery walks up from cwd, finds this package's `biome.json`
(`"root": false, "extends": "//"`), and inherits the root config.

## Migration (pending)

Once trusted, delete the 13 superseded boundary test files, slim
`recipe-boundary.test.ts` to the `package.json` exports check, and keep
`component-filename-boundary` and `affix-compensation-boundary` as-is.
Until then both systems run; they agree on the current tree.
