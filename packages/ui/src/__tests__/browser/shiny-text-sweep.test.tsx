import { afterEach, describe, expect, it } from 'vitest'
import { ShinyText } from '../../components/shiny-text'
import { rootReducedMotionClass } from '../../core/motion/root'
import { bySlot, renderUI } from '../helpers'

/**
 * Real-browser check of the ShinyText sweep. A CSS animation of
 * `ui/tailwind.css` runs the sweep, behind `motion-safe:`. The class comes on
 * when the text is in the viewport.
 */
describe('ShinyText sweep (real browser)', () => {
	afterEach(() => {
		document.documentElement.classList.remove(rootReducedMotionClass)
	})

	function sweepOf(container: HTMLElement) {
		const text = bySlot(container, 'shiny-text')

		if (!text) throw new Error('expected the text')

		return () => text.getAnimations().map((animation) => (animation as CSSAnimation).animationName)
	}

	it('runs the sweep while the text is in view', async () => {
		const { container } = renderUI(<ShinyText>Shine</ShinyText>)

		const sweep = sweepOf(container)

		await expect.poll(sweep).toEqual(['shiny-text'])
	})

	// The browser of the suite asks for no reduction, so the Motion setting of
	// the root reduces motion here.
	it('runs no sweep under reduced motion', async () => {
		document.documentElement.classList.add(rootReducedMotionClass)

		const { container } = renderUI(<ShinyText>Shine</ShinyText>)

		const sweep = sweepOf(container)

		// The class waits for the in-view report, so the text must be in view
		// first for the empty list to mean anything.
		await expect
			.poll(() => bySlot(container, 'shiny-text')?.className)
			.toContain('motion-safe:animate-shiny-text')

		expect(sweep()).toEqual([])
	})
})
