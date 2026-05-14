import type { PointerEvent as ReactPointerEvent } from 'react'

/** Extract the canvas-relative point from a pointer event. */
export function getCanvasPoint(
	canvas: HTMLCanvasElement | null,
	event: ReactPointerEvent,
): { x: number; y: number } | null {
	if (!canvas) return null

	const rect = canvas.getBoundingClientRect()

	return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

/** Draw a snapshot data-URL onto a canvas at its CSS dimensions. */
export function drawSnapshot(canvas: HTMLCanvasElement, src: string) {
	const ctx = canvas.getContext('2d')

	if (!ctx) return

	const { width, height } = canvas.getBoundingClientRect()

	const img = new Image()

	img.onload = () => ctx.drawImage(img, 0, 0, width, height)

	img.src = src
}

/** Configure a 2D context for signature stroke rendering. */
export function configureStroke(ctx: CanvasRenderingContext2D, color: string, width: number) {
	ctx.lineCap = 'round'
	ctx.lineJoin = 'round'
	ctx.strokeStyle = color
	ctx.lineWidth = width
}
