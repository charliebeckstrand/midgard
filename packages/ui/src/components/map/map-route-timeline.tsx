'use client'

import { Button } from '../button'
import {
	Sheet,
	SheetActions,
	SheetBody,
	SheetClose,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '../sheet'
import {
	Timeline,
	TimelineDescription,
	TimelineItem,
	TimelineTimestamp,
	TimelineTitle,
} from '../timeline'
import { formatTimestamp, resolveCurrentIndex } from './map-route-utilities'
import type { RouteStop } from './types'

export type MapRouteTimelineProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	stops: RouteStop[]
}

export function MapRouteTimeline({ open, onOpenChange, stops }: MapRouteTimelineProps) {
	const currentIndex = resolveCurrentIndex(stops)

	return (
		<Sheet open={open} onOpenChange={onOpenChange} size="sm">
			<SheetHeader>
				<SheetTitle>Route timeline</SheetTitle>
				{stops.length > 0 && (
					<SheetDescription>
						{stops.length} stop{stops.length === 1 ? '' : 's'}
					</SheetDescription>
				)}
			</SheetHeader>
			<SheetBody>
				<Timeline>
					{stops.map((stop, index) => {
						const isCompleted = index < currentIndex

						const isCurrent = index === currentIndex

						const isReached = isCompleted || isCurrent

						const isFinal = isCurrent && index === stops.length - 1

						const timestamp = formatTimestamp(stop.timestamp)

						return (
							<TimelineItem
								key={stop.id}
								current={isCurrent}
								variant={isReached ? 'solid' : 'outline'}
								status={isCompleted || isFinal ? 'active' : isCurrent ? 'info' : 'inactive'}
								pulse={isCurrent && !isFinal}
								lineBefore={isReached ? 'green' : undefined}
								lineAfter={isCompleted ? 'green' : undefined}
							>
								{timestamp && <TimelineTimestamp>{timestamp}</TimelineTimestamp>}
								<TimelineTitle>{stop.name}</TimelineTitle>
								{stop.description && <TimelineDescription>{stop.description}</TimelineDescription>}
							</TimelineItem>
						)
					})}
				</Timeline>
			</SheetBody>
			<SheetActions>
				<SheetClose>
					<Button>Close</Button>
				</SheetClose>
			</SheetActions>
		</Sheet>
	)
}
