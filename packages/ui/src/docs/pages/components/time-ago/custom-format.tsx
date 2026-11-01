import { useIntl } from 'ui/primitives/intl'
import { TimeAgo } from 'ui/time-ago'
import { SECOND, useNow } from './use-now.ts'

export default function CustomFormat() {
	const intl = useIntl()

	const now = useNow()

	return (
		<TimeAgo
			value={now - 90 * SECOND}
			format={(diffMs) =>
				intl.formatRelativeTime(-Math.round(Math.abs(diffMs) / SECOND), 'second', {
					style: 'narrow',
				})
			}
		/>
	)
}
