'use client'

import { useRef } from 'react'
import { cn } from '../../core'
import { useRovingFocus } from '../../hooks'
import { ActiveIndicatorScope } from '../../primitives'
import { useSegmentContext } from './context'
import { type SegmentControlVariants, segmentControlVariants } from './variants'

// ── SegmentControl ──────────────────────────────────────

export type SegmentControlProps = SegmentControlVariants & {
	'aria-label'?: string
	className?: string
	children?: React.ReactNode
}

export function SegmentControl({
	'aria-label': ariaLabel,
	size: sizeProp,
	className,
	children,
}: SegmentControlProps) {
	const ctx = useSegmentContext()

	const size = sizeProp ?? ctx.size

	const containerRef = useRef<HTMLDivElement>(null)

	const handleKeyDown = useRovingFocus(containerRef, {
		itemSelector: 'button[data-slot="segment-item"]:not(:disabled)',
		orientation: 'horizontal',
	})

	return (
		<ActiveIndicatorScope>
			<div
				ref={containerRef}
				data-slot="segment-control"
				role="radiogroup"
				aria-label={ariaLabel}
				onKeyDown={handleKeyDown}
				className={cn(segmentControlVariants({ size }), className)}
			>
				{children}
			</div>
		</ActiveIndicatorScope>
	)
}
