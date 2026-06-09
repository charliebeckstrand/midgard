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

	// Mutable props flow through `sizingRef` so `resize` has a stable identity;
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

	// `configureStroke` otherwise runs only on resize, so a runtime strokeColor /
	// strokeWidth change wouldn't reach segments drawn before the next resize.
	// Re-apply it to the live context when those props change (no resize/clear).
	useEffect(() => {
		const context = canvasRef.current?.getContext('2d')

		if (!context) return

		configureStroke(context, strokeColor, strokeWidth)
	}, [canvasRef, strokeColor, strokeWidth])

	useResizeObserver(containerRef, resize)
}
