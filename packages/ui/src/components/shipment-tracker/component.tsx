import {
	Timeline,
	TimelineDescription,
	TimelineHeading,
	TimelineItem,
	type TimelineProps,
	TimelineTimestamp,
} from '../timeline'

export type ShipmentTrackerStep = {
	label: string
	timestamp?: string
	description?: React.ReactNode
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

					return (
						<TimelineItem
							key={step.label}
							active={isCurrent}
							variant={isReached ? 'solid' : 'outline'}
							status={isReached ? 'active' : 'inactive'}
							pulse={isCurrent}
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
