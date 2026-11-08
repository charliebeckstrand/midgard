'use client'

import { Badge } from 'ui/badge'
import { Link } from 'ui/link'
import { Flex } from 'ui/structure/flex'
import { Swatch } from 'ui/swatch'
import { TimeAgo } from 'ui/time-ago'
import type { Candidate } from '../../types'
import { surname } from '../../utilities/race-math'
import { entryName, type RaceEntry } from '../../utilities/results'

/** One call of {@link LatestCalls}. */
export type LatestCall = {
	entry: RaceEntry
	winner: Candidate
	/** When the race was called, as an ISO time. */
	at: string
	/** The page of the race. */
	href: string
}

/** The newest calls, newest first: the winner, the race with its office, and how long ago. */
export function LatestCalls({ calls }: { calls: readonly LatestCall[] }) {
	if (calls.length === 0) {
		return <p className="text-sm text-zinc-500 dark:text-zinc-400">No race called yet.</p>
	}

	return (
		<ul>
			{calls.map((call) => (
				<li
					key={call.href}
					className="border-t border-zinc-950/5 py-2.5 text-sm/6 first:border-t-0 dark:border-white/5"
				>
					<Flex gap="md">
						<Swatch color={call.winner.slot} />

						<Flex as="span" wrap gap="sm" flex="1" className="min-w-0">
							<Link href={call.href} className="font-medium hover:underline">
								{surname(call.winner.name)} wins {entryName(call.entry)}
							</Link>

							<Badge variant="soft">{call.entry.contest.label}</Badge>
						</Flex>

						<TimeAgo value={call.at} className="shrink-0 text-zinc-500 dark:text-zinc-400" />
					</Flex>
				</li>
			))}
		</ul>
	)
}
