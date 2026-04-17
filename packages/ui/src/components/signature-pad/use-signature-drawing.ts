import {
	type Dispatch,
	type PointerEvent as ReactPointerEvent,
	type RefObject,
	type SetStateAction,
	useRef,
} from 'react'
import { getCanvasPoint } from './utilities'

type UseSignatureDrawingOptions = {
	canvasRef: RefObject<HTMLCanvasElement | null>
	disabled?: boolean
	readOnly?: boolean
	strokeColor: string
	strokeWidth: number
	isEmpty: boolean
	setIsEmpty: Dispatch<SetStateAction<boolean>>
	lastEmittedRef: RefObject<string | null>
	setCurrent: (value: string | null) => void
}

/**
 * Manages pointer-driven drawing on the signature canvas.
 * Returns event handlers to wire onto the `<canvas>` element.
 */
export function useSignatureDrawing({
	canvasRef,
	disabled,
	readOnly,
	strokeColor,
	strokeWidth,
	isEmpty,
	setIsEmpty,
	lastEmittedRef,
	setCurrent,
}: UseSignatureDrawingOptions) {
	const drawingRef = useRef(false)

	const lastPointRef = useRef<{ x: number; y: number } | null>(null)

	const handlePointerDown = (event: ReactPointerEvent) => {
		if (disabled || readOnly) return

		if (event.pointerType === 'mouse' && event.button !== 0) return

		const point = getCanvasPoint(canvasRef.current, event)

		if (!point) return

		event.preventDefault()

		;(event.currentTarget as Element).setPointerCapture?.(event.pointerId)

		drawingRef.current = true

		lastPointRef.current = point

		const ctx = canvasRef.current?.getContext('2d')

		if (!ctx) return

		ctx.beginPath()

		ctx.moveTo(point.x, point.y)

		// Dot so a tap leaves a mark.
		ctx.arc(point.x, point.y, strokeWidth / 2, 0, Math.PI * 2)

		ctx.fillStyle = strokeColor

		ctx.fill()
	}

	const handlePointerMove = (event: ReactPointerEvent) => {
		if (!drawingRef.current) return

		const point = getCanvasPoint(canvasRef.current, event)

		if (!point) return

		const ctx = canvasRef.current?.getContext('2d')

		const last = lastPointRef.current

		if (!ctx || !last) return

		ctx.beginPath()

		ctx.moveTo(last.x, last.y)
		ctx.lineTo(point.x, point.y)

		ctx.stroke()

		lastPointRef.current = point
		if (isEmpty) setIsEmpty(false)
	}

	const commit = () => {
		if (!drawingRef.current) return

		drawingRef.current = false

		lastPointRef.current = null

		const canvas = canvasRef.current

		if (!canvas) return

		const next = canvas.toDataURL()

		lastEmittedRef.current = next

		setCurrent(next)
	}

	return { handlePointerDown, handlePointerMove, commit }
}
