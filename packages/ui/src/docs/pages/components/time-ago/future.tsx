import { Stack } from 'ui/stack'
import { TimeAgo } from 'ui/time-ago'
import { DAY, HOUR, MINUTE, useNow } from './now.ts'

export default function Future() {
	const now = useNow()

	return (
		<Stack gap="xs">
			<TimeAgo className="min-h-lh" value={now + 10 * MINUTE} />
			<TimeAgo className="min-h-lh" value={now + 4 * HOUR} />
			<TimeAgo className="min-h-lh" value={now + 7 * DAY} />
		</Stack>
	)
}
