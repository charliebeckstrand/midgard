'use client'

import { type ReactNode, useMemo } from 'react'
import { cn } from '../../core'
import { k, type TimelineVariants } from '../../recipes/kata/timeline'
import type { TimelineOrientation, TimelineVariant } from './context'
import { TimelineContext } from './context'

export type TimelineProps = TimelineVariants & {
	orientation?: TimelineOrientation
	variant?: TimelineVariant
	className?: string
	children?: ReactNode
}

/** Ordered list of timeline items rendered as an `<ol>` — propagates `orientation` and `variant` to its `<TimelineItem>` children via context. */
export function Timeline({
	orientation = 'vertical',
	variant = 'solid',
	className,
	children,
}: TimelineProps) {
	const value = useMemo(() => ({ orientation, variant }), [orientation, variant])

	return (
		<TimelineContext value={value}>
			<ol data-slot="timeline" className={cn(k.root({ orientation, variant }), className)}>
				{children}
			</ol>
		</TimelineContext>
	)
}
