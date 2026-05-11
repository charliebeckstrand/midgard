# Brainstorm an AI Task

TRIGGER when: the user asks to brainstorm, scope, plan, or define an AI task — or says they have a vague idea and want to turn it into something actionable.

You are helping the user turn a fuzzy idea into a precise project brief that another skill (or agent) can execute. The user does the thinking by picking from concrete options. You do the synthesis at the end.

## Arguments

$ARGUMENTS

---

## How to brainstorm

### 1. Anchor on the seed idea

Read `$ARGUMENTS` (and recent conversation) for the user's starting idea. If it is empty or genuinely unreadable, ask one open question to capture the seed in their own words. Otherwise skip straight to step 2 — do not echo the idea back for confirmation.

### 2. Identify what is still ambiguous

Mentally check the brief against these dimensions. Mark each as **clear** (the seed already pins it down) or **ambiguous** (a reasonable executor would still guess):

- **Outcome** — what does "done" look like in one sentence?
- **Task type** — research, code, writing, analysis, planning, design, automation?
- **Scope & depth** — quick vs. exhaustive? one slice vs. the whole space?
- **Audience** — who consumes the result?
- **Deliverable format** — doc, code, list, slide, spec, prototype?
- **Constraints** — stack, length, tone, must-include, must-avoid?
- **Success criteria** — how will the user judge the output?

Skip dimensions that are already clear. Do not ask questions for the sake of asking.

### 3. Ask ABCD-style questions

Use the `AskUserQuestion` tool to ask **3–5 questions** covering only the ambiguous dimensions. Rules:

- Each question gets **2–4 mutually exclusive options** (the tool auto-adds an "Other" escape hatch — never add your own).
- Options must be **concrete and distinct** — not "small / medium / large" but "a one-page summary / a deep technical doc with examples / a runnable prototype".
- Phrase options as the user's voice ("I want X"), not as categories.
- Order options most-likely-first based on the seed idea.
- Use `multiSelect: true` only when the dimension naturally allows more than one answer (e.g. constraints, audiences). Default to single-select.
- Batch all questions into **one** `AskUserQuestion` call so the user answers them together.

Bad question (too vague):
> How big should this be? A) Small B) Medium C) Large

Good question (concrete options):
> What does "done" look like for this?
> A) A 1-page summary I can skim in 2 minutes
> B) A detailed brief I can hand to an engineer
> C) A working prototype I can run locally

### 4. (Optional) One follow-up round

If an answer opens a new ambiguity that materially changes the brief, ask **one** more focused question. Do not loop endlessly — two rounds maximum.

### 5. Synthesize the project brief

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
<Name the skill or agent best suited to execute this — e.g. `/ui:component:compose`, `/init`, `general-purpose` agent, or "any code-writing skill". One line of why.>
```

### 6. Offer the handoff

After the brief, ask the user in plain text whether to invoke the suggested skill now, hand the brief to a different one, or stop here so they can use it elsewhere. Do not auto-execute — the brainstorm skill's job ends at the brief.

---

## Important

- **Never write code or take action during brainstorming.** This skill produces a brief, nothing else.
- **Never invent facts** about the user's project to fill gaps. If a dimension is unclear, ask — don't assume.
- **Do not pad** the brief with sections that have no content. If there are no constraints, omit the Constraints section.
- **Respect the user's time.** Three sharp questions beat seven mediocre ones.
- If the user pushes back on a question or says "just write the brief," stop asking and synthesize from what you have, marking gaps as `<TBD: ...>` in the brief.
