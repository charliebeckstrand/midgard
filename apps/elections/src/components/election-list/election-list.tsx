'use client'

import type { ReactNode } from 'react'
import { Card } from 'ui/card'
import { Link } from 'ui/link'
import { useIntl } from 'ui/primitives/intl'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import { type Election, electionPath } from '../../elections/registry'

/**
 * The day of an election in the locale of the page, such as `November 3, 2026`.
 * The day is a date, so it reads in UTC: each zone shows the same day.
 */
export function ElectionDay({ date }: { date: string }) {
	const intl = useIntl()

	return intl.formatDate(`${date}T12:00:00Z`, { dateStyle: 'long', timeZone: 'UTC' })
}

/** The flag of each country of a list, by the code of the country, such as `us`. */
export type CountryFlags = Readonly<Record<string, ReactNode>>

/** Props for {@link ElectionList}. */
export type ElectionListProps = {
	elections: readonly Election[]
	/** The flag of each country, which the card shows before the name of the country. */
	flags: CountryFlags
}

/**
 * The elections of a list, each a card that leads to its overview. The cards
 * stack in one column. A card names the election, its country with its flag,
 * and its day, which every election has, whatever its country and its
 * offices. The list gives no status: the group of the list names it.
 */
export function ElectionList({ elections, flags }: ElectionListProps) {
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
								{election.countryName}, <ElectionDay date={election.date} />
							</span>
						</Flex>
					</Stack>
				</Card>
			))}
		</Stack>
	)
}
