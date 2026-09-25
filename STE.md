# Simplified Technical English

> **The project's controlled language.** [ASD-STE100](https://www.asd-ste100.org) limits the vocabulary, the grammar, and the length of each sentence, so that the text stays unambiguous. Write the prose that the repository keeps in Simplified Technical English ([`CLAUDE.md`](CLAUDE.md) §2.5).

## What STE means

STE is a specification, not a preference. Part 1 gives the writing rules. Part 2 gives the Dictionary, which approves one word for each meaning and lists the words that it replaces. Issue 9 (January 2025) is current.

STE governs the words and the grammar. [`CADENCE.md`](CADENCE.md) governs the spacing and the shape. Apply both.

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

## Scope in this repository

Rules 3, 6, and 10 are gated. [`controlled-language-boundary.test.ts`](packages/ui/src/__tests__/boundary/controlled-language-boundary.test.ts) pins each at zero across the comments of the `ui` source tree. The curated surface docs and the rule documents at the repository root carry no debt in any of the three.

The rule 3 gate reads spelling only. It finds a British form such as `colour`, `centre`, or `normalise`, and the fix is the American form. A second word for one thing needs a reader, so review holds the rest of rule 3.

Rule 6 held a per-file ledger while the tree paid its debt down. The last of it closed, so the ledger is gone and a new break fails the gate outright.

Rule 6 counts a semicolon-joined compound as one sentence. A cap on the sentence is the point of the rule, so a long run of joined clauses is a break.

Rule 4 is not gated, and a count of it misleads. The descriptive half is conditional, so no count of it has a correct value. The instruction half is empty by construction. An imperative starts with its main verb, which is active, so a passive inside one sits in a subordinate clause the rule permits. Read rule 4 in review.

Rule 5 stays out of scope until this repository holds Part 2. The `-ing` category runs to about 7,000 sites in the `ui` comments alone. Most are participial adjectives — "the enclosing dialog", "the underlying seam" — and Part 2 approves a subset of them. A rewrite without the Dictionary degrades the prose it touches.

An audit and a plan stay in their authored voice. An audit is a point-in-time record, which [`CONVENTIONS.md` §12.4](CONVENTIONS.md) deletes once its findings close. A plan is a permanent record of one decision ([`CONVENTIONS.md` §12.5](CONVENTIONS.md)). Neither is a living surface document, so neither is worth the churn.

Chat is exempt. The repository does not keep it, so the cost of the rules buys nothing there ([`CLAUDE.md`](CLAUDE.md) §2.5).

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
| gate | A check that fails the build on a break: a boundary test, a Biome rule, or a Biome plugin. | `CLAUDE.md` §3.4 |
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

**See also:** [`CADENCE.md`](CADENCE.md) · [`CLAUDE.md` §2](CLAUDE.md) · [`CONVENTIONS.md` §12](CONVENTIONS.md).
