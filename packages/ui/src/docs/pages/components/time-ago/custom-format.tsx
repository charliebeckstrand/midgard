import { TimeAgo } from 'ui/time-ago'
import { SEC, useNow } from './now.ts'

export default function CustomFormat() {
	const now = useNow()

	if (now === null) return null

	return (
		<TimeAgo
			date={now - 90 * SEC}
			format={(diffMs) => `${Math.round(Math.abs(diffMs) / SEC)}s ago`}
		/>
	)
}
