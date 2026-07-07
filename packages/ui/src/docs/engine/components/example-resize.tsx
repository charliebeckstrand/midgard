'use client'

import {
	type KeyboardEvent as ReactKeyboardEvent,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useRef,
	useState,
} from 'react'
import { cn, dataAttr } from '../../../core'

/**
 * Width grid, in pixels, the handle snaps to when `snap` is on. A resized frame
 * lands on the nearest multiple, so its width reads as a round number.
 */
export const SNAP_STEP = 8

// Keyboard resize increments: a plain arrow nudges by one grid step, Shift by a
// coarser jump, mirroring the feel of ResizableHandle's separator.
const KEY_STEP = SNAP_STEP

const KEY_STEP_LARGE = SNAP_STEP * 8

/** The object form of {@link Example}'s `resize` prop. */
export type ResizeConfig = {
	/** Whether the frame is resizable. @defaultValue true */
	enabled?: boolean
	/** Minimum width in pixels; unset leaves the lower bound auto. */
	min?: number
	/** Maximum width in pixels; unset leaves the upper bound auto. */
	max?: number
	/** Snap the width to an {@link SNAP_STEP}-pixel grid while resizing. @defaultValue false */
	snap?: boolean
}

/** {@link Example}'s `resize` prop: `true` for defaults, or a {@link ResizeConfig}. */
export type ResizeProp = boolean | ResizeConfig

/** The normalized settings an enabled frame drives its handle with. */
export type ResolvedResize = { min?: number; max?: number; snap: boolean }

/**
 * Normalizes the `resize` prop to its settings, or `null` when resizing is off.
 *
 * @remarks
 * `true` yields auto bounds with snapping off; an object with `enabled: false`
 * turns resizing off; otherwise the object's bounds and `snap` (default off)
 * carry through. `min`/`max` stay `undefined` — and therefore auto — unless set.
 */
export function resolveResize(resize: ResizeProp | undefined): ResolvedResize | null {
	if (!resize) return null

	if (resize === true) return { snap: false }

	if (resize.enabled === false) return null

	return { min: resize.min, max: resize.max, snap: resize.snap ?? false }
}

/**
 * Constrains a proposed width to the resolved bounds, snapping to the
 * {@link SNAP_STEP} grid first when enabled so the clamped result still honors
 * `min`/`max`. Never returns a negative width.
 *
 * @param proposed - The candidate width in pixels.
 */
export function resolveWidth(proposed: number, { min, max, snap }: ResolvedResize): number {
	let width = snap ? Math.round(proposed / SNAP_STEP) * SNAP_STEP : proposed

	if (max !== undefined) width = Math.min(width, max)

	if (min !== undefined) width = Math.max(width, min)

	return Math.max(width, 0)
}

/** Pointer/keyboard handlers the handle binds to, from {@link useExampleResize}. */
export type ResizeHandlers = {
	onPointerDown: (event: ReactPointerEvent) => void
	onPointerMove: (event: ReactPointerEvent) => void
	onPointerUp: (event: ReactPointerEvent) => void
	onPointerCancel: (event: ReactPointerEvent) => void
	onKeyDown: (event: ReactKeyboardEvent) => void
}

/**
 * The widest the frame may grow: its container's content box, so the width
 * stays relative to the container even when `max` is auto. Falls back to
 * unbounded when the container can't be measured (e.g. no layout in tests).
 *
 * @internal
 */
function availableWidth(el: HTMLElement): number {
	const parent = el.parentElement

	if (!parent) return Number.POSITIVE_INFINITY

	const style = getComputedStyle(parent)

	const inner =
		parent.clientWidth -
		parseFloat(style.paddingLeft || '0') -
		parseFloat(style.paddingRight || '0')

	return inner > 0 ? inner : Number.POSITIVE_INFINITY
}

/** What {@link useExampleResize} exposes to the frame and its handle. */
export type ExampleResize = {
	containerRef: React.RefObject<HTMLDivElement | null>
	width: number | undefined
	resizing: boolean
	handlers: ResizeHandlers
}

type DragStart = { pointerX: number; width: number; containerMax: number }

/**
 * Drives an {@link Example} frame's manual width. Returns the container ref to
 * measure and size, the current pixel `width` (undefined until first resized, so
 * the frame stays auto), the `resizing` flag, and the handle's handlers.
 *
 * @param resolved - The resize settings, or `null` when resizing is off.
 * @remarks
 * The width is capped at the container's content box (see {@link availableWidth})
 * even when `max` is auto. Pointer drags use pointer capture, so a drag that
 * leaves the handle still tracks; a move with no button down — or a
 * `pointercancel` — ends the drag so a missed `pointerup` can't leave it stuck.
 * Arrow keys nudge by a grid step (Shift for a coarser jump) and Home/End jump
 * to a defined bound. The latest `resolved` is read through a ref, keeping the
 * handlers stable across renders.
 */
