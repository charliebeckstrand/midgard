// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { headingScale, headingWeight, k, titleSize } from '../../recipes/kata/heading'
import { ji } from '../../recipes/kiso'
import { steps } from '../../recipes/kiso/sun'

const { size, weight } = ji

const levels = [1, 2, 3, 4, 5, 6] as const

// The heading ladder is arithmetic over a rung list, and `heading.test.tsx`
// reached it through a render and four pinned class literals, which covers
// four of the eighteen level-by-step pairs. Reading the kata directly covers
// all eighteen, and every expectation here derives from the ladder, so a typo
// in a rung fails and a deliberate move of the whole scale does not.

/** Ladder position of a rung, which the hierarchy cases order against. */
const rungIndex = (rung: keyof typeof size) => Object.keys(size).indexOf(rung)

describe('headingScale', () => {
	it.each(levels)('gives level %i a rung of its own at neutral density', (level) => {
		const others = levels.filter((other) => other !== level)

		expect(others.map((other) => headingScale(other, 'md'))).not.toContain(
			headingScale(level, 'md'),
		)
	})

	it.each(steps)('descends through the levels at the %s step', (step) => {
		const rungs = levels.map((level) => rungIndex(headingScale(level, step)))

		expect(rungs).toStrictEqual([...rungs].sort((a, b) => b - a))
	})

	it.each(levels)('shifts level %i by exactly one rung per step away from neutral', (level) => {
		const neutral = rungIndex(headingScale(level, 'md'))

		expect(rungIndex(headingScale(level, 'sm'))).toBe(neutral - 1)

		expect(rungIndex(headingScale(level, 'lg'))).toBe(neutral + 1)
	})
})

describe('titleSize', () => {
	it.each(steps)('takes the level-4 rung at the %s step', (step) => {
		expect(titleSize(step)).toBe(size[headingScale(4, step)])
	})
})

describe('headingWeight', () => {
	it('eases from bold at the top of the scale to medium at the bottom', () => {
		const order: string[] = [weight.bold, weight.semibold, weight.medium]

		const ranks = levels.map((level) => order.indexOf(headingWeight(level)))

		expect(ranks).not.toContain(-1)

		expect(ranks).toStrictEqual([...ranks].sort((a, b) => a - b))
	})
})

describe('the heading recipe', () => {
	it.each(levels)('emits the weight `headingWeight` reports for level %i', (level) => {
		expect(k({ level })).toContain(headingWeight(level))
	})

	it.each(steps)('emits the level-1 size class for the %s step', (step) => {
		expect(k({ scale: headingScale(1, step) })).toContain(size[headingScale(1, step)])
	})
})
