import { describe, expect, it } from 'vitest'
import { ShinyText, ShinyTextSkeleton } from '../../components/shiny-text'
import { bySlot, getSlot, renderUI } from '../helpers'
import { installControlledObserver } from '../helpers/controlled-intersection'

// A CSS animation runs the sweep. The class carries it behind `motion-safe:`,
// so the gate here is whether the class is on the span.
const SWEEP = 'motion-safe:animate-shiny-text'

describe('ShinyText', () => {
	it('renders its children inside the masked span', () => {
		const { container } = renderUI(<ShinyText>Shine</ShinyText>)

		expect(bySlot(container, 'shiny-text')).toHaveTextContent('Shine')
	})

	it('masks the text with the gradient highlight', () => {
		const { container } = renderUI(<ShinyText shineColor="red">Shine</ShinyText>)

		const el = bySlot(container, 'shiny-text')

		expect(el).toHaveClass('bg-clip-text', 'text-transparent')

		expect(el?.style.backgroundImage).toContain('red')
	})

	it('merges a consumer style rather than losing the gradient to it', () => {
		const { container } = renderUI(
			<ShinyText shineColor="red" style={{ marginInlineStart: 4 }}>
				Shine
			</ShinyText>,
		)

		const el = bySlot(container, 'shiny-text')

		// The consumer's own key lands.
		expect(el?.style.marginInlineStart).toBe('4px')

		// The keys that carry the sweep survive it.
		expect(el?.style.backgroundImage).toContain('red')

		// jsdom normalizes `200% auto` to `200%`.
		expect(el?.style.backgroundSize).toContain('200%')
	})

	it('runs the sweep in view, behind motion-safe', () => {
		const { container } = renderUI(<ShinyText>Shine</ShinyText>)

		// Positive control: anchors the negative assertions below.
		expect(bySlot(container, 'shiny-text')).toHaveClass(SWEEP)
	})

	// The gradient is twice the width of the text, so a position of p% puts the
	// shine at (1 - p/100) of the text width. At rest the shine is past the right
	// edge, where the sweep to the left starts.
	it('parks the shine past the right edge', () => {
		const { container } = renderUI(<ShinyText>Shine</ShinyText>)

		expect(bySlot(container, 'shiny-text')?.style.backgroundPosition).toBe('-50% center')
	})

	it('takes the duration of a sweep from speed', () => {
		const { container } = renderUI(<ShinyText speed={3}>Shine</ShinyText>)

		expect(bySlot(container, 'shiny-text')?.style.animationDuration).toBe('3s')
	})

	it('stops the sweep off screen and starts it again in view', () => {
		const observer = installControlledObserver()

		const { container } = renderUI(<ShinyText>Shine</ShinyText>)

		const el = bySlot(container, 'shiny-text')

		expect(el).not.toHaveClass(SWEEP)

		observer.report(true)

		expect(el).toHaveClass(SWEEP)

		observer.report(false)

		expect(el).not.toHaveClass(SWEEP)
	})

	it('renders static text and runs no sweep when disabled', () => {
		const { container } = renderUI(<ShinyText disabled>Shine</ShinyText>)

		expect(bySlot(container, 'shiny-text')).toHaveTextContent('Shine')

		expect(bySlot(container, 'shiny-text')).not.toHaveClass(SWEEP)
	})
})

describe('ShinyTextSkeleton', () => {
	it('renders an inline span with a width, so it is valid in a paragraph and does not collapse', () => {
		const { container } = renderUI(
			<p>
				Status: <ShinyTextSkeleton />
			</p>,
		)

		const el = getSlot(container, 'placeholder')

		expect(el.tagName).toBe('SPAN')

		expect(el.parentElement?.tagName).toBe('P')

		expect(el).toHaveClass('inline-block', 'w-full')
	})
})