export function useExampleResize(resolved: ResolvedResize | null): ExampleResize {
	const containerRef = useRef<HTMLDivElement | null>(null)

	const [width, setWidth] = useState<number>()

	const [resizing, setResizing] = useState(false)

	const startRef = useRef<DragStart | null>(null)

	const resolvedRef = useRef(resolved)

	resolvedRef.current = resolved

	const setResolvedWidth = useCallback((proposed: number, cap = Number.POSITIVE_INFINITY) => {
		const settings = resolvedRef.current

		if (!settings) return

		// The container caps the width even when `max` is auto, so the frame stays
		// relative to its container rather than overflowing it.
		const max = Math.min(settings.max ?? Number.POSITIVE_INFINITY, cap)

		setWidth(resolveWidth(proposed, { ...settings, max: Number.isFinite(max) ? max : undefined }))
	}, [])

	const endDrag = useCallback((event: ReactPointerEvent) => {
		if (!startRef.current) return

		startRef.current = null

		setResizing(false)

		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId)
		}
	}, [])

	const onPointerDown = useCallback((event: ReactPointerEvent) => {
		const container = containerRef.current

		if (!container || event.button !== 0) return

		event.preventDefault()

		startRef.current = {
			pointerX: event.clientX,
			width: container.getBoundingClientRect().width,
			containerMax: availableWidth(container),
		}

		event.currentTarget.setPointerCapture(event.pointerId)

		setResizing(true)
	}, [])

	const onPointerMove = useCallback(
		(event: ReactPointerEvent) => {
			const start = startRef.current

			if (!start) return

			// A move with no button down means the pointerup was missed (an OS
			// gesture, the pointer leaving the window); end the drag so it doesn't
			// keep resizing without a held button.
			if (event.buttons === 0) {
				endDrag(event)

				return
			}

			setResolvedWidth(start.width + (event.clientX - start.pointerX), start.containerMax)
		},
		[endDrag, setResolvedWidth],
	)

	const onKeyDown = useCallback(
		(event: ReactKeyboardEvent) => {
			const settings = resolvedRef.current

			const container = containerRef.current

			if (!settings || !container) return

			const cap = availableWidth(container)

			// Keyboard resizing starts from the current width, falling back to the
			// measured width before the first nudge sets one.
			const base = width ?? container.getBoundingClientRect().width

			const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP

			if (event.key === 'ArrowLeft') {
				event.preventDefault()

				setResolvedWidth(base - step, cap)
			} else if (event.key === 'ArrowRight') {
				event.preventDefault()

				setResolvedWidth(base + step, cap)
			} else if (event.key === 'Home' && settings.min !== undefined) {
				event.preventDefault()

				setResolvedWidth(settings.min, cap)
			} else if (event.key === 'End' && settings.max !== undefined) {
				event.preventDefault()

				setResolvedWidth(settings.max, cap)
			}
		},
		[setResolvedWidth, width],
	)

	return {
		containerRef,
		width,
		resizing,
		handlers: {
			onPointerDown,
			onPointerMove,
			onPointerUp: endDrag,
			onPointerCancel: endDrag,
			onKeyDown,
		},
	}
}

/** Props for {@link ExampleResizeHandle}. */
type ExampleResizeHandleProps = {
	resolved: ResolvedResize
	width: number | undefined
	resizing: boolean
	handlers: ResizeHandlers
}

/**
 * The grip on an {@link Example} frame's right edge, rendered as an `<hr>` — the
 * element whose implicit `separator` role carries the ARIA window-splitter
 * semantics, so no `role` override is needed. Its `aria-valuenow` tracks the
 * current width; drag it or use the arrow keys (Home/End for a defined bound) to
 * resize the frame. The two grip bars are drawn with `::before`/`::after`, since
 * `<hr>` takes no children.
 *
 * @internal
 */
export function ExampleResizeHandle({
	resolved,
	width,
	resizing,
	handlers,
}: ExampleResizeHandleProps) {
	return (
		<hr
			data-slot="example-resize-handle"
			data-resizing={dataAttr(resizing)}
			aria-orientation="vertical"
			aria-label="Resize example"
			aria-valuenow={width !== undefined ? Math.round(width) : undefined}
			aria-valuemin={resolved.min}
			aria-valuemax={resolved.max}
			tabIndex={0}
			onPointerDown={handlers.onPointerDown}
			onPointerMove={handlers.onPointerMove}
			onPointerUp={handlers.onPointerUp}
			onPointerCancel={handlers.onPointerCancel}
			onKeyDown={handlers.onKeyDown}
			className={cn(
				'absolute top-1/2 right-0 z-10 flex -translate-y-1/2 translate-x-1/2 items-center justify-center gap-0.5',
				'h-10 w-4 cursor-col-resize touch-none rounded-md border border-solid',
				'border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500',
				'outline-none hover:text-zinc-600 focus-visible:border-blue-500 dark:hover:text-zinc-300',
				'data-[resizing]:border-blue-500 data-[resizing]:text-blue-500',
				"before:h-4 before:w-px before:bg-current before:content-['']",
				"after:h-4 after:w-px after:bg-current after:content-['']",
			)}
		/>
	)
}
