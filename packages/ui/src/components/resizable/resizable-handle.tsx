'use client'

import { useCallback } from 'react'
import { cn } from '../../core'
import { useResizable } from './context'
import { k } from './variants'

export type ResizableHandleProps = {
	className?: string
}

export function ResizableHandle(props: ResizableHandleProps) {
	const { className } = props

	const handleIndex: number = ((props as Record<string, unknown>)._handleIndex as number) ?? 0
	const panelSize: number = ((props as Record<string, unknown>)._panelSize as number) ?? 0
	const panelMinSize: number = ((props as Record<string, unknown>)._panelMinSize as number) ?? 0
	const panelMaxSize: number = ((props as Record<string, unknown>)._panelMaxSize as number) ?? 100

	const { direction, dragging, startDrag, resize } = useResizable()

	const isHorizontal = direction === 'horizontal'

	const isDragging = dragging === handleIndex

	const onKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
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
			data-dragging={isDragging ? '' : undefined}
			role="separator"
			aria-orientation={direction}
			aria-label="Resize"
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
