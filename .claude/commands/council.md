# council

TRIGGER when: the user asks to council, war-room, evaluate, or pressure-test a concrete proposal or decision; says "should I X or Y", "which option", "what would you do", "I'm torn"; or plan mode is active for non-trivial work (3+ steps, multiple viable approaches, real tradeoffs). Skip yes/no questions, factual lookups, reversible low-stakes choices, and planning where the path is obvious.

Run a proposal through 5 evaluators using shared lenses, peer-review their evaluations anonymously, then render a verdict. Adapted from Karpathy's LLM Council using sub-agents instead of separate models.

## When to use this vs. siblings

- **Use `council`** when the decision is high-stakes, affects parties beyond the user, has low reversibility, or has multiple non-obvious tradeoffs. Default entry point for serious decisions — triage will route to `debate` if the question turns out lighter.
- **Use `debate`** instead when the decision needs scrutiny but only has one or two real tradeoffs and you want a fast two-party check rather than a full report.
- **Use `deliberate`** after a council or debate when the verdict feels suspiciously clean or blurred, or to vet any decision in plain language without invoking a full council.

## Core principle

The council evaluates a **concrete proposal**, not a topic. All five evaluators examine the same artifact through different lenses. They do not hold assigned stances — none is positionally pro or con. Consensus emerges when it emerges; disagreement surfaces when it's real. The chairman renders a verdict, which may be to reject the proposal outright, and may side with a minority when the minority's reasoning is stronger.

The council is impartial. It does not exist to make the user's proposal work. It exists to evaluate whether it should.

## Flow

### 1. Triage

Before convening, assess whether the question warrants the full protocol:

- **Skip the council and answer directly** if the answer is obvious or has one right answer, the decision is cheaply reversible and low blast-radius, or the user wants factual information rather than evaluation.
- **Ask one clarifying question, then re-triage** if the question is too vague to extract a proposal.
- **Route to `debate`** if the question deserves scrutiny but doesn't warrant a full council — moderate stakes, one or two real tradeoffs, or the user just needs to be rubber-ducked by more than one party. The Supreme Court doesn't hear every case; the council shouldn't either. Tell the user you're routing to debate and why.
- **Continue to step 2** if the question warrants the full council: high stakes, multiple non-obvious tradeoffs, low reversibility, or affects parties beyond the user.

### 2. Frame the proposal

Scan the workspace for context (≤30 seconds): `CLAUDE.md`, `memory/`, referenced files, recent council transcripts, anything obviously relevant. Use `Glob` + `Read`.

Construct a **Proposal Under Review** with these required parts:

- **Proposal** — 1-3 sentences stating what is being proposed. Concrete, not topical.
- **Driver** — the specific friction, opportunity, or goal motivating this consideration. *Why now, why this?* If the user hasn't said and it isn't obvious from context, ask before convening. A proposal without a driver is a proposal in search of a problem.
- **Key assumption** — the central claim the proposal rests on. If this is wrong, the proposal fails.
- **Success criterion** — what observably happens if this works.
- **User's current prior** — what the user currently leans toward, in their own framing.
- **Constraints** — budget, timeline, reversibility, what's been tried, team/context. Surface explicitly; do not assume.

If the user brought a vague question rather than a proposal, draft the proposal yourself and confirm it with the user in one message before convening. The user can amend it. Do not convene without a concrete proposal on the table.

### 3. Convene evaluators (parallel)

Spawn all 5 evaluators in parallel. Each examines the same Proposal Under Review through a different evaluation lens. None is positionally pro or con — all are evaluators of the same object.

- **Assumption** — Is the proposal's central assumption true? What would have to be the case for it to hold? What evidence supports or undermines it?
- **Failure-mode** — Where does this break under real conditions? What's the most likely way it fails, and what's the worst way it fails?
- **Cost** — What does this actually cost in time, attention, reversibility, opportunity, and second-order obligations? Is the cost priced correctly?
- **Counterfactual** — What's the nearest alternative path? Why is the proposal better than that alternative, or is it?
- **Second-order** — If this works, what becomes true downstream? What does it unlock, foreclose, or force?

