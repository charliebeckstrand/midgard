import { test } from 'vitest'
import { axe, renderUI } from '../helpers'
import { baseline } from './cases'
import { IMPACTS, type ScoreBreakdown, scoreViolations, type Violationish } from './scoring'

/**
 * A11y benchmark — prints a weighted 0–100 score for the shared component
 * corpus (`cases.tsx`) instead of asserting pass/fail like `baseline.test.tsx`.
 * Run as a one-off via `pnpm a11y:score` (uses vitest.a11y.config.ts); it is
 * excluded from the normal test run. The scoring rubric lives in `scoring.ts`.
 *
 * Deliberately makes no assertions: the deliverable is the printed table, so
 * the run always "passes" and the number is read off stdout.
 */

type Row = readonly [name: string, breakdown: ScoreBreakdown]

async function violationsFor(element: (typeof baseline)[number][1]): Promise<Violationish[]> {
	const { container, unmount } = renderUI(element)

	try {
		const { violations } = await axe(container)

		return violations as Violationish[]
	} finally {
		unmount()
	}
}

function formatRow(name: string, { score, counts }: ScoreBreakdown, nameWidth: number): string {
	const tally = IMPACTS.map((impact) => `${impact}:${counts[impact]}`).join('  ')

	return `  ${name.padEnd(nameWidth)}  ${String(score).padStart(3)}   ${tally}`
}

test('a11y score', async () => {
	const rows: Row[] = []
	const all: Violationish[] = []

	for (const [name, element] of baseline) {
		const violations = await violationsFor(element)

		all.push(...violations)
		rows.push([name, scoreViolations(violations)])
	}

	const overall = scoreViolations(all)
	const nameWidth = Math.max(...rows.map(([name]) => name.length), 'component'.length)

	const lines = [
		'',
		'A11y benchmark — weighted axe-core score (jsdom; contrast & target-size excluded)',
		`  ${'component'.padEnd(nameWidth)}  score   violating nodes by impact`,
		`  ${'-'.repeat(nameWidth)}  -----   ${'-'.repeat(40)}`,
		...rows.map(([name, breakdown]) => formatRow(name, breakdown, nameWidth)),
		`  ${'-'.repeat(nameWidth)}  -----`,
		formatRow('OVERALL', overall, nameWidth),
		'',
		`  Score: ${overall.score}/100  (${overall.deductions} points deducted across ${baseline.length} components)`,
		'',
	]

	console.log(lines.join('\n'))
})
