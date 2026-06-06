'use client'

import {
	type Dispatch,
	type PointerEvent as ReactPointerEvent,
	type RefObject,
	type SetStateAction,
	useRef,
} from 'react'
import { getCanvasPoint } from './signature-pad-utilities'

type SignatureDrawingOptions = {
	canvasRef: RefObject<HTMLCanvasElement | null>
	disabled?: boolean
	readOnly?: boolean
	strokeColor: string
	strokeWidth: number
	empty: boolean
	setEmpty: Dispatch<SetStateAction<boolean>>
	lastEmittedRef: RefObject<string | null>
	setCurrent: (value: string | null) => void
}

/**
 * Manages pointer-driven drawing on the signature canvas.
 * Returns event handlers to wire onto the `<canvas>` element.
 */
export function useSignaturePadDrawing({
	canvasRef,
	disabled,
	readOnly,
	strokeColor,
	strokeWidth,
	empty,
	setEmpty,
	lastEmittedRef,
	setCurrent,
}: SignatureDrawingOptions) {
	const drawingRef = useRef(false)

	const lastPointRef = useRef<{ x: number; y: number } | null>(null)

	const handlePointerDown = (event: ReactPointerEvent) => {
		if (disabled || readOnly) return

		if (event.pointerType === 'mouse' && event.button !== 0) return

		const point = getCanvasPoint(canvasRef.current, event)

		if (!point) return

		event.preventDefault()

		event.currentTarget.setPointerCapture?.(event.pointerId)

		drawingRef.current = true

		lastPointRef.current = point

		const context = canvasRef.current?.getContext('2d')

		if (!context) return

		context.beginPath()

		context.moveTo(point.x, point.y)

		// Dot so a tap leaves a mark.
		context.arc(point.x, point.y, strokeWidth / 2, 0, Math.PI * 2)

		context.fillStyle = strokeColor

		context.fill()
	}

	const handlePointerMove = (event: ReactPointerEvent) => {
		if (!drawingRef.current) return

		const point = getCanvasPoint(canvasRef.current, event)

		if (!point) return

		const context = canvasRef.current?.getContext('2d')

		const last = lastPointRef.current

		if (!context || !last) return

		context.beginPath()

		context.moveTo(last.x, last.y)
		context.lineTo(point.x, point.y)

		context.stroke()

		lastPointRef.current = point

		if (empty) setEmpty(false)
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
