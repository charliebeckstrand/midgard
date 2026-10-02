'use client'

import { type KeyboardEvent, useCallback } from 'react'
import { cn, dataAttr } from '../../core'
import { logicalArrowKey } from '../../hooks/a11y/logical-arrow'
import { PanelSplitter } from '../../primitives/panel/panel-splitter'
import { k } from '../../recipes/kata/resizable'
import { useResizable, useResizableIndex } from './context'
import { pairRange } from './use-resizable-panel'

/** Props for {@link ResizableHandle}: an optional accessible name. */
export type ResizableHandleProps = {
	/** Accessible name; distinguishes multiple handles ("Resize sidebar"). @defaultValue 'Resize' */
	'aria-label'?: string
	className?: string
}

/**
 * Resize delta for a key press: arrows move by `step` along the panel axis,
 * Home / End jump to the bounds. Returns 0 for keys that don't resize. A
 * horizontal arrow comes in the reading order, after `logicalArrowKey`.
 *
 * @internal
 */
function resizeDeltaForKey(key: string, isHorizontal: boolean, step: number): number {
	const increase = isHorizontal ? 'ArrowRight' : 'ArrowDown'
	const decrease = isHorizontal ? 'ArrowLeft' : 'ArrowUp'

	if (key === increase) return step

	if (key === decrease) return -step

	if (key === 'Home') return -100

	if (key === 'End') return 100

	return 0
}

/**
 * Draggable divider between two {@link ResizablePanel}s. Renders a focusable
 * `role="separator"` whose `aria-orientation` is perpendicular to the group
 * axis. A drag or the arrow keys adjust the adjacent panel within its min and
 * max bounds. Shift takes a larger step, and Home/End reach the extremes. In a
 * right-to-left group the panels start on the right, so the horizontal arrows
 * and the drag mirror: ArrowLeft and a move to the left grow the panel before
 * the handle. `aria-valuemin` and `aria-valuemax` give the range that this
 * panel can reach while both panels keep their bounds.
 */
export function ResizableHandle(props: ResizableHandleProps) {
	const { 'aria-label': ariaLabel = 'Resize', className } = props

	const { orientation, dragging, sizes, panelConfigs, startDrag, resize } = useResizable()
	const { handleIndex = 0 } = useResizableIndex()

	// The range is where the left panel can go while both panels of the pair
	// keep their bounds, so each end is one that the handle can reach.
	const range = pairRange(sizes, handleIndex, panelConfigs)

	const panelSize = Math.round(sizes[handleIndex] ?? 0)
	const panelMinSize = Math.round(range.min)
	const panelMaxSize = Math.round(range.max)

	const isHorizontal = orientation === 'horizontal'

	const isDragging = dragging === handleIndex

	const onKeyDown = useCallback(
		(event: KeyboardEvent) => {
			const step = event.shiftKey ? 10 : 5

			// In a right-to-left group the first panel is on the right, so the
			// horizontal arrows swap: ArrowLeft grows it.
			const delta = resizeDeltaForKey(
				logicalArrowKey(event.key, event.currentTarget),
				isHorizontal,
				step,
			)

			if (delta !== 0) {
				event.preventDefault()

				resize(handleIndex, delta)
			}
		},
		[handleIndex, isHorizontal, resize],
	)

	return (
		<PanelSplitter
			data-slot="resizable-handle"
			data-dragging={dataAttr(isDragging)}
			// A separator's orientation is its own, not the group's flex axis: the
			// handle between side-by-side panels is a vertical bar.
			aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
			aria-label={ariaLabel}
			aria-valuenow={panelSize}
			aria-valuemin={panelMinSize}
			aria-valuemax={panelMaxSize}
			onPointerDown={(event) => startDrag(handleIndex, event)}
			onKeyDown={onKeyDown}
			className={cn(
				k.handle.base,
				isHorizontal ? k.handle.horizontal : k.handle.vertical,
				className,
			)}
		>
			<span
				aria-hidden
				className={cn(k.grip.base, isHorizontal ? k.grip.horizontal : k.grip.vertical)}
			/>
		</PanelSplitter>
	)
}
