import { describe, expect, it } from 'vitest'
import { Control } from '../../../components/control'
import { SignaturePad } from '../../../components/signature-pad'
import { bySlot, present, renderUI, waitFor } from '../../helpers'
import { eachAuthorScheme, systemColor } from '../helpers/forced-colors'

/**
 * The ink of a SignaturePad under forced colors. The pad is paper: a white surface with a dark
 * ink in each theme, and the canvas reads its ink from its own computed `color`. Forced colors
 * set that color to `CanvasText`, which is white in a dark palette, so the pad drew and saved
 * white strokes. The pad must keep its paper and its ink, and its edge must take `CanvasText`.
 */

/** Draws one stroke across the middle of `canvas`. */
function drawStroke(canvas: HTMLCanvasElement) {
	const box = canvas.getBoundingClientRect()

	const y = box.top + box.height / 2

	const event = (type: string, x: number) =>
		new PointerEvent(type, {
			bubbles: true,
			cancelable: true,
			pointerId: 1,
			pointerType: 'mouse',
			isPrimary: true,
			button: 0,
			buttons: type === 'pointerup' ? 0 : 1,
			clientX: box.left + x,
			clientY: y,
		})

	canvas.dispatchEvent(event('pointerdown', 20))

	for (let x = 30; x <= 120; x += 10) canvas.dispatchEvent(event('pointermove', x))

	canvas.dispatchEvent(event('pointerup', 120))
}

/** The darkest opaque pixel of `canvas`, as the sum of its three channels, or `null`. */
function darkestInk(canvas: HTMLCanvasElement): number | null {
	const context = canvas.getContext('2d')

	if (!context) throw new Error('expected a 2D context')

	const { data } = context.getImageData(0, 0, canvas.width, canvas.height)

	let darkest: number | null = null

	for (let i = 0; i < data.length; i += 4) {
		if ((data[i + 3] ?? 0) < 200) continue

		const sum = (data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0)

		darkest = darkest === null ? sum : Math.min(darkest, sum)
	}

	return darkest
}

describe('signature pad ink under forced colors (real browser)', () => {
	eachAuthorScheme(() => {
		it('keeps the white paper and the dark ink, and draws its edge in CanvasText', async () => {
			const { container } = renderUI(<SignaturePad aria-label="Signature" />)

			const pad = present(bySlot(container, 'signature-pad'), 'the pad')

			const canvas = present<HTMLCanvasElement>(container.querySelector('canvas'), 'the canvas')

			expect(getComputedStyle(pad).backgroundColor).toBe('rgb(255, 255, 255)')

			expect(getComputedStyle(pad).borderTopColor).toBe(systemColor('CanvasText'))

			drawStroke(canvas)

			const ink = darkestInk(canvas)

			expect(ink).not.toBeNull()

			expect(ink).toBeLessThan(150)

			// The clear button is a control on the paper, so it takes system colors again.
			const clear = await waitFor(() => present(bySlot(container, 'signature-pad-clear'), 'clear'))

			expect(getComputedStyle(clear).forcedColorAdjust).toBe('auto')

			expect(getComputedStyle(clear).color).toBe(systemColor('ButtonText'))
		})

		/**
		 * The pad does not adjust, so forced colors do not remove its `box-shadow` validation ring.
		 * Forced colors make red, amber, and green one color, so the pad drops the ring there. Only
		 * the invalid state keeps a mark: the outline of `sen.forced.invalid`.
		 */
		it.each(['error', 'warning', 'success'] as const)(
			'paints no %s validation ring, and marks only the invalid state',
			(severity) => {
				const { container } = renderUI(
					<Control severity={severity}>
						<SignaturePad aria-label="Signature" />
					</Control>,
				)

				const style = getComputedStyle(present(bySlot(container, 'signature-pad'), 'the pad'))

				// Each layer of the ring shadow has a spread of 0.
				expect(style.boxShadow).not.toMatch(/0px 0px 0px [1-9]/)

				expect(style.outlineStyle).toBe(severity === 'error' ? 'solid' : 'none')
			},
		)
	})
})
