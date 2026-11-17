// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { REFERENCE_DASH_OFF, REFERENCE_DASH_ON } from '../../modules/chart/engine/chart-constants'
import { ruleDashArray, rulePieces } from '../../modules/chart/engine/chart-geometry/rule'
import { FLOAT } from '../helpers/geometry/tolerance'

/**
 * A piece fits a whole count of dashes, so each dash and each gap stretches or
 * shrinks from its own length by less than this bound.
 */
const DASH_FIT_TOLERANCE = 0.5

/** The drawn spans of a dash pattern, as `[from, to]` from the start of the rule. */
function drawn(pattern: number[]): [number, number][] {
	const spans: [number, number][] = []

	let at = 0

	pattern.forEach((length, index) => {
		if (index % 2 === 0 && length > 0) spans.push([at, at + length])

		at += length
	})

	return spans
}

describe('rulePieces', () => {
	it('keeps the spans between the breaks, merged and clamped to the rule', () => {
		expect(
			rulePieces(100, [
				{ from: 40, to: 50 },
				{ from: 45, to: 60 },
				{ from: 90, to: 120 },
			]),
		).toEqual([
			{ from: 0, to: 40 },
			{ from: 60, to: 90 },
		])
	})

	it('drops a piece too short to see', () => {
		expect(
			rulePieces(100, [
				{ from: 0, to: 49.5 },
				{ from: 50, to: 100 },
			]),
		).toEqual([])
	})
})

describe('ruleDashArray', () => {
	it('starts and ends each piece on a full dash, so each break is the same at both sides', () => {
		const pattern = ruleDashArray(200, [{ from: 93, to: 117 }], true) ?? []

		const spans = drawn(pattern)

		// The first dash starts the rule, a dash ends right at the break, the next
		// starts right after it, and the last dash ends the rule.
		expect(spans[0]?.[0]).toBeNear(0, FLOAT)

		expect(spans.find(([, to]) => Math.abs(to - 93) < FLOAT)).toBeDefined()

		expect(spans.find(([from]) => Math.abs(from - 117) < FLOAT)).toBeDefined()

		expect(spans.at(-1)?.[1]).toBeNear(200, FLOAT)
	})

	it('keeps the dash and the gap near their own lengths', () => {
		const [dash = 0, gap = 0] = ruleDashArray(203, [], true) ?? []

		expect(dash).toBeNear(REFERENCE_DASH_ON, DASH_FIT_TOLERANCE)

		expect(gap).toBeNear(REFERENCE_DASH_OFF, DASH_FIT_TOLERANCE)

		expect(dash / gap).toBeNear(REFERENCE_DASH_ON / REFERENCE_DASH_OFF, FLOAT)
	})

	it('draws nothing first for a rule that starts with a break', () => {
		const pattern = ruleDashArray(100, [{ from: 0, to: 20 }], true) ?? []

		expect(pattern.slice(0, 2)).toEqual([0, 20])
	})

	it('ends with an empty length past the rule, so the pattern does not repeat', () => {
		const pattern = ruleDashArray(100, [], true) ?? []

		expect(pattern.length % 2).toBe(0)

		expect(pattern.at(-1)).toBeGreaterThanOrEqual(100)
	})

	it('draws each piece of a solid rule whole, and needs no pattern with no break', () => {
		expect(ruleDashArray(100, [{ from: 40, to: 60 }], false)).toEqual([40, 20, 40, 100])

		expect(ruleDashArray(100, [], false)).toBeUndefined()
	})
})
