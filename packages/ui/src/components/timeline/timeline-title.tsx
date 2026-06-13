'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/timeline'
import { useTimeline } from './context'

/** Props for {@link TimelineTitle}. */
export type TimelineTitleProps = {
	className?: string
	children?: ReactNode
}

/** Headline of a `<TimelineItem>`; spaced against the marker per the inherited orientation. */
export function TimelineTitle({ className, children }: TimelineTitleProps) {
	const { orientation } = useTimeline()

	return (
		<div data-slot="timeline-title" className={cn(k.title({ orientation }), className)}>
			{children}
		</div>
	)
}
