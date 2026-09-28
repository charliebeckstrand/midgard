// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { densitySteps } from '../../core/density'
import { headingRamp, headingWeight, k, titleRamp } from '../../recipes/kata/heading'
import { ji } from '../../recipes/kiso'
import { findSteps } from '../helpers/class-stops'

/**
 * The type scale, low to high, in the names that `density-text` takes. A heading
 * ramp names a rung of this scale for each step. Tailwind needs each class as a
 * literal, so the ramps are the source, and these cases hold their shape: each
 * level has a rung of its own, the levels keep their order at each step, and a
 * step moves a level one rung.
 */
const scale = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'] as const

/**
 * The skeleton height of each rung. The silhouette of a heading is as tall as
 * the rung that the heading takes.
 */
const heightOf = {
	xs: '2',
	sm: '3',
	base: '4',
	lg: '5',
	xl: '6',
	'2xl': '7',
	'3xl': '8',
	'4xl': '9',
} as const satisfies Record<(typeof scale)[number], string>

const levels = [1, 2, 3, 4, 5, 6] as const

type Level = (typeof levels)[number]

const { weight } = ji

/** The rung of `level` at each step, from its ramp. */
const rungsOf = (level: Level) => findSteps([headingRamp[level]], 'density-text-')

/** The position of `rung` on the scale, or -1 when it is not on the scale. */
const indexOf = (rung: string) => scale.indexOf(rung as (typeof scale)[number])

describe('heading ramps', () => {
	it.each(levels)('names a rung of the scale at each step for level %i', (level) => {
		const rungs = rungsOf(level)

		for (const step of densitySteps) expect(indexOf(rungs[step])).not.toBe(-1)
	})

	it.each(levels)('gives level %i a rung of its own at md', (level) => {
		const others = levels.filter((other) => other !== level)

		expect(others.map((other) => rungsOf(other).md)).not.toContain(rungsOf(level).md)
	})

	it.each(densitySteps)('descends through the levels at the %s step', (step) => {
		const positions = levels.map((level) => indexOf(rungsOf(level)[step]))

		expect(positions).toStrictEqual([...positions].sort((a, b) => b - a))
	})

	it.each(levels)('moves level %i one rung for each step away from md', (level) => {
		const rungs = rungsOf(level)

		const md = indexOf(rungs.md)

		expect([rungs.xs, rungs.sm, rungs.lg, rungs.xl].map(indexOf)).toStrictEqual([
			md - 1,
			md - 1,
			md + 1,
			md + 1,
		])
	})

	it.each(levels)('keeps the skeleton of level %i as tall as its rung at each step', (level) => {
		const rungs = rungsOf(level)

		const heights = findSteps([k.skeleton.ramp[level]], 'density-h-')

		for (const step of densitySteps) {
			expect(heights[step]).toBe(heightOf[rungs[step] as keyof typeof heightOf])
		}
	})

	it('gives a title the ramp of level 4', () => {
		expect(titleRamp).toBe(headingRamp[4])
	})
})

describe('headingWeight', () => {
	it('eases from bold at the top of the scale to medium at the bottom', () => {
		const order: string[] = [weight.bold, weight.semibold, weight.medium]

		const ranks = levels.map((level) => order.indexOf(headingWeight(level)))

		expect(ranks).not.toContain(-1)

		expect(ranks).toStrictEqual([...ranks].sort((a, b) => a - b))
	})

	it.each(levels)('is the weight that the recipe gives level %i', (level) => {
		expect(k({ level })).toContain(headingWeight(level))
	})
})
