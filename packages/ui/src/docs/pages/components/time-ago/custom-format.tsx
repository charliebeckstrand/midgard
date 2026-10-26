import { useIntl } from 'ui/primitives/intl'
import { TimeAgo } from 'ui/time-ago'
import { SECOND, useNow } from './now.ts'

export default function CustomFormat() {
	const intl = useIntl()

	const now = useNow()

	return (
		<TimeAgo
			className="min-h-lh"
			value={now - 90 * SECOND}
			format={(diffMs) =>
				intl.formatRelativeTime(-Math.round(Math.abs(diffMs) / SECOND), 'second', {
					style: 'narrow',
				})
			}
		/>
	)
}
