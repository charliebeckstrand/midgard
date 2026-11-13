'use client'

import type { ReactNode } from 'react'
import { Card } from 'ui/card'
import { DateTime } from 'ui/date-time'
import { Link } from 'ui/link'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import { type Election, electionPath } from '../../elections/registry'
import { ELECTION_DAY_FORMAT, type ElectionDays, electionDayInstant } from '../../utilities/levels'

/**
 * The day of an election in a `<time>`, such as `November 3, 2026`. A day in
 * `days` shows the text of the server. Another day shows the skeleton of a
 * `DateTime` until hydration.
 */
export function ElectionDay({ date, days }: { date: string; days: ElectionDays }) {
	return <DateTime value={days[date] ?? electionDayInstant(date)} format={ELECTION_DAY_FORMAT} />
}

/** The flag of each country of a list, by the code of the country, such as `us`. */
export type CountryFlags = Readonly<Record<string, ReactNode>>

/** Props for {@link ElectionList}. */
export type ElectionListProps = {
	elections: readonly Election[]
	/** The flag of each country, which the card shows before the name of the country. */
	flags: CountryFlags
	/** The text of each election day, which the server writes (`electionDays`). */
	days: ElectionDays
}

/**
 * The elections of a list, each a card that leads to its overview. The cards
 * stack in one column. A card names the election, its country with its flag,
 * and its day, which every election has, whatever its country and its
 * offices. The list gives no status. In the list view, the heading of each
 * group names it.
 */
export function ElectionList({ elections, flags, days }: ElectionListProps) {
	return (
		<Stack gap="md">
			{elections.map((election) => (
				<Card
					key={electionPath(election)}
					href={electionPath(election)}
					render={<Link href={electionPath(election)} />}
					className="transition-shadow hover:shadow-md"
				>
					<Stack gap="sm" className="min-w-0">
						<span className="font-semibold">
							{election.year} {election.name}
						</span>

						{/* On the baseline, so the flag stands where the capitals of the name stand. */}
						<Flex
							as="span"
							align="baseline"
							gap="sm"
							className="text-sm text-zinc-600 dark:text-zinc-400"
						>
							{flags[election.country]}

							<span>
								{election.countryName}, <ElectionDay date={election.date} days={days} />
							</span>
						</Flex>
					</Stack>
				</Card>
			))}
		</Stack>
	)
}
