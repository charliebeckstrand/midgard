# skill:compose

TRIGGER when: the user asks to compose, scaffold, create, add, draft, or author a new project skill — a file under `.claude/commands/`. Also when the user asks how to extend the skill catalog or add a new project-level slash command.

You are scaffolding a new skill that will live alongside the existing ones in `.claude/commands/`. The new file must read like it was written by the same hand that wrote the rest of the catalog. The final step of this skill is a self-audit that blocks completion until the draft passes the catalog's own quality bar.

## Arguments

$ARGUMENTS

Recognized hints:
- A bare slug (`scaffold`, `forge`, `audit:foo`) → seed the new skill's name.
- A slug plus a one-line intent (`compose "scaffold new skills"`) → seed both name and purpose.
- No arguments → ask for the seed in step 1.

---

## 1. Anchor on the seed

Read `$ARGUMENTS` for a proposed slug and (optionally) a one-line intent. If both are present, skip ahead. If anything is missing, use `AskUserQuestion` to capture only what's missing — slug, namespace, and a one-sentence intent. Do not ask anything you can derive from later steps.

Validate the slug:
- Top-level slug → single token, lowercase, hyphenated only when one word does not fit (`code-review`).
- Namespaced slug → `<namespace>:<leaf>`. The namespace must already exist as a sibling directory under `.claude/commands/`, or the new namespace must be a clear, distinct boundary you can name in one sentence.

Resolve the file path:
- Top-level → `.claude/commands/<slug>.md`.
- Namespaced → `.claude/commands/<namespace>/<leaf>.md`.

Refuse to overwrite an existing file. If the path exists, surface the collision and ask whether to pick a new slug or edit the existing skill instead.

## 2. Sample the catalog

Glob `.claude/commands/**/*.md`. Read 2–3 sibling skills end-to-end:
- The skill nearest the proposed namespace (for `audit:foo`, read `audit/a11y.md` and `audit/refactor.md`).
- One top-level reference skill (`repo/discover.md` or `deliberate.md`) for default voice and structure.

From the samples, capture as working notes — do not echo to the user:
- Opener style: bare `# Title` + `TRIGGER when:` paragraph, or YAML frontmatter. Match the dominant pattern in the catalog; surface drift in the final summary if both forms exist.
- Section ordering: which numbered steps recur (`Load the Project Profile`, `Resolve scope`, `Run the heuristics`, `Output`, `Important`).
- Severity labels: `blocker / warning / nit` is the catalog's current scheme.
- Recommendation-table columns: recommenders use `Name | Location | Pattern | Impact | Effort | Priority | Rationale`.
- Voice: imperative, second person, no hedging, no padding.

## 3. Shape the new skill

Use `AskUserQuestion` to pin the dimensions that materially change the scaffold. Batch into one call. Skip any dimension already pinned by `$ARGUMENTS` or by the namespace's siblings:

- **Profile dependency** — does the skill consume `.claude/cache/project-profile.json`?
- **Output shape** — prose report, ranked findings table, scaffolded files, or in-place fix?
- **Findings & severities** — does it produce findings? If yes, default to `blocker / warning / nit` unless siblings disagree.
- **Handoffs** — does it auto-invoke another skill (`/tests:compose`, `/skill:audit`, `/council`, `/premortem`)?
- **Arguments** — does it accept `$ARGUMENTS`? Which hints does it recognize?

Two rounds maximum. If the user says "just write it," synthesize from defaults and mark gaps as `<TBD>` placeholders in the draft.

## 4. Compose the file

Write the new skill to the resolved path using the catalog's de-facto template. Sections in this order, omitting any that do not apply:

1. `# <Title Case Heading>` — the display name, not the slug.
2. `TRIGGER when: …` — one paragraph. Reference at least one concrete intent verb (`audit`, `recommend`, `scaffold`, `compose`) and the object the skill acts on. Phrase generically — never name a real package, recipe, or component from this repo in a generic skill's trigger.
3. One-paragraph framing of what the skill produces and what makes it different from siblings.
4. `## Arguments` block with `$ARGUMENTS` (only if step 3 said the skill takes arguments).
5. `---` separator.
6. Numbered `## N. <verb-phrase>` sections. The first numbered section loads the Project Profile when step 3 said the skill needs it; copy the standard load-and-refresh paragraph from `code-review.md` step 0 verbatim — drift in this paragraph is what `/skill:audit` flags.
7. Optional `## Worked examples (fabricated)` section. Use fabricated identifiers (`Widget`, `formatCurrency`, `SizeProvider`) — never real names from this repo or any other real project.
8. `## Important` closing section: 3–6 bullets stating non-obvious invariants and what the skill must not do.

Voice rules while writing:
- Imperative second person ("Read the file", not "The file should be read" or "Reading the file").
- No padding words: `simply`, `just`, `really`, `very`, `actually`, `basically`, `essentially`, `obviously`, `clearly`.
- No hedging in mandatory steps: rewrite `you might want to <verb>` as `<verb>`, or delete the step.
- One idea per sentence. No nominalizations (`perform an audit` → `audit`).
- Code examples ≤25 lines, demonstrating one idea each.

Cross-references to other skills must use the live form (`/skill:audit`, not `/audit-meta`). Every `/foo` mention must resolve to a file under `.claude/commands/`.

## 5. Wire the CLAUDE.md binding

Open `CLAUDE.md` and append a binding paragraph to the `## Skills` section, following the existing prose pattern:

> When asked to <intent>, always use the `/<slug>` skill. <One sentence on what it does and when it returns control.>

Preserve clustering when siblings are grouped (e.g. all `audit:*` bindings sit together). Skills bound in CLAUDE.md but missing from the catalog (or vice versa) are blockers per `/skill:audit` heuristic 4k — keep the two in sync.

If the user explicitly opts out of binding, skip this step and note it in the final summary so they remember to wire it later.

## 6. Self-audit

This is the consistency-and-quality directive. Invoke `/skill:audit <path-to-new-skill>` and read the verdict:

- **PASS** → done. Print the path, a one-line summary of what was scaffolded, and the binding line added to `CLAUDE.md`. Surface any warnings the audit reported but do not block on them.
- **PASS WITH FINDINGS** → resolve the warnings in the draft, or have the user explicitly waive each one, then re-run `/skill:audit` on the file until the verdict reaches PASS.
- **FAIL** → blockers exist. Fix every blocker in-loop and re-audit. Do not return control to the user until the verdict is PASS or PASS WITH FINDINGS.

Do not skip this step. The catalog's quality bar is whatever `/skill:audit` enforces; a scaffold that bypasses it drifts from the rest of the catalog by definition.

---

## Important

- The new skill must read like a sibling, not a stranger. When a stylistic preference disagrees with the catalog, follow the catalog.
- Never invent project facts to fill the body. If a section needs project-specific content the user has not supplied, mark it `<TBD>` and surface the gap in the final summary.
- Never invent new severity labels, table columns, or section headings when the catalog already settled them. Propose new shapes as a separate question — do not sneak them into a scaffold.
- The CLAUDE.md binding is part of the deliverable, not a follow-up. `/skill:audit` heuristic 4k flags missing bindings.
- Self-audit is not optional. A "good enough" scaffold that fails `/skill:audit` is not done.
