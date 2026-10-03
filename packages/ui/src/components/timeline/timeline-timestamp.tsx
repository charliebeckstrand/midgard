'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/timeline'
import { useTimeline } from './context'

/** Props for {@link TimelineTimestamp}. */
export type TimelineTimestampProps = {
	className?: string
	children?: ReactNode
	/** Machine-readable date/time for the underlying `<time dateTime>`. Without it, the timestamp renders a `<span>`. */
	dateTime?: string
}

/**
 * Timestamp of a `<TimelineItem>`, rendered as a semantic `<time>` element when
 * `dateTime` is set. Without `dateTime`, the content of a `<time>` must be a valid
 * date string, so free text renders in a `<span>`.
 */
export function TimelineTimestamp({ className, children, dateTime }: TimelineTimestampProps) {
	const { orientation } = useTimeline()

	const classes = cn(k.timestamp({ orientation }), className)

	if (dateTime === undefined) {
		return (
			<span data-slot="timeline-timestamp" className={classes}>
				{children}
			</span>
		)
	}

	return (
		<time data-slot="timeline-timestamp" dateTime={dateTime} className={classes}>
			{children}
		</time>
	)
}
