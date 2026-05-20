import { Children, isValidElement, type ReactNode, useMemo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/timeline'
import { TimelineProvider, type TimelineVariant, useTimeline } from './context'
import type { TimelineMarkerConfig } from './timeline-marker'
import { TimelineMarker } from './timeline-marker'

export type TimelineItemProps = {
	current?: boolean
	variant?: TimelineVariant
	className?: string
	children?: ReactNode
} & TimelineMarkerConfig

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
			className={cn(k.item({ orientation }), className)}
		>
			<TimelineProvider value={providerValue}>
				{!hasMarker && <TimelineMarker {...markerConfig} />}
				{children}
			</TimelineProvider>
		</li>
	)
}
