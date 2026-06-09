'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/textarea'
import { Placeholder } from '../placeholder'

export type TextareaSkeletonProps = {
	/** Visible text rows, mirrored from `Textarea` so the silhouette matches its height. @default 3 */
	rows?: number
	className?: string
}

/**
 * Skeleton silhouette for `Textarea`. Its height keys off `rows` rather than a
 * size step, so it is hand-written (cf. §3.6) instead of `createSkeleton`.
 */
export function TextareaSkeleton({ rows = 3, className }: TextareaSkeletonProps) {
	return (
		<Placeholder
			className={cn(k.skeleton.base, className)}
			style={{ height: `calc(${rows}lh + 1rem)` }}
		/>
	)
}
