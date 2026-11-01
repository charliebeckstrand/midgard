import { TimeAgo, type TimeAgoProps } from 'ui/time-ago'
import { SECOND, useNow } from './use-now.ts'

export default function TimeAgoPlayground(props: TimeAgoProps) {
	const now = useNow()

	return <TimeAgo {...props} value={now - 30 * SECOND} />
}
