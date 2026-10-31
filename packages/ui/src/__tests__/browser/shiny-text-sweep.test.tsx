import { describe, expect, it } from 'vitest'
import { ShinyText } from '../../components/shiny-text'
import { ROOT_REDUCED_MOTION_CLASS } from '../../core/motion/root'
import { bySlot, renderUI } from '../helpers'
import { holdRootClass } from './helpers/root-state'

/**
 * Real-browser check of the ShinyText sweep. A CSS animation of
 * `ui/tailwind.css` runs the sweep, behind `motion-safe:`. The class comes on
 * when the text is in the viewport.
 */
describe('ShinyText sweep (real browser)', () => {
	function readSweep(container: HTMLElement) {
		const text = bySlot(container, 'shiny-text')

		if (!text) throw new Error('expected the text')

		return () => text.getAnimations().map((animation) => (animation as CSSAnimation).animationName)
	}

	it('runs the sweep while the text is in view', async () => {
		const { container } = renderUI(<ShinyText>Shine</ShinyText>)

		const sweep = readSweep(container)

		await expect.poll(sweep).toEqual(['shiny-text'])
	})

	// The browser of the suite asks for no reduction, so the Motion setting of
	// the root reduces motion here.
	it('runs no sweep under reduced motion', async () => {
		holdRootClass(ROOT_REDUCED_MOTION_CLASS)

		const { container } = renderUI(<ShinyText>Shine</ShinyText>)

		const sweep = readSweep(container)

		// The class waits for the in-view report, so the text must be in view
		// first for the empty list to mean anything.
		await expect
			.poll(() => bySlot(container, 'shiny-text')?.className)
			.toContain('motion-safe:animate-shiny-text')

		expect(sweep()).toEqual([])
	})

	// The text is transparent, and the gradient alone paints the glyphs. A print
	// with no background graphics drops the gradient, so the span must keep it.
	it('keeps the gradient in print, so the text does not disappear', () => {
		const { container } = renderUI(<ShinyText>Shine</ShinyText>)

		const text = bySlot(container, 'shiny-text')

		if (!text) throw new Error('expected the text')

		expect(getComputedStyle(text).printColorAdjust).toBe('exact')
	})
})
