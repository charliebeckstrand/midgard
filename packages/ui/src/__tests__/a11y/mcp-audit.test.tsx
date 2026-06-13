import { writeFileSync } from 'node:fs'
import type { UserEvent } from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { afterAll, describe, it } from 'vitest'
import { axe, renderUI, userEvent } from '../helpers'
import { baseline, interactive, overlays } from './cases'

/**
 * MCP audit harness (a11y server, `audit` tool). Not a gate: it renders corpus
 * cases through the same `renderUI` + `axe` path as `baseline.test.tsx` and
 * writes the raw axe violations to `MCP_AUDIT_OUT` for the server to reshape.
 *
 * Inert in normal runs — only the server sets `MCP_AUDIT=1`, so `test:a11y`
 * and CI see a single skipped placeholder. Driven by env:
 *   MCP_AUDIT=1            arm the harness
 *   MCP_AUDIT_BUCKET=...   baseline | overlays | interactive (default baseline)
 *   MCP_AUDIT_FILTER=...   case-name substring (optional)
 *   MCP_AUDIT_OUT=...      absolute path for the JSON result
 */

const ARMED = process.env.MCP_AUDIT === '1'
const BUCKET = process.env.MCP_AUDIT_BUCKET ?? 'baseline'
const FILTER = process.env.MCP_AUDIT_FILTER ?? ''
const OUT = process.env.MCP_AUDIT_OUT

type OpenStep = (user: UserEvent) => Promise<unknown>
type AuditCase = readonly [name: string, element: ReactElement, open?: OpenStep]

const BUCKETS: Record<string, readonly AuditCase[]> = { baseline, overlays, interactive }

// Returns the `data-slot` attribute value on the violating node, anchoring each
// finding to the component's stable slot. Named to avoid the `data-slot` prop
// token the boundary guard forbids (data-slot-boundary.test.ts).
function slotOf(html: string): string | undefined {
	return html.match(/data-slot="([^"]+)"/)?.[1]
}

// Types derived from the `axe` helper itself, so the boundary stays precise
// without an `any` (CONVENTIONS §4.1) or a direct axe-core import.
type Violation = Awaited<ReturnType<typeof axe>>['violations'][number]

function serialize(violation: Violation) {
	return {
		id: violation.id,
		impact: violation.impact,
		help: violation.help,
		helpUrl: violation.helpUrl,
		wcag: violation.tags.filter((t) => t.startsWith('wcag') || t.startsWith('cat')),
		nodes: violation.nodes.map((n) => ({
			target: n.target,
			slot: slotOf(n.html),
			failureSummary: n.failureSummary,
		})),
	}
}

if (!ARMED) {
	describe.skip('a11y mcp audit (disarmed)', () => {
		it('runs only when MCP_AUDIT=1', () => {})
	})
} else {
	const selected = (BUCKETS[BUCKET] ?? [])
		.filter(([name]) => name.includes(FILTER))
		.map(([name, element, open]) => ({ name, element, open }))
	const results: Array<{
		case: string
		violations: ReturnType<typeof serialize>[]
		error?: string
	}> = []

	afterAll(() => {
		if (OUT)
			writeFileSync(OUT, JSON.stringify({ bucket: BUCKET, filter: FILTER, results }, null, 2))
	})

	describe('a11y mcp audit', () => {
		// Each case is isolated (it.each → per-case cleanup), mirroring the gate.
		// A throwing case records its error instead of aborting the batch.
		it.each(selected)('$name', async ({ name, element, open }) => {
			try {
				if (BUCKET === 'baseline') {
					const { container } = renderUI(element)
					results.push({ case: name, violations: (await axe(container)).violations.map(serialize) })
				} else {
					renderUI(element)
					if (open) await open(userEvent.setup())
					results.push({
						case: name,
						violations: (await axe(document.body)).violations.map(serialize),
					})
				}
			} catch (err) {
				results.push({ case: name, violations: [], error: String(err) })
			}
		})
	})
}
