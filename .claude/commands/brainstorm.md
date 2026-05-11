---
name: brainstorm
description: "Turn a fuzzy idea into a precise brief an executor — another skill, an agent, or the user themselves — can act on without further translation. The user does the thinking by choosing from concrete ABCD options; you synthesize the brief at the end. MANDATORY TRIGGERS: 'brainstorm this', 'brainstorm X', 'help me scope X', 'help me shape X', 'help me define X', 'turn this into a brief', 'I have a vague idea', 'I want to do X but don't yet know what shape it should take'. STRONG TRIGGERS (when the request is upstream of execution): 'how should I frame X', 'what would the brief look like', 'I'm not sure what I'm asking for yet', 'let's define this before I start'. SKIP for: requests already scoped enough to execute, questions with one obvious answer, decisions between known alternatives (use /council), or stress-testing a drafted plan (use /premortem). Distinct from /council: council debates *whether* or *which* among known options; brainstorm produces the brief that defines the work in the first place."
---

# Brainstorm

Walk the user through 3–5 concrete ABCD-style questions to pin down what "done" looks like — outcome, scope, audience, deliverable, success criteria — then synthesize their picks into a Project Brief precise enough to hand off without further clarification.

Use when the user starts with a fuzzy idea and can't yet describe the deliverable in one sentence. Skip if the request is already scoped enough to execute, if the question is *whether* or *which* among known options (use `/council`), or if a plan is already drafted and the question is whether it will work (use `/premortem`).

## Arguments

$ARGUMENTS

---

## Flow

### 1. Anchor on the seed

Read `$ARGUMENTS` and recent conversation for the user's starting idea. If it is empty or unreadable, ask one open question to capture the seed in their own words. Otherwise skip straight to step 2 — do not echo the idea back for confirmation.

### 2. Identify what is still ambiguous

Check the seed against these dimensions. Mark each as **clear** (already pinned down) or **ambiguous** (a reasonable executor would still have to guess):

- **Outcome** — what does "done" look like in one sentence?
- **Task type** — research, code, writing, analysis, planning, design, automation?
- **Scope & depth** — quick vs. exhaustive? one slice vs. the whole space?
- **Audience** — who consumes the result?
- **Deliverable format** — doc, code, list, slide, spec, prototype?
- **Constraints** — stack, length, tone, must-include, must-avoid?
- **Success criteria** — how will the user judge the output?

Skip dimensions already pinned down. Do not ask questions for the sake of asking.

### 3. Ask ABCD-style questions

Use `AskUserQuestion` to ask **3–5 questions** covering only the ambiguous dimensions. Rules:

- Each question carries **2–4 mutually exclusive options** (the tool auto-adds an "Other" escape hatch — never add your own).
- Options must be **concrete and distinct** — not "small / medium / large" but "a one-page summary / a deep technical doc with examples / a runnable prototype".
- Phrase options in the user's voice ("I want X"), not as categories.
- Order options most-likely-first based on the seed.
- Use `multiSelect: true` only when the dimension naturally admits more than one answer (e.g. constraints, audiences). Default to single-select.
- Batch all questions into **one** `AskUserQuestion` call so the user answers them together.

Bad question (too vague):
> How big should this be? A) Small B) Medium C) Large

Good question (concrete options):
> What does "done" look like for this?
> A) A 1-page summary I can skim in 2 minutes
> B) A detailed brief I can hand to an engineer
> C) A working prototype I can run locally

### 4. (Optional) One follow-up round

If an answer opens a new ambiguity that materially changes the brief, ask **one** more focused question. Two rounds maximum — never loop.

### 5. Synthesize the brief

Output the brief directly in the chat using this exact structure. Keep each section tight — no filler, no restating the obvious.

```markdown
# Project Brief: <short title>

## Objective
<One sentence. What success looks like.>

## Context
<2–4 bullets of relevant background the executor needs but wouldn't know.>

## Scope
- **In:** <what to do>
- **Out:** <what to skip>

## Deliverable
<Concrete shape and format. e.g. "A markdown doc at docs/foo.md with sections X, Y, Z" or "A TypeScript module exporting `fooBar(input): Result`.">

## Constraints
<Bullets. Stack, tone, length, must-haves, must-avoids. Omit section if none.>

## Success criteria
<2–3 bullets the user can check the result against.>

## Suggested handoff
<Name the skill, agent, or person best suited to execute this — e.g. `/ui:component:compose`, `/init`, the `general-purpose` agent, or "the user, working solo". One line of why.>
```

### 6. Offer the handoff

After the brief, ask the user in plain text whether to invoke the suggested skill now, hand the brief to a different one, or stop here so they can use it elsewhere. Do not auto-execute — this skill's job ends at the brief.

---

## Worked example (fabricated)

Seed: "I want to write up our caching strategy."

After two rounds of ABCD questions the user picks:

- **Outcome** — a reference doc the team can consult
- **Scope** — only the read-path cache (Redis); the write-path is out
- **Audience** — backend engineers new to the codebase
- **Deliverable format** — markdown, roughly three pages
- **Success criteria** — a new hire can answer "what gets cached, for how long, and what invalidates it" without asking

Synthesized brief:

```markdown
# Project Brief: Read-path caching reference

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

## Suggested handoff
The `general-purpose` agent, scoped to a single research-and-draft pass — the brief is concrete enough to execute without further clarification.
```

The `<TBD: ...>` line demonstrates how to mark a deferred dimension when the user opts out of a follow-up question.

---

## Rules

- **Never write code or take action during brainstorming.** This skill produces a brief, nothing else.
- **Never invent facts** about the user's project to fill gaps. If a dimension is unclear, ask — don't assume.
- **Do not pad** the brief with empty sections. If there are no constraints, omit the Constraints section.
- **Respect the user's time.** Three sharp questions beat seven mediocre ones.
- If the user pushes back on a question or says "just write the brief," stop asking and synthesize from what you have, marking gaps as `<TBD: ...>` in the brief.
