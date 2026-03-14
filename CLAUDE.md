# CLAUDE.md

## Principles

- Simplicity above all. The best solution is the simplest one that fully solves the problem. Speculative abstractions age poorly — earn complexity through proven need.
- Hold yourself to a staff engineer standard. Only propose changes you would confidently ship to production. Challenge your own work before presenting it.
- If a solution feels wrong, iterate until it doesn't. Demand excellence.
- **No shortcuts.** Do the work properly. A hacky fix that "works for now" becomes permanent tech debt. If a proper solution is complex, that's fine — break it into steps and do each one right. If you genuinely cannot avoid a shortcut, document it in `claude/debt.md` immediately and explain what the proper fix looks like. Shortcuts should be rare exceptions, not defaults.

## Self-Improvement Rules

The `claude/` directory is a persistent knowledge base that grows across sessions. **Every session should leave the project easier for the next session.** If the `claude/` directory does not exist, create it.

1. **Write immediately, not later.** The moment you learn something, write it down. Do not defer to "end of session." If you catch yourself thinking "I'll add that later," stop and add it now.
2. **Be specific.** Vague entries waste future sessions' time. Include file paths, function names, and exact error messages.
3. **Be honest.** Record mistakes and failed approaches — they're the most valuable entries.
4. **Prune stale info.** If you notice an entry in any file that is no longer accurate, update or remove it.
5. **Cross-reference.** When an entry in one file relates to another, mention the other file.
6. **Measure yourself.** If you re-discover something that should have been in the knowledge base, add it immediately and note the gap in `claude/lessons.md`.
7. **Never push without updating.** The `claude/` directory is part of the deliverable, not an afterthought. Code changes without corresponding knowledge updates are incomplete work.
8. **Nothing sensitive.** The `claude/` directory is committed and public. Never write secrets, API keys, tokens, passwords, internal URLs, PII, or anything you wouldn't want in a public repo. Reference environment variable *names* (e.g., `BIFROST_URL`), never their values. If context requires mentioning a credential, describe it generically (e.g., "the database password from 1Password") — never include the actual value.

## Session Start Ritual

At the start of **every** session, before doing any work:

1. If `claude/project.md` does not exist, explore the codebase and create it before doing anything else.
2. **Tier 1 — Read in full** (core memory, always read):
   - `claude/project.md` — project map and structure
   - `claude/lessons.md` — mistakes to avoid
   - `claude/preferences.md` — user's coding preferences
   - `claude/decisions.md` — why things are the way they are
   - `claude/glossary.md` — domain terms and naming conventions
3. **Tier 2 — Scan headers, read relevant sections** (working memory):
   - `claude/context.md` — non-obvious API contracts and type relationships
   - `claude/patterns.md` — reusable code patterns
   - `claude/errors.md` — known error solutions
   - `claude/commands.md` — useful commands and workflows
   - `claude/debt.md` — known tech debt and shortcuts
   - `claude/reviews.md` — common review feedback to avoid
4. **Tier 3 — Read on-demand** when working in that area (reference shelf):
   - `claude/dependencies.md` — dependency quirks
   - `claude/testing.md` — testing patterns and strategy
   - `claude/apis.md` — API routes and contracts
   - `claude/env.md` — environment variables reference
   - `claude/debug.md` — debugging approaches
5. Note which files are missing or outdated and plan to update them during the session.

## Code

- Understand before modifying. Read the surrounding code, follow its conventions, and let consistency guide your decisions.
- Build from small, composable pieces. Colocate what belongs together. Let the type system carry its weight — if a type is hard to express, rethink the design.
- Formatting is tooling's job. Never fight the formatter.
- Solve the stated problem — not adjacent ones. A bug fix is not a refactoring opportunity. If the right fix requires broadening scope, ask first.

## Architecture

- Extend before inventing. Prefer growing an existing module over creating a new one unless there is a clear, distinct boundary.
- Dependencies flow inward. Shared packages never depend on application code.
- Abstractions are extracted, not predicted. Duplication across multiple call sites earns a shared utility; a single use case does not.

## Workflow

For non-trivial work (three or more steps), enter planning mode before writing code. Delegate research to subagents — one focused task per agent — and keep the main context window clean. Summarize at milestones, not line by line.

### Research Before Committing to an Approach

When a task is complex, unfamiliar, or could take significant effort to resolve:

1. **Stop and research first.** Do not guess at a solution. Spawn subagents to investigate in parallel — one per area of concern (e.g., one to search for prior art in the codebase, one to check dependency docs, one to explore the failing behavior).
2. **Synthesize findings.** Once research is complete, evaluate the options. If the path forward is clear, proceed. If there are meaningful trade-offs or multiple viable approaches, present them to the user and ask which direction to take.
3. **Never brute-force.** If a first attempt fails, do not retry the same approach repeatedly. Step back, research why it failed, and choose a different path. If stuck after two attempts, ask the user for guidance rather than spiraling.

