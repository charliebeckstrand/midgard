import {
	Timeline,
	TimelineDescription,
	TimelineItem,
	TimelineTimestamp,
	TimelineTitle,
} from '../../../components/timeline'
import { Axes, Example } from '../../engine'

export function Demo() {
	return (
		<>
			<Axes
				of="Timeline"
				render={(props) => (
					<Timeline {...props}>
						<TimelineItem>
							<TimelineTimestamp>Jan 2026</TimelineTimestamp>
							<TimelineTitle>Project kicked off</TimelineTitle>
							<TimelineDescription>Initial planning and team assembly.</TimelineDescription>
						</TimelineItem>
						<TimelineItem>
							<TimelineTimestamp>Feb 2026</TimelineTimestamp>
							<TimelineTitle>Design completed</TimelineTitle>
							<TimelineDescription>
								Finalized wireframes and design system tokens.
							</TimelineDescription>
						</TimelineItem>
						<TimelineItem status="active">
							<TimelineTimestamp>Mar 2026</TimelineTimestamp>
							<TimelineTitle>Beta released</TimelineTitle>
							<TimelineDescription>Shipped to early adopters for feedback.</TimelineDescription>
						</TimelineItem>
					</Timeline>
				)}
			/>

			<Axes
				of="TimelineItem"
				captions={false}
				title="Timeline item"
				omit={['current', 'color', 'lineBefore', 'lineAfter']}
				render={(props, label) => (
					<Timeline>
						<TimelineItem {...props}>
							<TimelineTitle>{label}</TimelineTitle>
						</TimelineItem>
					</Timeline>
				)}
			/>

			<Example title="Per-item variant">
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
			</Example>
		</>
	)
}
