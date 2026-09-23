'use client'

import {
	type Dispatch,
	type PointerEvent as ReactPointerEvent,
	type RefObject,
	type SetStateAction,
	useRef,
} from 'react'
import { getCanvasPoint, resolveStrokeColor } from './signature-pad-utilities'

type SignatureDrawingOptions = {
	canvasRef: RefObject<HTMLCanvasElement | null>
	disabled?: boolean
	readOnly?: boolean
	strokeColor: string | undefined
	strokeWidth: number
	empty: boolean
	setEmpty: Dispatch<SetStateAction<boolean>>
	lastEmittedRef: RefObject<string | null>
	setCurrent: (value: string | null) => void
	onDrawStart?: () => void
}

/**
 * Pointer-driven drawing on the signature canvas: strokes between successive
 * points, a dot on a bare tap, and a commit that snapshots to a data URL.
 *
 * @internal
 * @param options - The `canvasRef`, stroke styling, the `disabled`/`readOnly`
 * flags, the `empty`/`setEmpty`/`lastEmittedRef`/`setCurrent` state hooks, and
 * the `onDrawStart` report.
 * @returns The `handlePointerDown`, `handlePointerMove`, and `commit` handlers
 * to wire onto the `<canvas>`.
 * @remarks
 * `handlePointerDown` ignores non-primary mouse buttons and captures the pointer
 * so a stroke continues past the canvas edge. `commit` writes the snapshot into
 * `lastEmittedRef` before `setCurrent`, letting the state hook's value-sync effect
 * skip its own repaint of a value it just drew. `commit` returns `true` only
 * when it committed a stroke, and `false` when no stroke was in progress.
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
	onDrawStart,
}: SignatureDrawingOptions) {
	const drawingRef = useRef(false)

	const lastPointRef = useRef<{ x: number; y: number } | null>(null)

	const handlePointerDown = (event: ReactPointerEvent) => {
		if (disabled || readOnly) return

		if (event.pointerType === 'mouse' && event.button !== 0) return

		const point = getCanvasPoint(canvasRef.current, event)

		if (!point) return

		// Acquire the context before capturing the pointer or marking a stroke
		// active: on a context-less pad the pointerdown must be a clean no-op, or
		// `commit` would later toDataURL an unpainted canvas and emit a value while
		// `empty` stays true (placeholder over a "signed" pad, clear button hidden).
		const context = canvasRef.current?.getContext('2d')

		if (!context) return

		event.preventDefault()

		event.currentTarget.setPointerCapture?.(event.pointerId)

		drawingRef.current = true

		// The stroke is now established: every guard above passed, and `commit`
		// owes a value. The report rides this line, so a pad that draws nothing
		// stays silent.
		onDrawStart?.()

		lastPointRef.current = point

		context.beginPath()

		context.moveTo(point.x, point.y)

		// Draws a dot; a bare tap leaves a mark.
		context.arc(point.x, point.y, strokeWidth / 2, 0, Math.PI * 2)

		context.fillStyle = resolveStrokeColor(canvasRef.current, strokeColor)

		context.fill()

		// A tap (pointerdown→up with no move) draws this dot; flipping `empty`
		// here (not only in the move handler) keeps the placeholder hidden and
		// the dot preserved on resize.
		if (empty) setEmpty(false)
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

	const commit = (): boolean => {
		if (!drawingRef.current) return false

		drawingRef.current = false

		lastPointRef.current = null

		const canvas = canvasRef.current

		if (!canvas) return false

		const next = canvas.toDataURL()

		lastEmittedRef.current = next

		setCurrent(next)

		return true
	}

	return { handlePointerDown, handlePointerMove, commit }
}
