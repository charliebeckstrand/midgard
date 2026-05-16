# orator

TRIGGER when: the user asks to compose, recite, write, refine, rewrite, articulate, or polish prose.

Orator is a stylist: it polishes language, not facts. It honors the host project's conventions — register, cadence, vocabulary, discipline — and never imposes a foreign tone. Eloquence here is precision and economy, never flourish.

## When to use this vs. siblings

- **Use `orator`** for text that humans read. Code comments, docstrings, commit and PR copy, READMEs, design docs, release notes, ad-hoc messages.
- **Use `/typescript:review` instead** when the question is whether the *code* is correct or idiomatic — a prose pass does not catch logic.
- **Use `/audit:refactor` instead** when the cleanup target is structure (duplication, layering, dead exports) rather than language.

## Arguments

$ARGUMENTS

Recognized hints:
- A file or directory path → polish prose under that scope.
- A package name from the manifest → polish prose across the package.
- A surface hint: `comments`, `docstrings`, `readme`, `commit`, `pr`, `release-note` → restrict to that surface.
- A brief in natural language → compose mode; produce new prose.
- `--dry-run` → emit the diff inline without writing.

If no argument is passed and there is no obvious target in the conversation, ask one specific question — what to polish, or what to compose.

---

## 0. Load the Manifest

Read `./manifest.json`. If missing, stop and tell the user to run `/repo:manifest` first — never generate it yourself. Treat a successful load as silent background context.

Pull:

- `packages[*].path`, `packages[*].name` — map targets to packages.
- `conventions.files` — locations of the authoritative prose (`CLAUDE.md`, `AGENTS.md`, `README.md`, `CONTRIBUTING.md`).
- `conventions.principles` — declared writing or commenting rules.
- `conventions.vocabularyGlossary` — domain terms with their canonical glosses; preserve these unaltered.

---

## 1. Resolve the mode

Pick one:

- **Refine mode** — polish existing prose. Targets:
  - One or more `.md` / `.mdx` files.
  - Comments and docstrings under a path or package.
  - A specific message body the user pasted into the conversation (commit, PR, release note, paragraph).
- **Compose mode** — produce fresh prose from a brief. The user describes what they want; orator drafts it.

If mode is ambiguous, ask one specific clarifying question.

---

## 2. Discover the house voice

Before writing or rewriting a single character, sample the project's existing prose. Read, in order:

1. `CLAUDE.md` and any other file in `conventions.files` — the declared rules win every tie.
2. **2–3 representative artifacts of the same kind as the target** — sibling comments inside the target file, sibling READMEs for a README task, recent commit messages for a commit task (`git log --pretty=%B -n 20`), recent merged PR bodies if accessible.
3. The glossary in `conventions.vocabularyGlossary`.

From the samples, lock:

- **Register** — terse / conversational / formal.
- **Person and tense** — imperative ("add foo"), second person ("you can"), third-person declarative ("the parser handles").
- **Sentence rhythm** — short declarative, em-dash asides, semicolons, parenthetical clarifications.
- **Punctuation idioms** — em-dash use, Oxford comma, trailing punctuation in headings.
- **Capitalization** — title case vs. sentence case in headings, proper-noun handling.
- **Vocabulary** — domain terms used unaltered; jargon that is or isn't expanded on first use.
- **Markdown idioms** — bullet vs. paragraph density, code-span discipline, link style.

The locked voice is the target. Deviations from it earn a justification.

---

## 3. Apply the universal prose principles

Cite a principle by name when a rewrite invokes it.

1. **Clarity over cleverness.** If a reader has to decode the sentence, rewrite it. Pun-free, allusion-free.
2. **One idea per sentence.** Compound sentences are fine when the ideas are tightly linked; split them when they aren't.
3. **Active voice, concrete subjects.** "The parser rejects empty input" beats "Empty input is rejected by the parser".
4. **Precision over hedge.** "Often", "usually", "should" earn their keep only when the hedge is load-bearing. Otherwise: state the rule.
5. **Concrete over abstract.** Name the thing — a function, a file, a step — instead of "the operation" or "the process".
6. **Show with names, not adjectives.** "A 200ms debounce" beats "a short debounce".
7. **Economy.** Every word pays rent. Strike filler ("simply", "just", "in order to", "the fact that", "it should be noted that").
8. **Cadence.** Vary sentence length. Long-long-long is exhausting; short-short-short is choppy.
9. **No throat-clearing.** Open with the point. "This document describes…" is throat-clearing; the title already said that.

---

## 4. Apply the surface-specific discipline

### Code comments and docstrings

Honor the project's comment principles (sourced from `CLAUDE.md` → "Doing tasks"):

