import { describe, expect, it } from 'vitest'
import { ShinyText } from '../../../components/shiny-text'
import { bySlot, getSlot, renderUI } from '../../helpers'
import { animationNames } from '../helpers/animation-names'

/**
 * Real-browser check of the ShinyText sweep for a reader who asks for reduced
 * motion. The sweep is behind `motion-safe:`, so the platform setting stops it.
 * `shiny-text-sweep.test.tsx` of the `browser` instance holds the sweep and the
 * case of the Motion setting.
 */
describe('ShinyText sweep under reduced motion (real browser)', () => {
	it('runs no sweep', async () => {
		const { container } = renderUI(<ShinyText>Shine</ShinyText>)

		// The class waits for the in-view report, so the text must be in view
		// first for the empty list to mean anything.
		await expect
			.poll(() => bySlot(container, 'shiny-text')?.className)
			.toContain('motion-safe:animate-shiny-text')

		expect(animationNames(getSlot(container, 'shiny-text'))).toEqual([])
	})
})
