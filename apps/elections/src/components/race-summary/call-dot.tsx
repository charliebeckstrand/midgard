'use client'

import { CircleCheck } from 'lucide-react'
import { Icon } from 'ui/icon'
import { StatusDot } from 'ui/status'
import { Flex } from 'ui/structure/flex'
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
