import type { ReactNode } from 'react'
import {
	Timeline,
	TimelineDescription,
	TimelineHeading,
	TimelineItem,
	TimelineMarker,
	type TimelineProps,
	TimelineTimestamp,
} from '../timeline'

export type ShipmentTrackerStep = {
	id?: string
	label: string
	timestamp?: string
	description?: ReactNode
	marker?: ReactNode
}

export type ShipmentTrackerProps = {
	steps: ShipmentTrackerStep[]
	currentIndex: number
	orientation?: TimelineProps['orientation']
	className?: string
}

export function ShipmentTracker({
	steps,
	currentIndex,
	orientation,
	className,
}: ShipmentTrackerProps) {
	return (
		<div data-slot="shipment-tracker" className={className}>
			<Timeline orientation={orientation}>
				{steps.map((step, index) => {
					const isCompleted = index < currentIndex

					const isCurrent = index === currentIndex

					const isReached = isCompleted || isCurrent

					const isFinal = isCurrent && index === steps.length - 1

					return (
						<TimelineItem
							key={step.id ?? index}
							active={isCurrent}
							variant={isReached ? 'solid' : 'outline'}
							status={isCompleted || isFinal ? 'active' : isCurrent ? 'info' : 'inactive'}
							pulse={isCurrent && !isFinal}
							lineBefore={isReached ? 'green' : undefined}
							lineAfter={isCompleted ? 'green' : undefined}
						>
							{step.marker != null && <TimelineMarker>{step.marker}</TimelineMarker>}
							<TimelineTimestamp>{step.timestamp ?? '—'}</TimelineTimestamp>
							<TimelineHeading>{step.label}</TimelineHeading>
							{step.description && <TimelineDescription>{step.description}</TimelineDescription>}
						</TimelineItem>
					)
				})}
			</Timeline>
		</div>
	)
}
