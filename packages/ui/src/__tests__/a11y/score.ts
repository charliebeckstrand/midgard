/// <reference types="vite/client" />
import type { ComponentType } from 'react'
import { createElement } from 'react'
import { test } from 'vitest'
import { axe, renderUI } from '../helpers'
import { IMPACTS, type ScoreBreakdown, scoreViolations } from './scoring'

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
 * Two env vars turn the summary into a triage tool for locating where a gap
 * lives — the component's own markup vs the demo's usage of it:
 *
 *   A11Y_DETAIL=1   per finding, list each offending node grouped by axe rule
 *                   and owning `data-slot` (the component that emitted it), with
 *                   axe's failure summary and an HTML sample.
 *   A11Y_ONLY=a,b   restrict the whole run to these demo ids for focused triage.
 *
 * Deliberately makes no assertions: the deliverable is the printed table, so the
 * run always "passes" and the numbers are read off stdout.
 */

const demos = import.meta.glob<ComponentType>(
	['../../docs/demos/*.tsx', '../../docs/demos/pages/*.tsx', '../../docs/demos/providers/*.tsx'],
	{ import: 'Demo', eager: true },
)

const detail = process.env.A11Y_DETAIL === '1' || process.env.A11Y_DETAIL === 'true'
const only = process.env.A11Y_ONLY?.split(',')
	.map((id) => id.trim())
	.filter(Boolean)

/** `../../docs/demos/pages/dashboard.tsx` → `pages/dashboard`. */
function demoId(path: string): string {
	return path.replace(/^.*\/demos\//, '').replace(/\.tsx$/, '')
}

/** The slice of an axe result node this runner reads. */
type AxeNode = {
	readonly html: string
	readonly target: readonly string[]
	readonly failureSummary?: string
}

/** axe `Result`, narrowed to the fields scoring and triage need. */
type RuleViolation = {
	readonly id: string
	readonly impact?: 'critical' | 'serious' | 'moderate' | 'minor' | null
	readonly nodes: readonly AxeNode[]
}

/** One offending element, attributed to the component (`data-slot`) that owns it. */
type NodeDetail = {
	readonly rule: string
	readonly owner: string
	readonly summary: string
	readonly html: string
}

function message(error: unknown): string {
	return (error instanceof Error ? error.message : String(error)).split('\n')[0] ?? ''
}

/**
 * Attribute a node to the nearest enclosing `data-slot` — the component that
 * rendered it. Resolved against the live DOM (the node is still mounted here);
 * falls back to the slot on the node's own markup if the selector no longer
 * matches.
 */
function ownerOf(node: AxeNode): string {
	const selector = node.target.at(-1)
	const element = selector ? document.querySelector(selector) : null
	const slot = element?.closest('[data-slot]')?.getAttribute('data-slot')

	if (slot) return slot

	return /data-slot="([^"]+)"/.exec(node.html)?.[1] ?? '?'
}

function condense(summary: string | undefined): string {
	if (!summary) return ''

	return summary
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.join(' ')
		.slice(0, 140)
}

async function inspect(Demo: ComponentType): Promise<{
	violations: RuleViolation[]
	details: NodeDetail[]
}> {
	const { container, unmount } = renderUI(createElement(Demo))

	try {
		const regions = container.querySelectorAll<HTMLElement>('[data-demo-preview]')
		const targets: readonly HTMLElement[] = regions.length ? [...regions] : [container]

		const violations: RuleViolation[] = []
		const details: NodeDetail[] = []

		for (const target of targets) {
			const result = await axe(target)

			for (const violation of result.violations as unknown as RuleViolation[]) {
				violations.push(violation)

				for (const node of violation.nodes) {
					details.push({
						rule: violation.id,
						owner: ownerOf(node),
						summary: condense(node.failureSummary),
						html: node.html.slice(0, 100),
					})
				}
			}
		}

		return { violations, details }
	} finally {
		unmount()
	}
}

function bar(width: number): string {
	return '-'.repeat(width)
}

type DemoResult = {
	readonly id: string
	readonly breakdown: ScoreBreakdown
	readonly error?: string
}

test('a11y score', async () => {
	const results: DemoResult[] = []
	const nodesByRule = new Map<string, number>()
	const detailsById = new Map<string, NodeDetail[]>()
	let deductionsAcross = 0

	for (const [path, Demo] of Object.entries(demos)) {
		const id = demoId(path)

		if (only && !only.includes(id)) continue

		try {
			const { violations, details } = await inspect(Demo)
			const breakdown = scoreViolations(violations)

			results.push({ id, breakdown })
			detailsById.set(id, details)
			deductionsAcross += breakdown.deductions

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
	const idWidth = Math.max(...findings.map((result) => result.id.length), 'component'.length)

	const tallyOf = ({ counts }: ScoreBreakdown) =>
		IMPACTS.map((impact) => `${impact}:${counts[impact]}`).join('  ')

	const topRules = [...nodesByRule.entries()].sort((a, b) => b[1] - a[1])

	const lines: string[] = [
		'',
		'A11y benchmark — all components (weighted axe-core score over demo previews; jsdom)',
		...(only ? [`  Filtered to: ${only.join(', ')}`] : []),
		'',
		`  Overall: ${meanScore}/100   (mean per-component score; ${deductionsAcross} weighted defect load)`,
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

	if (detail) {
		const reported = scored
			.filter((result) => (detailsById.get(result.id)?.length ?? 0) > 0)
			.sort((a, b) => a.breakdown.score - b.breakdown.score)

		if (reported.length > 0) {
			lines.push('  Detail — offending nodes by rule · owning data-slot:')

			for (const result of reported) {
				lines.push('', `  ${result.id}  (${result.breakdown.score}/100)`)

				const groups = new Map<string, { count: number; sample: NodeDetail }>()

				for (const node of detailsById.get(result.id) ?? []) {
					const key = `${node.rule}|${node.owner}`
					const group = groups.get(key)

					if (group) group.count += 1
					else groups.set(key, { count: 1, sample: node })
				}

				for (const { count, sample } of [...groups.values()].sort((a, b) => b.count - a.count)) {
					lines.push(`    [${sample.rule}] ×${count}  owner=${sample.owner}`)

					if (sample.summary) lines.push(`      ${sample.summary}`)

					lines.push(`      ${sample.html}`)
				}
			}

			lines.push('')
		}
	}

	if (errored.length > 0) {
		lines.push('  Errored demos (not scored):')
		lines.push(...errored.map((result) => `    ${result.id}: ${result.error}`))
		lines.push('')
	}

	console.log(lines.join('\n'))
})
