import { Timeline, TimelineItem, TimelineTimestamp, TimelineTitle } from 'ui/timeline'

export default function ItemStatus() {
	return (
		<Timeline>
			<TimelineItem status="active">
				<TimelineTimestamp>09:02</TimelineTimestamp>
				<TimelineTitle>Build passed</TimelineTitle>
			</TimelineItem>
			<TimelineItem status="warning">
				<TimelineTimestamp>09:05</TimelineTimestamp>
				<TimelineTitle>Two tests skipped</TimelineTitle>
			</TimelineItem>
			<TimelineItem status="error">
				<TimelineTimestamp>09:11</TimelineTimestamp>
				<TimelineTitle>Health check failed</TimelineTitle>
			</TimelineItem>
			<TimelineItem status="info" pulse>
				<TimelineTimestamp>09:12</TimelineTimestamp>
				<TimelineTitle>Rollback in progress</TimelineTitle>
			</TimelineItem>
			<TimelineItem status="inactive">
				<TimelineTimestamp>Next</TimelineTimestamp>
				<TimelineTitle>Notify the team</TimelineTitle>
			</TimelineItem>
		</Timeline>
	)
}
