'use client'

import { type ReactNode, useMemo } from 'react'
import { cn } from '../../core'
import { k, type TimelineVariants } from '../../recipes/kata/timeline'
import type { TimelineOrientation, TimelineVariant } from './context'
import { TimelineContext } from './context'

/** Props for {@link Timeline}. */
export type TimelineProps = TimelineVariants & {
	/**
	 * Layout axis shared with descendant items via context.
	 * @defaultValue 'vertical'
	 */
	orientation?: TimelineOrientation
	/**
	 * Marker/line treatment shared with descendant items; `<TimelineItem>` may override per row.
	 * @defaultValue 'solid'
	 */
	variant?: TimelineVariant
	className?: string
	children?: ReactNode
}

/**
 * Ordered sequence of events rendered as an `<ol>` of `<TimelineItem>` rows.
 * Lays out along `orientation` (vertical or horizontal) and propagates both
 * `orientation` and `variant` to its items via context, so markers and
 * connector lines stay consistent across the run.
 */
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
