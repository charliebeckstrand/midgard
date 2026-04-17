import { cn } from '../../core'
import { k } from './variants'

// ── TimelineTimestamp ────────────────────────────────────

export type TimelineTimestampProps = {
	className?: string
	children?: React.ReactNode
	dateTime?: string
}

export function TimelineTimestamp({ className, children, dateTime }: TimelineTimestampProps) {
	return (
		<time data-slot="timeline-timestamp" dateTime={dateTime} className={cn(k.timestamp, className)}>
			{children}
		</time>
	)
}
