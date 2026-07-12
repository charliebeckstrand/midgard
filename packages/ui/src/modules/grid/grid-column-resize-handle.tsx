'use client'

import { type KeyboardEvent, useEffect, useRef } from 'react'
import { announce, cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/grid'
import { describeResize } from './engine/grid-announcements'
import {
	COLUMN_RESIZE_PAGE_STEP,
	COLUMN_RESIZE_STEP,
	GRID_STATUS_DEBOUNCE_MS,
} from './engine/grid-constants'
import type { GridColumnResize } from './use-grid-table'

/** Props for {@link GridColumnResizeHandle}. @internal */
type GridColumnResizeHandleProps = {
	id: string | number
	label: string
	resize: GridColumnResize
	resizing: boolean
}

/**
 * Resize separator on a resizable column header's trailing edge: a focusable
 * window-splitter, sized to the header, that starts a pointer drag-resize and
 * accepts Arrow keys to nudge the width. A double-click auto-sizes the column
 * to its content. Its always-visible grip is the `aria-hidden` child.
 *
 * @internal
 */
export function GridColumnResizeHandle({
	id,
	label,
	resize,
	resizing,
}: GridColumnResizeHandleProps) {
	const onPointer = resize.getResizeHandler(id)

	const { min, max } = resize.bounds(id)

	// Debounce the post-resize announcement so a run of keyboard nudges settles into
	// one polite message rather than chattering on every keystroke (WCAG 4.1.3).
	const announceTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

	useEffect(() => () => clearTimeout(announceTimer.current), [])

	function announceSettledWidth() {
		clearTimeout(announceTimer.current)

		announceTimer.current = setTimeout(
			() => announce(describeResize(label, resize.getSize(id))),
			GRID_STATUS_DEBOUNCE_MS,
		)
	}

	function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
		// Arrow nudges, PageUp/Down coarse steps, Home/End to the bounds, and Enter to
		// reset the column to its default — the window-splitter key set (WCAG 4.1.2).
		const size = resize.getSize(id)

		switch (event.key) {
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
				resize.reset(id)
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
			aria-valuenow={Math.round(resize.getSize(id))}
			aria-valuetext={`${Math.round(resize.getSize(id))} pixels`}
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

				onPointer?.(event)
			}}
			onTouchStart={(event) => {
				event.stopPropagation()

				onPointer?.(event)
			}}
			// The engine drives the resize off mouse/touch (above); dnd-kit's pointer
			// sensor rides `pointerdown`. When the whole header is a reorder drag
			// handle it listens for `pointerdown` on the enclosing `<th>`, so keep a
			// press on this separator from bubbling up and starting a column drag
			// alongside the resize.
			onPointerDown={(event) => event.stopPropagation()}
			onClick={(event) => event.stopPropagation()}
			onDoubleClick={(event) => {
				// Double-click auto-sizes the column to its content — the pointer
				// twin of the Enter key's reset, and the "Auto-size this column"
				// context-menu action. The two no-op drag-resizes the double press
				// registers (down/up without motion) leave the width untouched, so
				// the reset lands on the width the second release left in place.
				event.stopPropagation()

				resize.reset(id)

				announceSettledWidth()
			}}
			onKeyDown={handleKeyDown}
		>
			<span aria-hidden="true" className={cn(k.resize.grip)} />
		</span>
	)
}
