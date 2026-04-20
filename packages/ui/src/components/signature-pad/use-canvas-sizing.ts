import { type RefObject, useEffect, useRef } from 'react'
import { configureStroke, drawSnapshot } from './utilities'

type UseCanvasSizingOptions = {
	containerRef: RefObject<HTMLDivElement | null>
	canvasRef: RefObject<HTMLCanvasElement | null>
	isEmpty: boolean
	strokeColor: string
	strokeWidth: number
}

/**
 * Keeps the canvas sized to its container, accounting for devicePixelRatio.
 * Restores the existing drawing after each resize.
 */
export function useCanvasSizing({
	containerRef,
	canvasRef,
	isEmpty,
	strokeColor,
	strokeWidth,
}: UseCanvasSizingOptions) {
	const sizingRef = useRef({ isEmpty, strokeColor, strokeWidth })

	sizingRef.current = { isEmpty, strokeColor, strokeWidth }

	useEffect(() => {
		const container = containerRef.current

		if (!container) return

		const resize = () => {
			const canvas = canvasRef.current

			if (!canvas) return

			const { width, height } = container.getBoundingClientRect()

			if (width === 0 || height === 0) return

			const {
				isEmpty: currentEmpty,
				strokeColor: color,
				strokeWidth: lineWidth,
			} = sizingRef.current

			const dpr = window.devicePixelRatio || 1

			const snapshot = currentEmpty ? null : canvas.toDataURL()

			canvas.width = Math.round(width * dpr)
			canvas.height = Math.round(height * dpr)

			canvas.style.width = `${width}px`
			canvas.style.height = `${height}px`

			const ctx = canvas.getContext('2d')

			if (!ctx) return

			ctx.scale(dpr, dpr)

			configureStroke(ctx, color, lineWidth)

			if (snapshot) {
				drawSnapshot(canvas, snapshot)
			}
		}

		resize()

		const observer = new ResizeObserver(resize)

		observer.observe(container)

		return () => observer.disconnect()
	}, [containerRef, canvasRef])
}
