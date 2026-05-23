import { type RefObject, useCallback, useRef } from 'react'
import { useResizeObserver } from '../../hooks'
import { configureStroke, drawSnapshot } from './signature-pad-utilities'

type UseCanvasSizingOptions = {
	containerRef: RefObject<HTMLDivElement | null>
	canvasRef: RefObject<HTMLCanvasElement | null>
	empty: boolean
	strokeColor: string
	strokeWidth: number
}

/**
 * Keeps the canvas sized to its container, accounting for devicePixelRatio.
 * Restores the existing drawing after each resize.
 */
export function useSignaturePadCanvasSizing({
	containerRef,
	canvasRef,
	empty,
	strokeColor,
	strokeWidth,
}: UseCanvasSizingOptions) {
	const sizingRef = useRef({ empty, strokeColor, strokeWidth })

	sizingRef.current = { empty, strokeColor, strokeWidth }

	// Mutable props (`empty`, `strokeColor`, `strokeWidth`) flow through
	// `sizingRef` so `resize`'s identity stays stable — otherwise
	// `useResizeObserver` would re-subscribe on every stroke-style change.
	const resize = useCallback(() => {
		const container = containerRef.current

		if (!container) return

		const canvas = canvasRef.current

		if (!canvas) return

		const { width, height } = container.getBoundingClientRect()

		if (width === 0 || height === 0) return

		const { empty: currentEmpty, strokeColor: color, strokeWidth: lineWidth } = sizingRef.current

		const dpr = window.devicePixelRatio || 1

		const snapshot = currentEmpty ? null : canvas.toDataURL()

		canvas.width = Math.round(width * dpr)
		canvas.height = Math.round(height * dpr)

		canvas.style.width = `${width}px`
		canvas.style.height = `${height}px`

		const context = canvas.getContext('2d')

		if (!context) return

		context.scale(dpr, dpr)

		configureStroke(context, color, lineWidth)

		if (snapshot) {
			drawSnapshot(canvas, snapshot)
		}
	}, [containerRef, canvasRef])

	useResizeObserver(containerRef, resize)
}
