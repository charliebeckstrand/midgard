import { Stack } from '../../components/stack'
import {
	Timeline,
	TimelineDescription,
	TimelineItem,
	TimelineTimestamp,
	TimelineTitle,
} from '../../components/timeline'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Vertical">
				<Timeline>
					<TimelineItem>
						<TimelineTimestamp>Jan 2026</TimelineTimestamp>
						<TimelineTitle>Project kicked off</TimelineTitle>
						<TimelineDescription>Initial planning and team assembly.</TimelineDescription>
					</TimelineItem>
					<TimelineItem status="info">
						<TimelineTimestamp>Feb 2026</TimelineTimestamp>
						<TimelineTitle>Design completed</TimelineTitle>
						<TimelineDescription>
							Finalized wireframes and design system tokens.
						</TimelineDescription>
					</TimelineItem>
					<TimelineItem variant="outline">
						<TimelineTimestamp>Mar 2026</TimelineTimestamp>
						<TimelineTitle>Beta released</TimelineTitle>
						<TimelineDescription>Shipped to early adopters for feedback.</TimelineDescription>
					</TimelineItem>
				</Timeline>
			</Example>

			<Example title="Horizontal">
				<Timeline orientation="horizontal">
					<TimelineItem>
						<TimelineTimestamp>Step 1</TimelineTimestamp>
						<TimelineTitle>Register</TimelineTitle>
					</TimelineItem>
					<TimelineItem>
						<TimelineTimestamp>Step 2</TimelineTimestamp>
						<TimelineTitle>Verify</TimelineTitle>
					</TimelineItem>
					<TimelineItem status="active">
						<TimelineTimestamp>Step 3</TimelineTimestamp>
						<TimelineTitle>Complete</TimelineTitle>
					</TimelineItem>
				</Timeline>
			</Example>

			<Example title="Outline variant">
				<Timeline variant="outline">
					<TimelineItem>
						<TimelineTimestamp>10:30 AM</TimelineTimestamp>
						<TimelineTitle>Commit pushed</TimelineTitle>
						<TimelineDescription>
							Updated dependencies and fixed linting errors.
						</TimelineDescription>
					</TimelineItem>
					<TimelineItem>
						<TimelineTimestamp>11:15 AM</TimelineTimestamp>
						<TimelineTitle>Review requested</TimelineTitle>
						<TimelineDescription>Assigned to two reviewers for approval.</TimelineDescription>
					</TimelineItem>
					<TimelineItem status="active">
						<TimelineTimestamp>2:00 PM</TimelineTimestamp>
						<TimelineTitle>Merged to main</TimelineTitle>
						<TimelineDescription>All checks passed, deployed to staging.</TimelineDescription>
					</TimelineItem>
				</Timeline>
			</Example>

			<Example title="Pulse status">
				<Timeline variant="outline">
					<TimelineItem>
						<TimelineTimestamp>Apr 1, 2026</TimelineTimestamp>
						<TimelineTitle>Feature development</TimelineTitle>
						<TimelineDescription>Implemented core functionality and tests.</TimelineDescription>
					</TimelineItem>
					<TimelineItem status="error" pulse>
						<TimelineTimestamp>Apr 10, 2026</TimelineTimestamp>
						<TimelineTitle>Deployment failed</TimelineTitle>
						<TimelineDescription>
							Investigating root cause and rolling back changes.
						</TimelineDescription>
					</TimelineItem>
				</Timeline>
			</Example>

			<Example title="Per-item variant">
				<Timeline>
					<TimelineItem variant="solid" status="info">
						<TimelineTimestamp>Step 1</TimelineTimestamp>
						<TimelineTitle>Account created</TimelineTitle>
						<TimelineDescription>Highlighted with a solid marker override.</TimelineDescription>
					</TimelineItem>
					<TimelineItem variant="outline">
						<TimelineTimestamp>Step 2</TimelineTimestamp>
						<TimelineTitle>Email verified</TimelineTitle>
						<TimelineDescription>Inherits the outline variant from Timeline.</TimelineDescription>
					</TimelineItem>
					<TimelineItem variant="outline">
						<TimelineTimestamp>Step 3</TimelineTimestamp>
						<TimelineTitle>Profile completed</TimelineTitle>
						<TimelineDescription>Inherits the outline variant from Timeline.</TimelineDescription>
					</TimelineItem>
				</Timeline>
			</Example>
		</Stack>
	)
}