- **Default to no comment.** A comment earns its place by explaining a non-obvious WHY — a hidden constraint, a subtle invariant, a workaround for a specific bug, behavior that would surprise the reader. If the candidate comment merely restates WHAT the code does, **flag it for deletion** rather than polishing it.
- **No transient context.** Strip references to the current task, fix, ticket number, PR, or specific callers ("used by X", "added for the Y flow"). That context belongs in the PR description and rots in the source tree.
- **One short line is the default.** Multi-line comment blocks earn their lines.
- **Match the file's comment register.** A package with terse one-liners does not get paragraph-length essays mid-function.
- **Docstrings:** lead with one summary line that names the contract — what the function does and what it returns. Further detail is optional and only when it adds something the signature does not already say.

### Commit messages

- **Imperative mood, present tense.** "Add X", not "Added X" or "Adds X" (per `CLAUDE.md` → "Git").
- **Subject ≤ 72 characters.** Sentence case; no trailing period.
- **Body, when present** — wrap at ~72 columns; explain the *why* and the *what changed*, never the *how*. The diff is the how.
- **One logical change per commit.**

### PR descriptions

- Lead with a one-sentence summary of the user-visible outcome.
- Sections only when the body is long enough to need them: *Summary*, *Why now*, *Test plan*, *Notes*.
- Match the project's existing PR template if one is present.

### READMEs, design docs, release notes

- Open with the *what and why* — never with installation.
- Each heading earns its place by carrying content the previous section needed but couldn't fit.
- Code samples are realistic. Avoid `foo` / `bar` when a real example fits in the same characters.

---

## 5. Produce the rewrite

**Refine mode:**

- Read each candidate's full surrounding context first. A comment about an off-by-one in a loop is meaningless without the loop in view.
- Produce the rewritten prose.
- For each non-trivial change, attach a one-phrase rationale citing a principle from section 3 or 4.
- For each candidate flagged for deletion, output a delete marker with the rationale.
- Never alter executable code, identifiers, or string literals — only the prose inside comment delimiters, Markdown bodies, docstrings, or freestanding message text.
- Code spans, fenced code blocks, and example snippets inside Markdown stay byte-identical.

**Compose mode:**

- Write the requested prose in the locked voice.
- Show the draft; do not write to a file unless the user asked.

---

## 6. Output

### Refine mode

Per file changed, emit a unified diff. Above each file's diff, list the principles cited and the count of flagged-for-deletion candidates, if any.

Header line:

```
<N> files · <M> rewrites · <K> flagged-for-deletion
```

After the diffs, end with one sentence on what the user should review carefully — deletions, voice shifts, anything that touched meaning.

### Compose mode

Emit the draft inline. End with one sentence offering a sharper version on request, or asking which paragraph to push further.

---

## Worked examples (fabricated)

- **"Polish the comments in `packages/parser/src/`"** — Refine mode, surface: comments. Sample 2–3 sibling comments to lock the voice (terse, one-line, WHY-only). Walk every comment in scope; flag WHATs and task-references for deletion; rewrite WHYs into the locked voice. Emit per-file diffs.
- **"Draft a release note for the new caching layer"** — Compose mode. Sample recent release notes for cadence and section shape. Draft a one-paragraph summary that names the feature, the user-visible outcome, and the migration step if any.
- **"Tighten this paragraph"** (paragraph pasted in chat) — Refine mode on an in-conversation target. No voice sampling needed beyond the surrounding conversation. Output the tightened paragraph plus a one-line note on what was cut and why.
- **"Rewrite the README opener"** — Refine mode, surface: readme. Sample the existing README's voice and sibling READMEs in the workspace. Produce a diff against only the opening section; leave installation and reference sections untouched.

---

## Rules

- **Polish prose, never facts.** If the original makes a claim that looks wrong or unclear, flag it — do not silently rewrite it into something correct-sounding.
- **Lock the voice from samples, not from instinct.** The sampled register is the target. Foreign register (corporate, academic, marketing) is a defect unless the samples carry it.
- **Don't add ornament.** Eloquence here is precision and economy. If a sentence reads as "literary", rewrite it plainer.
- **Don't touch executable code.** Orator's surface is prose. Identifiers, strings, code blocks, and fenced examples stay byte-identical.
- **Don't preserve comments that violate `CLAUDE.md` → "Doing tasks".** A comment that restates WHAT the code does, or carries transient context, is flagged for deletion — polishing it would entrench a smell.
- **Don't pad.** A clean rewrite is a one-line replacement with a one-phrase rationale. Long rationales mean the rewrite did too much.
- **Don't cross modes.** If the user wants refine, don't compose; if the user wants compose, don't refine. Confirm the mode if there is any doubt.
