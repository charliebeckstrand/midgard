import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	baselinePath,
	type Counts,
	countsByFile,
	LIVING_MARKDOWN,
	markdownBreaks,
	packageDir,
	scanPackage,
} from '../helpers/controlled-language'

// STE.md is the project's controlled language, and CLAUDE.md §2.5 applies it to
// every authored statement. The 2026-08-02 documentation audit swept three of
// its rules by hand and closed none of them for good, because nothing held the
// tree to the result. Rule 10 went from 41 sites back to 89 in six weeks. The
// audit that found that regression named the missing gate as the reason it
// closed fewer categories than it could.
//
// This test is that gate, in two shapes:
//
//   1. Rule 10 is pinned at zero. The rule admits no judgment — "must" states a
//      requirement and "can" states a possibility — so any site is a break.
//   2. Rules 4 and 6 are pinned to a per-file ledger. Each needs a per-sentence
//      rewrite, so the tree carries a recorded debt that can only be paid down.
//
// The ledger holds counts, not verdicts. A rule 4 count is the candidates a
// reader can find, and rule 4 permits a descriptive passive where the active
// voice is longer or less clear. Read a count as "look here", never as "this is
// wrong".
//
// Refresh the ledger with STE_BASELINE=write after a change moves a count. The
// diff is the burn-down record, so a commit that pays debt down shows it.

type Baseline = Record<string, Counts>

function readBaseline(): Baseline {
	return JSON.parse(readFileSync(baselinePath, 'utf8')) as Baseline
}

/**
 * Serialize the ledger with one file to a line.
 *
 * @remarks
 * `JSON.stringify` spreads each entry over four lines, which costs 3,300 lines
 * for 826 files and hides the burn-down. One line to a file makes a count
 * change a one-line diff that carries the path beside it.
 */
function formatBaseline(baseline: Baseline): string {
	const rows = Object.entries(baseline).map(
		([file, counts]) =>
			`\t${JSON.stringify(file)}: { "rule4": ${counts.rule4}, "rule6": ${counts.rule6} }`,
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

	it('no file exceeds its recorded rule 4 and rule 6 debt (STE.md)', () => {
		const current = countsByFile(breaks)

		if (process.env.STE_BASELINE === 'write') {
			writeFileSync(baselinePath, formatBaseline(current))
		}

		const baseline = readBaseline()
		const files = [...new Set([...Object.keys(baseline), ...Object.keys(current)])].sort()

		const grown: string[] = []
		const paid: string[] = []

		for (const file of files) {
			const was = baseline[file] ?? { rule4: 0, rule6: 0 }
			const now = current[file] ?? { rule4: 0, rule6: 0 }

			for (const rule of ['rule4', 'rule6'] as const) {
				if (now[rule] > was[rule]) grown.push(`${file} ${rule}: ${was[rule]} → ${now[rule]}`)
				if (now[rule] < was[rule]) paid.push(`${file} ${rule}: ${was[rule]} → ${now[rule]}`)
			}
		}

		expect(
			grown,
			`new controlled-language debt — rewrite the sentence, or pay an equal amount down elsewhere in the file (STE.md rules 4 and 6):\n${grown.join('\n')}`,
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
