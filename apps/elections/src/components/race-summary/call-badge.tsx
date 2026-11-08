'use client'

import { CircleCheck } from 'lucide-react'
import { Badge } from 'ui/badge'
import { Icon } from 'ui/icon'
import { useIntl } from 'ui/primitives/intl'
import { Flex } from 'ui/structure/flex'
import { percentText } from '../../utilities/race-math'

/**
 * The call of a race or a chamber: a small soft green `Called` badge, or an
 * amber `Not called` one. Green is a call, so no party color takes it.
 */
export function CallBadge({ called, label }: { called: boolean; label?: string }) {
	return called ? (
		<Badge variant="soft" color="green" size="sm">
			{label ?? 'Called'}
		</Badge>
	) : (
		<Badge variant="soft" color="amber" size="sm">
			Not called
		</Badge>
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
 * The percent reporting of a race with its call badge set beside it, not at
 * the far end of the row, so the two read as one fact.
 */
export function ReportingRow({ reporting, called }: { reporting: number; called: boolean }) {
	const intl = useIntl()

	return (
		<Flex wrap gap="sm" className="text-sm/6 text-zinc-600 dark:text-zinc-400">
			<span className="tabular-nums">{percentText(intl.formatNumber, reporting, 1)} reporting</span>

			<CallBadge called={called} />
		</Flex>
	)
}
