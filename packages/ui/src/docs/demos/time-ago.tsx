import { Stack } from '../../components/stack'
import { TimeAgo } from '../../components/time-ago'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

const SEC = 1000
const MIN = 60 * SEC
const HOUR = 60 * MIN
const DAY = 24 * HOUR

export default function TimeAgoDemo() {
	const now = Date.now()

	return (
		<Stack gap={6}>
			<Example title="Recent">
				<TimeAgo date={new Date(now - 30 * SEC)} />
			</Example>

			<Example title="Past">
				<Stack gap={1}>
					<TimeAgo date={new Date(now - 5 * MIN)} />
					<TimeAgo date={new Date(now - 2 * HOUR)} />
					<TimeAgo date={new Date(now - 3 * DAY)} />
					<TimeAgo date={new Date(now - 30 * DAY)} />
					<TimeAgo date={new Date(now - 365 * DAY)} />
				</Stack>
			</Example>

			<Example title="Future">
				<Stack gap={1}>
					<TimeAgo date={new Date(now + 10 * MIN)} />
					<TimeAgo date={new Date(now + 4 * HOUR)} />
					<TimeAgo date={new Date(now + 7 * DAY)} />
				</Stack>
			</Example>

			<Example title="Custom format">
				<TimeAgo
					date={new Date(now - 90 * SEC)}
					format={(ms) => `${Math.round(Math.abs(ms) / SEC)}s ago`}
				/>
			</Example>

			<Example title="Without title">
				<TimeAgo date={new Date(now - 5 * MIN)} title={false} />
			</Example>

			<Example title="Custom locale (fr-FR)">
				<TimeAgo date={new Date(now - 5 * MIN)} locale="fr-FR" />
			</Example>
		</Stack>
	)
}
