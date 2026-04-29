import { Flex } from '../../components/flex'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { TimeAgo } from '../../components/time-ago'
import { code } from '../code'
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
			<Example
				title="Recent"
				code={code`
					import { TimeAgo } from 'ui/time-ago'

					<TimeAgo date={new Date(Date.now() - 30 * 1000)} />
				`}
			>
				<TimeAgo date={new Date(now - 30 * SEC)} />
			</Example>

			<Example
				title="Past"
				code={code`
					import { TimeAgo } from 'ui/time-ago'

					<TimeAgo date={new Date(Date.now() - 5 * 60 * 1000)} />
					<TimeAgo date={new Date(Date.now() - 2 * 60 * 60 * 1000)} />
					<TimeAgo date={new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)} />
					<TimeAgo date={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)} />
					<TimeAgo date={new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)} />
					<TimeAgo date={new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000)} />
				`}
			>
				<Stack gap={1}>
					<TimeAgo date={new Date(now - 5 * MIN)} />
					<TimeAgo date={new Date(now - 2 * HOUR)} />
					<TimeAgo date={new Date(now - 3 * DAY)} />
					<TimeAgo date={new Date(now - 30 * DAY)} />
					<TimeAgo date={new Date(now - 365 * DAY)} />
				</Stack>
			</Example>

			<Example
				title="Future"
				code={code`
					import { TimeAgo } from 'ui/time-ago'

					<TimeAgo date={new Date(Date.now() + 10 * 60 * 1000)} />
					<TimeAgo date={new Date(Date.now() + 4 * 60 * 60 * 1000)} />
					<TimeAgo date={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)} />
				`}
			>
				<Stack gap={1}>
					<TimeAgo date={new Date(now + 10 * MIN)} />
					<TimeAgo date={new Date(now + 4 * HOUR)} />
					<TimeAgo date={new Date(now + 7 * DAY)} />
				</Stack>
			</Example>

			<Example
				title="Custom format"
				code={code`
					import { TimeAgo } from 'ui/time-ago'
					
					const SEC = 1000

					<TimeAgo
						date={new Date(Date.now() - 90 * SEC)}
						format={(ms) => \`\${Math.round(Math.abs(ms) / SEC)}s ago\`}
					/>
				`}
			>
				<TimeAgo
					date={new Date(now - 90 * SEC)}
					format={(ms) => `${Math.round(Math.abs(ms) / SEC)}s ago`}
				/>
			</Example>

			<Example
				title="Without title"
				code={code`
					import { TimeAgo } from 'ui/time-ago'

					<TimeAgo date={new Date(Date.now() - 5 * 60 * 1000)} title={false} />
				`}
			>
				<TimeAgo date={new Date(now - 5 * MIN)} title={false} />
			</Example>

			<Example
				title="Custom locale"
				code={code`
					import { TimeAgo } from 'ui/time-ago'

					<TimeAgo date={new Date(Date.now() - 5 * 60 * 1000)} locale="fr-FR" />
					<TimeAgo date={new Date(Date.now() - 5 * 60 * 1000)} locale="it-IT" />
					<TimeAgo date={new Date(Date.now() - 5 * 60 * 1000)} locale="en-US" />
				`}
			>
				<Stack gap={1}>
					<Flex gap={2}>
						<Text variant="muted" className="font-mono">
							fr-FR
						</Text>
						<TimeAgo date={new Date(now - 5 * MIN)} locale="fr-FR" />
					</Flex>
					<Flex gap={2}>
						<Text variant="muted" className="font-mono">
							it-IT
						</Text>
						<TimeAgo date={new Date(now - 5 * MIN)} locale="it-IT" />
					</Flex>
					<Flex gap={2}>
						<Text variant="muted" className="font-mono">
							en-US
						</Text>
						<TimeAgo date={new Date(now - 5 * MIN)} locale="en-US" />
					</Flex>
				</Stack>
			</Example>
		</Stack>
	)
}
