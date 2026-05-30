'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/timeline'
import { useTimeline } from './context'

export type TimelineDescriptionProps = {
	className?: string
	children?: ReactNode
}

export function TimelineDescription({ className, children }: TimelineDescriptionProps) {
	const { orientation } = useTimeline()

	return (
		<p data-slot="timeline-description" className={cn(k.description({ orientation }), className)}>
			{children}
		</p>
	)
}
