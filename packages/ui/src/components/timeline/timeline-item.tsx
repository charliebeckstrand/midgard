'use client'

import { type ReactNode, useMemo } from 'react'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/timeline'
import { TimelineContext, type TimelineVariant, useTimeline } from './context'
import { TimelineMarker, type TimelineMarkerConfig } from './timeline-marker'

/**
 * Props for {@link TimelineItem}. The marker keys ({@link TimelineMarkerConfig})
 * set the dot and the connector lines of the row.
 */
export type TimelineItemProps = {
	/**
	 * Marks this row as the active step; sets `aria-current` and a `data-current` styling hook.
	 * @defaultValue false
	 */
	current?: boolean
	/** Overrides the marker treatment inherited from `<Timeline>` for this row only. */
	variant?: TimelineVariant
	className?: string
	children?: ReactNode
} & TimelineMarkerConfig

/**
 * A single `<li>` row within a `<Timeline>`. Renders its marker from
 * the marker keys. It carries `aria-current` when `current`, and
 * re-shares the resolved orientation and variant to descendants via context.
 */
export function TimelineItem(props: TimelineItemProps) {
	const { current, variant: variantProp, className, children, ...markerConfig } = props

	const { orientation, variant: contextVariant } = useTimeline()

	const variant = variantProp ?? contextVariant

	const providerValue = useMemo(() => ({ orientation, variant }), [orientation, variant])

	return (
		<li
			data-slot="timeline-item"
			data-current={dataAttr(current)}
			aria-current={current ? 'step' : undefined}
			className={cn(k.item({ orientation }), className)}
		>
			<TimelineContext value={providerValue}>
				<TimelineMarker {...markerConfig} />
				{children}
			</TimelineContext>
		</li>
	)
}