Each evaluator gets:

```
You are the [Lens Name] evaluator on a Council reviewing a concrete proposal.

Your lens: [lens description above]

You are not positionally pro or con. You are evaluating the proposal through your lens. If your lens reveals the proposal is sound, say so. If it reveals problems, say so. Engage the proposal as it actually is, not as a strawman.

PROPOSAL UNDER REVIEW:
---
[full Proposal Under Review block, including constraints]
---

Respond through your lens. Be direct and specific. Engage the constraints — do not float free of them. If your lens has little to add for this proposal, say so briefly rather than inventing concerns.

150-300 words. No preamble.
```

### 4. Peer review (parallel)

Anonymize the 5 responses as A-E (randomize the mapping). Spawn 5 reviewers in parallel:

```
Five evaluators reviewed this proposal through different lenses:

PROPOSAL UNDER REVIEW:
---
[full Proposal Under Review block]
---

**Response A:** [response]
**Response B:** [response]
**Response C:** [response]
**Response D:** [response]
**Response E:** [response]

Answer, referencing responses by letter:

1. Which response is most useful? Why?
2. Which response has the biggest blind spot or weakest reasoning? What is it missing?
3. Did any evaluator fail to engage the stated constraints? Which one and how?
4. What did all five miss?

<250 words. Be direct.
```

### 5. Chairman verdict

One agent gets the framed proposal, all 5 de-anonymized evaluator responses, and all 5 peer reviews:

```
You are Chairman of a Council. Your job is to render a verdict on the proposal, not to synthesize opinions.

PROPOSAL UNDER REVIEW:
---
[full Proposal Under Review block]
---

EVALUATOR RESPONSES:
**Assumption:** [response]
**Failure-mode:** [response]
**Cost:** [response]
**Counterfactual:** [response]
**Second-order:** [response]

PEER REVIEWS:
[all 5 reviews]

Render a verdict. Your verdict is one of:

- **Proceed** — the proposal is sound. Name any risks worth monitoring.
- **Revise** — the proposal has the right shape but needs specific changes. Name them.
- **Reject** — the proposal should not proceed. Name what should replace it.
- **Fork** — the deliberation surfaced two viable paths (A and B) that depend on a factor the council cannot resolve from outside (user's risk tolerance, team composition, specific context). Name both paths, name the deciding factor, and give the user a concrete way to determine which path applies to them. Use sparingly — most forks are actually unresolved Revises in disguise. If the deciding factor *can* be resolved by the user gathering one piece of information, prefer "Insufficient information" with a request for that information.
- **Insufficient information** — the proposal cannot be evaluated as stated. Name what's missing.

Rules:
- Side with a minority view when the minority's reasoning is stronger. Do not honor positions for their own sake.
- If the evaluators converged on a point, state it as convergence. Do not manufacture disagreement.
- If the evaluators disagreed on something real, state the disagreement and which side is stronger.
- Do not produce a "both sides" verdict. Pick one — unless the deliberation genuinely surfaced a Fork (two paths separated by a factor only the user can resolve), in which case name the fork honestly rather than collapsing it.
- Engage the constraints. A verdict that floats free of the user's situation is not a verdict.

Output exactly this structure, omitting any section that does not apply. The Headline, Cliff Notes, Verdict, and One Thing together must be readable in under a minute — keep them tight. Supporting sections can be longer.

## Headline
[One sentence capturing the entire deliberation. The thing you'd say in a hallway. ≤25 words. Should land even without reading anything else.]

## Cliff Notes
[3-5 bullets condensing the report. Format each as a short labeled bullet:
- **Verdict:** [one phrase]
- **Why:** [one phrase naming the strongest convergence or the deciding consideration]
- **Watch for:** [one phrase naming the biggest risk or blind spot]
- **Do first:** [one phrase naming the next action]
- **If condition X:** [optional — if the verdict has a reframe path, name it]
Keep each bullet ≤15 words.]

## Verdict
[Proceed / Revise / Reject / Fork / Insufficient information, followed by one paragraph stating the verdict and why. Direct, no hedging. ≤120 words (≤180 for Fork, since both paths must be named). If a reframe of the proposal would warrant a different verdict, name it here in one sentence.]

## The One Thing to Do First
[One concrete next step. Not a list. ≤40 words. If a peer reviewer flagged this specific prescription as underspecified, acknowledge inline rather than burying the caveat in blind spots.]

---

## Where the Council Converged
[Points where multiple evaluators independently reached the same conclusion. Omit this section entirely if there was no meaningful convergence.]

## Where the Council Disagreed
[Real disagreements worth surfacing. State both sides and which is stronger and why. Omit if there were no substantive disagreements.]

## Blind Spots Peer Review Caught
[What only emerged in anonymous review. Omit if peer review surfaced nothing material.]

## Risks to Monitor
[Specific risks the user should track. Only include if verdict is Proceed or Revise.]

## Falsifiable Predictions
[1-2 predictions the verdict implies, in the form "If you do X, by Y you will observe Z." These let the user check later whether the council was right.]
```

