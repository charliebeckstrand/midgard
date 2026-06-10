'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/textarea'
import { Placeholder } from '../placeholder'

export type TextareaSkeletonProps = {
	/** Visible rows the control reserves; drives the placeholder height. */
	rows?: number
	className?: string
}

/**
 * Textarea-shaped placeholder. Height tracks the reserved `rows` count rather
 * than the Density `size` axis; it folds in the row math by hand instead of
 * using the size-driven `createSkeleton` factory.
 */
export function TextareaSkeleton({ rows = 3, className }: TextareaSkeletonProps) {
	return (
		<Placeholder
			className={cn(k.skeleton.base, className)}
			style={{ height: `calc(${rows}lh + 1rem)` }}
		/>
	)
}
