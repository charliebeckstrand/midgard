/// <reference types="vite/client" />
import type { ComponentType } from 'react'
import { createElement } from 'react'
import { test } from 'vitest'
import { axe, renderUI } from '../helpers'
import { IMPACTS, type ScoreBreakdown, scoreViolations, type Violationish } from './scoring'

/**
 * A11y benchmark — scores every component's docs demo and prints a weighted
 * 0–100 number, instead of asserting pass/fail like `baseline.test.tsx`. Run as
 * a one-off via `pnpm a11y:score` (uses vitest.a11y.config.ts); it is excluded
 * from the normal test run. The scoring rubric lives in `scoring.ts`.
 *
 * The corpus is auto-discovered from the docs demos — the same realistic,
 * maintained renders the documentation shows — so new components are scored the
 * moment they have a demo, with no separate list to keep in sync. axe is scoped
 * to the `data-demo-preview` region the docs `Example` wraps each showcase in,
 * so the score reflects the demonstrated component, not the docs chrome (control
 * widgets, code blocks). Demos that render no preview region (providers, pages)
 * are scored on their full output.
 *
 * Deliberately makes no assertions: the deliverable is the printed table, so the
 * run always "passes" and the numbers are read off stdout.
 */

const demos = import.meta.glob<ComponentType>(
	['../../docs/demos/*.tsx', '../../docs/demos/pages/*.tsx', '../../docs/demos/providers/*.tsx'],
	{ import: 'Demo', eager: true },
)

/** `../../docs/demos/pages/dashboard.tsx` → `pages/dashboard`. */
function demoId(path: string): string {
	return path.replace(/^.*\/demos\//, '').replace(/\.tsx$/, '')
}

/** axe `Result` carries the rule `id` on top of the fields scoring reads. */
type RuleViolation = Violationish & { readonly id: string }

type DemoResult = {
	readonly id: string
	readonly breakdown: ScoreBreakdown
	readonly error?: string
}

function message(error: unknown): string {
	return (error instanceof Error ? error.message : String(error)).split('\n')[0] ?? ''
}

async function violationsFor(Demo: ComponentType): Promise<RuleViolation[]> {
	const { container, unmount } = renderUI(createElement(Demo))

	try {
		const regions = container.querySelectorAll<HTMLElement>('[data-demo-preview]')
		const targets: readonly HTMLElement[] = regions.length ? [...regions] : [container]

		const violations: RuleViolation[] = []

		for (const target of targets) {
			const result = await axe(target)

			violations.push(...(result.violations as RuleViolation[]))
		}

		return violations
	} finally {
		unmount()
	}
}

function bar(width: number): string {
	return '-'.repeat(width)
}

test('a11y score', async () => {
	const results: DemoResult[] = []
	const everyViolation: RuleViolation[] = []
	const nodesByRule = new Map<string, number>()

	for (const [path, Demo] of Object.entries(demos)) {
		const id = demoId(path)

		try {
			const violations = await violationsFor(Demo)

			everyViolation.push(...violations)
			results.push({ id, breakdown: scoreViolations(violations) })

			for (const violation of violations) {
				nodesByRule.set(violation.id, (nodesByRule.get(violation.id) ?? 0) + violation.nodes.length)
			}
		} catch (error) {
			results.push({ id, breakdown: scoreViolations([]), error: message(error) })
		}
	}

	const errored = results.filter((result) => result.error)
	const scored = results.filter((result) => !result.error)
	const findings = scored
		.filter((result) => result.breakdown.score < 100)
		.sort((a, b) => a.breakdown.score - b.breakdown.score)
	const clean = scored.length - findings.length

	// Headline is the mean of the per-component scores — summing every violation
	// across the whole library into one `100 − deductions` would floor at 0 the
	// moment total deductions clear 100, which says nothing useful. The total
	// weighted deduction is kept as a raw defect-load figure alongside it.
	const meanScore = scored.length
		? Math.round(scored.reduce((sum, result) => sum + result.breakdown.score, 0) / scored.length)
		: 100
	const defectLoad = scoreViolations(everyViolation).deductions
	const idWidth = Math.max(...findings.map((result) => result.id.length), 'component'.length)

	const tallyOf = ({ counts }: ScoreBreakdown) =>
		IMPACTS.map((impact) => `${impact}:${counts[impact]}`).join('  ')

	const topRules = [...nodesByRule.entries()].sort((a, b) => b[1] - a[1])

	const lines: string[] = [
		'',
		'A11y benchmark — all components (weighted axe-core score over demo previews; jsdom)',
		'',
		`  Overall: ${meanScore}/100   (mean per-component score; ${defectLoad} weighted defect load)`,
		`  ${results.length} demos · ${clean} clean · ${findings.length} with findings · ${errored.length} errored`,
		'',
	]

	if (topRules.length > 0) {
		lines.push('  Top rules (violating nodes):')
		lines.push(...topRules.map(([rule, count]) => `    ${rule}: ${count}`))
		lines.push('')
	}

	if (findings.length > 0) {
		lines.push('  Components with findings (worst first):')
		lines.push(`    ${'component'.padEnd(idWidth)}  score   violating nodes by impact`)
		lines.push(`    ${bar(idWidth)}  -----   ${bar(40)}`)
		lines.push(
			...findings.map(
				({ id, breakdown }) =>
					`    ${id.padEnd(idWidth)}  ${String(breakdown.score).padStart(3)}   ${tallyOf(breakdown)}`,
			),
		)
		lines.push('')
	}

	if (errored.length > 0) {
		lines.push('  Errored demos (not scored):')
		lines.push(...errored.map((result) => `    ${result.id}: ${result.error}`))
		lines.push('')
	}

	console.log(lines.join('\n'))
})
