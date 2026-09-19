import { beforeEach, describe, expect, it } from 'vitest'
import { CurrentContent, CurrentContents, CurrentContext } from '../../primitives/current'
import { act, bySlot, renderUI } from '../helpers'
import { type ResizeObserverStub, stubResizeObserver } from '../helpers/stub-resize-observer'

/**
 * The morph's pin arithmetic, over notifications a browser cannot stage.
 *
 * What the container does against real layout is asserted in
 * `browser/current-morph.test.tsx`: that it tweens rather than snapping, that
 * it rests at `height: auto`, and that a real width-coupled drag passes through
 * with no morph and no React commit. The two cases below cannot move there, for
 * the reason that also keeps the chart frame's equality guard under jsdom. Both
 * need a resize sequence delivered on demand — a height-only frame at a fixed
 * width, then a width-coupled frame arriving mid-morph — and a real
 * `ResizeObserver` delivers what layout produces, never what a case asks for. A
 * browser attempt at the interrupt could not observe the pin reliably, so it
 * would have asserted nothing at all.
 *
 * The stub is the subject here, and the pin values are the claim.
 */

/** Stubs an element's `getBoundingClientRect` box (jsdom always reports 0). */
function mockRect(el: Element, box: { width: number; height: number }) {
	Object.defineProperty(el, 'getBoundingClientRect', {
		value: () => ({ ...box, top: 0, left: 0, right: box.width, bottom: box.height }),
		configurable: true,
	})
}

describe('CurrentContents morph pin arithmetic', () => {
	let observers: ResizeObserverStub[]

	beforeEach(() => {
		observers = stubResizeObserver()
	})

	function mount(value: string) {
		return renderUI(
			<CurrentContext value={{ value, onValueChange: undefined }}>
				<CurrentContents slotPrefix="test" fade mount="always">
					<CurrentContent slotPrefix="test" value="a">
						Panel A
					</CurrentContent>
					<CurrentContent slotPrefix="test" value="b">
						Panel B
					</CurrentContent>
				</CurrentContents>
			</CurrentContext>,
		)
	}

	/** Delivers one observer frame for every observed panel. */
	function fire(box: { inline: number; block: number }) {
		act(() => {
			for (const observer of observers) {
				const entries = observer.targets.map((target) => ({
					target,
					borderBoxSize: [{ inlineSize: box.inline, blockSize: box.block }],
				})) as unknown as ResizeObserverEntry[]

				observer.callback(entries, observer as unknown as ResizeObserver)
			}
		})
	}

	it('morphs on a height-only change, pinning the outgoing height before paint', () => {
		const { container } = mount('a')

		const contents = bySlot(container, 'test-contents')

		if (!contents) throw new Error('no contents box rendered')

		mockRect(contents, { width: 600, height: 300 })

		fire({ inline: 600, block: 300 })

		// Content grows in place: same width, taller panel.
		fire({ inline: 600, block: 420 })

		expect(contents.style.height).toBe('300px')
	})

	it('lets a width-coupled change cancel a morph, then morphs cleanly again', () => {
		const { container } = mount('a')

		const contents = bySlot(container, 'test-contents')

		if (!contents) throw new Error('no contents box rendered')

		mockRect(contents, { width: 600, height: 300 })

		fire({ inline: 600, block: 300 })

		fire({ inline: 600, block: 420 })

		expect(contents.style.height).toBe('300px')

		// A drag arrives mid-morph: the morph stands down (the pin stays only
		// until the animation runtime hands the height back to layout).
		fire({ inline: 640, block: 440 })

		// The next height-only change morphs from the container's current box.
		mockRect(contents, { width: 640, height: 320 })

		fire({ inline: 640, block: 500 })

		expect(contents.style.height).toBe('320px')
	})
})
