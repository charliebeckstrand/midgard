import {
	Timeline,
	TimelineDescription,
	TimelineItem,
	type TimelineProps,
	TimelineTimestamp,
	TimelineTitle,
} from 'ui/timeline'

export default function TimelinePlayground(props: TimelineProps) {
	return (
		<Timeline {...props}>
			<TimelineItem>
				<TimelineTimestamp>January 2026</TimelineTimestamp>
				<TimelineTitle>Project kicked off</TimelineTitle>
				<TimelineDescription>The team planned the scope and the schedule.</TimelineDescription>
			</TimelineItem>
			<TimelineItem>
				<TimelineTimestamp>February 2026</TimelineTimestamp>
				<TimelineTitle>Design completed</TimelineTitle>
				<TimelineDescription>
					The team finished the wireframes and the design tokens.
				</TimelineDescription>
			</TimelineItem>
			<TimelineItem status="active">
				<TimelineTimestamp>March 2026</TimelineTimestamp>
				<TimelineTitle>Beta released</TimelineTitle>
				<TimelineDescription>Early users got the beta and sent feedback.</TimelineDescription>
			</TimelineItem>
		</Timeline>
	)
}
