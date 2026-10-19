import { Timeline, TimelineItem, TimelineTimestamp, TimelineTitle } from 'ui/timeline'

export default function ItemStatus() {
	return (
		<Timeline>
			<TimelineItem status="active">
				<TimelineTimestamp>9:02 AM</TimelineTimestamp>
				<TimelineTitle>Build passed</TimelineTitle>
			</TimelineItem>
			<TimelineItem status="warning">
				<TimelineTimestamp>9:05 AM</TimelineTimestamp>
				<TimelineTitle>Two tests skipped</TimelineTitle>
			</TimelineItem>
			<TimelineItem status="error">
				<TimelineTimestamp>9:11 AM</TimelineTimestamp>
				<TimelineTitle>Health check failed</TimelineTitle>
			</TimelineItem>
			<TimelineItem status="info" pulse>
				<TimelineTimestamp>9:12 AM</TimelineTimestamp>
				<TimelineTitle>Rollback in progress</TimelineTitle>
			</TimelineItem>
			<TimelineItem status="inactive">
				<TimelineTimestamp>Next</TimelineTimestamp>
				<TimelineTitle>Notify the team</TimelineTitle>
			</TimelineItem>
		</Timeline>
	)
}
