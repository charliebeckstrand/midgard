import type { ReactNode } from 'react'
import {
	Timeline,
	TimelineDescription,
	TimelineHeading,
	TimelineItem,
	type TimelineProps,
	TimelineTimestamp,
} from '../timeline'

export type ShipmentTrackerStep = {
	id?: string
	label: string
	timestamp?: string
	description?: ReactNode
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
							status={isFinal ? 'active' : isCurrent ? 'info' : 'inactive'}
							pulse={isCurrent && !isFinal}
						>
							{step.timestamp && <TimelineTimestamp>{step.timestamp}</TimelineTimestamp>}
							<TimelineHeading>{step.label}</TimelineHeading>
							{step.description && <TimelineDescription>{step.description}</TimelineDescription>}
						</TimelineItem>
					)
				})}
			</Timeline>
		</div>
	)
}
