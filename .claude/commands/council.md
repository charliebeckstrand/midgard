# council

TRIGGER when: the user asks to council, war-room, validate, or pressure-test a decision; says "should I X or Y", "which option", "what would you do", "I'm torn"; or plan mode is active for non-trivial work (3+ steps, multiple viable approaches, real tradeoffs). Skip yes/no questions, factual lookups, and planning where the path is obvious.

Run a high-stakes question through 5 independent advisors, have them peer-review each other anonymously, then synthesize a verdict. Adapted from Karpathy's LLM Council using sub-agents instead of separate models.

Use when there's genuine uncertainty and a wrong answer is expensive: audits, non-trivial plans, architectural decisions. Skip for trivia, creation tasks, processing tasks, or planning where the path is obvious.

## Advisors

- **Contrarian** — hunts for the fatal flaw. Assumes the idea is wrong and tries to prove it.
- **First Principles** — ignores the surface question, asks what's actually being solved.
- **Expansionist** — looks for hidden upside. Cares only about what happens if this works.
- **Outsider** — has zero context. Reacts to what's literally in front of them.
- **Executor** — only cares what you do Monday morning. No theory.

## Flow

### 1. Frame

Scan the workspace for context (≤30 seconds): `CLAUDE.md`, `memory/`, referenced files, recent council transcripts, anything obviously relevant. Use `Glob` + `Read`.

Reframe the user's question into a neutral prompt with: the decision, key user context, key workspace context, what's at stake. No opinion, no steering.

If the question is too vague, ask one clarifying question, then proceed.

### 2. Convene (parallel)

Spawn all 5 advisors in parallel. Each gets:

```
You are [Advisor Name] on a Council.
Thinking style: [description above]

Question:
---
[framed question]
---

Respond from your perspective. Be direct and specific. Don't hedge. Lean fully into your angle. Other advisors cover other angles.

150-300 words. No preamble.
```

### 3. Peer review (parallel)

Anonymize the 5 responses as A-E (randomize the mapping). Spawn 5 reviewers in parallel:

```
Five advisors answered this question:
---
[framed question]
---

**Response A:** [response]
**Response B:** [response]
**Response C:** [response]
**Response D:** [response]
**Response E:** [response]

Answer, referencing responses by letter:
1. Which is strongest? Why?
2. Which has the biggest blind spot? What is it missing?
3. What did all five miss?

<200 words. Be direct.
```

### 4. Chairman

One agent gets the framed question, all 5 de-anonymized advisor responses, and all 5 peer reviews:

```
You are Chairman of a Council.

Question:
---
[framed question]
---

ADVISOR RESPONSES:
**Contrarian:** [response]
**First Principles:** [response]
**Expansionist:** [response]
**Outsider:** [response]
**Executor:** [response]

PEER REVIEWS:
[all 5 reviews]

Output exactly this structure:

## Where the Council Agrees
[High-confidence convergence points.]

## Where the Council Clashes
[Real disagreements. Both sides. Why reasonable advisors disagree.]

## Blind Spots the Council Caught
[What only emerged in peer review.]

## The Recommendation
[A direct answer. Not "it depends." Chairman may side with the dissenter if reasoning supports it.]

## The One Thing to Do First
[One concrete next step. Not a list.]

Be direct. Don't hedge.
```

### 5. Report + transcript

Save two files in the workspace:

- `council-report-[timestamp].html` — self-contained HTML, inline CSS, system font stack, clean and scannable. Contains: the question, the chairman's verdict (prominent), an alignment visual showing where advisors agreed/diverged, collapsed-by-default sections for each advisor's full response, a collapsed peer-review section, footer with timestamp. Open it after writing.
- `council-transcript-[timestamp].md` — original question, framed question, all 5 advisor responses, all 5 peer reviews (with anonymization mapping revealed), chairman's full synthesis.

## Rules

- Spawn advisors and reviewers in parallel — never sequentially.
- Anonymize before peer review. Reviewers must not know who said what.
- The chairman may override the majority if the dissenter's reasoning is stronger.
- Don't council trivial questions. If there's one right answer, just answer it.
