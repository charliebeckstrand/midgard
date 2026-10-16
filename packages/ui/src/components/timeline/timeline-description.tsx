'use client'

import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/timeline'
import { useTimeline } from './context'

/** Props for {@link TimelineDescription}. The `<p>` takes the rest. */
export type TimelineDescriptionProps = ComponentProps<'p'>

/** Supporting body copy of a `<TimelineItem>`, rendered as a `<p>`. */
export function TimelineDescription({ className, children, ...props }: TimelineDescriptionProps) {
	const { orientation } = useTimeline()

	return (
		<p
			data-slot="timeline-description"
			{...props}
			className={cn(k.description({ orientation }), className)}
		>
			{children}
		</p>
	)
}
