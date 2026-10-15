import { describe, expect, it } from 'vitest'
import { SignaturePad } from '../../components/signature-pad'
import { bySlot, present, renderUI } from '../helpers'
import { nextPaint } from '../helpers/frames'

/** Whether a canvas holds an opaque pixel. */
function hasInk(canvas: HTMLCanvasElement) {
	const context = canvas.getContext('2d')

	if (!context) throw new Error('expected a 2D context')

	const { data } = context.getImageData(0, 0, canvas.width, canvas.height)

	for (let index = 3; index < data.length; index += 4) {
		if ((data[index] ?? 0) >= 128) return true
	}

	return false
}

/** A data URL of an image that is opaque everywhere. */
function solidImage() {
	const source = document.createElement('canvas')

	source.width = 100
	source.height = 50

	const context = source.getContext('2d')

	if (!context) throw new Error('expected a 2D context')

	context.fillRect(0, 0, 100, 50)

	return source.toDataURL()
}

/**
 * A value that the pad paints decodes asynchronously. Rides the real browser,
 * because jsdom decodes no image and has no canvas pixels.
 *
 * Before the fix, a decode that finished after the value changed still painted
 * the old value. The pad then showed a signature with its state empty.
 */
describe('SignaturePad snapshot (real browser)', () => {
	it('does not paint a value that a reset replaced before the decode', async () => {
		const { container, rerender } = renderUI(<SignaturePad value={null} />)

		const canvas = present<HTMLCanvasElement>(bySlot(container, 'signature-pad-canvas'), 'canvas')

		// The first resize clears the canvas, so it runs before the value comes.
		await nextPaint()

		await nextPaint()

		rerender(<SignaturePad value={solidImage()} />)

		rerender(<SignaturePad value={null} />)

		for (let frame = 0; frame < 10; frame++) await nextPaint()

		expect(bySlot(container, 'signature-pad')).toHaveAttribute('data-empty', '')

		expect(hasInk(canvas)).toBe(false)
	})
})
