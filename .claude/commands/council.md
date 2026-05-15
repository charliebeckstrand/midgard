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

Save two files in the workspace and deliver the HTML to the user via `SendUserFile` (status `normal`, caption naming the topic). Use a single `YYYYMMDD-HHMMSS` timestamp for both filenames.

#### `council-transcript-[timestamp].md`

Plain Markdown. Sections, in order: original question (verbatim), framed question, anonymization mapping table (Letter → Advisor), each advisor's full response under their name, each peer review under its number, chairman's full synthesis. No styling.

#### `council-report-[timestamp].html`

Self-contained — one file, inline `<style>`, no external assets, no scripts. Must render correctly when opened directly in a browser from the filesystem.

**Required structure, in this order:**

1. **Header** — `<h1>` with the topic, meta line beneath with date and (if relevant) git branch in `<code>`.
2. **Question callout** — left-border accent panel containing a one-paragraph distillation of the framed question. This is the only place the question appears in the HTML.
3. **Chairman's Verdict** — bordered panel, the most prominent block on the page. Contains: a one-paragraph lede stating the recommendation, then a sub-panel listing branches/conditions if the recommendation is conditional, then a final highlighted sub-panel for "The one thing to do first."
4. **Alignment visualization** — for each advisor, a row with the advisor's name and a horizontal bar whose fill width represents their conviction toward acting (0–100%). Dissenters use a warm/red gradient; the rest use the cool/green accent gradient. One sentence beneath the bars summarizing the split (e.g. "Four want change; one wants none — the real split is which change").
5. **Where the Council Agrees** — `<ul>` of convergence points.
6. **Where the Council Clashes** — `<h3>` per fight, two-paragraph each (one per side), plus a muted-color sentence explaining why reasonable people disagree.
7. **Blind Spots Peer Review Caught** — `<ul>` of items only surfaced during anonymous review.
8. **Advisor Responses** — five `<details>` panels, collapsed by default. Each `<summary>` shows a `<span class="tag">` with the advisor name (uppercase, letter-spaced) and a one-line gist of their position. The body is the advisor's own response, lightly formatted with paragraphs and lists where appropriate.
9. **Peer Reviews** — one `<details>` panel, collapsed by default, containing all five reviews under `<h3>Reviewer N</h3>` headers with one paragraph each (strongest / blind spot / what all missed).
10. **Footer** — muted, centered, e.g. "Council session — 5 advisors, 5 anonymous peer reviews, 1 chairman synthesis."

**Required styling:**

- Inline `<style>` only. CSS custom properties for theme colors. `@media (prefers-color-scheme: light)` block providing a light-mode palette; default palette is dark.
- System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
- Centered content column, `max-width: 880px`, generous padding (`48px 28px 80px`).
- `<details>` panels: bordered, rounded, custom `+`/`−` indicator on the right of the summary (suppress the default marker via `summary::-webkit-details-marker { display: none }` and `list-style: none`). Body separated from summary by a top border.
- Code spans (`<code>`) get a subtle panel background and rounded corners.
- No emoji. No images. No external fonts.

After writing both files, deliver the HTML via `SendUserFile`.

## Rules

- Spawn advisors and reviewers in parallel — never sequentially.
- Anonymize before peer review. Reviewers must not know who said what.
- The chairman may override the majority if the dissenter's reasoning is stronger.
- Don't council trivial questions. If there's one right answer, just answer it.
