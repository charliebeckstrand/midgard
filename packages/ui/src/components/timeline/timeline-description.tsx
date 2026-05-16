import type { ReactNode } from 'react'
import { cn } from '../../core'
import { timelineDescriptionVariants } from '../../recipes/kata/timeline'
import { useTimeline } from './context'

export type TimelineDescriptionProps = {
	className?: string
	children?: ReactNode
}

export function TimelineDescription({ className, children }: TimelineDescriptionProps) {
	const { orientation } = useTimeline()

	return (
		<p
			data-slot="timeline-description"
			className={cn(timelineDescriptionVariants({ orientation }), className)}
		>
			{children}
		</p>
	)
}
