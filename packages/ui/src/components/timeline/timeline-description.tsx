import type { ReactNode } from 'react'
import { cn } from '../../core'
import { useTimeline } from './context'
import { k } from './variants'

// ── TimelineDescription ─────────────────────────────────

export type TimelineDescriptionProps = {
	className?: string
	children?: ReactNode
}

export function TimelineDescription({ className, children }: TimelineDescriptionProps) {
	const { orientation } = useTimeline()

	return (
		<p
			data-slot="timeline-description"
			className={cn(k.description.base, k.description[orientation], className)}
		>
			{children}
		</p>
	)
}
