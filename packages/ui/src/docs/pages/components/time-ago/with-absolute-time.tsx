import { DateTime } from 'ui/date-time'
import { TimeAgo } from 'ui/time-ago'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'
import { MINUTE, useNow } from './now.ts'

export default function WithAbsoluteTime() {
	const now = useNow()

	if (now === null) return null

	const date = new Date(now - 5 * MINUTE)

	return (
		<Tooltip>
			<TooltipTrigger>
				<TimeAgo value={date} tabIndex={0} />
			</TooltipTrigger>
			<TooltipContent>
				<DateTime value={date} format={{ dateStyle: 'medium', timeStyle: 'short' }} />
			</TooltipContent>
		</Tooltip>
	)
}
