# audit:meta

TRIGGER when: the user asks to audit, review, critique, tighten, polish, or improve the project's **skills** themselves — the files under `.claude/commands/`. Also when the user asks about skill consistency, trigger overlap, prose quality, or whether the Project Profile schema needs new fields.

This is the meta-audit: every other audit looks at code, this one looks at the audits (and every other skill in the catalog). It produces severity-sorted, file:line-anchored findings plus a separate set of cross-cutting recommendations (schema improvements, candidate extractions, vocabulary drift).

## Arguments

$ARGUMENTS

Recognized hints:
- A skill name or path (`/audit:refactor`, `.claude/commands/ui/component/compose.md`) → audit just that skill.
- A heuristic from section 4 → only run that heuristic.
- No arguments → audit every skill under `.claude/commands/`.

---

## 1. Load context

Run these reads in parallel:

- **List of skills** — glob `.claude/commands/**/*.md`. For each, capture path, first heading, the `TRIGGER` line, and total line count.
- **Project Profile schema** — read `.claude/commands/repo/discover.md` and extract the `Project Profile schema` section. This is the **canonical source of truth** for what fields exist; never quote the schema from memory.
- **Conventions** — read `CLAUDE.md` for declared principles (used to weight findings) and the `## Skills` section (used to verify each skill is bound or intentionally optional).

If `.claude/commands/repo/discover.md` does not exist, surface that as the first blocker — every other skill depends on the profile it produces.

---

## 2. Resolve scope

If the user passed a skill name or path, narrow to that file. Otherwise audit every skill in the inventory.

Always include this skill (`audit/meta.md`) in the scope when no argument is passed. Self-audit findings are tagged `(self)` in the output for transparency.

---

## 3. Read each skill carefully

For every skill in scope, read the file end-to-end. Capture:

- Section headers and ordering.
- Whether a `TRIGGER` line exists and where.
- Whether the skill consumes the Project Profile and how.
- Every code example (language, line count, whether it uses real-world identifiers).
- Every reference to another skill (`/foo`, `/foo:bar`).
- Every reference to a profile field (`packages[*].framework`, etc.).

---

## 4. Run the heuristics

Run independent heuristics in parallel. Each produces zero or more findings.

### 4a. Trigger quality

For each skill, evaluate the `TRIGGER` line:

- **Missing trigger** → blocker. Every project skill must declare a trigger so the harness can bind it.
- **Vague trigger** → warning. Phrases like "user wants help" or "general improvements". Triggers must reference a concrete intent verb (`audit`, `recommend`, `scaffold`, `review`) and an object.
- **Project-coupled trigger** → warning. The trigger names a real identifier from this repo (a package name, a recipe name, etc.) — generic skills must phrase triggers in domain terms.
- **Trigger overlap** → warning. Two skills' triggers fire on the same phrasing without a stated disambiguator. Quote the conflicting fragments.

### 4b. Prose quality

Read the body and flag:

- **Padding words** — `simply`, `just`, `really`, `very`, `actually`, `basically`, `essentially`, `obviously`, `clearly`. Each occurrence is a nit.
- **Nominalizations** — `perform an audit` (→ `audit`), `do a review of` (→ `review`), `make a recommendation` (→ `recommend`).
- **Passive voice in instructions** — instructions to the model should be imperative ("Read the file"), not passive ("The file should be read"). Flag passive constructions in numbered/how-to sections.
- **Redundant qualifiers** — `close proximity`, `end result`, `unexpected surprise`, `completely eliminate`, `merge together`.
- **Hedging in mandatory steps** — `consider reading`, `you might want to`, `it may be helpful to`. A skill step is mandatory or it doesn't belong; rewrite or delete.
- **Inconsistent voice** — flag skills that mix imperative ("Read X") and gerund/descriptive ("Reading X") within the same numbered list.

Aggregate per-skill: report counts plus the top 3 worst offenders by line. Don't list every occurrence.

### 4c. Structural conformance

Compare each skill against the catalog's de-facto template:

1. `# <Title>` heading
2. `TRIGGER when:` paragraph
3. Optional `## Arguments` block with `$ARGUMENTS`
4. Optional `---` separator
5. A "Load the Project Profile" or "Load context" step (when the skill consumes the profile)
6. Numbered "How to" sections
7. Optional worked examples
8. An `## Important` (or equivalent) closing section

Flag deviations as warnings: missing `TRIGGER`, missing profile load when the skill clearly needs one, numbered sections in inconsistent ordering across sibling skills, missing `## Important` closing.

### 4d. Project Profile integration

For each skill that mentions the profile:

