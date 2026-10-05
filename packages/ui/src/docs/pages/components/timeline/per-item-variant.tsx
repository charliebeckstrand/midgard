import {
	Timeline,
	TimelineDescription,
	TimelineItem,
	TimelineTimestamp,
	TimelineTitle,
} from 'ui/timeline'

export default function PerItemVariant() {
	return (
		<Timeline variant="outline">
			<TimelineItem variant="solid" status="info">
				<TimelineTimestamp>Step 1</TimelineTimestamp>
				<TimelineTitle>Account created</TimelineTitle>
				<TimelineDescription>Highlighted with a solid marker override.</TimelineDescription>
			</TimelineItem>
			<TimelineItem>
				<TimelineTimestamp>Step 2</TimelineTimestamp>
				<TimelineTitle>Email verified</TimelineTitle>
				<TimelineDescription>Inherits the outline variant from Timeline.</TimelineDescription>
			</TimelineItem>
			<TimelineItem>
				<TimelineTimestamp>Step 3</TimelineTimestamp>
				<TimelineTitle>Profile completed</TimelineTitle>
				<TimelineDescription>Inherits the outline variant from Timeline.</TimelineDescription>
			</TimelineItem>
		</Timeline>
	)
}
