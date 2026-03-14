# CLAUDE.md

## Principles

- Simplicity above all. The best solution is the simplest one that fully solves the problem. Speculative abstractions age poorly — earn complexity through proven need.
- Hold yourself to a staff engineer standard. Only propose changes you would confidently ship to production. Challenge your own work before presenting it.
- If a solution feels wrong, iterate until it doesn't. Demand excellence.

## Code

- Understand before modifying. Read the surrounding code, follow its conventions, and let consistency guide your decisions.
- Build from small, composable pieces. Colocate what belongs together. Let the type system carry its weight — if a type is hard to express, rethink the design.
- Formatting is tooling's job. Never fight the formatter.
- Solve the stated problem — not adjacent ones. A bug fix is not a refactoring opportunity. If the right fix requires broadening scope, ask first.

## Architecture

- Extend before inventing. Prefer growing an existing module over creating a new one unless there is a clear, distinct boundary.
- Dependencies flow inward. Shared packages never depend on application code.
- Abstractions are extracted, not predicted. Duplication across multiple call sites earns a shared utility; a single use case does not.

## Git

- Imperative mood, atomic commits. Each commit represents one logical change, described by what it does — not what you did.
- Feature branches for non-trivial work. Never force-push shared branches.
- Review your own diff before committing. Read it as a reviewer would.

## Workflow

For non-trivial work (three or more steps), enter planning mode before writing code. Delegate research to subagents — one focused task per agent — and keep the main context window clean. Summarize at milestones, not line by line.

---

## Self-Improvement System

The `claude/` directory is a persistent knowledge base that grows across sessions. **Every session should leave the project easier for the next session.** If the `claude/` directory does not exist, create it.

### Session Start Ritual

At the start of **every** session, before doing any work:

1. Read **all** files in `claude/` — every one of them. They are your memory.
2. If `claude/project.md` does not exist, explore the codebase and create it before doing anything else.
3. Note which files are missing or outdated and plan to update them during or at the end of the session.

### Session End Ritual

Before ending **every** session, reflect and update:

1. **Did the project structure change?** Update `claude/project.md`.
2. **Did I learn something the hard way?** Append to `claude/lessons.md`.
3. **Did I discover reusable context?** Append to `claude/context.md`.
4. **Did the user express a preference?** Append to `claude/preferences.md`.
5. **Did I use a pattern worth remembering?** Append to `claude/patterns.md`.
6. **Did I hit an error worth documenting?** Append to `claude/errors.md`.
7. **Did I make or discover an architectural decision?** Append to `claude/decisions.md`.
8. **Did I find a useful command or workflow?** Append to `claude/commands.md`.
9. **Did a dependency behave unexpectedly?** Append to `claude/dependencies.md`.
10. **Did I write or discover a testing approach?** Append to `claude/testing.md`.

If a file does not exist yet and you have something to record, create it using the format described below.

### Knowledge Files

All files are append-only unless stated otherwise. Organize entries with dates. Keep entries concise and actionable — future sessions should be able to scan quickly.

#### `claude/project.md` — Project Map (update in place)

Project overview: workspace layout, what each package does, key file paths, tech stack, external services, and common commands. This is the only file that gets **updated in place** rather than appended to. Keep it current.

#### `claude/lessons.md` — Hard-Won Knowledge

Things learned through mistakes, failed approaches, or surprising behavior. Each entry should save a future session from repeating the same mistake.

Format:
```
## YYYY-MM-DD — Short title
What happened, why it was wrong, and what to do instead.
```

#### `claude/context.md` — Expensive-to-Rediscover Context

Function signatures, type relationships, non-obvious API contracts, environment variable meanings, and anything that took significant exploration to figure out. This is the "cheat sheet" for the codebase.

Format:
```
## YYYY-MM-DD — Topic
The context worth preserving.
```

#### `claude/preferences.md` — User Preferences

Code-style, formatting, naming conventions, and workflow preferences stated by the user. Read at session start and apply to all code written. Each preference should be specific and actionable with noted exceptions.

Format:
```
## Category (e.g., Code ordering, Naming conventions)
- Preference description. Note any exceptions.
```

#### `claude/patterns.md` — Reusable Code Patterns

Recurring code patterns, idioms, and snippets specific to this project. When the same pattern is used in 2+ places, extract it here so future sessions can apply it consistently.

Format:
```
## Pattern name
When to use it, followed by a minimal code example.
```

#### `claude/errors.md` — Error Solutions

Errors encountered and their solutions. Indexed by error message or symptom so future sessions can search for them.

Format:
```
## Error message or symptom
- **Cause:** Why it happened.
- **Fix:** What resolved it.
- **Date:** YYYY-MM-DD
```

#### `claude/decisions.md` — Architecture Decision Records

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

#### `claude/commands.md` — Useful Commands & Workflows

CLI commands, scripts, one-liners, and multi-step workflows that are useful for this project. Saves future sessions from re-discovering how to do common operations.

Format:
```
## Task description
\`\`\`sh
command here
\`\`\`
Optional notes about when to use it or gotchas.
```

#### `claude/dependencies.md` — Dependency Notes

Version quirks, upgrade notes, compatibility issues, and non-obvious behaviors of third-party packages. If a dependency does something unexpected, record it here.

Format:
```
## package-name@version
What's notable, quirky, or broken. Date discovered: YYYY-MM-DD.
```

#### `claude/testing.md` — Testing Patterns & Strategy

Testing conventions, utilities, setup/teardown patterns, mocking approaches, and what to test for each type of code in this project.

Format:
```
## Category (e.g., Component tests, API tests)
How tests are structured, what tools are used, and patterns to follow.
```

### Self-Improvement Rules

1. **Be proactive.** Don't wait for the user to ask you to record something. If you learn it, write it down.
2. **Be specific.** Vague entries waste future sessions' time. Include file paths, function names, and exact error messages.
3. **Be honest.** Record mistakes and failed approaches — they're the most valuable entries.
4. **Prune stale info.** If you notice an entry in any file that is no longer accurate, update or remove it.
5. **Cross-reference.** When an entry in one file relates to another, mention the other file.
6. **Measure yourself.** If you re-discover something that should have been in the knowledge base, add it immediately and note the gap in `claude/lessons.md`.
