import { TimeAgo } from 'ui/time-ago'
import { SECOND, useNow } from './now.ts'

export default function CustomFormat() {
	const now = useNow()

	if (now === null) return null

	return (
		<TimeAgo
			value={now - 90 * SECOND}
			format={(diffMs) => `${Math.round(Math.abs(diffMs) / SECOND)}s ago`}
		/>
	)
}
