'use client'

import { List, ListItem, ListLabel } from 'ui/list'
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

/**
 * The race of a call with its office: `Virginia Senate`. A district names no
 * office, because a district race is always the House: `Texas 3rd District`.
 */
function raceName(entry: RaceEntry): string {
	return entry.district === null ? `${entryName(entry)} ${entry.contest.label}` : entryName(entry)
}

/**
 * The newest calls, newest first, as a plain List: one line with the winner
 * and the race, and how long ago. Each row leads to the page of the race.
 */
export function LatestCalls({ calls }: { calls: readonly LatestCall[] }) {
	if (calls.length === 0) {
		return <p className="text-sm text-zinc-500 dark:text-zinc-400">No race called yet.</p>
	}

	return (
		<List
			variant="plain"
			sortable={false}
			items={[...calls]}
			getKey={(call) => call.href}
			aria-label="Latest calls"
		>
			{(call) => (
				<ListItem
					href={call.href}
					prefix={<Swatch color={call.winner.slot} />}
					suffix={<TimeAgo value={call.at} className="text-zinc-500 dark:text-zinc-400" />}
				>
					{/* The line wraps on a phone, so the race is never cut. */}
					<ListLabel className="whitespace-normal">
						{surname(call.winner.name)} wins {raceName(call.entry)}
					</ListLabel>
				</ListItem>
			)}
		</List>
	)
}
