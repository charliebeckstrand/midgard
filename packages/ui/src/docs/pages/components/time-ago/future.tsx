import { Stack } from 'ui/stack'
import { TimeAgo } from 'ui/time-ago'
import { DAY, HOUR, MINUTE, useNow } from './now.ts'

export default function Future() {
	const now = useNow()

	if (now === null) return null

	return (
		<Stack gap="xs">
			<TimeAgo date={now + 10 * MINUTE} />
			<TimeAgo date={now + 4 * HOUR} />
			<TimeAgo date={now + 7 * DAY} />
		</Stack>
	)
}
