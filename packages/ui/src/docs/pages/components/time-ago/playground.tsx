import { TimeAgo, type TimeAgoProps } from 'ui/time-ago'
import { SEC, useNow } from './now.ts'

export default function TimeAgoPlayground(props: TimeAgoProps) {
	const now = useNow()

	if (now === null) return null

	return <TimeAgo {...props} date={now - 30 * SEC} />
}
