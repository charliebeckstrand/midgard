import { Stack } from 'ui/stack'
import { TimeAgo } from 'ui/time-ago'
import { DAY, HOUR, MINUTE, useNow } from './now.ts'

export default function Past() {
	const now = useNow()

	if (now === null) return null

	return (
		<Stack gap="xs">
			<TimeAgo date={now - 5 * MINUTE} />
			<TimeAgo date={now - 2 * HOUR} />
			<TimeAgo date={now - 3 * DAY} />
			<TimeAgo date={now - 30 * DAY} />
			<TimeAgo date={now - 365 * DAY} />
		</Stack>
	)
}
