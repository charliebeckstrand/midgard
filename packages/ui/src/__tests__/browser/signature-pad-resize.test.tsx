import { describe, expect, it } from 'vitest'
import { SignaturePad } from '../../components/signature-pad'
import { bySlot, present, renderUI, waitFor } from '../helpers'
import { nextPaint } from '../helpers/frames'

/** The CSS box of the opaque pixels on a canvas, or `null` when it holds none. */
function inkBox(canvas: HTMLCanvasElement) {
	const context = present<HTMLCanvasElement>(canvas, 'canvas').getContext('2d')

	if (!context) throw new Error('expected a 2D context')

	const { data } = context.getImageData(0, 0, canvas.width, canvas.height)

	const scale = canvas.width / canvas.getBoundingClientRect().width

	let left = Number.POSITIVE_INFINITY
	let right = -1

	for (let y = 0; y < canvas.height; y++) {
		for (let x = 0; x < canvas.width; x++) {
			if ((data[(y * canvas.width + x) * 4 + 3] ?? 0) < 128) continue

			left = Math.min(left, x)
			right = Math.max(right, x)
		}
	}

	return right < 0
		? null
		: { left: Math.round(left / scale), right: Math.round((right + 1) / scale) }
}

/** A data URL of a 300 by 160 image with an opaque bar from x = 20 to x = 280. */
function barImage() {
	const source = document.createElement('canvas')

	source.width = 300
	source.height = 160

	const context = source.getContext('2d')

	if (!context) throw new Error('expected a 2D context')

	context.fillRect(20, 70, 260, 20)

	return source.toDataURL()
}

/** Gives the pad a new width and waits for the resize to paint. */
async function resizeTo(frame: HTMLElement, width: number) {
	frame.style.width = `${width}px`

	await nextPaint()

	await nextPaint()
}

/**
 * The drawing on a SignaturePad through a series of resizes. Rides the real
 * browser because jsdom has no canvas pixels.
 *
 * Before the fix, each resize painted the old drawing into the new box, so the
 * drawing stretched, and the stretch accumulated.
 */
describe('SignaturePad resize (real browser)', () => {
	it('keeps the scale of the drawing, and shows the hidden part again when the pad grows', async () => {
		const { container } = renderUI(
			<div data-testid="frame" style={{ width: 300 }}>
				<SignaturePad aria-label="Signature" defaultValue={barImage()} />
			</div>,
		)

		const frame = present(container.querySelector('[data-testid="frame"]'), 'frame')

		const canvas = present<HTMLCanvasElement>(bySlot(container, 'signature-pad-canvas'), 'canvas')

		await waitFor(() => expect(inkBox(canvas)).toEqual({ left: 20, right: 280 }))

		await resizeTo(frame, 500)

		expect(inkBox(canvas)).toEqual({ left: 20, right: 280 })

		await resizeTo(frame, 200)

		expect(inkBox(canvas)).toEqual({ left: 20, right: 200 })

		await resizeTo(frame, 400)

		expect(inkBox(canvas)).toEqual({ left: 20, right: 280 })
	})
})
