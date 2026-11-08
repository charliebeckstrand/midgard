'use client'

import { Avatar } from 'ui/avatar'
import { Badge } from 'ui/badge'
import { useIntl } from 'ui/primitives/intl'
import { ProgressBar } from 'ui/progress'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import { Swatch } from 'ui/swatch'
import type { Candidate } from '../../types'
import { barColor, initials, percentText } from '../../utilities/race-math'
import { ReportingRow, WinnerMark } from './call-dot'

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
	 * Shows each candidate in full: an avatar, the party, `Incumbent`, and the
	 * votes. The tab of a race uses it, and a card does not.
	 * @defaultValue false
	 */
	detail?: boolean
	/** The digits of each share. @defaultValue 1 */
	digits?: number
}

/** One candidate of a {@link RaceSummary}: the name, the share, and a bar of the share. */
function CandidateRow({
	candidate,
	detail,
	digits,
}: {
	candidate: Candidate
	detail: boolean
	digits: number
}) {
	const intl = useIntl()

	const share = percentText(intl.formatNumber, candidate.percent, digits)

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

						{candidate.winner ? <WinnerMark /> : null}
					</Flex>

					{detail ? (
						<Flex wrap gap="sm">
							<Badge variant="soft" color={barColor(candidate.slot)}>
								{candidate.party}
							</Badge>

							{candidate.incumbent ? (
								<span className="text-sm text-zinc-500 dark:text-zinc-400">Incumbent</span>
							) : null}
						</Flex>
					) : null}
				</Stack>

				{/* The votes sit under the share, as the party sits under the name. */}
				<Stack gap="xs" align="end" className="shrink-0 tabular-nums">
					<span className="font-semibold">{share}</span>

					{detail ? (
						<span className="text-sm text-zinc-500 dark:text-zinc-400">
							{intl.formatNumber(candidate.votes)}
						</span>
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
 * The body of each place where a race shows: the national Drawer on a state,
 * the cards of a state, the tab of a race, and the Drawer on a county. It
 * lists the leading candidates, each with the share and a bar, then the
 * percent reporting with the call dot. The place around it adds its title
 * and its link.
 */
export function RaceSummary({
	candidates,
	reporting,
	called,
	rows = 2,
	detail = false,
	digits = 1,
}: RaceSummaryProps) {
	const shown = rows === 'all' ? candidates : candidates.slice(0, rows)

	return (
		<Stack gap="lg">
			<Stack gap="md" role="list">
				{shown.map((candidate) => (
					<CandidateRow
						key={candidate.name}
						candidate={candidate}
						detail={detail}
						digits={digits}
					/>
				))}
			</Stack>

			<ReportingRow reporting={reporting} called={called} />
		</Stack>
	)
}
