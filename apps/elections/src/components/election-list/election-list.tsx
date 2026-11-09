'use client'

import { Card } from 'ui/card'
import { Link } from 'ui/link'
import { useIntl } from 'ui/primitives/intl'
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

/**
 * The elections of a list, each a card that leads to its overview. The cards
 * stack in one column. A card names the election, its country, and its day,
 * which every election has, whatever its country and its offices. The list
 * gives no status: the group of the list names it.
 */
export function ElectionList({ elections }: { elections: readonly Election[] }) {
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

						<span className="text-sm text-zinc-600 dark:text-zinc-400">
							{election.countryName}, <ElectionDay date={election.date} />
						</span>
					</Stack>
				</Card>
			))}
		</Stack>
	)
}
