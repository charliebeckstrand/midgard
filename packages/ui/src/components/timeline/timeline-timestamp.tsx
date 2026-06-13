'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/timeline'
import { useTimeline } from './context'

/** Props for {@link TimelineTimestamp}. */
export type TimelineTimestampProps = {
	className?: string
	children?: ReactNode
	/** Machine-readable date/time for the underlying `<time dateTime>`. */
	dateTime?: string
}

/** Timestamp of a `<TimelineItem>`, rendered as a semantic `<time>` element. */
export function TimelineTimestamp({ className, children, dateTime }: TimelineTimestampProps) {
	const { orientation } = useTimeline()

	return (
		<time
			data-slot="timeline-timestamp"
			dateTime={dateTime}
			className={cn(k.timestamp({ orientation }), className)}
		>
			{children}
		</time>
	)
}
