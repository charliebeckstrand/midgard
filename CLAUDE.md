# CLAUDE.md

## 1. Conduct

1.1 Extend before inventing; add abstractions only at distinct boundaries.

1.2 Solve only the stated problem; surface adjacent issues.

1.3 Flag irreversible actions; perform only on instruction.

## 2. Voice

2.1 Write short, technical prose; assume domain fluency. Cut filler and repetition, not the grammar words that STE keeps.

2.2 Prefer paragraphs; reserve lists for enumerable items.

2.3 Answer first; no preamble, filler, flattery, or restatement.

2.4 On correction, comply; don't apologize or relitigate decisions.

2.5 Write the text that the repository keeps in ASD-STE100 Simplified Technical English: comments, TSDoc, Markdown, and commit bodies. [STE.md](STE.md) gives the rules and the exemptions. Chat is exempt, and §2.1 to §2.4 govern it.

## 3. Workflow

3.1 Before architectural work, work that crosses packages, or a breaking change to a public export, surface the approach for assent.

3.2 When weighing a decision, name the fitting instrument: `/debate` for binary X-or-Y, `/council` for high-stakes calls with competing tradeoffs. Don't run either unprompted.

3.3 For research across many files or subsystems, delegate to subagents, one task each. Read a small, known set of files directly.

3.4 Prove it works; flag anything unverified. Verify with `biome check .`, `turbo run check-types`, and scoped Vitest (`test:related` or `test:changed`). Lefthook runs Biome on staged files before a commit, and the branch gate before a push. CI runs the full gate and gates merges.

3.5 When you change a public `ui` export, update its TSDoc. Update the related surface index in `packages/ui/docs` in the same commit ([CONVENTIONS.md](CONVENTIONS.md) §12).

3.6 [CADENCE.md](CADENCE.md) sets the spacing and the shape of authored text. `cadence-boundary.test.ts` gates the rule documents at the repository root, and review holds the rest.

3.7 Comments and TSDoc follow [CONVENTIONS.md](CONVENTIONS.md) §12.1 and [STE.md](STE.md).

3.8 The repository rules outrank a skill. When a skill disagrees with this file, [CONVENTIONS.md](CONVENTIONS.md), [STE.md](STE.md), or a gate, follow the repository.

## 4. Version Control

4.1 Commit messages follow Conventional Commits, with a scope from the `scope-enum` in [commitlint.config.mjs](commitlint.config.mjs). Use `midgard` for a change outside one package.

4.2 A pull request merges by squash, so its title becomes the commit subject on `main`. The `PR title` workflow checks the title with commitlint.

4.3 A wide diff can push the pre-push gate past a two-minute timeout. Run `git push` with a ten-minute timeout, and never bypass hooks to beat one.

4.4 Never rewrite the history of a pushed branch that another author uses: no rebase, no amend, and no force-push. Merge the base branch in.

---

**See also:** [CONVENTIONS.md](CONVENTIONS.md), [REFERENCE.md](REFERENCE.md), [STE.md](STE.md), [CADENCE.md](CADENCE.md).
