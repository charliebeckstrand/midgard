import { Stack } from '../../components/stack'
import {
	Timeline,
	TimelineDescription,
	TimelineHeading,
	TimelineItem,
	TimelineTimestamp,
} from '../../components/timeline'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

export default function TimelineDemo() {
	return (
		<Stack gap={6}>
			<Example title="Vertical">
				<Timeline>
					<TimelineItem>
						<TimelineTimestamp>Jan 2026</TimelineTimestamp>
						<TimelineHeading>Project kicked off</TimelineHeading>
						<TimelineDescription>Initial planning and team assembly.</TimelineDescription>
					</TimelineItem>
					<TimelineItem status="info">
						<TimelineTimestamp>Feb 2026</TimelineTimestamp>
						<TimelineHeading>Design completed</TimelineHeading>
						<TimelineDescription>
							Finalized wireframes and design system tokens.
						</TimelineDescription>
					</TimelineItem>
					<TimelineItem variant="outline">
						<TimelineTimestamp>Mar 2026</TimelineTimestamp>
						<TimelineHeading>Beta released</TimelineHeading>
						<TimelineDescription>Shipped to early adopters for feedback.</TimelineDescription>
					</TimelineItem>
				</Timeline>
			</Example>

			<Example title="Horizontal">
				<Timeline orientation="horizontal">
					<TimelineItem>
						<TimelineTimestamp>Step 1</TimelineTimestamp>
						<TimelineHeading>Register</TimelineHeading>
					</TimelineItem>
					<TimelineItem>
						<TimelineTimestamp>Step 2</TimelineTimestamp>
						<TimelineHeading>Verify</TimelineHeading>
					</TimelineItem>
					<TimelineItem status="active">
						<TimelineTimestamp>Step 3</TimelineTimestamp>
						<TimelineHeading>Complete</TimelineHeading>
					</TimelineItem>
				</Timeline>
			</Example>

			<Example title="Outline variant">
				<Timeline variant="outline">
					<TimelineItem>
						<TimelineTimestamp>10:30 AM</TimelineTimestamp>
						<TimelineHeading>Commit pushed</TimelineHeading>
						<TimelineDescription>
							Updated dependencies and fixed linting errors.
						</TimelineDescription>
					</TimelineItem>
					<TimelineItem>
						<TimelineTimestamp>11:15 AM</TimelineTimestamp>
						<TimelineHeading>Review requested</TimelineHeading>
						<TimelineDescription>Assigned to two reviewers for approval.</TimelineDescription>
					</TimelineItem>
					<TimelineItem status="active">
						<TimelineTimestamp>2:00 PM</TimelineTimestamp>
						<TimelineHeading>Merged to main</TimelineHeading>
						<TimelineDescription>All checks passed, deployed to staging.</TimelineDescription>
					</TimelineItem>
				</Timeline>
			</Example>

			<Example title="Pulse status">
				<Timeline variant="outline">
					<TimelineItem>
						<TimelineTimestamp>Apr 1, 2026</TimelineTimestamp>
						<TimelineHeading>Feature development</TimelineHeading>
						<TimelineDescription>Implemented core functionality and tests.</TimelineDescription>
					</TimelineItem>
					<TimelineItem status="error" pulse>
						<TimelineTimestamp>Apr 10, 2026</TimelineTimestamp>
						<TimelineHeading>Deployment failed</TimelineHeading>
						<TimelineDescription>
							Investigating root cause and rolling back changes.
						</TimelineDescription>
					</TimelineItem>
				</Timeline>
			</Example>

			<Example title="Per-item variant">
				<Timeline variant="outline">
					<TimelineItem variant="solid" status="info">
						<TimelineTimestamp>Step 1</TimelineTimestamp>
						<TimelineHeading>Account created</TimelineHeading>
						<TimelineDescription>Highlighted with a solid marker override.</TimelineDescription>
					</TimelineItem>
					<TimelineItem>
						<TimelineTimestamp>Step 2</TimelineTimestamp>
						<TimelineHeading>Email verified</TimelineHeading>
						<TimelineDescription>Inherits the outline variant from Timeline.</TimelineDescription>
					</TimelineItem>
					<TimelineItem>
						<TimelineTimestamp>Step 3</TimelineTimestamp>
						<TimelineHeading>Profile completed</TimelineHeading>
						<TimelineDescription>Inherits the outline variant from Timeline.</TimelineDescription>
					</TimelineItem>
				</Timeline>
			</Example>

			<Example title="Custom color">
				<Timeline>
					<TimelineItem color="blue">
						<TimelineTimestamp>09:00 AM</TimelineTimestamp>
						<TimelineHeading>Build started</TimelineHeading>
						<TimelineDescription>CI pipeline triggered on push to main.</TimelineDescription>
					</TimelineItem>
					<TimelineItem color="amber">
						<TimelineTimestamp>09:12 AM</TimelineTimestamp>
						<TimelineHeading>Deploying</TimelineHeading>
						<TimelineDescription>Rolling out to staging environment.</TimelineDescription>
					</TimelineItem>
					<TimelineItem color="green">
						<TimelineTimestamp>09:18 AM</TimelineTimestamp>
						<TimelineHeading>Live</TimelineHeading>
						<TimelineDescription>Deployment healthy, all probes passing.</TimelineDescription>
					</TimelineItem>
				</Timeline>
			</Example>
		</Stack>
	)
}
