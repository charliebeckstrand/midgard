'use client'

import { type KeyboardEvent, useRef } from 'react'
import { announce, cn, dataAttr } from '../../core'
import { useDragCursor } from '../../hooks'
import { logicalArrowKey } from '../../hooks/a11y/logical-arrow'
import { useStableEvent } from '../../hooks/use-stable-event'
import { useTimeout } from '../../hooks/use-timeout'
import { useTouchTap } from '../../hooks/use-touch-tap'
import { useIntl } from '../../primitives/intl/use-intl'
import { Splitter } from '../../primitives/splitter/splitter'
import { k } from '../../recipes/kata/grid'
import { holdTextSelection } from '../../utilities/hold-text-selection'
import { isPrimaryPress } from '../../utilities/primary-press'
import { describeResize } from './engine/grid-announcements'
import {
	COLUMN_RESIZE_PAGE_STEP,
	COLUMN_RESIZE_STEP,
	GRID_STATUS_DEBOUNCE_MS,
} from './engine/grid-constants'
import { gridMessages } from './engine/grid-messages'
import type { GridColumnResizeActions } from './engine/grid-table/resize-view'
import { GRID_DOUBLE_TAP_WINDOW } from './use-grid-touch-entry'

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
 * accepts Arrow keys to nudge the width. A double-click or a double tap
 * auto-sizes the column to its content. Its always-visible grip is the
 * `aria-hidden` child.
 *
 * A touch screen sends no double-click: the root `touch-action: manipulation`
 * of `ui` stops it on iOS, and the touch end of the drag-resize of the engine
 * cancels the mouse events of the tap. Thus the handle finds the double tap
 * itself. Two taps that lift in {@link GRID_DOUBLE_TAP_WINDOW} of each other
 * are a double tap, and a third tap starts a new pair. A press that travels or
 * holds is not a tap (see {@link useTouchTap}).
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
	// The resize cursor stays on the page for the whole drag, over a cell or a
	// control with a cursor of its own.
	useDragCursor(resizing, 'col-resize')

	const intl = useIntl()

	// A nudge or an auto-size lands in a later commit than the key press, so the
	// timer calls a stable event, which reads the width of the newest commit.
	const announceWidth = useStableEvent(() => announce(describeResize(intl, label, size)))

	// Debounce the post-resize announcement so a run of keyboard nudges settles into
	// one polite message rather than chattering on every keystroke (WCAG 4.1.3).
	const announceTimer = useTimeout()

	function announceSettledWidth() {
		announceTimer.set(announceWidth, GRID_STATUS_DEBOUNCE_MS)
	}

	function autoSize() {
		resize.autoSizeColumn(id)

		announceSettledWidth()
	}

	// The lift time of the last touch tap, which a second tap makes a double tap.
	const prevTap = useRef<number | null>(null)

	// Whether the last tap was the second tap of a double tap.
	const doubleTapped = useRef(false)

	const autoSizeTimer = useTimeout()

	const touch = useTouchTap(() => {
		const at = performance.now()

		const prev = prevTap.current

		const double = prev !== null && at - prev <= GRID_DOUBLE_TAP_WINDOW

		prevTap.current = double ? null : at

		doubleTapped.current = double
	})

	function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
		// Arrow nudges, PageUp/Down coarse steps, Home/End to the bounds, and Enter to
		// auto-size the column to its content: the window-splitter key set (WCAG 4.1.2).
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
		<Splitter
			label={intl.formatMessage(gridMessages.resizeColumn, { column: label })}
			orientation="vertical"
			value={Math.round(size)}
			valueText={intl.formatMessage(gridMessages.pixels, { width: Math.round(size) })}
			min={Math.floor(min)}
			max={max < Number.MAX_SAFE_INTEGER ? max : undefined}
			data-resizing={dataAttr(resizing)}
			className={cn(k.resize.handle, k.resize.grip)}
			onMouseDown={(event) => {
				// Only a plain primary press starts a drag-resize. Any context-menu
				// gesture (a right- or middle-click, or a Ctrl-click, which is the
				// macOS secondary click) would otherwise begin one through the engine's
				// mouse handler, which never ends because the context menu the same
				// press opens swallows the `mouseup`, leaving the column stuck resizing
				// to the pointer. These presses fall through untouched so the header's
				// context menu still opens.
				if (!isPrimaryPress(event)) return

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
				// The browser sends the mouse events only for the primary pointer, so
				// this gate also refuses a pointer that is not the primary pointer, for
				// example a second finger.
				if (!isPrimaryPress(event)) return

				doubleTapped.current = false

				touch.onPointerDown(event)

				holdTextSelection(event)

				// Capture holds the handle as the pointer target for the whole drag, so
				// the cells under the pointer show no hover. The engine's document-level
				// mouse listeners still receive the moves and the release. The browser
				// releases the capture on pointerup and pointercancel.
				event.currentTarget.setPointerCapture(event.pointerId)
			}}
			onPointerMove={touch.onPointerMove}
			onPointerUp={touch.onPointerUp}
			onPointerCancel={touch.onPointerCancel}
			onTouchEnd={() => {
				if (!doubleTapped.current) return

				doubleTapped.current = false

				// The engine ends the drag-resize of the tap from its own touch end
				// listener on the document. That end writes the width of the drag, which
				// can move a few px with the finger, so the auto-size must come after it.
				// A listener cannot follow it: when React listens on the document, its
				// listeners run first, and the engine stops the event there. A timer
				// fires in a later task, after the whole dispatch of this touch end.
				autoSizeTimer.set(autoSize, 0)
			}}
			onClick={(event) => event.stopPropagation()}
			onDoubleClick={(event) => {
				// Double-click auto-sizes the column to its content: the pointer
				// twin of the Enter key, and the "Auto-size this column" context-menu
				// action. The double press also registers two drag-resizes without
				// motion. They move no width, so they take no width control.
				event.stopPropagation()

				autoSize()
			}}
			onKeyDown={handleKeyDown}
		/>
	)
}
