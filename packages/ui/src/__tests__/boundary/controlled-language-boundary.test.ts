import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	baselinePath,
	countsByFile,
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
//   2. Rule 6 is pinned to a per-file ledger. Each break is a per-sentence
//      rewrite, so the tree carries a recorded debt that can only be paid down.
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
//
// Refresh the ledger with STE_BASELINE=write after a change moves a count. The
// diff is the burn-down record, so a commit that pays debt down shows it.

type Baseline = Record<string, number>

function readBaseline(): Baseline {
	return JSON.parse(readFileSync(baselinePath, 'utf8')) as Baseline
}

/**
 * Serialize the ledger with one file to a line.
 *
 * @remarks
 * `JSON.stringify` spreads each entry over three lines, which buries the
 * burn-down. One line to a file makes a count change a one-line diff that
 * carries the path beside it.
 */
function formatBaseline(baseline: Baseline): string {
	const rows = Object.entries(baseline).map(
		([file, count]) => `\t${JSON.stringify(file)}: ${count}`,
	)

	return `{\n${rows.join(',\n')}\n}\n`
}

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

	it('no file exceeds its recorded rule 6 debt (STE.md)', () => {
		const current = countsByFile(breaks)

		if (process.env.STE_BASELINE === 'write') {
			writeFileSync(baselinePath, formatBaseline(current))
		}

		const baseline = readBaseline()
		const files = [...new Set([...Object.keys(baseline), ...Object.keys(current)])].sort()

		const grown: string[] = []
		const paid: string[] = []

		for (const file of files) {
			const was = baseline[file] ?? 0
			const now = current[file] ?? 0

			if (now > was) grown.push(`${file}: ${was} → ${now}`)
			if (now < was) paid.push(`${file}: ${was} → ${now}`)
		}

		expect(
			grown,
			`new rule 6 debt — split the sentence, or pay an equal amount down elsewhere in the file (STE.md rule 6):\n${grown.join('\n')}`,
		).toEqual([])

		expect(
			paid,
			`debt paid down but the ledger still records the old count — re-run with STE_BASELINE=write so the burn-down lands in the diff:\n${paid.join('\n')}`,
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
