import { Stack } from 'ui/stack'
import { TimeAgo } from 'ui/time-ago'
import { DAY, HOUR, MINUTE, useNow } from './now.ts'

export default function Future() {
	const now = useNow()

	if (now === null) return null

	return (
		<Stack gap="xs">
			<TimeAgo value={now + 10 * MINUTE} />
			<TimeAgo value={now + 4 * HOUR} />
			<TimeAgo value={now + 7 * DAY} />
		</Stack>
	)
}
