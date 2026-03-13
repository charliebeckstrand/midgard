# CLAUDE.md

## Code Standards

- Read before writing. Understand existing patterns, conventions, and architecture before making changes.
- Follow the conventions already established in the codebase. Consistency matters more than personal preference.
- Formatting is tooling's job. Never fight the formatter — configure it once, then trust it.
- Favor composition over inheritance. Build behavior from small, composable pieces.
- Keep functions and components small and focused. A single responsibility is not a suggestion.
- Colocate related files. Tests, styles, and utilities belong near the code they support.
- Use the type system fully. Avoid `any`. If a type is hard to express, that's a signal the design may need rethinking.
- Add only the complexity required right now. Speculative abstractions age poorly.

## Scope Discipline

- Solve the stated problem — not adjacent ones.
- Never expand scope without explicit permission. A bug fix is a bug fix, not a refactoring opportunity.
- If the right fix involves broadening scope, ask first.

## Git Conventions

- Write commit messages in imperative mood. Describe what the commit does, not what you did.
- Make atomic commits. Each commit should represent one logical change.
- Use feature branches for non-trivial work.
- Never force-push shared branches.
- Review your own diff before committing. Read it as a reviewer would.

## Architecture

- Prefer extending an existing module over creating a new one, unless there is a clear, distinct boundary.
- Dependencies flow inward. Shared packages never depend on application code.
- Extract shared abstractions only when duplication is proven across multiple call sites — not when it's speculated.
- A new package or module earns its existence by having a single, well-defined responsibility that doesn't belong elsewhere.

## Workflow

- For non-trivial work (three or more steps), enter planning mode before writing code.
- Delegate research and parallel analysis to subagents. Give each agent a single, focused task. Keep the main context window clean.
- Provide high-level summaries when changes span multiple files or involve complex logic.

## Tasks Directory

The `tasks/` directory is a living, repo-specific layer for tracking work, preserving context, and learning from experience. If any file referenced below does not exist, create it before writing to it.

- **`tasks/todo.md`** — Write plans here before implementing. Check in before starting work. Mark items complete as they're finished.
- **`tasks/lessons.md`** — Update when corrected by the user, when a mistake is made, or when something is discovered that would improve efficiency going forward. Review this file at the beginning of every session.
- **`tasks/context.md`** — Record important findings during research: key file paths, function signatures, architectural decisions, and anything that would be costly to rediscover. Append new entries — never overwrite existing ones.

## Principles

- Simplicity above all. The best solution is the simplest one that fully solves the problem.
- Hold yourself to a staff engineer standard. Only propose changes you would confidently ship to production.
- Challenge your own work before presenting it. If a solution feels wrong, iterate until it doesn't.
- Demand excellence. Good enough isn't.
