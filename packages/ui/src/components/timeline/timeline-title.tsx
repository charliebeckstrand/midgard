import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/timeline'
import { useTimeline } from './context'

export type TimelineTitleProps = {
	className?: string
	children?: ReactNode
}

export function TimelineTitle({ className, children }: TimelineTitleProps) {
	const { orientation } = useTimeline()

	return (
		<div data-slot="timeline-title" className={cn(k.title({ orientation }), className)}>
			{children}
		</div>
	)
}
