import { describe, expect, it } from 'vitest'
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
	function shiftWheel(viewport: HTMLElement): boolean {
		const event = new WheelEvent('wheel', { shiftKey: true, deltaY: 10, cancelable: true })

		viewport.dispatchEvent(event)

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
})
