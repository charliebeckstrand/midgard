# premortem

TRIGGER when: a concrete plan exists and is about to execute, and the user asks to premortem, stress-test, pressure-test, or check what could go wrong — "is this plan safe", "what will break", "ready to start?". Skip when no plan exists yet (use `/council` or `/deliberate`), or when the failure mode is already obvious.

Stress-test a drafted plan. Five agents roleplay future-you, two weeks in, narrating a specific failure that already happened. Peer-review anonymously, then synthesize the most likely failure, falsifiable assumptions to verify before starting, and a concrete diff to the plan. Based on Gary Klein's pre-mortem technique.

## Archetypes

Each archetype is a different axis of plan failure:

| Archetype | Failure axis |
|---|---|
| **Scope Creeper** | estimation failure — emergent adjacent work multiplied the change |
| **Boundary Breaker** | structural failure — a cross-package contract, shared component, or CLAUDE.md rule was tripped; some other app broke |
| **Hidden Dependency Hunter** | epistemic failure — a load-bearing assumption was wrong (race, untyped `any`, env config, undocumented invariant) |
| **Point of No Return** | irreversibility failure — data shape, public API, or migration shipped and can't be cleanly rolled back |
| **User-Reality Gap** | intent failure — wrong thing built; requirements misread; success criteria interpreted toward the easy path |

## Flow

### 0. Manifest

Read `./manifest.json`. If missing, silently invoke `/repo:manifest --quiet` to create it.

Check freshness: run `git diff HEAD --name-only` (and `git diff --cached --name-only` if anything is staged). If any path matches `[manifest-invalidators]` (defined at the bottom of `/postmortem`), silently invoke `/repo:manifest --quiet` to refresh, then proceed without staging the refreshed manifest (the user stages it when postmortem runs).

No invalidator → proceed with the existing manifest.

### 1. Resolve input

Find the plan to stress-test, in priority order:

1. A plan pasted inline in the user's message.
2. A file path the user referenced.
3. Otherwise, if `~/.claude/plans/` exists, the most recently modified `.md` file in that directory. Echo the plan's first H1 and path back; ask one beat of confirmation before fanning out.
4. Nothing resolves → ask one clarifying question.

### 2. Frame

Read `CLAUDE.md`, the plan, and any files the plan references. Use `Glob` + `Read`. Reframe into a neutral one-paragraph summary: goal, approach, scope, where the work touches.

### 3. Convene (parallel)

Spawn all 5 archetypes in parallel. Each writes a past-tense Slack message from future-you, two weeks in, after the plan went badly. Each gets the same scaffold with archetype-specific opener and constraint:

```
You are [Archetype Name].

It is two weeks from now. You executed the plan below. It went badly — [archetype-specific opener]. You are writing a Slack message to the team explaining what happened.

PLAN:
---
[framed plan]
---

Write the message. Hard rules:
- Past tense. "I started X, then found Y, then had to also do Z."
- Name the specific step in the plan where the slip began.
- [archetype-specific constraint]
- Quantify the delta (estimate vs actual, files touched, rollback cost).
- End with one sentence: "What I wish I'd checked before starting was ___."

No risk lists. No "this could happen." It already happened. You are reporting, not predicting.

180–260 words. No preamble.
```

Archetype-specific openers and constraints:

| Archetype | Opener | Constraint |
|---|---|---|
| **Scope Creeper** | *"your estimate was 4× off and you're behind, mid-flight, with the change half-done."* | name the concrete adjacent work that wasn't in the plan but turned out to be required (a refactor, test infra fix, type migration, missing fixture) |
| **Boundary Breaker** | *"a shared module, cross-package contract, or CLAUDE.md rule was tripped and another app's tests now fail."* | name the specific shared module / package / rule that was violated and which downstream consumer broke |
| **Hidden Dependency Hunter** | *"a load-bearing assumption in the plan turned out to be wrong at runtime."* | name the assumption, where you read or inferred it, and how it actually behaved |
| **Point of No Return** | *"the change shipped, then the bug surfaced, and you couldn't cleanly roll back."* | name the irreversible artifact (data shape, public API, migration, file format) and the rollback cost |
| **User-Reality Gap** | *"you shipped it and the user said 'that's not what I asked for.'"* | quote the user's reaction and name the specific success criterion that was misinterpreted |

### 4. Peer review (parallel)

Anonymize the 5 narratives as A–E. Record the A–E → archetype mapping before spawning reviewers; reuse it verbatim in §6's transcript. Spawn 5 reviewers in parallel:

```
Five future-you agents reported failures of this plan:
---
[framed plan]
---

**Narrative A:** [narrative]
**Narrative B:** [narrative]
**Narrative C:** [narrative]
**Narrative D:** [narrative]
**Narrative E:** [narrative]

Answer, referencing narratives by letter:
1. Which failure is most likely to actually bite this plan? Why?
2. Which is least credible — overdramatized or off-target? Why?
3. What did all five miss?

<200 words. Be direct.
```

### 5. Examiner

One agent gets the framed plan, all 5 de-anonymized narratives, and all 5 peer reviews:

```
You are the Examiner of a Premortem.

Plan:
---
[framed plan]
---

NARRATIVES:
**Scope Creeper:** [narrative]
**Boundary Breaker:** [narrative]
**Hidden Dependency Hunter:** [narrative]
**Point of No Return:** [narrative]
**User-Reality Gap:** [narrative]

PEER REVIEWS:
[all 5 reviews]

Output exactly this structure:

## Most Likely Failure
[One paragraph. Name the failure and its mechanism. Not "it depends".]

## Other Real Risks
[Ranked by likelihood × blast radius. ≤4 bullets.]

## Assumptions to Verify
[Falsifiable yes/no questions answerable in ≤10 minutes of grep or doc lookup. ≤6 bullets. If you can't phrase it as a yes/no the user can answer with one lookup, it's a Risk, not an Assumption.]

## Plan Diff
[Concrete edits to the plan as `+ add: …`, `- remove: …`, `~ change: …` bullets. Patch-style, not prose.]

## The One Thing to Verify Right Now
[One concrete next step. Not a list.]

Be direct. Don't hedge.
```

### 6. Report + transcript

Save two files to cwd. Capture the filename timestamp via `date +%Y%m%d-%H%M%S` at the start of this step and reuse for both filenames.

- `premortem-report-[timestamp].html` — self-contained HTML, inline CSS, system font stack, clean and scannable. Contains: the framed plan, the Examiner verdict (prominent), an alignment matrix (5-row table: archetypes vs. shared failure themes; X-marks which archetypes raised which theme), collapsed-by-default sections for each archetype's full narrative, a collapsed peer-review section, footer with timestamp. Open it after writing.
- `premortem-transcript-[timestamp].md` — original input, framed plan, all 5 narratives, all 5 peer reviews (with anonymization mapping revealed), Examiner's full synthesis.

## Rules

- Spawn archetypes and reviewers in parallel.
- Anonymize before peer review. Reviewers must not know which archetype wrote which narrative.
- Past tense, always. Narratives report failures that already happened; they don't predict.
- The Examiner may override the loudest narrative when peer reviews show it's overdramatized. When overriding, name the replacement explicitly in Most Likely Failure — don't hedge between them.
- Don't premortem trivial plans. If the failure mode is obvious or the plan is a one-line change, skip.
- When no concrete plan exists, recommend `/council` (decision still open) or `/deliberate` (idea still vague) and wait for the user to confirm. Never auto-invoke either.
