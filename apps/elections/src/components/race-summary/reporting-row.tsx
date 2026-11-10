'use client'

import { CircleCheck, Landmark } from 'lucide-react'
import { useHasHover } from 'ui/hooks'
import { Icon } from 'ui/icon'
import { StatusDot } from 'ui/status'
import { Flex } from 'ui/structure/flex'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'
import { PercentOdometer } from '../percent-odometer'

/**
 * The call of a race: a solid green dot, or a pulsing amber dot while the race
 * is not called. Green is a call, so no party color takes it. The dot has the
 * name `Called` or `Not called` for screen readers.
 */
function CallDot({ called }: { called: boolean }) {
	return called ? (
		<StatusDot status="active" label="Called" />
	) : (
		<StatusDot status="warning" pulse label="Not called" />
	)
}

/** The mark of a winner after the name: a green circle check, named `Winner` for screen readers. */
export function WinnerMark() {
	return (
		<span className="inline-flex shrink-0 text-green-600 dark:text-green-500">
			<Icon icon={<CircleCheck />} size="sm" label="Winner" />
		</span>
	)
}

/**
 * The mark of an incumbent after the name: a gray landmark, which a tooltip
 * names `Incumbent`. A hover opens the tooltip on a device with a mouse or a
 * pen. A touch screen gives no hover, so a tap opens it there. A screen reader
 * hears the name of the button.
 */
export function IncumbentMark() {
	const trigger = useHasHover() ? 'hover' : 'click'

	return (
		<Tooltip trigger={trigger}>
			<TooltipTrigger>
				<button
					type="button"
					className="inline-flex shrink-0 rounded-sm text-zinc-500 dark:text-zinc-400"
				>
					<Icon icon={<Landmark />} size="sm" label="Incumbent" />
				</button>
			</TooltipTrigger>

			<TooltipContent>Incumbent</TooltipContent>
		</Tooltip>
	)
}

/**
 * The percent reporting of a race with its call dot before it, so the two read
 * as one fact.
 */
export function ReportingRow({ reporting, called }: { reporting: number; called: boolean }) {
	return (
		<Flex wrap gap="sm" className="text-sm/6 text-zinc-600 dark:text-zinc-400">
			<CallDot called={called} />

			<span>
				<PercentOdometer value={reporting} digits={1} /> reporting
			</span>
		</Flex>
	)
}
