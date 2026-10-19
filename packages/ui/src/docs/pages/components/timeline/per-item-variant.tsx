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
				<TimelineDescription>You created your account.</TimelineDescription>
			</TimelineItem>
			<TimelineItem>
				<TimelineTimestamp>Step 2</TimelineTimestamp>
				<TimelineTitle>Email verified</TimelineTitle>
				<TimelineDescription>You confirmed your email address.</TimelineDescription>
			</TimelineItem>
			<TimelineItem>
				<TimelineTimestamp>Step 3</TimelineTimestamp>
				<TimelineTitle>Profile completed</TimelineTitle>
				<TimelineDescription>You added your name and a photo.</TimelineDescription>
			</TimelineItem>
		</Timeline>
	)
}
