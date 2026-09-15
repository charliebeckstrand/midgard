import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	LIVING_MARKDOWN,
	markdownBreaks,
	packageDir,
	scanPackage,
} from '../helpers/controlled-language'

// STE.md is the project's controlled language, and CLAUDE.md §2.5 applies it to
// every authored statement. The 2026-08-02 documentation audit swept its rules
// by hand and closed none of them for good, because nothing held the tree to
// the result. Rule 10 went from 41 sites back to 89 in six weeks. The audit
// that found that regression named the missing gate as the reason it closed
// fewer categories than it could.
//
// This test is that gate, in three shapes:
//
//   1. Rule 10 is pinned at zero. The rule admits no judgment — "must" states a
//      requirement and "can" states a possibility — so any site is a break.
//   2. Rule 6 is pinned at zero. It held a per-file ledger while the tree paid
//      the debt down, and the last of it closed in this branch.
//   3. The curated surface docs carry no debt at all, in either rule.
//
// Rule 4 is deliberately absent, and the reason is worth keeping. Its two
// halves behave differently. The descriptive half is conditional — the rule
// permits a passive where the active voice is longer or less clear — so a count
// of those has no correct value to reach. The instruction half is categorical
// but empty by construction: an imperative's main verb is its first word, which
// is active, so the only passives inside one sit in a subordinate clause that
// the rule allows. Gating it measured about 1,600 sites nobody could drive to
// zero, against 33 flagged instructions of which the readable ones were a
// suffix heuristic mistaking "is that" and "is honest" for participles. Rule 4
// stays a review concern.

describe('controlled-language boundary', () => {
	const breaks = scanPackage()

	it('no comment uses a banned modal (STE.md rule 10)', () => {
		const violations = breaks
			.filter((item) => item.rule === 10)
			.map((item) => `${item.file}:${item.line} — ${item.text}`)

		expect(
			violations,
			`banned modal in a comment — "must" for a requirement, "can" for a possibility (STE.md rule 10):\n${violations.join('\n')}`,
		).toEqual([])
	})

	it('no comment runs past the sentence cap (STE.md rule 6)', () => {
		const violations = breaks
			.filter((item) => item.rule === 6)
			.map((item) => `${item.file}:${item.line} — ${item.text}`)

		expect(
			violations,
			`sentence past the cap — 20 words for an instruction, 25 for a description (STE.md rule 6):\n${violations.join('\n')}`,
		).toEqual([])
	})

	it('the living Markdown keeps rules 6 and 10 (CONVENTIONS.md §12.2)', () => {
		const violations: string[] = []

		for (const file of LIVING_MARKDOWN) {
			for (const item of markdownBreaks(file, readFileSync(join(packageDir, file), 'utf8'))) {
				violations.push(`${item.file}:${item.line} rule ${item.rule} — ${item.text}`)
			}
		}

		expect(
			violations,
			`the curated surface docs are a quick-glance index, so they carry no debt — split the sentence, or drop the modal (STE.md rules 6 and 10):\n${violations.join('\n')}`,
		).toEqual([])
	})
})
