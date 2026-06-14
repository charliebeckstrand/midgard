'use client'

import { type RefObject, useCallback, useEffect, useRef } from 'react'
import { useResizeObserver } from '../../hooks'
import { configureStroke, drawSnapshot } from './signature-pad-utilities'

type CanvasSizingOptions = {
	containerRef: RefObject<HTMLDivElement | null>
	canvasRef: RefObject<HTMLCanvasElement | null>
	empty: boolean
	strokeColor: string
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
 * context so strokes stay crisp on HiDPI displays; the non-empty canvas is
 * snapshotted to a data URL and repainted afterward, since resizing the backing
 * store clears it. Stroke styling flows through a mutable ref to keep the resize
 * callback identity-stable; a separate effect re-applies styling when
 * `strokeColor`/`strokeWidth` change without a resize.
 */
export function useSignaturePadCanvasSizing({
	containerRef,
	canvasRef,
	empty,
	strokeColor,
	strokeWidth,
}: CanvasSizingOptions) {
	const sizingRef = useRef({ empty, strokeColor, strokeWidth })

	sizingRef.current = { empty, strokeColor, strokeWidth }

	// Mutable props flow through `sizingRef`; `resize` stays identity-stable and
	// `useResizeObserver` re-subscribes only when its callback reference changes.
	const resize = useCallback(() => {
		const container = containerRef.current

		if (!container) return

		const canvas = canvasRef.current

		if (!canvas) return

		const { width, height } = container.getBoundingClientRect()

		if (width === 0 || height === 0) return

		const { empty: currentEmpty, strokeColor, strokeWidth } = sizingRef.current

		const dpr = window.devicePixelRatio || 1

		const snapshot = currentEmpty ? null : canvas.toDataURL()

		canvas.width = Math.round(width * dpr)
		canvas.height = Math.round(height * dpr)

		canvas.style.width = `${width}px`
		canvas.style.height = `${height}px`

		const context = canvas.getContext('2d')

		if (!context) return

		context.scale(dpr, dpr)

		configureStroke(context, strokeColor, strokeWidth)

		if (snapshot) {
			drawSnapshot(canvas, snapshot)
		}
	}, [containerRef, canvasRef])

	// The resize callback runs `configureStroke` only on resize; this re-applies
	// it to the live context when strokeColor / strokeWidth change (no
	// resize/clear).
	useEffect(() => {
		const context = canvasRef.current?.getContext('2d')

		if (!context) return

		configureStroke(context, strokeColor, strokeWidth)
	}, [canvasRef, strokeColor, strokeWidth])

	useResizeObserver(containerRef, resize)
}
