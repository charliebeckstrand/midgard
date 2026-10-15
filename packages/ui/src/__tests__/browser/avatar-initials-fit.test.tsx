import { describe, expect, it } from 'vitest'
import { Avatar } from '../../components/avatar'
import { densitySteps } from '../../core/density'
import { bySlot, present, renderUI } from '../helpers'

/**
 * The half height of the capitals, as a fraction of the font size. The ink of
 * a capital is about 0.7em high and sits on the middle of the circle, so the
 * text must fit the chord of the circle at this distance from the center.
 */
const CAP_HALF = 0.36

/**
 * Avatar geometry that only a real layout shows: jsdom loads no stylesheet.
 */
describe('avatar initials fit (real browser)', () => {
	it.each(
		densitySteps.flatMap((size) =>
			['+100', '+999', 'ABC', 'WWW', 'WWWW', 'WWWWW'].map((initials) => [size, initials] as const),
		),
	)('fits the %s initials %s in the circle', (size, initials) => {
		const { container } = renderUI(<Avatar size={size} initials={initials} alt="" />)

		const avatar = present(bySlot(container, 'avatar'), 'avatar')

		const svg = present(avatar.querySelector('svg'), 'initials svg')

		const text = present(avatar.querySelector('text'), 'initials')

		// The circle clips at its padding box, which the SVG fills.
		const circle = svg.getBoundingClientRect()

		const box = text.getBoundingClientRect()

		const radius = circle.width / 2

		const centerX = circle.left + radius

		// The SVG maps 100 units to the width of the circle.
		const capHalf =
			(Number.parseFloat(getComputedStyle(text).fontSize) * CAP_HALF * circle.width) / 100

		const halfChord = Math.sqrt(radius ** 2 - capHalf ** 2)

		expect(box.left).toBeGreaterThanOrEqual(centerX - halfChord)

		expect(box.right).toBeLessThanOrEqual(centerX + halfChord)
	})

	it.each(['A', 'AB', '+3', 'WW', 'MW', '+12', '+99', 'JRR'])(
		'keeps the full size for the short initials %s',
		(initials) => {
			const { container } = renderUI(<Avatar initials={initials} alt="" />)

			const text = present(container.querySelector('text'), 'initials')

			expect(getComputedStyle(text).fontSize).toBe('48px')
		},
	)
})
