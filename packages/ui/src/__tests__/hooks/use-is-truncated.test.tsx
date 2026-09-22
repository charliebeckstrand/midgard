import { render } from '@testing-library/react'
import { type RefObject, useRef } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { useIsTruncated } from '../../hooks/use-is-truncated'

/**
 * The comparison at its boundary, over widths a browser cannot be asked for.
 *
 * Everything {@link useIsTruncated} does against real layout is asserted in
 * `browser/use-is-truncated.test.tsx`: a clipped string measures its full text
 * width, a fitting one does not, padding comes out of the content box, the
 * element keeps its own text with nothing injected, and a real resize
 * re-measures with no re-render to prompt it. What stays here is the arithmetic
 * at the edge — equal widths, and widths a fraction of a pixel apart. Those
 * need the two numbers set exactly, and a browser gives what the font and the
 * layout engine produce, not what a case asks for.
 */

type Dimensions = {
	containerWidth: number
	textWidth: number
}

/** Pins the container and text widths the hook compares, and returns the undo. */
function mockLayout({ containerWidth, textWidth }: Dimensions) {
	const originalGetBCR = Element.prototype.getBoundingClientRect

	const originalRangeGetBCR = Range.prototype.getBoundingClientRect

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

	// jsdom implements no Range geometry; the hook feature-detects it, so the
	// measurement path only runs once this stub supplies it.
	Range.prototype.getBoundingClientRect = () => rect(textWidth)

	return () => {
		Element.prototype.getBoundingClientRect = originalGetBCR

		Range.prototype.getBoundingClientRect = originalRangeGetBCR
	}
}

function Probe({ text, onResult }: { text: string; onResult: (v: boolean) => void }) {
	const ref = useRef<HTMLDivElement>(null)

	const truncated = useIsTruncated(ref as RefObject<HTMLElement | null>, text)

	onResult(truncated)

	return <div ref={ref}>{text}</div>
}

describe('useIsTruncated at the comparison boundary', () => {
	let restore: (() => void) | undefined

	afterEach(() => {
		restore?.()

		restore = undefined
	})

	it('treats exact equality as not truncated', () => {
		restore = mockLayout({ containerWidth: 100, textWidth: 100 })

		const results: boolean[] = []

		render(<Probe text="exact" onResult={(v) => results.push(v)} />)

		expect(results.at(-1)).toBe(false)
	})

	it('handles subpixel widths without rounding artifacts', () => {
		// getBoundingClientRect returns floats; 100.4px text in a 100.6px box → not truncated.
		restore = mockLayout({ containerWidth: 100.6, textWidth: 100.4 })

		const results: boolean[] = []

		render(<Probe text="subpixel" onResult={(v) => results.push(v)} />)

		expect(results.at(-1)).toBe(false)
	})
})
