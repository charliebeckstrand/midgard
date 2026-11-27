import { describe, expect, it } from 'vitest'
import { LoadingDots, LoadingSpinner } from '../../../components/loading'
import { getSlot, renderUI } from '../../helpers'
import { animationNames } from '../helpers/animation-names'

/**
 * Real-browser check of the loading indicators for a reader who asks for
 * reduced motion (WCAG 2.3.3). The spin and the pulse are behind `motion-safe:`,
 * so the spinner rests as a static glyph and each dot rests as a steady dot.
 * `loading-motion.test.tsx` of the `browser` instance holds the animations for
 * full motion.
 */
describe('loading indicators under reduced motion (real browser)', () => {
	it('runs no spin on the spinner', () => {
		const { container } = renderUI(<LoadingSpinner />)

		expect(animationNames(getSlot(container, 'loading-spinner'))).toEqual([])
	})

	it('runs no pulse on the dots', () => {
		const { container } = renderUI(<LoadingDots />)

		const dots = [...container.querySelectorAll<HTMLElement>('[data-slot="loading-dot"]')]

		// The count is live, so the check below can fail.
		expect(dots).toHaveLength(3)

		expect(dots.flatMap(animationNames)).toEqual([])
	})
})
