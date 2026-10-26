import { Stack } from 'ui/stack'
import { TimeAgo } from 'ui/time-ago'
import { DAY, HOUR, MINUTE, useNow } from './now.ts'

export default function Past() {
	const now = useNow()

	return (
		<Stack gap="xs" className="*:min-h-lh">
			<TimeAgo value={now - 5 * MINUTE} />
			<TimeAgo value={now - 2 * HOUR} />
			<TimeAgo value={now - 3 * DAY} />
			<TimeAgo value={now - 30 * DAY} />
			<TimeAgo value={now - 365 * DAY} />
		</Stack>
	)
}
