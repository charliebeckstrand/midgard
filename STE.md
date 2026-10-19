# Simplified Technical English

> **The project's controlled language.** [ASD-STE100](https://www.asd-ste100.org) limits the vocabulary, the grammar, and the length of each sentence, so that the text stays unambiguous. Write the prose that the repository keeps in Simplified Technical English ([`CLAUDE.md`](CLAUDE.md) §2.5).

## What STE means

STE is a specification, not a preference. Part 1 gives the writing rules. Part 2 gives the Dictionary, which approves one word for each meaning and lists the words that it replaces. Issue 9 (January 2025) is current.

STE governs the words and the grammar. The cadence rules below govern the spacing and the shape. Apply both.

This repository does not hold the Dictionary, and full conformance to Part 2 needs it. Apply Part 1 in full. Use the rules below as the working standard. Consult the Dictionary when you have access to it.

This document obeys the rules that it defines; read it as the reference.

## Rules

1. **Approved words.** Use each word in one meaning and in one part of speech. Do not give a word a second sense.

2. **Technical names and technical verbs.** STE admits the technical vocabulary of the domain. The names in the code are approved: the tools, the packages, the components, the files, the props, and the routes. The verbs that name technical operations are approved: `render`, `fetch`, `commit`, `mock`, `lint`.

3. **One term for one thing.** Use the same word for the same thing each time. Do not change the word for variety. Use one spelling for each word: the American spelling, which the identifiers use.

4. **Active voice.** Write in the active voice. Do not use the passive voice in an instruction. In descriptive text, use the passive voice only when the active voice is longer or less clear.

5. **Approved verb forms.** Use the infinitive, the imperative, the simple present, the simple past, and the simple future. Use the past participle only as an adjective. Do not use the `-ing` form, unless the word is an approved word or part of a technical name.

6. **Short sentences.** Keep an instruction to 20 words or fewer. Keep a descriptive sentence to 25 words or fewer.

7. **Short paragraphs.** Keep a paragraph to six sentences or fewer. Write one topic in each paragraph, and put that topic in the first sentence.

8. **Small noun clusters.** Use three nouns or fewer in a cluster. Break a longer cluster with a preposition or a hyphen. Write "the path to the hook configuration file", not "hook config file path".

9. **Complete sentences.** Keep the articles "a", "an", and "the". Do not remove words to make a sentence short.

10. **Precise modals.** Use "must" for a requirement and "can" for a possibility. Do not use `shall`, `should`, or `may`.

11. **Procedures.** Start an instruction with the verb, and write one instruction in each sentence. Put a warning or a caution before the step that it applies to. Put a complex set of conditions in a vertical list.

## Cadence

A *statement* is one unit of authored text: a numbered clause, a paragraph, a list item, or a logical block of code. The cadence rules govern the spacing and the shape of statements.

1. **One blank line between statements.** Separate each statement from the next with exactly one blank line. In code, put the blank line between logical blocks.

2. **One idea per statement.** Do not merge unrelated ideas, and do not split one idea across two statements.

3. **Contiguous numbering.** Number the clauses of a rule document `N.M`, in order and with no gap.

4. **Terminal punctuation.** End each statement with sentence punctuation. A colon can end a statement that introduces a table or a list.

5. **Asides.** Put an aside in its own sentence or in parentheses, not between em-dashes.

6. **Consistent links.** Write a cross-reference with descriptive link text, a relative path, and a `§` section marker. Match the link form of the document.

7. **File hygiene.** End the file with one newline. Leave no trailing whitespace and no stacked blank lines.

## Scope in this repository

STE rules 3, 6, and 10 are gated. [`controlled-language-boundary.test.ts`](packages/ui/src/__tests__/boundary/controlled-language-boundary.test.ts) reads the comments of the `ui` source tree, the curated surface docs, and the rule documents at the repository root. The surface docs and the rule documents carry no debt in the three rules. In the comments, a rule 3 or a rule 10 break fails the run. Rule 6 is not gated in the comments: `pnpm --filter ui ste:report` lists the breaks, and review decides what to fix.

The rule 3 gate reads spelling only, so review holds the rest of rule 3. Rule 6 counts a semicolon-joined compound as one sentence.

Review holds STE rule 4, because no count of it is correct. Rule 5 stays out of scope until this repository holds Part 2. Do not rewrite an `-ing` form without the Dictionary.

[`cadence-boundary.test.ts`](packages/ui/src/__tests__/boundary/cadence-boundary.test.ts) gates cadence rules 1, 3, 4, and 7 in the rule documents. Review holds the other cadence rules.

An audit and a plan stay in their authored voice, because each is a temporary record ([`CONVENTIONS.md` §12.4, §12.5](CONVENTIONS.md)). Chat is exempt ([`CLAUDE.md`](CLAUDE.md) §2.5).

## Project terms

These terms have one meaning in this repository. Use them in that meaning, and do not use another word for the same thing.

| Term | Meaning | Source |
|---|---|---|
| barrel | The `index.ts` of a directory, which only re-exports. It is the public surface of the directory. | `CONVENTIONS.md` §3.3, §3.5 |
| anchor | The `data-slot` value of an element. Tests and library selectors read it. | `CONVENTIONS.md` §3.9, §10.2 |
| binding cascade | The order in which a control resolves its value: the explicit prop, then the bound field, then its own state. | `CONVENTIONS.md` §7.2 |
| styling cascade | A context that passes ambient styling down to client descendants, such as `useControl` or `useGlass`. | `CONVENTIONS.md` §3.5 |
| static tier | The `ui` components that read no context and carry no `'use client'`. | `packages/ui/REFERENCE.md` §2 |
| client tier | The `ui` components that carry `'use client'` and can read context. | `packages/ui/REFERENCE.md` §2 |
| seam | The synchronous part of a behavior that a test can drive: a reducer, a callback, or a typed harness. | `CONVENTIONS.md` §10.3 |
| gate | A check that fails the build on a break: a boundary test, a Biome rule, or a Biome plugin. | `CLAUDE.md` §3.3 |
| recipe | The styling definition of a unit, built in the Kiso, Katakana, and Kata layers. | `packages/ui/src/recipes/README.md` |

## Example

Drift — a gerund as the subject, and two instructions in one sentence:

```md
Touching a public `ui` export updates its TSDoc and the matching `packages/ui/docs/*` surface index in the same change.
```

STE — a command for each instruction, in the active voice:

```md
When you change a public `ui` export, update its TSDoc. Update the related surface index in `packages/ui/docs` in the same commit.
```

---

**See also:** [`CLAUDE.md` §2](CLAUDE.md) · [`CONVENTIONS.md` §12](CONVENTIONS.md).
