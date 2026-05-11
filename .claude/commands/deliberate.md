---
name: deliberate
description: "Survey the seed against the seven dimensions on which every brief lives or dies, then invite the user to weigh concrete ABCD options—only on the dimensions the seed leaves open. Synthesize their choices into a Brief an executor can act on without further translation. **Mandatory triggers:** 'deliberate this', 'deliberate X', 'help me scope/shape/define X', 'turn this into a brief', 'pin this down', 'I have a vague idea', 'I want to do X but don't yet know what shape it should take'. **Strong triggers** (when the request sits upstream of execution): 'how should I frame X', 'what would the brief look like', 'I'm not sure what I'm asking for yet', 'let's define this before I start', 'what's the actual ask'. **Skip when:** the request is already scoped enough to execute; the question has one obvious answer; the user is choosing between known alternatives (use /council); or the user is stress-testing a drafted plan (use /premortem). **Distinct from /council:** council debates *whether* or *which* (the decision isn't yet made); deliberate produces the brief that defines the work in the first place."
---

# Deliberate

A structured deliberation that sharpens a fuzzy idea into a brief ready for execution. You name the dimensions still in question; the user weighs concrete options on each; together you produce a Brief an executor can act on without further translation. 

Use when the seed is too vague to act on. Skip when scope is already clear, when the choice is *whether* or *which* among known options (use `/council`), or when a plan is drafted and you want to pressure-test it (use `/premortem`).

## Dimensions

Every brief lives or dies on the same seven dimensions. Deliberation pins each one down before the executor touches anything.

- **Outcome** — one sentence describing what "done" means. The brief's north star.
- **Task type** — research, code, writing, analysis, planning, design, automation. Picks the right executor.
- **Scope & depth** — quick vs. exhaustive, one slice vs. the whole space. Bounds the work.
- **Audience** — exactly one consumer. Vague audience produces vague output.
- **Deliverable** — concrete shape and format. "A markdown doc with sections X, Y, Z," not "a writeup."
- **Constraints** — must-haves and must-avoids. Stack, length, tone.
- **Success criteria** — 2–3 checks the user can run against the output. The acceptance test.

Only Open dimensions go to the user. Pinned ones — the dimensions the seed already commits to an answer on — are recorded for the brief, not questioned.

## Arguments

$ARGUMENTS

---

## Flow

### 1. Seed

Read `$ARGUMENTS` and recent conversation for the starting idea. If neither yields anything readable, ask one open question to capture it. Otherwise proceed — do not echo the seed back for confirmation.

### 2. Survey

Walk the seed against the seven dimensions. Mark each:

- **Pinned** — the seed already commits to an answer.
- **Open** — a competent executor would still have to guess.

Only Open dimensions go to the Weigh round. Pinned ones are recorded for the brief.

### 3. Weigh

Use `AskUserQuestion` to put **3–5 questions** to the user, one per Open dimension. Rules:

- Each question carries **2–4 mutually exclusive options** (the tool adds "Other" automatically — never add your own).
- Options are **concrete and distinct** — not "small / medium / large" but "a one-page summary I can skim / a deep technical doc with examples / a runnable prototype".
- Options are **phrased in the user's voice** ("I want X"), not as categories.
- Options are **ordered most-likely-first** based on the seed.
- Use `multiSelect: true` only where multiple answers naturally compose (e.g. constraints, audiences). Default to single-select.
- Batch every question into **one** `AskUserQuestion` call. The user weighs them together.

Bad question (too vague):
> How big should this be? A) Small B) Medium C) Large

Good question (concrete options):
> What does "done" look like for this?
> A) A 1-page summary I can skim in 2 minutes
> B) A detailed brief I can hand to an engineer
> C) A working prototype I can run locally

### 4. Refine (optional)

If an answer opens a new ambiguity that materially changes the brief, ask **one** more focused question. Two rounds maximum — never loop.

### 5. Synthesize

Output the brief directly in chat using this exact structure. Keep each section tight — no filler, no restating the obvious.

```markdown
# Brief: <short title>

## Objective
<One sentence. What success looks like.>

## Context
<2–4 bullets of background the executor needs but wouldn't already know.>

## Scope
- **In:** <what to do>
- **Out:** <what to skip>

## Deliverable
<Concrete shape and format. e.g. "A markdown doc at docs/foo.md with sections X, Y, Z" or "A TypeScript module exporting `fooBar(input): Result`.">

## Constraints
<Bullets. Stack, tone, length, must-haves, must-avoids. Omit section if none.>

## Success criteria
<2–3 bullets the user can check the result against.>

## Handoff
<Name the skill, agent, or person best suited to execute this — e.g. `/ui:component:compose`, `/init`, the `general-purpose` agent, or "the user, working solo". One line on why.>
```

### 6. Offer the handoff

After the brief, ask the user in plain text whether to invoke the named handoff now, route to a different one, or stop here. Never auto-execute — this skill's job ends at the brief.

---

## Worked example (fabricated)

Seed: "I want to write up our caching strategy."

Survey: Task type (writing) and Scope (read-path caching) are Pinned by the seed. Outcome, Audience, Deliverable, Success criteria are Open. Constraints have no signal — skip.

After the Weigh round, the user picks:

- **Outcome** — a reference doc the team can consult
- **Audience** — backend engineers new to the codebase
- **Deliverable** — markdown, roughly three pages
- **Success criteria** — a new hire can answer "what gets cached, for how long, and what invalidates it" without asking

Synthesized brief:

```markdown
# Brief: Read-path caching reference

## Objective
Produce a reference doc that lets a new backend engineer reason about the read-path Redis cache without consulting the team.

## Context
- Read-path cache lives in `services/cache/redis.ts`.
- TTL policy was rewritten last quarter; the old wiki page is stale.
- Write-path queue and CDN cache are explicitly excluded.

## Scope
- **In:** what gets cached, the TTL per key family, what invalidates an entry, the failure mode when Redis is unreachable.
- **Out:** infra setup, capacity planning, cost analysis.

## Deliverable
A markdown doc at `docs/architecture/read-cache.md`, ~3 pages, structured: Overview → Key families → TTL & invalidation → Failure mode → FAQ.

## Success criteria
- A new hire can answer "what gets cached, for how long, and what invalidates it" without asking.
- No reference to deprecated key names (verify against `services/cache/redis.ts` exports).
- <TBD: include sequence diagrams? deferred — author's call>

## Handoff
The `general-purpose` agent, scoped to a single research-and-draft pass — the brief is concrete enough to execute without further clarification.
```

The `<TBD: ...>` line shows how to mark a dimension the user opted out of weighing.

---

## Rules

- **The deliberation is the user's, not yours.** You name the Open dimensions and offer concrete options; the user weighs them. Never invent answers to fill gaps — if a dimension is unclear, ask or mark `<TBD>`.
- **Never write code or take action during deliberation.** This skill produces a brief, nothing else.
- **Don't pad the brief.** If a section has nothing in it, omit the section entirely.
- **Three sharp questions beat seven mediocre ones.** Don't ask about dimensions the seed already settles.
- **No looping.** Two rounds of questions maximum. If the brief is still hazy after two rounds, mark gaps `<TBD>` and synthesize.
- If the user says "just write the brief," stop asking and synthesize from what you have.
