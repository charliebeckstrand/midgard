import { cn } from '../../core'
import { k } from './variants'

// ── TimelineHeading ─────────────────────────────────────

export type TimelineHeadingProps = {
	className?: string
	children?: React.ReactNode
}

export function TimelineHeading({ className, children }: TimelineHeadingProps) {
	return (
		<div data-slot="timeline-heading" className={cn(k.heading, className)}>
			{children}
		</div>
	)
}
