import { describe, expect, it, onTestFinished } from 'vitest'
import { isScrollbarPress } from '../../utilities/scrollbar-press'

/**
 * The unit suite stubs the geometry. These cases read the real `offsetX` that Chromium gives a
 * press on a bordered scroller under `direction: rtl`. Headless Chromium hides its scrollbars,
 * so the gutter takes no width here, and the borders are the only term to subtract.
 */
describe('isScrollbarPress in a real browser', () => {
	/** Mounts a bordered, vertically scrolling box and presses it at `x` from its border-box edge. */
	function pressAt(x: number) {
		const scroller = document.createElement('div')

		scroller.style.cssText =
			'width: 200px; height: 100px; overflow-y: auto; direction: rtl; border-left: 7px solid; border-right: 3px solid'

		const content = document.createElement('div')

		content.style.height = '400px'

		scroller.append(content)

		document.body.append(scroller)

		onTestFinished(() => scroller.remove())

		const box = scroller.getBoundingClientRect()

		const event = new MouseEvent('mousedown', { clientX: box.left + x, clientY: box.top + 50 })

		scroller.dispatchEvent(event)

		return { event, scroller }
	}

	it('measures offsetX from the inner border edge', () => {
		const { event } = pressAt(10)

		expect(event.offsetX).toBeCloseTo(3, 0)
	})

	it('reads a press just inside the inline-start border as content', () => {
		const { event, scroller } = pressAt(10)

		expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight)

		expect(isScrollbarPress(event, scroller)).toBe(false)
	})
})