## Continuous Learning (During Work)

Do not wait until the end of a session. Update `claude/` files **as you go**:

- **Hit an error?** Write it to `claude/errors.md` immediately, while the error message and fix are in context.
- **Discovered a non-obvious API or type relationship?** Write it to `claude/context.md` now, not later.
- **Made a design choice?** Write it to `claude/decisions.md` before moving on.
- **Found a useful command?** Write it to `claude/commands.md` the moment you use it.
- **Took a shortcut?** Write it to `claude/debt.md` so it doesn't get forgotten.
- **Spent time debugging?** Write the approach to `claude/debug.md` before moving on.

The rule: **if you learned it, write it down before your next action.** Context fades fast — capture it while it's fresh.

## Git

- Imperative mood, atomic commits. Each commit represents one logical change, described by what it does — not what you did.
- Feature branches for non-trivial work. Never force-push shared branches.
- Review your own diff before committing. Read it as a reviewer would.

### Pre-Push Gate

**Before every `git push`**, you MUST:

1. Review what you learned during this unit of work.
2. Update every relevant `claude/` file. At minimum, consider:
   - `claude/project.md` — if any file, package, or export changed.
   - `claude/lessons.md` — if anything surprised you or took more than one attempt.
   - `claude/context.md` — if you had to read code carefully to understand something.
   - `claude/errors.md` — if you hit and resolved any error.
   - `claude/decisions.md` — if you made a non-trivial choice.
   - `claude/patterns.md` — if you wrote or followed a recurring pattern.
   - `claude/commands.md` — if you ran a useful command.
   - `claude/dependencies.md` — if a dependency behaved unexpectedly.
   - `claude/testing.md` — if you wrote or discovered a testing approach.
   - `claude/preferences.md` — if the user stated a preference.
   - `claude/glossary.md` — if you introduced or encountered a domain term.
   - `claude/apis.md` — if you added, changed, or discovered an API route.
   - `claude/env.md` — if you used or discovered an environment variable.
   - `claude/debt.md` — if you took a shortcut or found existing tech debt.
   - `claude/reviews.md` — if you received or noticed recurring review feedback.
   - `claude/debug.md` — if you debugged something non-trivial.
3. Stage and commit the `claude/` changes as a **separate** commit (e.g., `update claude/ knowledge base`) to keep code commits clean.
4. **Only then** run `git push`.

Skipping this gate means knowledge is lost. Treat it as a required step, not a nice-to-have.

## Session End Ritual

Before ending **every** session, do a final sweep. Ask yourself whether any of the following files need updates that weren't already captured by the pre-push gate:

1. `claude/project.md` — Did the project structure change?
2. `claude/lessons.md` — Did I learn something the hard way?
3. `claude/context.md` — Did I discover reusable context?
4. `claude/preferences.md` — Did the user express a preference?
5. `claude/patterns.md` — Did I use a pattern worth remembering?
6. `claude/errors.md` — Did I hit an error worth documenting?
7. `claude/decisions.md` — Did I make or discover an architectural decision?
8. `claude/commands.md` — Did I find a useful command or workflow?
9. `claude/dependencies.md` — Did a dependency behave unexpectedly?
10. `claude/testing.md` — Did I write or discover a testing approach?
11. `claude/glossary.md` — Did I introduce or encounter a domain term?
12. `claude/apis.md` — Did I add, change, or discover an API route?
13. `claude/env.md` — Did I use or discover an environment variable?
14. `claude/debt.md` — Did I take a shortcut or find tech debt?
15. `claude/reviews.md` — Did I receive review feedback worth remembering?
16. `claude/debug.md` — Did I debug something non-trivial?

This ritual is a **safety net** — most updates should already be done. If you find yourself writing a lot here, you skipped the continuous learning and pre-push steps.

---

## Knowledge Files Reference

All files live in `claude/` and are **committed to the repository**. All are append-only unless stated otherwise. Organize entries with dates. Keep entries concise and actionable — future sessions should be able to scan quickly. Never include secrets, credentials, or sensitive values (see rule 8 above).

If a file does not exist yet and you have something to record, create it using the formats below.

### `claude/project.md` — Project Map (update in place)

Project overview: workspace layout, what each package does, key file paths, tech stack, external services, and common commands. This is the only file that gets **updated in place** rather than appended to. Keep it current.

### `claude/lessons.md` — Hard-Won Knowledge

