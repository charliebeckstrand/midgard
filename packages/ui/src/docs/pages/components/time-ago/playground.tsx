import { TimeAgo, type TimeAgoProps } from 'ui/time-ago'
import { SECOND, useNow } from './now.ts'

export default function TimeAgoPlayground(props: TimeAgoProps) {
	const now = useNow()

	return <TimeAgo className="min-h-lh" {...props} value={now - 30 * SECOND} />
}
