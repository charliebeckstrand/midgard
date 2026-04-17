'use client'

import { cn } from '../../core'
import { ActiveIndicator, useActiveIndicator, useCurrentContext } from '../../primitives'
import { useSegmentContext } from './context'
import { k, segmentItemVariants } from './variants'

// ── SegmentItem ─────────────────────────────────────────

export type SegmentItemProps = {
	value: string
	disabled?: boolean
	className?: string
	children?: React.ReactNode
}

export function SegmentItem({ value, disabled, className, children }: SegmentItemProps) {
	const currentCtx = useCurrentContext()
	const { size } = useSegmentContext()

	const current = currentCtx?.value === value

	const indicator = useActiveIndicator()

	return (
		<span className="group relative" {...indicator.tapHandlers}>
			{/* biome-ignore lint/a11y/useSemanticElements: a styled button with role="radio" is standard for segmented controls */}
			<button
				data-slot="segment-item"
				data-current={current ? '' : undefined}
				type="button"
				role="radio"
				aria-checked={current}
				disabled={disabled}
				tabIndex={current ? 0 : -1}
				onClick={() => currentCtx?.onChange?.(value)}
				className={cn(segmentItemVariants({ size }), 'relative z-1', className)}
			>
				{children}
			</button>
			{current && <ActiveIndicator ref={indicator.ref} className={cn(k.indicator)} />}
		</span>
	)
}
