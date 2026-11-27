import { describe, expect, it } from 'vitest'
import { LoadingDots, LoadingSpinner } from '../../components/loading'
import { getSlot, renderUI } from '../helpers'
import { animationNames } from './helpers/animation-names'

/**
 * Real-browser check of the loading indicators for a reader who does not ask
 * for reduced motion: the spinner spins and each dot pulses.
 * `reduced-motion/loading-motion.test.tsx` holds the check for a reader who asks
 * for reduced motion.
 */
describe('loading indicators under full motion (real browser)', () => {
	it('spins the spinner', () => {
		const { container } = renderUI(<LoadingSpinner />)

		expect(animationNames(getSlot(container, 'loading-spinner'))).toEqual(['spin'])
	})

	it('pulses each dot', () => {
		const { container } = renderUI(<LoadingDots />)

		const dots = [...container.querySelectorAll<HTMLElement>('[data-slot="loading-dot"]')]

		expect(dots.flatMap(animationNames)).toEqual(['pulse', 'pulse', 'pulse'])
	})
})
