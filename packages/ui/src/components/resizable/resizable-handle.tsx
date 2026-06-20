'use client'

import { type KeyboardEvent, useCallback } from 'react'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/resizable'
import { useResizable, useResizableIndex } from './context'

/** Props for {@link ResizableHandle}: an optional accessible name. */
export type ResizableHandleProps = {
	/** Accessible name; distinguishes multiple handles ("Resize sidebar"). @defaultValue 'Resize' */
	'aria-label'?: string
	className?: string
}

/**
 * Resize delta for a key press: arrows move by `step` along the panel axis,
 * Home / End jump to the bounds. Returns 0 for keys that don't resize.
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
		(event: KeyboardEvent) => {
			const step = event.shiftKey ? 10 : 5

			const delta = resizeDeltaForKey(event.key, isHorizontal, step)

			if (delta !== 0) {
				event.preventDefault()

				resize(handleIndex, delta)
			}
		},
		[handleIndex, isHorizontal, resize],
	)

	return (
		// biome-ignore lint/a11y/useSemanticElements: a focusable separator is the correct role for a resize handle
		<div
			data-slot="resizable-handle"
			data-dragging={dataAttr(isDragging)}
			role="separator"
			// A separator's orientation is its own, not the group's flex axis: the
			// handle between side-by-side panels is a vertical bar.
			aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
			aria-label={ariaLabel}
			aria-valuenow={panelSize}
			aria-valuemin={panelMinSize}
			aria-valuemax={panelMaxSize}
			tabIndex={0}
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
				className={cn(
					k.grip.base,
					isHorizontal ? k.grip.horizontal : k.grip.vertical,
					isDragging && k.grip.dragging,
				)}
			/>
		</div>
	)
}
