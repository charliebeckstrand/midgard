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
 * assumed already scaled to devicePixelRatio by the sizing hook. `onDraw` runs
 * after the draw.
 */
export function drawSnapshot(canvas: HTMLCanvasElement, src: string, onDraw?: () => void) {
	const context = canvas.getContext('2d')

	if (!context) return

	const { width, height } = canvas.getBoundingClientRect()

	const img = new Image()

	img.onload = () => {
		context.drawImage(img, 0, 0, width, height)

		onDraw?.()
	}

	img.src = src
}

/**
 * A copy of the drawing on a canvas, with the CSS size that the drawing had.
 *
 * @internal
 */
export type DrawingCopy = {
	/** A detached canvas that holds the pixels of the drawing. */
	canvas: HTMLCanvasElement
	/** The CSS width of the drawing. */
	width: number
	/** The CSS height of the drawing. */
	height: number
}

/**
 * Copies the pixels of a canvas to a detached canvas, with the CSS size of the
 * canvas.
 *
 * @internal
 * @remarks
 * The copy is synchronous, so a resize can clear the backing store and paint
 * the drawing back in the same task. A data URL decodes asynchronously, and a
 * second resize before the decode would copy a blank canvas.
 *
 * @returns The copy, or `null` when no 2D context is available.
 */
export function copyDrawing(canvas: HTMLCanvasElement): DrawingCopy | null {
	const copy = document.createElement('canvas')

	copy.width = canvas.width
	copy.height = canvas.height

	const context = copy.getContext('2d')

	if (!context) return null

	context.drawImage(canvas, 0, 0)

	const { width, height } = canvas.getBoundingClientRect()

	return { canvas: copy, width, height }
}

/**
 * The color a stroke paints in: the explicit `strokeColor`, else the canvas's
 * own computed `color`.
 *
 * @remarks
 * A canvas takes no `currentColor`, so the ink has to be read off the element
 * and handed to the 2D context. That lets the recipe set the ink with a CSS
 * class, and a consumer `className` can change it. Falls back to `currentColor` where no
 * computed style is available, which is the server and a detached node.
 *
 * @internal
 */
export function resolveStrokeColor(
	canvas: HTMLCanvasElement | null,
	strokeColor: string | undefined,
): string {
	if (strokeColor !== undefined) return strokeColor

	if (canvas === null || typeof window === 'undefined') return 'currentColor'

	return window.getComputedStyle(canvas).color || 'currentColor'
}

/**
 * Sets line cap, join, color, and width on a 2D context for stroke rendering.
 *
 * @internal
 */
export function configureStroke(context: CanvasRenderingContext2D, color: string, width: number) {
	context.lineCap = 'round'
	context.lineJoin = 'round'
	context.strokeStyle = color
	context.lineWidth = width
}
