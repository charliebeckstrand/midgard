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

/**
 * A data URL of a 298 by 158 image with an opaque bar from x = 20 to x = 280.
 * The size is the content box of a pad 300px wide: the `h-40` pad less its 1px
 * border on each side.
 */
function barImage() {
	const source = document.createElement('canvas')

	source.width = 298
	source.height = 158

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

		expect(inkBox(canvas)).toEqual({ left: 20, right: 198 })

		await resizeTo(frame, 400)

		expect(inkBox(canvas)).toEqual({ left: 20, right: 280 })
	})
})

/** The size of the content box of an element, in CSS px. */
function contentBox(element: HTMLElement) {
	const style = getComputedStyle(element)

	return {
		width:
			element.clientWidth -
			Number.parseFloat(style.paddingLeft) -
			Number.parseFloat(style.paddingRight),
		height:
			element.clientHeight -
			Number.parseFloat(style.paddingTop) -
			Number.parseFloat(style.paddingBottom),
	}
}

/**
 * The canvas size against the box of the pad. The canvas sits in the content
 * box of the pad, inside its border and its padding.
 *
 * Before the fix, the hook sized the canvas to the border box. The canvas was
 * then 2px too wide and 2px too tall. A pad that takes its width from its
 * content became wider on each resize.
 */
describe('SignaturePad canvas size (real browser)', () => {
	it('sizes the canvas to the content box of the pad', async () => {
		const { container } = renderUI(
			<div style={{ width: 300 }}>
				<SignaturePad aria-label="Signature" className="p-2" />
			</div>,
		)

		const pad = present(bySlot(container, 'signature-pad'), 'pad')

		const canvas = present<HTMLCanvasElement>(bySlot(container, 'signature-pad-canvas'), 'canvas')

		await nextPaint()

		await nextPaint()

		const box = contentBox(pad)

		expect(box).toEqual({ width: 282, height: 142 })

		const { width, height } = canvas.getBoundingClientRect()

		expect({ width, height }).toEqual(box)
	})

	it('keeps a pad with an intrinsic width at a stable width', async () => {
		const { container } = renderUI(
			<div style={{ width: 600 }}>
				<SignaturePad aria-label="Signature" className="w-max" />
			</div>,
		)

		const pad = present(bySlot(container, 'signature-pad'), 'pad')

		await nextPaint()

		const width = pad.getBoundingClientRect().width

		for (let i = 0; i < 5; i++) await nextPaint()

		expect(pad.getBoundingClientRect().width).toBe(width)
	})
})
