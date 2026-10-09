import { DateTime } from 'ui/date-time'
import { TimeAgo } from 'ui/time-ago'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'
import { MIN, useNow } from './now.ts'

export default function WithAbsoluteTime() {
	const now = useNow()

	if (now === null) return null

	const date = new Date(now - 5 * MIN)

	return (
		<Tooltip>
			<TooltipTrigger>
				<TimeAgo date={date} tabIndex={0} />
			</TooltipTrigger>
			<TooltipContent>
				<DateTime value={date} format={{ dateStyle: 'medium', timeStyle: 'short' }} />
			</TooltipContent>
		</Tooltip>
	)
}