Things learned through mistakes, failed approaches, or surprising behavior. Each entry should save a future session from repeating the same mistake.

Format:
```
## YYYY-MM-DD — Short title
What happened, why it was wrong, and what to do instead.
```

### `claude/context.md` — Expensive-to-Rediscover Context

Function signatures, type relationships, non-obvious API contracts, environment variable meanings, and anything that took significant exploration to figure out. This is the "cheat sheet" for the codebase.

Format:
```
## YYYY-MM-DD — Topic
The context worth preserving.
```

### `claude/preferences.md` — User Preferences

Code-style, formatting, naming conventions, and workflow preferences stated by the user. Read at session start and apply to all code written. Each preference should be specific and actionable with noted exceptions.

Format:
```
## Category (e.g., Code ordering, Naming conventions)
- Preference description. Note any exceptions.
```

### `claude/patterns.md` — Reusable Code Patterns

Recurring code patterns, idioms, and snippets specific to this project. When the same pattern is used in 2+ places, extract it here so future sessions can apply it consistently.

Format:
```
## Pattern name
When to use it, followed by a minimal code example.
```

### `claude/errors.md` — Error Solutions

Errors encountered and their solutions. Indexed by error message or symptom so future sessions can search for them.

Format:
```
## Error message or symptom
- **Cause:** Why it happened.
- **Fix:** What resolved it.
- **Date:** YYYY-MM-DD
```

### `claude/decisions.md` — Architecture Decision Records

Why things are the way they are. When a non-trivial design choice is made (or discovered), document the decision, the alternatives considered, and why this path was chosen.

Format:
```
## YYYY-MM-DD — Decision title
**Status:** Accepted | Superseded by [link]
**Context:** What prompted the decision.
**Decision:** What was decided.
**Alternatives:** What else was considered.
**Consequences:** What trade-offs this creates.
```

### `claude/commands.md` — Useful Commands & Workflows

CLI commands, scripts, one-liners, and multi-step workflows that are useful for this project. Saves future sessions from re-discovering how to do common operations.

Format:
```
## Task description
\`\`\`sh
command here
\`\`\`
Optional notes about when to use it or gotchas.
```

### `claude/dependencies.md` — Dependency Notes

Version quirks, upgrade notes, compatibility issues, and non-obvious behaviors of third-party packages. If a dependency does something unexpected, record it here.

Format:
```
## package-name@version
What's notable, quirky, or broken. Date discovered: YYYY-MM-DD.
```

### `claude/testing.md` — Testing Patterns & Strategy

Testing conventions, utilities, setup/teardown patterns, mocking approaches, and what to test for each type of code in this project.

Format:
```
## Category (e.g., Component tests, API tests)
How tests are structured, what tools are used, and patterns to follow.
```

### `claude/glossary.md` — Domain Glossary

Domain-specific terms, naming conventions, and the reasoning behind them. This project uses Norse mythology naming — document what each name maps to and any new terms introduced.

Format:
```
## Term
Definition and how it's used in this project.
```

### `claude/apis.md` — API Routes & Contracts

API endpoints, request/response shapes, authentication flows, status codes, and integration points. Document both internal routes and external service contracts.

Format:
```
## METHOD /path
- **Request:** params, body, headers
- **Response:** shape, status codes
- **Auth:** required | public
- **Notes:** anything non-obvious
```

### `claude/env.md` — Environment Variables

Environment variable names, what they control, their defaults, and where they're used. **Never record actual values — only names and descriptions.**

Format:
```
## VARIABLE_NAME
- **Used by:** package or file
- **Purpose:** what it controls
- **Default:** value if any
```

### `claude/debt.md` — Technical Debt

Known shortcuts, workarounds, and things that should be improved. Each entry should explain why the shortcut was taken and what the ideal fix looks like.

Format:
```
## YYYY-MM-DD — Short title
**Where:** file path or area
**What:** the shortcut or workaround
**Why:** why it was acceptable at the time
**Ideal fix:** what should be done when there's time
```

### `claude/reviews.md` — Review Feedback Patterns

Recurring PR review feedback, common mistakes, and things reviewers consistently flag. Learn from past reviews so the same feedback doesn't come up twice.

Format:
```
## Category (e.g., Error handling, Naming, Testing)
- What reviewers flag and what they expect instead.
```

### `claude/debug.md` — Debugging Playbook

Debugging strategies, tools, and approaches that worked for specific problem types in this project. When a bug takes significant effort to diagnose, record the approach.

Format:
```
## Symptom or problem type
**How to diagnose:** steps that led to the root cause
**Tools used:** browser devtools, logging, etc.
**Date:** YYYY-MM-DD
```
