'use client'

import { Avatar } from 'ui/avatar'
import { Badge } from 'ui/badge'
import { Odometer } from 'ui/odometer'
import { useIntl } from 'ui/primitives/intl'
import { ProgressBar } from 'ui/progress'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import { Swatch } from 'ui/swatch'
import type { Candidate } from '../../types'
import { barColor, initials, percentText } from '../../utilities/race-math'
import { PercentOdometer } from '../percent-odometer'
import { IncumbentMark, ReportingRow, WinnerMark } from './reporting-row'

/** Props for {@link RaceSummary}. */
export type RaceSummaryProps = {
	/** The candidates, most votes first. */
	candidates: readonly Candidate[]
	reporting: number
	called: boolean
	/**
	 * The most candidates to show, or `all`.
	 * @defaultValue 2
	 */
	rows?: number | 'all'
	/**
	 * Shows each candidate in full: an avatar, the mark of an incumbent, the
	 * party, and the votes. The overview of a race and the detailed layout of a county use it,
	 * and a card does not.
	 * @defaultValue false
	 */
	detail?: boolean
}

/**
 * One candidate of a {@link RaceSummary}: the name, the share, and a bar of the
 * share. A changed share or count of votes rolls to its new value.
 */
function CandidateRow({ candidate, detail }: { candidate: Candidate; detail: boolean }) {
	const intl = useIntl()

	const share = percentText(intl.formatNumber, candidate.percent, 1)

	return (
		<Stack gap="sm" role="listitem">
			<Flex gap="md">
				{detail ? (
					<Avatar
						initials={initials(candidate.name)}
						color={barColor(candidate.slot)}
						variant="soft"
					/>
				) : (
					<Swatch color={candidate.slot} />
				)}

				{/* The party always sits under the name, so each row has the same shape. */}
				<Stack gap="xs" flex="1" className="min-w-0">
					<Flex gap="sm">
						<span className="truncate font-medium">{candidate.name}</span>

						{detail && candidate.incumbent ? <IncumbentMark /> : null}

						{candidate.winner ? <WinnerMark /> : null}
					</Flex>

					{detail ? (
						<Flex>
							<Badge variant="soft" color={barColor(candidate.slot)}>
								{candidate.party}
							</Badge>
						</Flex>
					) : null}
				</Stack>

				{/* The votes sit under the share, as the party sits under the name. */}
				<Stack gap="xs" align="end" className="shrink-0">
					<PercentOdometer value={candidate.percent} digits={1} className="font-semibold" />

					{detail ? (
						<Odometer
							value={candidate.votes}
							className="text-sm text-zinc-500 dark:text-zinc-400"
						/>
					) : null}
				</Stack>
			</Flex>

			<ProgressBar
				aria-label={`${candidate.name}, ${share}`}
				value={candidate.percent}
				color={barColor(candidate.slot)}
				size="sm"
			/>
		</Stack>
	)
}

/**
 * A race in an office card of the overview of a state, in the Drawer and on
 * the page of the state. It also shows in the Drawer on the step of a race and
 * on the step of a county. It lists the leading candidates, each with the
 * share and a bar, then the percent reporting with the call dot. The place around it adds its title and its link.
 */
export function RaceSummary({
	candidates,
	reporting,
	called,
	rows = 2,
	detail = false,
}: RaceSummaryProps) {
	const shown = rows === 'all' ? candidates : candidates.slice(0, rows)

	return (
		<Stack gap="lg">
			<Stack gap="md" role="list">
				{shown.map((candidate) => (
					<CandidateRow key={candidate.name} candidate={candidate} detail={detail} />
				))}
			</Stack>

			<ReportingRow reporting={reporting} called={called} />
		</Stack>
	)
}
