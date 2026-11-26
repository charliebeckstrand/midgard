import { Timeline, TimelineItem, TimelineTimestamp, TimelineTitle } from 'ui/timeline'

// A decorative `color` marks the steps that are done, and the connector lines
// take the same color up to the `current` step.
export default function Progress() {
	return (
		<Timeline>
			<TimelineItem color="blue" lineAfter="blue">
				<TimelineTimestamp>Monday</TimelineTimestamp>
				<TimelineTitle>Order placed</TimelineTitle>
			</TimelineItem>
			<TimelineItem color="blue" lineBefore="blue" lineAfter="blue">
				<TimelineTimestamp>Tuesday</TimelineTimestamp>
				<TimelineTitle>Packed</TimelineTitle>
			</TimelineItem>
			<TimelineItem current color="blue" lineBefore="blue">
				<TimelineTimestamp>Wednesday</TimelineTimestamp>
				<TimelineTitle>Shipped</TimelineTitle>
			</TimelineItem>
			<TimelineItem>
				<TimelineTimestamp>Friday</TimelineTimestamp>
				<TimelineTitle>Delivered</TimelineTitle>
			</TimelineItem>
		</Timeline>
	)
}
