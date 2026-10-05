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
				<TimelineTimestamp>Jan 2026</TimelineTimestamp>
				<TimelineTitle>Project kicked off</TimelineTitle>
				<TimelineDescription>Initial planning and team assembly.</TimelineDescription>
			</TimelineItem>
			<TimelineItem>
				<TimelineTimestamp>Feb 2026</TimelineTimestamp>
				<TimelineTitle>Design completed</TimelineTitle>
				<TimelineDescription>Finalized wireframes and design system tokens.</TimelineDescription>
			</TimelineItem>
			<TimelineItem status="active">
				<TimelineTimestamp>Mar 2026</TimelineTimestamp>
				<TimelineTitle>Beta released</TimelineTitle>
				<TimelineDescription>Shipped to early adopters for feedback.</TimelineDescription>
			</TimelineItem>
		</Timeline>
	)
}
