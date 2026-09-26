'use client'

import { type KeyboardEvent, useEffect, useRef } from 'react'
import { announce, cn, dataAttr } from '../../core'
import { logicalArrowKey } from '../../hooks/a11y/logical-arrow'
import { k } from '../../recipes/kata/grid'
import { describeResize } from './engine/grid-announcements'
import {
	COLUMN_RESIZE_PAGE_STEP,
	COLUMN_RESIZE_STEP,
	GRID_STATUS_DEBOUNCE_MS,
} from './engine/grid-constants'
import type { GridColumnResizeActions } from './engine/grid-table/views'

/** Props for {@link GridColumnResizeHandle}. @internal */
type GridColumnResizeHandleProps = {
	id: string | number
	label: string
	/** The width of the column (px). */
	size: number
	/** The resize bounds of the column (px). */
	min: number
	max: number
	actions: GridColumnResizeActions
	resizing: boolean
}

/**
 * Resize separator on a resizable column header's trailing edge: a focusable
 * window-splitter sized to the header. It starts a pointer drag-resize and
 * accepts Arrow keys to nudge the width. A double-click auto-sizes the column
 * to its content. Its always-visible grip is the `aria-hidden` child.
 *
 * @internal
 */
export function GridColumnResizeHandle({
	id,
	label,
	size,
	min,
	max,
	actions: resize,
	resizing,
}: GridColumnResizeHandleProps) {
	// The width of the latest commit. A nudge or an auto-size lands in a later
	// commit than the key press, so the announcement reads the width from here.
	const sizeRef = useRef(size)

	useEffect(() => {
		sizeRef.current = size
	}, [size])

	// Debounce the post-resize announcement so a run of keyboard nudges settles into
	// one polite message rather than chattering on every keystroke (WCAG 4.1.3).
	const announceTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

	useEffect(() => () => clearTimeout(announceTimer.current), [])

	function announceSettledWidth() {
		clearTimeout(announceTimer.current)

		announceTimer.current = setTimeout(
			() => announce(describeResize(label, sizeRef.current)),
			GRID_STATUS_DEBOUNCE_MS,
		)
	}

	function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
		// Arrow nudges, PageUp/Down coarse steps, Home/End to the bounds, and Enter to
		// auto-size the column to its content — the window-splitter key set (WCAG 4.1.2).
		// The arrows move the trailing edge on screen. That edge is on the left of a
		// right-to-left header, so ArrowLeft widens the column there.
		const key = logicalArrowKey(event.key, event.currentTarget)

		switch (key) {
			case 'ArrowLeft':
				resize.nudge(id, -COLUMN_RESIZE_STEP)
				break
			case 'ArrowRight':
				resize.nudge(id, COLUMN_RESIZE_STEP)
				break
			case 'PageDown':
				resize.nudge(id, -COLUMN_RESIZE_PAGE_STEP)
				break
			case 'PageUp':
				resize.nudge(id, COLUMN_RESIZE_PAGE_STEP)
				break
			case 'Home':
				resize.nudge(id, min - size)
				break
			case 'End':
				// To the max when bounded; an unbounded column grows a coarse step instead.
				resize.nudge(
					id,
					(max < Number.MAX_SAFE_INTEGER ? max : size + COLUMN_RESIZE_PAGE_STEP) - size,
				)
				break
			case 'Enter':
				resize.autoSizeColumn(id)
				break
			default:
				return
		}

		event.preventDefault()

		announceSettledWidth()
	}

	return (
		// biome-ignore lint/a11y/useSemanticElements: an interactive window-splitter is role="separator" with aria-value*; <hr> is a non-interactive thematic break
		<span
			role="separator"
			aria-orientation="vertical"
			aria-label={`Resize ${label}`}
			aria-valuenow={Math.round(size)}
			aria-valuetext={`${Math.round(size)} pixels`}
			aria-valuemin={min}
			aria-valuemax={max < Number.MAX_SAFE_INTEGER ? max : undefined}
			tabIndex={0}
			data-resizing={dataAttr(resizing)}
			className={cn(k.resize.handle)}
			onMouseDown={(event) => {
				// Only a plain primary press starts a drag-resize. Any context-menu
				// gesture — a right- or middle-click, or a Ctrl-click (the macOS
				// secondary click) — would otherwise begin one through the engine's
				// mouse handler, which never ends because the context menu the same
				// press opens swallows the `mouseup`, leaving the column stuck
				// resizing to the pointer. These presses fall through untouched so
				// the header's context menu still opens.
				if (event.button !== 0 || event.ctrlKey) return

				event.stopPropagation()

				resize.startResize(id, event)
			}}
			onTouchStart={(event) => {
				event.stopPropagation()

				resize.startResize(id, event)
			}}
			// The engine drives the resize off mouse/touch (above); dnd-kit's pointer
			// sensor rides `pointerdown`. When the whole header is a reorder drag
			// handle it listens for `pointerdown` on the enclosing `<th>`, so keep a
			// press on this separator from bubbling up and starting a column drag
			// alongside the resize.
			onPointerDown={(event) => {
				event.stopPropagation()

				// The same press gate as `onMouseDown`, which the browser fires after
				// this event. Only a press that starts a drag-resize takes the capture.
				if (event.button !== 0 || event.ctrlKey) return

				// Capture holds the handle as the pointer target for the whole drag. The
				// handle then keeps its resize cursor over a cell or a control with its
				// own cursor. The engine's document-level mouse listeners still receive
				// the moves and the release. The browser releases the capture on
				// pointerup and pointercancel.
				event.currentTarget.setPointerCapture(event.pointerId)
			}}
			onClick={(event) => event.stopPropagation()}
			onDoubleClick={(event) => {
				// Double-click auto-sizes the column to its content — the pointer
				// twin of the Enter key, and the "Auto-size this column" context-menu
				// action. The double press also registers two drag-resizes without
				// motion. They move no width, so they take no width control.
				event.stopPropagation()

				resize.autoSizeColumn(id)

				announceSettledWidth()
			}}
			onKeyDown={handleKeyDown}
		>
			<span aria-hidden="true" className={cn(k.resize.grip)} />
		</span>
	)
}
