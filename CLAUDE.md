# CLAUDE.md

## Principles

- Simplicity above all. Earn complexity through proven need.
- Hold yourself to a staff engineer standard. Only ship changes you would confidently put in production.
- If a solution feels wrong, iterate until it doesn't.
- Do the work properly. Shortcuts become permanent debt. If a proper solution is complex, break it into steps and do each one right. On the rare occasion a shortcut is unavoidable, document it in `claude/debt.md` immediately with what the proper fix looks like.

## Self-Improvement

The `claude/` directory is a committed, public knowledge base that grows across sessions. **Every session must leave the project easier for the next one.** Create the directory if it does not exist.

1. **Write immediately.** If you learn something, write it down before your next action. Never defer to "end of session."
2. **Be specific.** Include file paths, function names, and exact error messages. Vague entries waste future sessions.
3. **Be honest.** Record mistakes and failed approaches — they are the most valuable entries.
4. **Prune stale info.** Update or remove entries that are no longer accurate.
5. **Cross-reference.** When entries relate across files, link them.
6. **Measure yourself.** If you re-discover something that should have been recorded, add it and note the gap in `claude/lessons.md`.
7. **Never push without updating.** Knowledge updates are part of the deliverable, not an afterthought.
8. **Nothing sensitive.** Never write secrets, API keys, tokens, passwords, internal URLs, or PII. Reference environment variable *names* (e.g., `BIFROST_URL`), never values. Describe credentials generically (e.g., "the database password from 1Password").

## Session Start

At the start of every session, before doing any work:

1. Create `claude/project.md` if it does not exist (explore the codebase first).
2. **Tier 1 — Read in full** (core memory):
   - `project.md` — project map and structure
   - `lessons.md` — mistakes to avoid
   - `preferences.md` — user coding preferences
   - `decisions.md` — architectural decisions and rationale
   - `glossary.md` — domain terms and naming conventions
3. **Tier 2 — Scan headers, read relevant sections** (working memory):
   - `context.md` — non-obvious API contracts and type relationships
   - `patterns.md` — reusable code patterns
   - `errors.md` — known error solutions
   - `commands.md` — useful commands and workflows
   - `debt.md` — known tech debt
   - `reviews.md` — common review feedback to avoid
4. **Tier 3 — Read on-demand** when working in that area (reference):
   - `dependencies.md` — dependency quirks
   - `testing.md` — testing patterns and strategy
   - `apis.md` — API routes and contracts
   - `env.md` — environment variables reference
   - `debug.md` — debugging approaches
5. Note which files are missing or outdated and update them during the session.

## Code

- Understand before modifying. Read surrounding code and follow its conventions.
- Build from small, composable pieces. Colocate what belongs together. If a type is hard to express, rethink the design.
- Formatting is tooling's job. Never fight the formatter.
- Solve the stated problem — not adjacent ones. A bug fix is not a refactoring opportunity.

## Architecture

- Extend before inventing. Prefer growing an existing module over creating a new one unless there is a clear, distinct boundary.
- Dependencies flow inward. Shared packages never depend on application code.
- Abstractions are extracted, not predicted. Duplication across multiple call sites earns a shared utility; a single use case does not.

## Workflow

For non-trivial work (three or more steps), enter planning mode before writing code. Delegate research to subagents — one focused task per agent — and keep the main context window clean.

### Research Before Committing to an Approach

When a task is complex, unfamiliar, or could take significant effort:

1. **Research first.** Spawn subagents in parallel to investigate — one per area of concern (e.g., prior art in the codebase, dependency docs, failing behavior).
2. **Synthesize.** If the path forward is clear, proceed. If there are meaningful trade-offs, present options to the user and ask.
3. **Never brute-force.** If an attempt fails, research why before retrying. After two failed attempts, ask the user for guidance.

## Continuous Learning

Update `claude/` files as you work, not at the end:

- **Error?** → `errors.md` immediately, while the message and fix are in context.
- **Non-obvious API or type relationship?** → `context.md` now.
- **Design choice?** → `decisions.md` before moving on.
- **Useful command?** → `commands.md` the moment you use it.
- **Debugging effort?** → `debug.md` before moving on.

## Git

- Imperative mood, atomic commits. Each commit is one logical change.
- Feature branches for non-trivial work. Never force-push shared branches.
- Review your own diff before committing.

### Pre-Push Gate

Before every `git push`:

