import type { PointerEvent as ReactPointerEvent } from 'react'

/**
 * Canvas-relative point of a pointer event, in CSS pixels.
 *
 * @internal
 * @returns The `{ x, y }` offset from the canvas's top-left, or `null` when the
 * canvas is absent.
 */
export function getCanvasPoint(
	canvas: HTMLCanvasElement | null,
	event: ReactPointerEvent,
): { x: number; y: number } | null {
	if (!canvas) return null

	const rect = canvas.getBoundingClientRect()

	return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

/**
 * Paints a snapshot data URL onto a canvas at its CSS dimensions.
 *
 * @internal
 * @remarks
 * Decodes via an `Image`, so the draw lands asynchronously on `onload` — the
 * canvas is unchanged until then. Sizes the draw to the CSS box; the context is
 * assumed already scaled to devicePixelRatio by the sizing hook.
 */
export function drawSnapshot(canvas: HTMLCanvasElement, src: string) {
	const context = canvas.getContext('2d')

	if (!context) return

	const { width, height } = canvas.getBoundingClientRect()

	const img = new Image()

	img.onload = () => context.drawImage(img, 0, 0, width, height)

	img.src = src
}

/**
 * Sets line cap, join, colour, and width on a 2D context for stroke rendering.
 *
 * @internal
 */
export function configureStroke(context: CanvasRenderingContext2D, color: string, width: number) {
	context.lineCap = 'round'
	context.lineJoin = 'round'
	context.strokeStyle = color
	context.lineWidth = width
}
