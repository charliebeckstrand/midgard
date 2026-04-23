import { Children, isValidElement, type ReactNode, useMemo } from 'react'
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
	children?: ReactNode
} & TimelineMarkerConfig

export function TimelineItem({
	active,
	variant: variantProp,
	className,
	children,
	status,
	color,
	pulse,
	lineBefore,
	lineAfter,
}: TimelineItemProps) {
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
			data-active={active || undefined}
			className={cn(
				k.item.base,
				orientation === 'vertical' ? k.item.vertical : k.item.horizontal,
				className,
			)}
		>
			<TimelineProvider value={providerValue}>
				{!hasMarker && (
					<TimelineMarker
						{...({ status, color, pulse, lineBefore, lineAfter } as TimelineMarkerProps)}
					/>
				)}
				{children}
			</TimelineProvider>
		</li>
	)
}
