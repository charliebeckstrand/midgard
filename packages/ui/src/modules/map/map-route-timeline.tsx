'use client'

import { Button } from '../../components/button'
import {
	Sheet,
	SheetBody,
	SheetClose,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '../../components/sheet'
import {
	Timeline,
	TimelineDescription,
	TimelineItem,
	TimelineTimestamp,
	TimelineTitle,
} from '../../components/timeline'
import { formatTimestamp, resolveCurrentIndex } from './map-route-utilities'
import type { RouteStop } from './types'

type MapRouteTimelineProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	stops: RouteStop[]
}

/** Per-stop timeline visuals derived by {@link routeStopVisuals}. */
type RouteStopVisuals = {
	current: boolean
	variant: 'solid' | 'outline'
	status: 'active' | 'info' | 'inactive'
	pulse: boolean
	lineBefore: 'green' | undefined
	lineAfter: 'green' | undefined
}

/**
 * Timeline styling for one stop relative to the current position: reached stops
 * are solid with a green connector; the current stop pulses unless it's the
 * final one.
 *
 * @internal
 */
function routeStopVisuals(
	index: number,
	currentIndex: number,
	stopCount: number,
): RouteStopVisuals {
	const isCompleted = index < currentIndex

	const isCurrent = index === currentIndex

	const isReached = isCompleted || isCurrent

	const isFinal = isCurrent && index === stopCount - 1

	return {
		current: isCurrent,
		variant: isReached ? 'solid' : 'outline',
		status: isCompleted || isFinal ? 'active' : isCurrent ? 'info' : 'inactive',
		pulse: isCurrent && !isFinal,
		lineBefore: isReached ? 'green' : undefined,
		lineAfter: isCompleted ? 'green' : undefined,
	}
}

/** Sheet listing a route's stops as a timeline, marking progress against the current position. */
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
						const visuals = routeStopVisuals(index, currentIndex, stops.length)

						const timestamp = formatTimestamp(stop.timestamp)

						return (
							<TimelineItem
								key={stop.id}
								current={visuals.current}
								variant={visuals.variant}
								status={visuals.status}
								pulse={visuals.pulse}
								lineBefore={visuals.lineBefore}
								lineAfter={visuals.lineAfter}
							>
								{timestamp && <TimelineTimestamp>{timestamp}</TimelineTimestamp>}
								<TimelineTitle>{stop.name}</TimelineTitle>
								{stop.description && <TimelineDescription>{stop.description}</TimelineDescription>}
							</TimelineItem>
						)
					})}
				</Timeline>
			</SheetBody>
			<SheetFooter>
				<SheetClose>
					<Button>Close</Button>
				</SheetClose>
			</SheetFooter>
		</Sheet>
	)
}
