import { Stack } from 'ui/stack'
import { TimeAgo } from 'ui/time-ago'
import { DAY, HOUR, MINUTE, useNow } from './now.ts'

export default function Past() {
	const now = useNow()

	return (
		<Stack gap="xs">
			<TimeAgo className="min-h-lh" value={now - 5 * MINUTE} />
			<TimeAgo className="min-h-lh" value={now - 2 * HOUR} />
			<TimeAgo className="min-h-lh" value={now - 3 * DAY} />
			<TimeAgo className="min-h-lh" value={now - 30 * DAY} />
			<TimeAgo className="min-h-lh" value={now - 365 * DAY} />
		</Stack>
	)
}
