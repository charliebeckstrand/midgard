'use client'

import { Children, isValidElement, type ReactNode, useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/timeline'
import { TimelineContext, type TimelineVariant, useTimeline } from './context'
import type { TimelineMarkerConfig } from './timeline-marker'
import { TimelineMarker } from './timeline-marker'

/**
 * Props for {@link TimelineItem}. Marker config keys ({@link TimelineMarkerConfig})
 * are forwarded to the implicit `<TimelineMarker>` when no explicit one is composed.
 */
export type TimelineItemProps = {
	/** Marks this row as the active step; sets `aria-current` and a `data-current` styling hook. */
	current?: boolean
	/** Overrides the marker treatment inherited from `<Timeline>` for this row only. */
	variant?: TimelineVariant
	className?: string
	children?: ReactNode
} & TimelineMarkerConfig

/**
 * A single `<li>` row within a `<Timeline>`. Renders an implicit
 * `<TimelineMarker>` from its marker-config props unless one is composed
 * explicitly among `children`, carries `aria-current` when `current`, and
 * re-shares the resolved orientation/variant to descendants via context.
 */
export function TimelineItem(props: TimelineItemProps) {
	const { current, variant: variantProp, className, children, ...markerConfig } = props

	const { orientation, variant: contextVariant } = useTimeline()

	const variant = variantProp ?? contextVariant

	const hasMarker = useMemo(
		() =>
			Children.toArray(children).some(
				(child) => isValidElement(child) && child.type === TimelineMarker,
			),
		[children],
	)

	const providerValue = useMemo(() => ({ orientation, variant }), [orientation, variant])

	return (
		<li
			data-slot="timeline-item"
			data-current={current || undefined}
			aria-current={current || undefined}
			className={cn(k.item({ orientation }), className)}
		>
			<TimelineContext value={providerValue}>
				{!hasMarker && <TimelineMarker {...markerConfig} />}
				{children}
			</TimelineContext>
		</li>
	)
}
