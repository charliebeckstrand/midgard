import { Children, isValidElement } from 'react'
import { cn } from '../../core'
import { TimelineProvider, type TimelineVariant, useTimeline } from './context'
import type { TimelineMarkerConfig } from './timeline-marker'
import { TimelineMarker, type TimelineMarkerProps } from './timeline-marker'
import { k } from './variants'

// ── TimelineItem ────────────────────────────────────────

export type TimelineItemProps = {
	active?: boolean
	variant?: TimelineVariant
	className?: string
	children?: React.ReactNode
} & TimelineMarkerConfig

export function TimelineItem({
	active,
	variant: variantProp,
	className,
	children,
	status,
	color,
	pulse,
}: TimelineItemProps) {
	const { orientation, variant: contextVariant } = useTimeline()

	const variant = variantProp ?? contextVariant

	const hasMarker = Children.toArray(children).some(
		(child) => isValidElement(child) && child.type === TimelineMarker,
	)

	return (
		<li
			data-slot="timeline-item"
			data-active={active || undefined}
			className={cn(
				k.item.base,
				orientation === 'vertical' ? k.item.vertical : k.item.horizontal,
				className,
			)}
		>
			<TimelineProvider value={{ orientation, variant }}>
				{!hasMarker && <TimelineMarker {...({ status, color, pulse } as TimelineMarkerProps)} />}
				{children}
			</TimelineProvider>
		</li>
	)
}
