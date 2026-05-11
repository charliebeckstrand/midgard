---
name: debate
description: "Resolve a binary motion by staging an adversarial debate. One agent argues For, one argues Against, each side rebuts the other, then a Steel-manner fortifies the weaker side before a Judge rules. Produces an HTML report and a full transcript. MANDATORY TRIGGERS: 'debate this', 'debate X vs Y', 'argue for and against', 'pro and con this', 'for/against analysis', 'steel-man this', 'make the case for and against'. STRONG TRIGGERS (use when the user frames a binary motion with stakes): 'should we do X or not', 'is X worth it', 'change my mind about X', 'what's the case against X', 'I want to hear both sides'. SKIP for: multi-lens analysis where 5 independent perspectives matter more than two opposing ones (use /council); plans drafted and about to execute where the question is will-this-work (use /premortem); fuzzy ideas without a concrete motion yet (use /brainstorm); trivial yes/no, factual lookups, or motions with one obvious right answer. Distinct from /council: council surveys 5 lenses in parallel and synthesizes; debate runs two adversaries through an exchange and rules. Use debate when the question is sharply binary and you want one side's strongest case to survive contact with the other's."
---

# Debate

Stage a two-sided adversarial exchange on a binary motion. Two agents argue For and Against in parallel openings, then rebut each other in parallel, then a Steel-manner fortifies the weaker side so the Judge rules against the strongest possible form of both positions.

Use when the question is genuinely binary — "do X or don't", "approach A or approach B" — and you want each side's case stress-tested by the other before deciding. Skip if the question is multi-lens analysis (use `/council`), plan stress-testing (use `/premortem`), idea shaping (use `/brainstorm`), or a motion with one obvious answer.

## Sides

- **For** — argues the motion. Builds the strongest affirmative case from evidence, precedent, and consequence. Concedes nothing reflexively.
- **Against** — argues the negation. Names the cost, the failure mode, the better alternative. Concedes nothing reflexively.
- **Steel-manner** — reads the full exchange after rebuttals, identifies the side whose case landed weaker, and writes the strongest version of that side's argument. Not an advocate; a corrective.
- **Judge** — rules. Sees both openings, both rebuttals, and the Steel-man before deciding. May rule against the louder side if the steel-manned case is stronger.

## Flow

### 1. Frame

Scan the workspace for context (≤30 seconds): `CLAUDE.md`, referenced files, recent debate transcripts, anything obviously relevant. Use `Glob` + `Read`.

Reframe the user's input into a single neutral motion. Two acceptable shapes:

- *Resolved: <claim>.* (e.g. "Resolved: we should adopt Tailwind for new components.")
- *Choose: <A> or <B>.* (e.g. "Choose: Postgres or DynamoDB for the events table.")

Name the user's context, what's at stake, and what counts as evidence. No opinion, no steering.

If the motion is not binary, ask one clarifying question to narrow it. If it cannot be narrowed, route to `/council` and stop.

### 2. Openings (parallel)

Spawn For and Against in parallel. Each gets:

```
You are the [For | Against] side of a Debate.

MOTION:
---
[framed motion]
---

CONTEXT:
[framed context, stakes, evidence rules]

Write your opening argument. Hard rules:
- Make the strongest case for your side. Do not concede preemptively.
- Lead with the load-bearing claim. State it in the first sentence.
- Cite at least two concrete reasons — evidence, precedent, or consequence.
- Name one cost or risk of your own side and explain why it is worth paying.
- Do not address the opposing side yet. That is the rebuttal round.

200–300 words. No preamble.
```

### 3. Rebuttals (parallel)

After both openings return, spawn the two rebuttals in parallel. Each side rebuts the other's opening:

```
You are the [For | Against] side of a Debate. Your opponent has spoken.

MOTION:
---
[framed motion]
---

OPPONENT'S OPENING:
---
[opposing opening]
---

YOUR OPENING (for reference):
---
[own opening]
---

Write your rebuttal. Hard rules:
- Quote or paraphrase the opponent's load-bearing claim before attacking it.
- Identify their weakest premise and explain why it fails.
- Concede any point that is genuinely correct — concession sharpens the remaining attack.
- End by restating the motion in your favor in one sentence.

180–260 words. No preamble.
```

### 4. Steel-man

After both rebuttals return, spawn one Steel-manner. They see the full exchange:

```
You are the Steel-manner of a Debate. You are not an advocate. You are a corrective.

MOTION:
---
[framed motion]
---

FOR — opening:
[opening]
FOR — rebuttal:
[rebuttal]

AGAINST — opening:
[opening]
AGAINST — rebuttal:
[rebuttal]

Identify which side's case landed weaker after the exchange. Then write the strongest version of that side's argument — the version a sharper advocate would have made. Hard rules:
- Name the weaker side in the first sentence.
- Address the strongest rebuttal against that side head-on.
- Add at least one argument or piece of evidence the side's advocate missed.
- Do not flatter. Do not hedge. Write the brief that would have made the Judge's decision harder.

200–280 words. No preamble.
```

### 5. Judge

One agent gets the framed motion, both openings, both rebuttals, and the Steel-man:

```
You are the Judge of a Debate.

MOTION:
---
[framed motion]
---

CONTEXT:
[framed context]

FOR:
**Opening:** [opening]
**Rebuttal:** [rebuttal]

AGAINST:
**Opening:** [opening]
**Rebuttal:** [rebuttal]

STEEL-MAN (fortifying the [weaker side]):
[steel-man]

Output exactly this structure:

## The Motion
[Restated in one sentence.]

## Where Both Sides Agree
[Ground that survived the exchange. ≤3 bullets. Omit if there is none.]

## The Strongest Case For
[One paragraph distilling the For side at its best.]

## The Strongest Case Against
[One paragraph distilling the Against side at its best — informed by the Steel-man if Against was fortified.]

## The Decisive Point
[The single argument or rebuttal that actually moved the needle. Name which round it came from.]

## The Verdict
[Resolved / Not resolved / Conditional. One paragraph. Direct. The Judge may rule against the side whose unaided arguments were louder if the steel-manned case is stronger.]

## The One Thing to Do First
[One concrete next step. Not a list.]

Be direct. Don't hedge.
```

### 6. Report + transcript

Save two files in the workspace:

- `debate-report-[timestamp].html` — self-contained HTML, inline CSS, system font stack, clean and scannable. Contains: the framed motion, the Judge's verdict (prominent), a two-column layout showing For and Against side by side across opening and rebuttal, a collapsed Steel-man section, footer with timestamp. Open it after writing.
- `debate-transcript-[timestamp].md` — original input, framed motion, both openings, both rebuttals, the Steel-man, the Judge's full ruling.

## Rules

- Openings run in parallel. Rebuttals run in parallel after openings complete — never before, because each rebuttal depends on the opponent's opening.
- The Steel-manner runs after rebuttals, not before. The Judge must see the strongest weaker case fortified against the full exchange.
- The Judge may rule against the side whose unaided arguments were louder if the steel-manned case is stronger. That is the point of the Steel-man.
- The Steel-manner is not a third advocate. They fortify only the side that landed weaker; they do not invent a third position.
- Do not debate motions with one obvious right answer. If both sides are not genuinely defensible, just answer.
- If the question is "which of several lenses think this is wise?", route to `/council`. If it is "will this drafted plan fail?", route to `/premortem`. If the motion is still fuzzy, route to `/brainstorm`.
