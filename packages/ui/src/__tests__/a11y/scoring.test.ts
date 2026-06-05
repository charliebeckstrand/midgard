import { describe, expect, it } from 'vitest'
import { IMPACT_WEIGHTS, scoreViolations, type Violationish } from './scoring'

const violation = (impact: Violationish['impact'], nodes: number): Violationish => ({
	impact,
	nodes: Array.from({ length: nodes }),
})

describe('scoreViolations', () => {
	it('scores a clean run as 100 with no deductions', () => {
		const result = scoreViolations([])

		expect(result.score).toBe(100)
		expect(result.deductions).toBe(0)
		expect(result.counts).toEqual({ critical: 0, serious: 0, moderate: 0, minor: 0 })
	})

	it('deducts each impact weight per violating node', () => {
		const result = scoreViolations([
			violation('critical', 1),
			violation('serious', 2),
			violation('moderate', 1),
			violation('minor', 3),
		])

		// 10 + 2×5 + 2 + 3×1 = 25
		expect(result.deductions).toBe(25)
		expect(result.score).toBe(75)
		expect(result.counts).toEqual({ critical: 1, serious: 2, moderate: 1, minor: 3 })
	})

	it('weights a single critical node above a fistful of minor ones', () => {
		const critical = scoreViolations([violation('critical', 1)]).score
		const fewMinors = scoreViolations([violation('minor', 3)]).score

		expect(critical).toBeLessThan(fewMinors)
	})

	it('clamps the floor at 0 rather than going negative', () => {
		const result = scoreViolations([violation('critical', 50)])

		expect(result.deductions).toBe(500)
		expect(result.score).toBe(0)
	})

	it('treats null or unknown impact as minor', () => {
		const result = scoreViolations([violation(null, 1)])

		expect(result.score).toBe(100 - IMPACT_WEIGHTS.minor)
		expect(result.counts.minor).toBe(1)
	})
})
