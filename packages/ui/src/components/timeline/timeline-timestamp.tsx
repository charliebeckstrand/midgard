'use client'

import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/timeline'
import { useTimeline } from './context'

/**
 * Props for {@link TimelineTimestamp}. The `<time>` or the `<span>` takes the
 * rest. The two elements have different ref types, so the timestamp takes no
 * `ref`.
 */
export type TimelineTimestampProps = Omit<ComponentProps<'span'>, 'ref'> & {
	/** Machine-readable date/time for the underlying `<time dateTime>`. Without it, the timestamp renders a `<span>`. */
	dateTime?: string
}

/**
 * Timestamp of a `<TimelineItem>`, rendered as a semantic `<time>` element when
 * `dateTime` is set. Without `dateTime`, the content of a `<time>` must be a valid
 * date string, so free text renders in a `<span>`.
 */
export function TimelineTimestamp({
	className,
	children,
	dateTime,
	...props
}: TimelineTimestampProps) {
	const { orientation } = useTimeline()

	const classes = cn(k({ orientation }).timestamp, className)

	if (dateTime === undefined) {
		return (
			<span data-slot="timeline-timestamp" {...props} className={classes}>
				{children}
			</span>
		)
	}

	return (
		<time data-slot="timeline-timestamp" {...props} dateTime={dateTime} className={classes}>
			{children}
		</time>
	)
}
