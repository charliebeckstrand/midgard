# deliberate

TRIGGER when: a council or debate produced a verdict that feels suspiciously clean (too-fast consensus), suspiciously blurred (consensus claimed but reasoning doesn't support it), or where the user wants the verdict itself interrogated rather than accepting it; also when a user wants careful scrutiny of any decision standalone (no prior council). Skip yes/no questions, settled matters, and routine choices.

Interrogate a verdict — or a decision — for the quality of its reasoning, not just its conclusion. Two modes: **post-council** (audits a prior verdict, technical register) and **standalone** (vets a decision from scratch, plain-language register).

## When to use this vs. siblings

- **Use `deliberate` (post-council mode)** after a `council` or `debate` session when the verdict feels suspiciously clean (too-fast consensus), suspiciously blurred (consensus claimed but reasoning doesn't support it), or when you want the verdict audited rather than accepted at face value.
- **Use `deliberate` (standalone mode)** when you want careful, plain-language scrutiny of a decision but don't need the full ceremony of a council or the structured exchange of a debate. Think of it as a lawyer talking to a client rather than convening a court.
- **Use `council`** instead if the decision is high-stakes and hasn't been examined yet — deliberate audits or advises but does not replace the council's verdict-rendering job.
- **Use `debate`** instead if you want a two-party exchange to surface tradeoffs you haven't yet considered.

## Core principle

A conclusion is only as good as the reasoning that produced it. Deliberate's job is not to render a new verdict — it is to check whether the existing one was *earned*. Convergence can be cargo-culted. Disagreement can be smoothed over. Drivers can be post-hoc. Verdicts can drift from the evaluator content they claim to synthesize. Deliberate audits for these failure modes and reports what it finds.

Modeled on a lawyer's role: rigorous, evidence-based, willing to say the case is weaker than it looks — or stronger. Speaks to the client (standalone mode) in language they understand. Speaks to other lawyers (post-council mode) with the technical vocabulary of the deliberation itself.

## Mode selection

Determine mode from context:

- **Post-council mode** — invoked on a prior council or debate transcript. The user names a session, references a verdict, or invokes after `council`/`debate` has run. Audit the transcript directly.
- **Standalone mode** — invoked on a decision with no prior council/debate. The user wants careful scrutiny but doesn't need full ceremony. Frame and audit in plain language.

If the mode is ambiguous, ask once: "Are you asking me to audit a prior council session, or vet a decision from scratch?"

---

## Post-council mode

Audits an existing transcript for reasoning quality. Technical register — assumes the user knows what evaluators, peer reviews, and verdicts are.

### 1. Locate and load the transcript

Find the council transcript (`council-transcript-[timestamp].md`) or debate output (`debate-[timestamp].md`) in the workspace. If the user named a topic but not a file, glob for recent transcripts and confirm which one to audit.

If no transcript exists but the user is referencing a recent session, ask the user to identify it.

### 2. Audit the deliberation

Audit the transcript against the following failure modes. For each, gather evidence from the transcript and form a judgment.

**No finding is a valid result for any individual failure mode, and for the audit as a whole.** The seven modes are a checklist of things to look for, not a quota to fill. A well-run council will produce zero or one findings, not seven. Padding the audit with weak findings to make the checklist feel complete dilutes the strong findings and trains the user to discount the audit. If a failure mode does not apply, say so in one phrase and move on. If the entire audit produces no material findings, the verdict is "Accept" and the audit is short — that is the correct outcome for a well-reasoned verdict, not a sign that the audit failed.

**Failure mode 1: Unearned consensus.** Did the verdict claim convergence that the evaluator content doesn't actually support? Check that each claimed convergence point appears in at least 2-3 evaluator responses with *independent reasoning paths* — not just similar phrasing. Multiple evaluators reaching the same conclusion via the same reasoning is one path, not many.

**Failure mode 2: Blurred or smoothed consensus.** Did real disagreements get averaged into a centrist verdict rather than adjudicated? Look for evaluator responses that took materially different positions and check whether the verdict picked one or split the difference. Splitting the difference is the failure mode `council` was rewritten to prevent.

**Failure mode 3: Dropped dissent.** Did a peer reviewer or evaluator raise a substantive concern that the chairman did not engage? Trace any concern that appears in evaluator or peer-review content but is absent from the verdict, blind-spots, or risks sections.

**Failure mode 4: Post-hoc driver.** Was the Driver field substantive, or was it back-filled to match a conclusion the user already wanted? A weak driver looks like a restated symptom, a vague goal, or "I've been thinking about this." A strong driver names a specific friction, opportunity, or constraint with concrete shape.

**Failure mode 5: Verdict-content drift.** Does the verdict actually follow from the evaluator content, or has it drifted? Compare the verdict's claims to what the evaluators actually said. The verdict may have absorbed claims that no evaluator made, or omitted claims central to the strongest evaluator response.

**Failure mode 6: Misaligned One Thing.** Does "The One Thing to Do First" follow from the verdict and the strongest evaluator content, or is it a generic next step that doesn't engage the specific reasoning? A misaligned One Thing is often the tell that the chairman defaulted to a template rather than reasoning from the specific deliberation.

**Failure mode 7: Buried strongest point.** Sometimes the strongest evaluator point — the one most likely to change the user's mind — is acknowledged but de-emphasized in the verdict. Identify the single strongest point from the evaluators and peer reviews, and check whether the verdict surfaces it proportionally.

### 3. Render an audit

Output exactly this structure. Omit any section where no finding applies.

```
## Headline
[One sentence stating whether the verdict was earned, partially earned, or unearned. Direct.]

## Audit Summary
- **Verdict under review:** [Proceed / Revise / Reject / Insufficient information] — [one phrase of what was recommended]
- **Audit outcome:** [Earned / Partially earned / Unearned / Cannot determine]
- **Strongest concern:** [one phrase naming the biggest issue with the deliberation, or "None" if clean]
- **Strongest defense:** [one phrase naming why the verdict held up under audit, or what specifically was solid]

## Findings
[For each failure mode where evidence was found, one labeled subsection with:
- What the failure mode was
- The specific evidence in the transcript (quote or reference)
- Why it matters for the verdict's reliability]

## What the Verdict Got Right
[Acknowledge what the deliberation did well. Audit is not adversarial — solid reasoning gets noted.]

## Recommendation
One of:
- **Accept the verdict** — audit found no material issues. Brief, ≤60 words.
- **Accept with caveats** — verdict stands but specific findings should be considered alongside it. Name them. ≤120 words.
- **Re-run council with a revised Proposal Under Review** — verdict is unsafe to act on; propose specifically what should change in the framing (sharper driver, surfaced constraint, different proposal shape). ≤120 words.
- **Re-run council with a different angle** — the proposal was framed but the evaluator lenses missed something specific. Name what. ≤120 words.
```

### 4. Output

Save two files in the workspace and deliver the HTML to the user via `SendUserFile` (status `normal`, caption naming the topic of the audited deliberation). Use a single `YYYYMMDD-HHMMSS` timestamp for both filenames.

#### `deliberate-audit-[timestamp].md`

Plain Markdown. The audit content as specified in step 3, verbatim. No styling.

#### `deliberate-audit-[timestamp].html`

Self-contained — one file, inline `<style>`, no external assets, no scripts. Must render correctly when opened directly in a browser from the filesystem.

**Required structure, in this order:**

1. **Header** — `<h1>` "Council Audit" (or the topic of the audited deliberation if it is known), meta line beneath with date and, if relevant, git branch in `<code>`.
2. **Headline** — large display text, one sentence, the audit's headline. Sits directly under the header with minimal chrome. The first thing the eye lands on.
3. **Audit Summary** — compact bordered panel directly under the headline. Renders the four labeled bullets (Verdict under review, Audit outcome, Strongest concern, Strongest defense) as a clean labeled list. Designed to be skimmed in ~10 seconds and to be copy-pasted into a doc or note.
4. **Verdict Under Review** — bordered panel containing the original verdict that was audited (verdict type and what was recommended). Provides the artifact context, parallel to council's Proposal Under Review.
5. **Audit Outcome** — the most prominent block on the page (heavier styling than Audit Summary). Contains: an outcome tag (Earned / Partially earned / Unearned / Cannot determine) styled distinctly per outcome, followed by the recommendation paragraph (Accept the verdict / Accept with caveats / Re-run council with a revised Proposal Under Review / Re-run council with a different angle), then a final highlighted sub-panel naming the concrete next action.
6. **Findings** — `<h3>` per finding, body containing the failure-mode name, the specific transcript evidence (rendered in a `<blockquote>` or quote-styled element), and why it matters for the verdict's reliability. **Omit this section entirely if the audit found no failures.**
7. **What the Verdict Got Right** — `<ul>` of points the deliberation handled well. **Omit if step 3 produced nothing to acknowledge.**
8. **Footer** — muted, centered, e.g. "Deliberate audit — seven failure modes checked. Re-run `council` with a revised Proposal Under Review if the recommendation calls for it."

**Conditional section rule:** sections 6 and 7 are omitted entirely if step 3 produced no content for them. A clean audit on a well-reasoned verdict produces a short report — that is the correct outcome, not a sign that the spec was under-filled.

**Required styling:**

- Inline `<style>` only. CSS custom properties for theme colors. `@media (prefers-color-scheme: light)` block providing a light-mode palette; default palette is dark.
- System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
- Centered content column, `max-width: 880px`, generous padding (`48px 28px 80px`).
- Headline: large display size (≥1.6× body), generous line-height, sits flush with the page rather than in a box.
- Audit Summary: compact bordered panel with subtle background, slightly tighter line-height than body text. Designed to read as a unit, not as prose.
- Outcome tag: distinct background per outcome type (Earned = green-tinted, Partially earned = amber-tinted, Unearned = red-tinted, Cannot determine = muted gray). Audit Outcome block uses a border accent in the matching color and is the heaviest-styled block on the page.
- Code spans (`<code>`) get a subtle panel background and rounded corners.
- No emoji. No images. No external fonts.

After writing both files, deliver the HTML via `SendUserFile`.

---

## Standalone mode

Vets a decision from scratch with no prior council. Plain-language register — assumes the user is not steeped in deliberation vocabulary. Speaks to the user as a careful lawyer speaks to a client: clear, no jargon, asks what they need to know without performing rigor.

### 1. Understand the decision

Ask the user to describe the decision in their own words if they haven't already. Then surface, in plain language:

- **What you're deciding** — the choice as the user sees it.
- **Why now** — what's prompting this.
- **What you're leaning toward** — and why, if they've said.
- **What's fixed** — constraints, deadlines, things that can't change.
- **What you've already tried or considered** — if anything.

If the user's framing is missing one of these, ask for it. Do not call it a "Driver" or a "Constraint" — just ask the question in plain language: "What's pushing you to make this choice now?" or "Is there a deadline or budget that limits the options?"

### 2. Ask the questions a careful advisor would ask

Walk through the decision with the user, raising the considerations they likely haven't surfaced. The goal is not to render a verdict — it is to make sure the user has considered the right things before they decide.

For each of the following, form a judgment based on what the user has shared. Raise the point with the user only if it's load-bearing for this specific decision:

- **Is the stated problem the actual problem?** Symptoms get diagnosed as causes more often than they should. If the user has named a symptom, gently surface what else could be causing it.
- **What's the cost of being wrong?** Not just "what does this cost" — what does it cost if this turns out to be the wrong call? Reversibility matters more than the user typically prices.
- **What's the cheapest test?** Before committing fully, is there a smaller version of this decision that produces information? Spike, pilot, partial rollout, time-boxed trial.
- **Who else does this affect?** Decisions made by one person often have second-order effects on people who weren't consulted.
- **What would change your mind?** If the user can't name a condition under which they'd choose differently, they may not be making a decision — they may be rationalizing one.
- **Have you done the obvious cheaper thing first?** Process changes, tool changes, and structural changes are often the third or fourth intervention. Earlier ones are usually cheaper.

### 3. Render advice

Output in plain language. No jargon. Structured but conversational.

```
## The Short Version
[One sentence on what the user should consider before deciding, or what the strongest pause-point is. ≤25 words.]

## Here's What I'd Want You to Think About Before Deciding
[3-5 plain-language paragraphs raising the considerations that matter most for this specific decision. Each starts with a clear point and explains why it matters. Avoid lists; this should read like an advisor talking, not a checklist.]

## What I'd Do First
[One concrete suggestion — usually the cheapest test or the most diagnostic question. ≤50 words.]

## What I'm Not Going to Tell You
[Brief paragraph naming what you cannot judge from outside their situation — usually: their team, their tolerance for risk, their personal motivation, things only they know. This is honesty, not hedging.]
```

### 4. Output

Save two files in the workspace and deliver the HTML to the user via `SendUserFile` (status `normal`, caption naming the decision being deliberated). Use a single `YYYYMMDD-HHMMSS` timestamp for both filenames.

#### `deliberate-advice-[timestamp].md`

Plain Markdown. The advice content as specified in step 3, verbatim. No styling.

#### `deliberate-advice-[timestamp].html`

Self-contained — one file, inline `<style>`, no external assets, no scripts. Must render correctly when opened directly in a browser from the filesystem.

**Required structure, in this order:**

1. **Header** — `<h1>` naming the decision in plain terms, meta line beneath with date and, if relevant, git branch in `<code>`.
2. **The Short Version** — large display text, one sentence, the advice's strongest pause-point. Sits directly under the header with minimal chrome. The first thing the eye lands on.
3. **The Decision** — bordered panel containing the user's framing as gathered in step 1: what they're deciding, why now, what they're leaning toward, what's fixed, what they've already tried. Provides the context the advice responds to.
4. **Here's What I'd Want You to Think About Before Deciding** — the main prose panel containing the 3–5 paragraphs of considerations. Body-style text, generous line-height, reads as an advisor talking rather than a checklist.
5. **What I'd Do First** — the heaviest-styled block on the page. One concrete suggestion. Visually prominent so it does not get lost in the surrounding prose.
6. **What I'm Not Going to Tell You** — muted closing panel acknowledging the limits of outside advice.
7. **Footer** — muted, centered, e.g. "Standalone deliberation — careful advice, no verdict. Run `council` if the decision warrants the full protocol."

**Required styling:**

- Inline `<style>` only. CSS custom properties for theme colors. `@media (prefers-color-scheme: light)` block providing a light-mode palette; default palette is dark.
- System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
- Centered content column, `max-width: 880px`, generous padding (`48px 28px 80px`).
- The Short Version: large display size (≥1.6× body), generous line-height, sits flush with the page.
- The Decision: bordered panel with subtle background.
- What I'd Do First: heaviest-styled block, border accent in a single attention color (not tied to a verdict type — standalone mode renders advice, not a verdict).
- What I'm Not Going to Tell You: muted text color, subtle border or background to set it apart from the main prose without competing visually with What I'd Do First.
- Code spans (`<code>`) get a subtle panel background and rounded corners.
- No emoji. No images. No external fonts.

After writing both files, deliver the HTML via `SendUserFile`.

---

## Rules

- The audit is not adversarial. A verdict that holds up under scrutiny gets confirmed, not contested.
- In post-council mode, every finding must reference specific transcript content — quote or paraphrase with attribution. "It seemed like the verdict was weak" is not a finding.
- In standalone mode, do not adopt council vocabulary (Driver, Proposal Under Review, Lens). Speak in the user's register.
- Do not re-render the verdict. Deliberate audits or advises; it does not replace the council's job. If a re-run is needed, recommend that — don't perform it inline.
- If post-council audit finds the verdict is unsafe to act on, the recommendation must name *what specifically* should change in a re-run, not just "re-run."
- In standalone mode, if the question turns out to warrant a council, say so and recommend `council` rather than producing rushed advice on a high-stakes decision.

## Sibling skills

- **`council`** — full five-evaluator protocol producing a verdict. Deliberate audits its output. If standalone deliberate finds the decision is higher-stakes than initially scoped, recommend escalating to council.
- **`debate`** — lighter two-party scrutiny. Deliberate can audit a debate's joint synthesis the same way it audits a council verdict, using the same failure modes adapted to the simpler structure.