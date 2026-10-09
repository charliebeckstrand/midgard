// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { type DensityStep, densitySteps } from '../../core/density'
import { geometry, lineHeight } from '../../core/density/geometry'
import { valuesByStep } from '../../core/density/steps'
import { dan } from '../../recipes/kiso/dan'

/**
 * The ramps of `dan` are literal classes, because Tailwind reads each class
 * from its source. `core/density/geometry.ts` gives the formula of each
 * text-coupled ramp. These cases hold each literal to its formula, and they
 * check the identities of the model against the live ramps.
 */

/** The size of each name of the text scale, in px. */
const textScale: Record<string, number> = {
	'2xs': 10,
	xs: 12,
	sm: 14,
	base: 16,
	lg: 18,
	xl: 20,
	'2xl': 24,
	'3xl': 30,
	'4xl': 36,
	'5xl': 48,
}

/** The ramp at `path` in `dan`, such as `size.icon.base`. */
function rampAt(path: string): string {
	const value = path
		.split('.')
		.reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], dan)

	if (typeof value !== 'string') throw new Error(`No ramp at dan.${path}`)

	return value
}

/**
 * The px value of `ramp` at each step. A text ramp gives its font size. A ring
 * utility subtracts its 1 px ring. Each other ramp gives its spacing stop.
 */
function pxOf(ramp: string): Record<DensityStep, number> {
	const match = /density-([a-z-]+)-\[([^\]]+)\]$/.exec(ramp)

	if (!match) throw new Error(`Not a ramp: ${ramp}`)

	const [, utility, list] = match as unknown as [string, string, string]

	const values = valuesByStep(list)

	if (!values) throw new Error(`Not a list of three or five values: ${ramp}`)

	const px = (value: string) => {
		if (utility === 'text') return textScale[value] ?? Number.NaN

		const stop = Number(value) * 4

		return utility.endsWith('-ring') ? stop - 1 : stop
	}

	return Object.fromEntries(densitySteps.map((step) => [step, px(values[step])])) as Record<
		DensityStep,
		number
	>
}

describe('density geometry', () => {
	describe.each(Object.entries(geometry))('dan.%s', (path, formula) => {
		const ramp = rampAt(path)

		it('has five values', () => {
			expect(/\[([^\]]+)\]$/.exec(ramp)?.[1]?.split(',')).toHaveLength(5)
		})

		it.each(densitySteps)('renders the formula at %s', (step) => {
			expect(pxOf(ramp)[step]).toBe(formula(step))
		})
	})

	describe.each(densitySteps)('at %s', (step) => {
		const body = pxOf(dan.text.body)[step]

		const chip = pxOf(dan.text.chip)[step]

		const icon = pxOf(dan.size.icon.base)[step]

		const leading = lineHeight(step)

		it('centers the icon in the line box with a 2 px margin', () => {
			expect((leading - icon) / 2).toBe(2)
		})

		it('gives the line height of the text plus 8 px', () => {
			expect(leading).toBe(body + 8)

			expect(leading).toBe(chip + 8)
		})

		it('gives an icon-only button the height of a labeled button', () => {
			const square = icon + 2 * pxOf(dan.space.button.base)[step]

			const labeled = chip + 8 + 2 * pxOf(dan.space.button.label)[step]

			expect(square).toBe(labeled)
		})

		it('gives a control the height of a button', () => {
			const control = body + 8 + 2 * pxOf(dan.space.control.y)[step]

			const button = chip + 8 + 2 * pxOf(dan.space.button.label)[step]

			expect(control).toBe(button)
		})
	})
})
