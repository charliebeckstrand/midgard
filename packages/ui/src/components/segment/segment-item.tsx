'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { ActiveIndicator, useActiveIndicator } from '../../primitives/active-indicator'
import { useCurrent } from '../../primitives/current'
import { k } from '../../recipes/kata/segment'
import { useSegmentContext } from './context'

export type SegmentItemProps = {
	value: string
	disabled?: boolean
	className?: string
	children?: ReactNode
}

export function SegmentItem({ value, disabled, className, children }: SegmentItemProps) {
	const currentContext = useCurrent()

	const { size } = useSegmentContext()

	const current = currentContext?.value === value

	const indicator = useActiveIndicator()

	return (
		<span className="group relative" {...indicator.tapHandlers}>
			{/* biome-ignore lint/a11y/useSemanticElements: a styled button with role="radio" is standard for segmented controls */}
			<button
				data-slot="segment-item"
				data-current={current || undefined}
				type="button"
				role="radio"
				aria-checked={current}
				disabled={disabled}
				tabIndex={current ? 0 : -1}
				onClick={() => currentContext?.onValueChange?.(value)}
				className={cn(k.item({ size }), 'relative z-1', className)}
			>
				{children}
			</button>
			{current && <ActiveIndicator ref={indicator.ref} className={cn(k.indicator)} />}
		</span>
	)
}
