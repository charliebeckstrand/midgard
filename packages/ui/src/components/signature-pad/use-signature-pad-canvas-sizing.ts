'use client'

import { type RefObject, useCallback, useEffect, useRef } from 'react'
import { useResizeObserver } from '../../hooks'
import {
	configureStroke,
	copyDrawing,
	type DrawingCopy,
	resolveStrokeColor,
} from './signature-pad-utilities'

type CanvasSizingOptions = {
	containerRef: RefObject<HTMLDivElement | null>
	canvasRef: RefObject<HTMLCanvasElement | null>
	empty: boolean
	strokeColor: string | undefined
	strokeWidth: number
}

/**
 * Keeps the canvas sized to its container, accounting for devicePixelRatio.
 * Restores the existing drawing after each resize.
 *
 * @internal
 * @param options - The `containerRef`/`canvasRef`, the `empty` flag, and the
 * current stroke styling.
 * @remarks
 * A `ResizeObserver` resizes the backing store to `width * dpr` and scales the
 * context, so strokes stay crisp on HiDPI displays. Resizing the backing store
 * clears it, so the drawing is painted back at the CSS size it had, and keeps
 * its scale. A larger pad shows more empty space, and a smaller pad hides the
 * parts of the drawing outside the new box.
 *
 * The first resize after a change to the drawing copies the canvas, and each
 * resize paints that copy until the drawing changes again. A pad that gets
 * smaller and then larger thus shows the hidden parts again, and a stretch or a
 * cut never accumulates over a series of resizes. Call the returned
 * `forgetDrawing` each time the drawing changes: a mark of a stroke, a clear,
 * or a value painted in.
 *
 * The observer reads the newest resize callback, so the callback reads the
 * stroke styling directly. A separate effect re-applies styling when
 * `strokeColor` or `strokeWidth` change without a resize.
 */
export function useSignaturePadCanvasSizing({
	containerRef,
	canvasRef,
	empty,
	strokeColor,
	strokeWidth,
}: CanvasSizingOptions) {
	// The drawing at its CSS size, from the first resize after it last changed.
	const source = useRef<DrawingCopy | null>(null)

	const forgetDrawing = useCallback(() => {
		source.current = null
	}, [])

	// `useResizeObserver` calls the newest `resize` through an effect event, so a
	// new identity does not subscribe again.
	const resize = () => {
		const container = containerRef.current

		if (!container) return

		const canvas = canvasRef.current

		if (!canvas) return

		const { width, height } = container.getBoundingClientRect()

		if (width === 0 || height === 0) return

		const dpr = window.devicePixelRatio || 1

		// Copy before the canvas takes the new size, which clears it.
		if (empty) {
			source.current = null
		} else {
			source.current ??= copyDrawing(canvas)
		}

		canvas.width = Math.round(width * dpr)
		canvas.height = Math.round(height * dpr)

		canvas.style.width = `${width}px`
		canvas.style.height = `${height}px`

		const context = canvas.getContext('2d')

		if (!context) return

		context.scale(dpr, dpr)

		configureStroke(context, resolveStrokeColor(canvas, strokeColor), strokeWidth)

		const drawing = source.current

		if (drawing) {
			context.drawImage(drawing.canvas, 0, 0, drawing.width, drawing.height)
		}
	}

	// The resize callback runs `configureStroke` only on resize; this re-applies
	// it to the live context when strokeColor / strokeWidth change (no
	// resize/clear).
	useEffect(() => {
		const canvas = canvasRef.current

		const context = canvas?.getContext('2d')

		if (!context) return

		configureStroke(context, resolveStrokeColor(canvas, strokeColor), strokeWidth)
	}, [canvasRef, strokeColor, strokeWidth])

	useResizeObserver(containerRef, resize)

	return { forgetDrawing }
}