1. Update every relevant `claude/` file:
   - `project.md` — file, package, or export changed
   - `lessons.md` — something surprised you or took multiple attempts
   - `context.md` — you read code carefully to understand something
   - `errors.md` — you hit and resolved an error
   - `decisions.md` — you made a non-trivial design choice
   - `patterns.md` — you wrote or followed a recurring pattern
   - `commands.md` — you ran a useful command
   - `dependencies.md` — a dependency behaved unexpectedly
   - `testing.md` — you wrote or discovered a testing approach
   - `preferences.md` — the user stated a preference
   - `glossary.md` — you introduced or encountered a domain term
   - `apis.md` — you added, changed, or discovered an API route
   - `env.md` — you used or discovered an environment variable
   - `debt.md` — you found existing tech debt
   - `reviews.md` — you received or noticed recurring review feedback
   - `debug.md` — you debugged something non-trivial
2. Commit `claude/` changes as a **separate** commit (e.g., `update claude/ knowledge base`).
3. Then push.

### Session End

Before ending a session, run through the Pre-Push Gate checklist one final time as a safety net. If you find yourself writing a lot here, you skipped the continuous learning and pre-push steps.

---

## Knowledge Files Reference

All files live in `claude/` and are committed to the repository. Append-only unless stated otherwise. Keep entries concise, dated, and actionable. Never include secrets or credentials.

Create any file on first use with the format below.

### `project.md` — Project Map

Project overview: workspace layout, packages, key file paths, tech stack, external services, common commands. **Updated in place** (not append-only).

### `lessons.md` — Hard-Won Knowledge

Mistakes, failed approaches, surprising behavior. Each entry should prevent a future session from repeating it.

```
## YYYY-MM-DD — Short title
What happened, why it was wrong, and what to do instead.
```

### `context.md` — Expensive-to-Rediscover Context

Function signatures, type relationships, non-obvious API contracts, environment variable meanings — the codebase cheat sheet.

```
## YYYY-MM-DD — Topic
The context worth preserving.
```

### `preferences.md` — User Preferences

Code-style, formatting, naming, and workflow preferences. Specific and actionable.

```
## Category
- Preference description. Note any exceptions.
```

### `patterns.md` — Reusable Code Patterns

Recurring idioms and snippets specific to this project. Extract here when a pattern appears in 2+ places.

```
## Pattern name
When to use it, followed by a minimal code example.
```

### `errors.md` — Error Solutions

Indexed by error message or symptom for quick lookup.

```
## Error message or symptom
- **Cause:** Why it happened.
- **Fix:** What resolved it.
- **Date:** YYYY-MM-DD
```

### `decisions.md` — Architecture Decision Records

Non-trivial design choices with context, alternatives, and trade-offs.

```
## YYYY-MM-DD — Decision title
**Status:** Accepted | Superseded by [link]
**Context:** What prompted the decision.
**Decision:** What was decided.
**Alternatives:** What else was considered.
**Consequences:** Trade-offs created.
```

### `commands.md` — Useful Commands & Workflows

CLI commands, scripts, and multi-step workflows worth remembering.

```
## Task description
\`\`\`sh
command here
\`\`\`
Optional notes.
```

### `dependencies.md` — Dependency Notes

Version quirks, upgrade notes, compatibility issues, unexpected behaviors.

```
## package-name@version
What's notable or broken. Date discovered: YYYY-MM-DD.
```

### `testing.md` — Testing Patterns & Strategy

Testing conventions, utilities, setup/teardown, mocking approaches.

```
## Category (e.g., Component tests, API tests)
How tests are structured and patterns to follow.
```

### `glossary.md` — Domain Glossary

Domain-specific terms and naming conventions. This project uses Norse mythology naming.

```
## Term
Definition and how it's used in this project.
```

### `apis.md` — API Routes & Contracts

Endpoints, request/response shapes, auth requirements, and integration points.

```
## METHOD /path
- **Request:** params, body, headers
- **Response:** shape, status codes
- **Auth:** required | public
- **Notes:** anything non-obvious
```

### `env.md` — Environment Variables

Variable names, what they control, defaults, and where they're used. **Names only — never values.**

```
## VARIABLE_NAME
- **Used by:** package or file
- **Purpose:** what it controls
- **Default:** value if any
```

### `debt.md` — Technical Debt

Known shortcuts and workarounds with context and ideal fixes.

```
## YYYY-MM-DD — Short title
**Where:** file path or area
**What:** the shortcut or workaround
**Why:** why it was acceptable at the time
**Ideal fix:** what should be done when there's time
```

### `reviews.md` — Review Feedback Patterns

Recurring PR review feedback to avoid repeating.

```
## Category (e.g., Error handling, Naming, Testing)
- What reviewers flag and what they expect instead.
```

### `debug.md` — Debugging Playbook

Debugging strategies that worked for specific problem types.

```
## Symptom or problem type
**How to diagnose:** steps that led to the root cause
**Tools used:** browser devtools, logging, etc.
**Date:** YYYY-MM-DD
```
