import { afterEach, describe, expect, it } from 'vitest'
import { isOverflowing } from '../../hooks/use-truncation'

/**
 * The comparison at its boundary, over widths a browser cannot be asked for.
 *
 * Everything {@link isOverflowing} does against real layout is asserted in
 * `browser/use-truncation.test.tsx`: a clipped string measures its full text
 * width, a fitting one does not, padding comes out of the content box, the
 * element keeps its own text with nothing injected, and a real resize
 * re-measures with no re-render to prompt it. What stays here is the arithmetic
 * at the edge: equal widths, and widths a fraction of a pixel apart. Those
 * need the two numbers set exactly, and a browser gives what the font and the
 * layout engine produce, not what a case asks for.
 */

type Dimensions = {
	containerWidth: number
	textWidth: number
}

/** Pins the container and text widths the comparison reads, and returns the undo. */
function mockLayout({ containerWidth, textWidth }: Dimensions) {
	const prevGetElementRect = Element.prototype.getBoundingClientRect

	const prevGetRangeRect = Range.prototype.getBoundingClientRect

	const rect = (width: number): DOMRect =>
		({
			width,
			height: 0,
			top: 0,
			left: 0,
			right: width,
			bottom: 0,
			x: 0,
			y: 0,
			toJSON: () => ({}),
		}) as DOMRect

	Element.prototype.getBoundingClientRect = () => rect(containerWidth)

	// jsdom implements no Range geometry. The comparison feature-detects it, so
	// the measurement path only runs once this stub supplies it.
	Range.prototype.getBoundingClientRect = () => rect(textWidth)

	return () => {
		Element.prototype.getBoundingClientRect = prevGetElementRect

		Range.prototype.getBoundingClientRect = prevGetRangeRect
	}
}

/** A detached element with `text` as its content. */
function label(text: string): HTMLElement {
	const el = document.createElement('div')

	el.textContent = text

	return el
}

describe('isOverflowing at the comparison boundary', () => {
	let restore: (() => void) | undefined

	afterEach(() => {
		restore?.()

		restore = undefined
	})

	it('treats exact equality as not truncated', () => {
		restore = mockLayout({ containerWidth: 100, textWidth: 100 })

		expect(isOverflowing(label('exact'))).toBe(false)
	})

	it('handles subpixel widths without rounding artifacts', () => {
		// getBoundingClientRect returns floats; 100.4px text in a 100.6px box → not truncated.
		restore = mockLayout({ containerWidth: 100.6, textWidth: 100.4 })

		expect(isOverflowing(label('subpixel'))).toBe(false)
	})
})
