'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/timeline'
import { useTimeline } from './context'

/** Props for {@link TimelineDescription}. */
export type TimelineDescriptionProps = {
	className?: string
	children?: ReactNode
}

/** Supporting body copy of a `<TimelineItem>`, rendered as a `<p>`. */
export function TimelineDescription({ className, children }: TimelineDescriptionProps) {
	const { orientation } = useTimeline()

	return (
		<p data-slot="timeline-description" className={cn(k.description({ orientation }), className)}>
			{children}
		</p>
	)
}
