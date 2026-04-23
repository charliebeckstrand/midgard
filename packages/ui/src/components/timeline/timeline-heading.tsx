import type { ReactNode } from 'react'
import { cn } from '../../core'
import { useTimeline } from './context'
import { k } from './variants'

// ── TimelineHeading ─────────────────────────────────────

export type TimelineHeadingProps = {
	className?: string
	children?: ReactNode
}

export function TimelineHeading({ className, children }: TimelineHeadingProps) {
	const { orientation } = useTimeline()

	return (
		<div
			data-slot="timeline-heading"
			className={cn(k.heading.base, k.heading[orientation], className)}
		>
			{children}
		</div>
	)
}
