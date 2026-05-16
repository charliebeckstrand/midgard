import type { ReactNode } from 'react'
import { cn } from '../../core'
import { timelineHeadingVariants } from '../../recipes/kata/timeline'
import { useTimeline } from './context'

export type TimelineHeadingProps = {
	className?: string
	children?: ReactNode
}

export function TimelineHeading({ className, children }: TimelineHeadingProps) {
	const { orientation } = useTimeline()

	return (
		<div
			data-slot="timeline-heading"
			className={cn(timelineHeadingVariants({ orientation }), className)}
		>
			{children}
		</div>
	)
}
