import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { cdp } from 'vitest/browser'
import { Swatch } from '../../components/swatch'
import { bySlot, present, renderUI } from '../helpers'

/** The color that forced colors give the page background. */
function canvas(): string {
	const probe = document.createElement('div')
	probe.style.cssText = 'forced-color-adjust: none; background-color: Canvas'
	document.body.append(probe)
	const color = getComputedStyle(probe).backgroundColor
	probe.remove()
	return color
}

/**
 * A `solid` swatch is only its `currentColor` background, and a `dashed` line is
 * only a gradient. Forced colors replace the background with `Canvas` and
 * remove the gradient. Each mark must still paint, or it disappears from the
 * legend, the tooltip, and the status dot.
 */
describe('Swatch under forced colors (real browser)', () => {
	beforeAll(() =>
		cdp().send('Emulation.setEmulatedMedia', {
			features: [{ name: 'forced-colors', value: 'active' }],
		}),
	)
	afterAll(() =>
		cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: '' }] }),
	)

	it.each(['square', 'circle', 'line'] as const)(
		'a solid %s paints a color other than Canvas',
		(shape) => {
			const { container } = renderUI(<Swatch shape={shape} color="blue" />)
			const el = present(bySlot(container, 'swatch'), 'swatch')

			expect(getComputedStyle(el).backgroundColor).not.toBe(canvas())
		},
	)

	it('a dashed line keeps its dash run in CanvasText', () => {
		const { container } = renderUI(<Swatch shape="line" variant="dashed" color="blue" />)
		const el = present(bySlot(container, 'swatch'), 'swatch')
		const style = getComputedStyle(el)

		expect(style.backgroundImage).toContain('repeating-linear-gradient')

		expect(style.color).not.toBe(canvas())
	})
})