### 6. Report + transcript

Save two files in the workspace and deliver the HTML to the user via `SendUserFile` (status `normal`, caption naming the topic). Use a single `YYYYMMDD-HHMMSS` timestamp for both filenames.

#### `council-transcript-[timestamp].md`

Plain Markdown. Sections, in order: original question (verbatim), Proposal Under Review (full block including driver and constraints), anonymization mapping table (Letter → Lens), each evaluator's full response under their lens name, each peer review under its number, chairman's full output (Headline, Cliff Notes, Verdict, One Thing, and all supporting sections that applied). No styling.

#### `council-report-[timestamp].html`

Self-contained — one file, inline `<style>`, no external assets, no scripts. Must render correctly when opened directly in a browser from the filesystem.

**Required structure, in this order:**

1. **Header** — `<h1>` with the topic, meta line beneath with date and (if relevant) git branch in `<code>`.
2. **Headline** — large display text, one sentence, the chairman's headline. Sits directly under the header with minimal chrome. This is the first thing the eye lands on.
3. **Cliff Notes** — compact bordered panel directly under the headline. Renders the chairman's Cliff Notes bullets as a clean labeled list. Designed to be skimmed in ~10 seconds and to be copy-pasted into a doc or note.
4. **Proposal Under Review** — bordered panel containing the full proposal block: proposal, driver, key assumption, success criterion, user's prior, constraints. The artifact the council evaluated; gets prominent placement.
5. **Verdict** — the most prominent block on the page (heavier styling than Cliff Notes). Contains: a verdict tag (Proceed / Revise / Reject / Fork / Insufficient information) styled distinctly per verdict type, followed by the chairman's verdict paragraph, then a final highlighted sub-panel for "The one thing to do first." For Fork verdicts, the verdict paragraph is replaced by two side-by-side sub-panels (one per path) with the deciding factor displayed between them.
6. **Council shape** — a compact visualization of how the five evaluators landed, chosen to match the deliberation:
    - **High convergence (≥4 evaluators converged on a single point):** a single tag-style panel naming the convergence (e.g. "Five evaluators converged: the diagnosis is missing"). No bars. The convergence itself *is* the shape.
    - **Proceed** or **Reject** without high convergence: horizontal bars per evaluator showing favorability toward the proposal (0% strongly against → 100% strongly for). Bars use a single neutral gradient — do not pre-color dissenters.
    - **Revise:** not a favorability axis (most evaluators in a Revise verdict agree on direction and disagree on shape). Instead, a compact two-column table — one row per evaluator, columns "Reading" (one phrase: e.g. "Right direction, wrong shape") and "Lever" (the specific thing they'd change). The shape of the disagreement is visible at a glance.
    - **Fork:** a two-column table — one row per evaluator, columns "Leans toward" (path A, path B, or undecided) and "Why." Makes the split visible at a glance.
    - **Insufficient information:** omit this section entirely.
   Beneath whichever variant rendered, one sentence describing the shape of the deliberation.
7. **Where the Council Converged** — `<ul>` of convergence points. **Omit this section entirely if the verdict had no convergence section.**
8. **Where the Council Disagreed** — `<h3>` per disagreement, two paragraphs (both sides), plus a muted-color sentence on which side is stronger and why. **Omit entirely if the verdict had no disagreement section.**
9. **Blind Spots Peer Review Caught** — `<ul>`. **Omit if no blind spots section in verdict.**
10. **Risks to Monitor** — `<ul>`. **Omit if no risks section in verdict.**
11. **Falsifiable Predictions** — `<ul>` of predictions in the form "If X, by Y, Z."
12. **Evaluator Responses** — five `<details>` panels, collapsed by default. Each `<summary>` shows a `<span class="tag">` with the lens name (uppercase, letter-spaced) and a one-line gist of what that lens surfaced. Body is the evaluator's response, lightly formatted.
13. **Peer Reviews** — one `<details>` panel, collapsed by default, containing all five reviews under `<h3>Reviewer N</h3>` headers.
14. **Footer** — muted, centered, e.g. "Council session — 5 evaluators, 5 anonymous peer reviews, 1 chairman verdict. Run `deliberate` on this transcript if the verdict needs interrogation."

**Conditional section rule:** sections 7, 8, 9, 10 are omitted entirely if the chairman's verdict did not include them. The report should reflect the actual shape of the council's deliberation, not a fixed template. If the council converged broadly, the report shows that. If it fragmented, the report shows that.

**Required styling:**

- Inline `<style>` only. CSS custom properties for theme colors. `@media (prefers-color-scheme: light)` block providing a light-mode palette; default palette is dark.
- System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
- Centered content column, `max-width: 880px`, generous padding (`48px 28px 80px`).
- Headline: large display size (≥1.6× body), generous line-height, sits flush with the page rather than in a box.
- Cliff Notes: compact bordered panel with subtle background, slightly tighter line-height than body text. Designed to read as a unit, not as prose.
- Verdict tag: distinct background per verdict type (Proceed = green-tinted, Revise = amber-tinted, Reject = red-tinted, Fork = blue-tinted, Insufficient = muted gray). Verdict block uses a border accent in the matching color and is the heaviest-styled block on the page. For Fork verdicts, the verdict block contains two clearly-separated sub-panels (one per path) with the deciding factor highlighted between them.
- `<details>` panels: bordered, rounded, custom `+`/`−` indicator on the right of the summary (suppress the default marker via `summary::-webkit-details-marker { display: none }` and `list-style: none`). Body separated from summary by a top border.
- Code spans (`<code>`) get a subtle panel background and rounded corners.
- No emoji. No images. No external fonts.

After writing both files, deliver the HTML via `SendUserFile`.

## Rules

- Spawn evaluators and reviewers in parallel — never sequentially.
- Anonymize before peer review. Reviewers must not know which lens produced which response.
- The chairman renders a verdict and may override the majority when the minority's reasoning is stronger.
- The chairman does not manufacture disagreement. If the council converged, the verdict reflects that. The "Where the Council Disagreed" section is omitted when there was nothing to disagree about.
- The chairman does not manufacture consensus either. Real disagreements are surfaced and adjudicated, not averaged.
- Triage out questions that don't warrant the protocol. Route to `debate` when the question deserves scrutiny but not full council ceremony.
- If the question cannot be reduced to a concrete proposal, do not convene. Ask for what's missing.

## Sibling skills

- **`debate`** — lighter-weight two-party scrutiny. Use for moderate-stakes questions that need rubber-ducking by more than one party. Council triage should route here when the question doesn't warrant the full protocol.
- **`deliberate`** — interrogates a council verdict for unearned or blurred consensus, dropped disagreements, post-hoc framing, or misalignment between evaluator content and verdict. Invoke after a council session when the verdict feels suspiciously clean or suspiciously blurred. Can also run standalone on any decision (different structure).