- **References field that doesn't exist** → blocker. Compare every profile-path reference (e.g. `packages[*].framework`) against the schema extracted in section 1. Typos like `packages[*].frameworks` or stale field names (`packages[*].router`) are common.
- **Re-implements discovery** → warning. The skill greps the lockfile, reads `tsconfig.json`, or parses `turbo.json` itself instead of delegating to `/repo:discover`. The exception is when the data the skill needs is not in the profile — that's a schema-gap finding (section 4e), not a re-implementation finding.
- **Skips the freshness check** → warning. Skills should refresh the profile via `/repo:discover --quiet` when cache is missing or stale, not unconditionally read the JSON. Look for the cache-and-refresh paragraph in each skill that consumes the profile.

### 4e. Profile schema gaps

This heuristic produces **schema improvement** recommendations rather than per-skill findings.

Scan every skill for: "read the linter config", "inspect `tsconfig.json`", "parse `.eslintrc*`", "look at CI config to find <X>", or any other reference to a project artifact that the profile does not currently expose. When a fact is consulted by **two or more** skills, propose adding it to the Project Profile schema.

Output one row per proposed field, listing:
- Field name.
- Suggested location in the schema (root, per-package, etc.).
- Which existing skills would benefit.
- A one-line rationale.

### 4f. Examples quality

For each skill that contains prescriptive guidance:

- **Missing example** → warning. A how-to step that prescribes a pattern (component shape, test shape, recipe shape) without a code example. Examples teach faster than prose; their absence weakens the skill.
- **Real-identifier leak** → blocker. An example that references a real package name, real component name, or real token name from this repo or any other real project. Generic skills must use fabricated identifiers (`Widget`, `formatCurrency`, `SizeProvider`).
- **Bloated example** → nit. Examples longer than ~25 lines that demonstrate one idea — trim to the minimum that conveys the pattern.
- **Outdated example** → warning. Example references an API or pattern the skill itself no longer recommends.

### 4g. Cross-skill consistency

Compare sibling skills (e.g. all `*recommend.md` files, all `audit/*.md` files):

- **Column shape mismatch** — recommenders should use the same column shape (`Name | Target | … | Priority | Rationale`). Flag mismatches.
- **Severity label drift** — one skill uses `blocker / warning / nit`, another uses `critical / major / minor`. Pick one.
- **Vocabulary drift** — sibling skills referring to the same concept with different names ("recipe" vs "variant recipe" vs "styling factory").
- **Heading-level drift** — sibling skills using `###` for the same concept in one file and `##` in another.

### 4h. Redundancy across skills

Find chunks of near-identical prose ≥6 lines that appear in 2+ skills. The "Load the Project Profile" paragraph is a known repeat; flag it only if it has **drifted** (the paragraphs disagree on staleness rules, flag names, or refresh command). Otherwise note the duplication once as a candidate for extraction into a shared preamble file (e.g. `.claude/commands/_preamble.md`).

### 4i. Length appropriateness

- **< 50 lines** → warning. The skill is probably underspecified. Exception: skills that delegate heavily to another skill.
- **> 500 lines** → warning. The skill is probably doing too much. Suggest splitting (e.g. extracting examples or a long catalog into a sibling file).

### 4j. Broken cross-references

Every `/foo` and `/foo:bar` mention in a skill body must resolve to an actual skill in `.claude/commands/` or `.claude/skills/`. Flag dangling references as blockers — they break the catalog's navigation.

Also flag references to skills under their **old** flat names (e.g. `/ui:component` after the rename to `/ui:component:compose`).

### 4k. CLAUDE.md binding coverage

Compare the inventory from section 1 with the `## Skills` section in CLAUDE.md. Flag:

- Skills present in the catalog but not bound in CLAUDE.md → warning. Bindings make triggers reliable.
- Skills bound in CLAUDE.md but no longer present in the catalog → blocker. Dangling binding.
- Skill bound under the wrong path (`/ui:component` instead of `/ui:component:compose`) → blocker.

---

## 5. Score severity

Default severities per heuristic are noted above. Bump one notch when the issue:

- Crosses ≥2 sibling skills (e.g. consistent vocabulary drift).
- Touches the Project Profile (the foundation every other skill depends on).
- Breaks a declared principle from `CLAUDE.md`.

---

## 6. Output

### Per-skill findings

One section per audited skill, sorted alphabetically. Skills with zero findings still appear with a single PASS line — silence is harder to read than an explicit pass.

```
### /ui:component:compose (.claude/commands/ui/component/compose.md · 297 lines)

| Severity | Rule | Location | Suggested fix |
| --- | --- | --- | --- |
| warning | hedging-in-mandatory-step | ui/component/compose.md:128 | replace "you might want to wire" with "wire" — the step is required |
| nit | padding-word | ui/component/compose.md:42, 87, 211 | drop "simply" (3 occurrences) |
```

