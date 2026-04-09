import {
	Timeline,
	TimelineDescription,
	TimelineHeading,
	TimelineItem,
	TimelineMarker,
	TimelineTimestamp,
} from '../../components/timeline'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Data Display' }

export default function TimelineDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Vertical"
				code={code`
					import { Timeline, TimelineItem, TimelineMarker, TimelineHeading, TimelineDescription, TimelineTimestamp } from 'ui/timeline'

					<Timeline>
						<TimelineItem>
							<TimelineMarker />
							<TimelineTimestamp>Jan 2026</TimelineTimestamp>
							<TimelineHeading>Project kicked off</TimelineHeading>
							<TimelineDescription>Initial planning and team assembly.</TimelineDescription>
						</TimelineItem>
					</Timeline>
				`}
			>
				<Timeline>
					<TimelineItem>
						<TimelineMarker />
						<TimelineTimestamp>Jan 2026</TimelineTimestamp>
						<TimelineHeading>Project kicked off</TimelineHeading>
						<TimelineDescription>Initial planning and team assembly.</TimelineDescription>
					</TimelineItem>
					<TimelineItem>
						<TimelineMarker />
						<TimelineTimestamp>Feb 2026</TimelineTimestamp>
						<TimelineHeading>Design completed</TimelineHeading>
						<TimelineDescription>
							Finalized wireframes and design system tokens.
						</TimelineDescription>
					</TimelineItem>
					<TimelineItem last>
						<TimelineMarker />
						<TimelineTimestamp>Mar 2026</TimelineTimestamp>
						<TimelineHeading>Beta released</TimelineHeading>
						<TimelineDescription>Shipped to early adopters for feedback.</TimelineDescription>
					</TimelineItem>
				</Timeline>
			</Example>
			<Example
				title="Horizontal"
				code={code`
					import { Timeline, TimelineItem, TimelineMarker, TimelineHeading, TimelineTimestamp } from 'ui/timeline'

					<Timeline orientation="horizontal">
						<TimelineItem>
							<TimelineMarker />
							<TimelineTimestamp>Step 1</TimelineTimestamp>
							<TimelineHeading>Register</TimelineHeading>
						</TimelineItem>
					</Timeline>
				`}
			>
				<Timeline orientation="horizontal">
					<TimelineItem>
						<TimelineMarker />
						<TimelineTimestamp>Step 1</TimelineTimestamp>
						<TimelineHeading>Register</TimelineHeading>
					</TimelineItem>
					<TimelineItem>
						<TimelineMarker />
						<TimelineTimestamp>Step 2</TimelineTimestamp>
						<TimelineHeading>Verify</TimelineHeading>
					</TimelineItem>
					<TimelineItem last>
						<TimelineMarker />
						<TimelineTimestamp>Step 3</TimelineTimestamp>
						<TimelineHeading>Complete</TimelineHeading>
					</TimelineItem>
				</Timeline>
			</Example>
			<Example
				title="Active item"
				code={code`
					import { Timeline, TimelineItem, TimelineMarker, TimelineHeading, TimelineDescription, TimelineTimestamp } from 'ui/timeline'

					<Timeline>
						<TimelineItem>
							<TimelineMarker />
							<TimelineHeading>Completed</TimelineHeading>
						</TimelineItem>
						<TimelineItem active>
							<TimelineMarker active />
							<TimelineHeading>In progress</TimelineHeading>
						</TimelineItem>
					</Timeline>
				`}
			>
				<Timeline>
					<TimelineItem>
						<TimelineMarker />
						<TimelineTimestamp>Mon, Apr 7</TimelineTimestamp>
						<TimelineHeading>Requirements gathered</TimelineHeading>
						<TimelineDescription>Stakeholder interviews and scope definition.</TimelineDescription>
					</TimelineItem>
					<TimelineItem active>
						<TimelineMarker active />
						<TimelineTimestamp>Wed, Apr 9</TimelineTimestamp>
						<TimelineHeading>Implementation in progress</TimelineHeading>
						<TimelineDescription>Building the timeline component.</TimelineDescription>
					</TimelineItem>
					<TimelineItem last>
						<TimelineMarker />
						<TimelineTimestamp>Fri, Apr 11</TimelineTimestamp>
						<TimelineHeading>Code review</TimelineHeading>
						<TimelineDescription>Pending team review and approval.</TimelineDescription>
					</TimelineItem>
				</Timeline>
			</Example>
			<Example
				title="Outline variant"
				code={code`
					import { Timeline, TimelineItem, TimelineMarker, TimelineHeading, TimelineDescription, TimelineTimestamp } from 'ui/timeline'

					<Timeline variant="outline">
						<TimelineItem>
							<TimelineMarker />
							<TimelineTimestamp>10:30 AM</TimelineTimestamp>
							<TimelineHeading>Commit pushed</TimelineHeading>
							<TimelineDescription>Updated dependencies and fixed linting errors.</TimelineDescription>
						</TimelineItem>
					</Timeline>
				`}
			>
				<Timeline variant="outline">
					<TimelineItem>
						<TimelineMarker />
						<TimelineTimestamp>10:30 AM</TimelineTimestamp>
						<TimelineHeading>Commit pushed</TimelineHeading>
						<TimelineDescription>
							Updated dependencies and fixed linting errors.
						</TimelineDescription>
					</TimelineItem>
					<TimelineItem>
						<TimelineMarker />
						<TimelineTimestamp>11:15 AM</TimelineTimestamp>
						<TimelineHeading>Review requested</TimelineHeading>
						<TimelineDescription>Assigned to two reviewers for approval.</TimelineDescription>
					</TimelineItem>
					<TimelineItem last>
						<TimelineMarker />
						<TimelineTimestamp>2:00 PM</TimelineTimestamp>
						<TimelineHeading>Merged to main</TimelineHeading>
						<TimelineDescription>All checks passed, deployed to staging.</TimelineDescription>
					</TimelineItem>
				</Timeline>
			</Example>
		</div>
	)
}
