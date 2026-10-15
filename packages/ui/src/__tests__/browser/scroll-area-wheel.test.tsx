import { describe, expect, it, vi } from 'vitest'
import { ScrollArea } from '../../components/scroll-area'
import { getSlot, renderUI } from '../helpers'

/**
 * Shift+wheel is the horizontal-scroll gesture, and a `ScrollArea` has to decide
 * whether to keep it or hand it up. It keeps the gesture when its own viewport
 * can scroll horizontally, and forwards it when it cannot — otherwise a
 * non-overflowing area would swallow a gesture meant for an ancestor.
 *
 * The decision reads `scrollWidth` against `clientWidth`. jsdom reports both as
 * zero, so its unit suite wrote the pair onto the viewport before dispatching,
 * which decided the branch it then asserted. Here the content is really wider
 * than the box, or really is not, and each case states that precondition before
 * reading the gesture.
 */
describe('ScrollArea shift+wheel against real overflow', () => {
	/** Dispatches a cancelable shift+wheel and reports whether it was consumed. */
	function shiftWheel(target: HTMLElement): boolean {
		const event = new WheelEvent('wheel', {
			shiftKey: true,
			deltaY: 10,
			bubbles: true,
			cancelable: true,
		})

		target.dispatchEvent(event)

		return event.defaultPrevented
	}

	it('keeps the gesture when the viewport really overflows horizontally', () => {
		const { container } = renderUI(
			<div style={{ width: 200 }}>
				<ScrollArea orientation="horizontal">
					<div style={{ width: 800 }}>content</div>
				</ScrollArea>
			</div>,
		)

		const viewport = getSlot(container, 'scroll-area-viewport')

		expect(viewport.scrollWidth).toBeGreaterThan(viewport.clientWidth)

		// The viewport scrolls horizontally itself; forwarding the gesture to an
		// ancestor would hijack it from its own content.
		expect(shiftWheel(viewport)).toBe(false)
	})

	it('forwards the gesture when the viewport has no horizontal overflow', () => {
		const { container } = renderUI(
			<div style={{ width: 400 }}>
				<ScrollArea>
					<div style={{ width: 100 }}>content</div>
				</ScrollArea>
			</div>,
		)

		const viewport = getSlot(container, 'scroll-area-viewport')

		expect(viewport.scrollWidth).toBe(viewport.clientWidth)

		expect(shiftWheel(viewport)).toBe(true)
	})

	it('leaves the gesture to a horizontal scroller inside the viewport', () => {
		const { container } = renderUI(
			<div style={{ width: 300 }}>
				<ScrollArea>
					<div data-testid="inner" style={{ overflowX: 'auto' }}>
						<div style={{ width: 800 }}>content</div>
					</div>
				</ScrollArea>
			</div>,
		)

		const viewport = getSlot(container, 'scroll-area-viewport')

		const inner = container.querySelector<HTMLElement>('[data-testid="inner"]')

		if (!inner) throw new Error('no inner scroller')

		expect(viewport.scrollWidth).toBe(viewport.clientWidth)

		expect(inner.scrollWidth).toBeGreaterThan(inner.clientWidth)

		// The gesture scrolls the inner scroller natively. The area must not
		// cancel it and send it to an ancestor.
		expect(shiftWheel(inner)).toBe(false)
	})

	it('forwards the gesture once from an area inside another area', () => {
		const { container } = renderUI(
			<div style={{ height: 200 }}>
				<ScrollArea bare className="h-full">
					<div style={{ height: 1000 }}>
						<ScrollArea bare className="h-[50px]">
							<div style={{ height: 300 }}>content</div>
						</ScrollArea>
					</div>
				</ScrollArea>
			</div>,
		)

		const [outer, inner] = container.querySelectorAll<HTMLElement>(
			'[data-slot="scroll-area-viewport"]',
		)

		if (!outer || !inner) throw new Error('no nested areas')

		const elementScroll = vi.spyOn(Element.prototype, 'scrollBy')

		const windowScroll = vi.spyOn(window, 'scrollBy')

		const event = new WheelEvent('wheel', {
			shiftKey: true,
			deltaY: 10,
			bubbles: true,
			cancelable: true,
		})

		inner.dispatchEvent(event)

		// The inner area hands the gesture to the outer viewport. The outer area
		// must not then hand the same gesture to its own ancestor.
		expect(elementScroll).toHaveBeenCalledTimes(1)

		expect(elementScroll.mock.contexts[0]).toBe(outer)

		expect(windowScroll).not.toHaveBeenCalled()
	})
})