### Schema improvements (cross-cutting)

Separate table — one row per proposed Project Profile field:

```
| Field | Location | Skills that would benefit | Rationale |
| --- | --- | --- | --- |
| `packages[*].stylingSystem` | per-package | `/ui:component:compose`, `/audit:a11y`, `/audit:refactor` | three skills currently re-detect CVA / tailwind-variants / CSS Modules from devDeps |
| `packages[*].tsStrict` | per-package | `/code-review`, `/audit:refactor` | type-tightness reasoning needs `compilerOptions.strict` and `noUncheckedIndexedAccess` |
```

### Extraction candidates

Separate table — one row per chunk of redundant prose ≥6 lines duplicated in 2+ skills:

```
| Chunk | Occurrences | Suggested action |
| --- | --- | --- |
| "Load the Project Profile" paragraph (~8 lines) | 7 skills | extract to `.claude/commands/_preamble.md` and have each skill reference it, OR keep colocated and add a lint rule to enforce identical wording |
```

### Summary

End with a one-line summary:

```
N skills audited · M findings (B blockers · W warnings · n nits) · S schema proposals · E extraction candidates
```

Verdict at the top of the report:
- **PASS** when no blockers and ≤5 warnings.
- **PASS WITH FINDINGS** when no blockers but >5 warnings.
- **FAIL** when any blocker exists.

---

## 7. Handoffs

Per-skill findings are mechanical — the user (or another agent) applies them directly. The **synthesis** sections (schema improvements, extraction candidates) carry real design tradeoffs and benefit from multiple perspectives.

### Handoffs to offer

`/council` and `/premortem` each spawn ~10 sub-agents. Surface them in the `Next steps:` block and wait for the user to opt in — never invoke them silently from this skill.

- **`/council` on the schema-improvements table** — offer prominently when the table has **≥2 rows**. Expanding the Project Profile is a load-bearing decision: more fields strengthen downstream skills, but `/repo:discover` becomes fatter and more brittle. If the user opts in, pass the table verbatim as the framed question ("Should we add these fields to the Project Profile? Which ones?") with the rationale rows.

  Skip the offer when the table has **0 or 1** rows — a single proposal is a yes/no question, not a council-worthy debate.

After printing the report, append:

> **Next steps:**
> - Run `/council` on the schema-improvements table → debate whether to expand the Project Profile.
> - Run `/council` on extraction candidates → debate DRY vs. colocation for the duplicated chunks.
> - Run `/premortem` before applying schema changes to `/repo:discover` → stress-test the diff before it lands, since the profile is the foundation every other skill consumes.
> - Apply per-skill findings directly — they're mechanical and don't need council.

Only show the lines that apply: drop the schema-council line when the schema table has 0 or 1 rows; drop the extraction line when there are zero candidates; drop the premortem line when no schema changes were proposed. Wait for an explicit go-ahead before firing any of them.

### Don't invoke

- `/deliberate` — the audit's output is concrete findings, not an open-ended idea-generation prompt.
- `/audit:refactor` — it operates on source code, not skill docs.

---

## Worked examples (fabricated)

### Hedging in a mandatory step

Before:

```
### 3. Run the discovery checks

You might want to read `package.json` if the project is a monorepo,
and it could be helpful to look at the linter config.
```

Finding:

```
warning · hedging-in-mandatory-step · widget-audit.md:42 · rewrite as imperative ("Read package.json. Read the linter config.") — step 3 is not optional
```

After:

```
### 3. Run the discovery checks

Read `package.json`. Read the linter config.
```

### Profile field that doesn't exist

Before:

```
Use `packages[*].router` from the profile to pick the routing convention.
```

Finding:

```
blocker · profile-field-missing · ui-route.md:18 · `packages[*].router` is not in the schema (canonical schema is in repo/discover.md). Either remove the reference or propose the field via 4e
```

### Schema-gap recommendation (cross-cutting)

Several skills currently say variants of "scan the linter config for X". This is a schema gap, not a per-skill bug:

```
| `lintRules` | per-package, summarized | `/audit:refactor`, `/audit:a11y` | two skills currently grep `.eslintrc*` / `biome.json` for rule presence; expose a summarized list at discovery time |
```

---

## Important

- This skill **reviews** skills — it does not rewrite them. Findings are recommendations; the user decides what to apply.
- Self-audit findings are tagged `(self)` in the output. Be honest about them; do not soften.
- When proposing schema additions, **never** modify `/repo:discover` directly from this skill — surface the proposal and let the user decide whether to expand the schema.
- Quote the canonical schema from `repo/discover.md` at runtime; never paraphrase the schema from memory, since it drifts.
- This skill is itself subject to the rules it enforces. If it grows past 500 lines or accumulates padding words, the next run should flag it.
