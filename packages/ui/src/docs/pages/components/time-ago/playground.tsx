import { TimeAgo, type TimeAgoProps } from 'ui/time-ago'
import { SECOND, useNow } from './now.ts'

export default function TimeAgoPlayground(props: TimeAgoProps) {
	const now = useNow()

	if (now === null) return null

	return <TimeAgo {...props} value={now - 30 * SECOND} />
}
