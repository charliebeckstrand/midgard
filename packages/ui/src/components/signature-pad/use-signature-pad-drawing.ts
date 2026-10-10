'use client'

import {
	type Dispatch,
	type PointerEvent as ReactPointerEvent,
	type RefObject,
	type SetStateAction,
	useRef,
} from 'react'
import { useDragCursorHold } from '../../hooks/use-drag-cursor'
import { holdTextSelection } from '../../utilities/hold-text-selection'
import { isPrimaryPress } from '../../utilities/primary-press'
import { getCanvasPoint, resolveStrokeColor } from './signature-pad-utilities'

type SignatureDrawingOptions = {
	canvasRef: RefObject<HTMLCanvasElement | null>
	disabled?: boolean
	readOnly?: boolean
	strokeColor: string | undefined
	strokeWidth: number
	empty: boolean
	setEmpty: Dispatch<SetStateAction<boolean>>
	/** Emits a committed snapshot. The state hook records it as shown first. */
	setCurrent: (value: string | null) => void
	onDrawStart?: () => void
	/** Runs after each mark that a stroke paints. */
	onInk?: () => void
}

/**
 * Pointer-driven drawing on the signature canvas: strokes between successive
 * points, a dot on a bare tap, and a commit that snapshots to a data URL.
 *
 * @internal
 * @param options - The `canvasRef`, stroke styling, the `disabled`/`readOnly`
 * flags, the `empty`/`setEmpty`/`setCurrent` state hooks, the
 * `onDrawStart` report, and the `onInk` report of each mark.
 * @returns The `handlePointerDown`, `handlePointerMove`, and `commit` handlers
 * to wire onto the `<canvas>`.
 * @remarks
 * `handlePointerDown` starts a stroke only on a primary press (`isPrimaryPress`), so a
 * secondary button, a macOS Ctrl-click, and a second finger draw nothing. It captures the pointer
 * so a stroke continues past the canvas edge. `commit` gives the snapshot to
 * `setCurrent`, which the state hook records as shown, so its value-sync effect
 * skips a repaint of a value it just drew. `commit` returns `true` only
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
	setCurrent,
	onDrawStart,
	onInk,
}: SignatureDrawingOptions) {
	const drawingRef = useRef(false)

	// The pen keeps the crosshair on the page while a stroke runs off the pad.
	const cursorHold = useDragCursorHold('crosshair')

	const lastPointRef = useRef<{ x: number; y: number } | null>(null)

	const handlePointerDown = (event: ReactPointerEvent) => {
		if (disabled || readOnly) return

		if (!isPrimaryPress(event)) return

		holdTextSelection(event)

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

		cursorHold.start()

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

		onInk?.()

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

		onInk?.()

		lastPointRef.current = point

		if (empty) setEmpty(false)
	}

	const commit = (): boolean => {
		cursorHold.end()

		if (!drawingRef.current) return false

		drawingRef.current = false

		lastPointRef.current = null

		const canvas = canvasRef.current

		if (!canvas) return false

		setCurrent(canvas.toDataURL())

		return true
	}

	return { handlePointerDown, handlePointerMove, commit }
}
