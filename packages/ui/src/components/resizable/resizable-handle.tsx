'use client'

import { type KeyboardEvent, useCallback } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/resizable'
import { useResizable, useResizableIndex } from './context'

/** Props for {@link ResizableHandle}: an optional accessible name. */
export type ResizableHandleProps = {
	/** Accessible name; distinguishes multiple handles ("Resize sidebar"). @default 'Resize' */
	'aria-label'?: string
	className?: string
}

/**
 * Draggable divider between two {@link ResizablePanel}s. Renders a focusable
 * `role="separator"` whose `aria-orientation` is perpendicular to the group
 * axis; drag or arrow keys (Shift for a larger step, Home/End for the extremes)
 * adjust the adjacent panel within its min/max bounds.
 */
export function ResizableHandle(props: ResizableHandleProps) {
	const { 'aria-label': ariaLabel = 'Resize', className } = props

	const { orientation, dragging, sizes, panelConfigs, startDrag, resize } = useResizable()
	const { handleIndex = 0 } = useResizableIndex()

	const panelSize = Math.round(sizes[handleIndex] ?? 0)
	const panelMinSize = Math.round(panelConfigs[handleIndex]?.minSize ?? 0)
	const panelMaxSize = Math.round(panelConfigs[handleIndex]?.maxSize ?? 100)

	const isHorizontal = orientation === 'horizontal'

	const isDragging = dragging === handleIndex

	const onKeyDown = useCallback(
		(e: KeyboardEvent) => {
			const step = e.shiftKey ? 10 : 5

			let delta = 0

			if (isHorizontal) {
				if (e.key === 'ArrowRight') delta = step
				else if (e.key === 'ArrowLeft') delta = -step
			} else {
				if (e.key === 'ArrowDown') delta = step
				else if (e.key === 'ArrowUp') delta = -step
			}

			if (e.key === 'Home') delta = -100

			if (e.key === 'End') delta = 100

			if (delta !== 0) {
				e.preventDefault()

				resize(handleIndex, delta)
			}
		},
		[handleIndex, isHorizontal, resize],
	)

	return (
		// biome-ignore lint/a11y/useSemanticElements: a focusable separator is the correct role for a resize handle
		<div
			data-slot="resizable-handle"
			data-dragging={isDragging || undefined}
			role="separator"
			// A separator's orientation is its own, not the group's flex axis: the
			// handle between side-by-side panels is a vertical bar.
			aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
			aria-label={ariaLabel}
			aria-valuenow={panelSize}
			aria-valuemin={panelMinSize}
			aria-valuemax={panelMaxSize}
			tabIndex={0}
			onPointerDown={(e) => startDrag(handleIndex, e)}
			onKeyDown={onKeyDown}
			className={cn(k.handle, isHorizontal ? k.handleHorizontal : k.handleVertical, className)}
		>
			<span
				aria-hidden
				className={cn(
					k.grip,
					isHorizontal ? k.gripHorizontal : k.gripVertical,
					isDragging && k.gripDragging,
				)}
			/>
		</div>
	)
}
