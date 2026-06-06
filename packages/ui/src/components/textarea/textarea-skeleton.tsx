import { cn } from '../../core'
import { k } from '../../recipes/kata/textarea'
import { Placeholder } from '../placeholder'

export type TextareaSkeletonProps = {
	/** Visible text rows; drives the placeholder height as Textarea's does. */
	rows?: number
	className?: string
}

export function TextareaSkeleton({ rows = 3, className }: TextareaSkeletonProps) {
	return (
		<Placeholder
			className={cn(k.skeleton.base, className)}
			style={{ height: `calc(${rows}lh + 1rem)` }}
		/>
	)
}
