import { Flex } from '../../components/flex'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { TimeAgo } from '../../components/time-ago'
import { Example } from '../components/example'

const SEC = 1000
const MIN = 60 * SEC
const HOUR = 60 * MIN
const DAY = 24 * HOUR

const now = Date.now()

function RecentExample() {
	return <TimeAgo date={new Date(now - 30 * SEC)} />
}

function PastExample() {
	return (
		<Stack gap="xs">
			<TimeAgo date={new Date(now - 5 * MIN)} />
			<TimeAgo date={new Date(now - 2 * HOUR)} />
			<TimeAgo date={new Date(now - 3 * DAY)} />
			<TimeAgo date={new Date(now - 30 * DAY)} />
			<TimeAgo date={new Date(now - 365 * DAY)} />
		</Stack>
	)
}

function FutureExample() {
	return (
		<Stack gap="xs">
			<TimeAgo date={new Date(now + 10 * MIN)} />
			<TimeAgo date={new Date(now + 4 * HOUR)} />
			<TimeAgo date={new Date(now + 7 * DAY)} />
		</Stack>
	)
}

function CustomFormatExample() {
	return (
		<TimeAgo
			date={new Date(now - 90 * SEC)}
			format={(ms) => `${Math.round(Math.abs(ms) / SEC)}s ago`}
		/>
	)
}

function WithAbsoluteTimeExample() {
	return <TimeAgo date={new Date(now - 5 * MIN)} absolute />
}

function CustomLocaleExample() {
	return (
		<Stack gap="xs">
			<Flex gap="sm">
				<Text severity="muted" className="font-mono">
					fr-FR
				</Text>
				<TimeAgo date={new Date(now - 5 * MIN)} locale="fr-FR" />
			</Flex>
			<Flex gap="sm">
				<Text severity="muted" className="font-mono">
					it-IT
				</Text>
				<TimeAgo date={new Date(now - 5 * MIN)} locale="it-IT" />
			</Flex>
			<Flex gap="sm">
				<Text severity="muted" className="font-mono">
					en-US
				</Text>
				<TimeAgo date={new Date(now - 5 * MIN)} locale="en-US" />
			</Flex>
		</Stack>
	)
}

export function Demo() {
	return (
		<>
			<Example title="Recent">
				<RecentExample />
			</Example>

			<Example title="Past">
				<PastExample />
			</Example>

			<Example title="Future">
				<FutureExample />
			</Example>

			<Example title="Custom format">
				<CustomFormatExample />
			</Example>

			<Example title="With absolute time">
				<WithAbsoluteTimeExample />
			</Example>

			<Example title="Custom locale">
				<CustomLocaleExample />
			</Example>
		</>
	)
}
