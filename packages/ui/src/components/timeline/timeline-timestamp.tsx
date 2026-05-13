import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/timeline'
import { useTimeline } from './context'

export type TimelineTimestampProps = {
	className?: string
	children?: ReactNode
	dateTime?: string
}

export function TimelineTimestamp({ className, children, dateTime }: TimelineTimestampProps) {
	const { orientation } = useTimeline()

	return (
		<time
			data-slot="timeline-timestamp"
			dateTime={dateTime}
			className={cn(k.timestamp.base, k.timestamp[orientation], className)}
		>
			{children}
		</time>
	)
}
