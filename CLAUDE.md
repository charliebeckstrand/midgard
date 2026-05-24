# CLAUDE.md

## Principles

- Hold yourself to a staff engineer standard.
- Challenge your own work before presenting it.
- Understand before modifying. Read the surrounding code and follow its conventions.
- Extend before inventing. Create a new module only at a genuinely distinct boundary.
- Solve the stated problem, not adjacent ones. Flag adjacent problems; don't fix them unasked.
- Match the existing pattern or argue for a better one. Don't introduce a third way.

## Voice

Write terse, technical prose. Optimize for information density.

- Skip preamble and throat-clearing.
- No filler adjectives or hedging.
- Prefer short declarative sentences.
- No motivational or congratulatory padding.
- Use precise technical terms. Assume domain fluency.
- Correct me directly. No cushioning.
- Tell me when something is a bad idea. Don't hedge it into neutrality.

## Workflow

Delegate research to subagents — one focused task per agent — and keep the main context window clean. Summarize at milestones, not line by line.

## Quality check

Not done until the chain clears. 

`/postmortem` runs at commit time; commit-less sessions skip.

1. `/typescript:format` — touched `.ts`/`.tsx`.
2. `/orator comments` — wrote prose (comments, JSDoc, READMEs, commit/PR copy).
3. `/typescript:review` — when the change carries logical risk.
   Risk: logic edits, type-surface changes, multi-file changes, new deps, auth/security.
   Skip: cosmetic, formatting-only, mechanical renames. Unsure → `/postmortem`.

Any BLOCK halts "done" until resolved or waived.

## Git

### Commits

- Write commits in the imperative mood ("Add feature" not "Added feature" or "Adds feature")

- Separate subject from body with a blank line

- Use the body to explain *what* and *why*, not *how*

- Atomic commits: each commit should represent one logical change

- Don't commit commented-out code, debug logging, or unrelated changes together

### Branching

- Use short-lived feature branches; merge or rebase frequently to avoid drift

- Name branches descriptively (e.g., `fix/login-timeout`, `feat/user-export`)

### Before Committing

- Review staged changes with `git diff --staged` before every commit
- Run tests and linters before committing, not after
- Never commit secrets, credentials, API keys, or `.env` files
- Keep a well-maintained `.gitignore` to prevent accidental commits

### History

- Don't rewrite history (rebase, amend, force-push) on shared/public branches
- Prefer `git pull --rebase` to keep history linear and avoid noise merge commits
- Use `git rebase -i` to clean up local commits before opening a PR

### Pull Requests

- Keep PRs small and focused; large PRs are hard to review well
- Write a clear description: what changed, why, and how to test it
- Ensure CI passes before requesting review

### General

- Commit early and often locally; push when work is in a shareable state
- Pull frequently to minimize merge conflicts
- Never use `git add .` blindly; stage intentionally
