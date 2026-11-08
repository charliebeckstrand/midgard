'use client'

import { List, ListDescription, ListItem, ListLabel } from 'ui/list'
import { Swatch } from 'ui/swatch'
import { TimeAgo } from 'ui/time-ago'
import type { Election } from '../../elections/registry'
import { useDrawerStep } from '../../hooks/use-drawer-step'
import type { Candidate } from '../../types'
import { districtName } from '../../utilities/elections-url'
import { surname } from '../../utilities/race-math'
import { entryKey, entryStep, type RaceEntry } from '../../utilities/results'

/** One call of {@link LatestCalls}. */
export type LatestCall = {
	entry: RaceEntry
	winner: Candidate
	/** When the race was called, as an ISO time. */
	at: string
}

/**
 * The race of a call with its office, under the winner: `Virginia Senate`, or
 * `Texas House 3rd District`.
 */
function raceName(entry: RaceEntry): string {
	const office = `${entry.state.name} ${entry.contest.label}`

	return entry.district === null ? office : `${office} ${districtName(entry.district)}`
}

/**
 * The newest calls, newest first, as a plain List: the winner, the race with
 * its office under it, and how long ago. Each row opens the race in the Drawer.
 */
export function LatestCalls({
	election,
	calls,
}: {
	election: Election
	calls: readonly LatestCall[]
}) {
	const { go } = useDrawerStep(election)

	if (calls.length === 0) {
		return <p className="text-sm text-zinc-500 dark:text-zinc-400">No race called yet.</p>
	}

	return (
		<List
			variant="plain"
			sortable={false}
			items={[...calls]}
			getKey={(call) => entryKey(call.entry)}
			aria-label="Latest calls"
		>
			{(call) => (
				<ListItem
					onClick={() => go(entryStep(call.entry))}
					prefix={<Swatch color={call.winner.slot} />}
					suffix={<TimeAgo value={call.at} className="text-zinc-500 dark:text-zinc-400" />}
				>
					<ListLabel>{surname(call.winner.name)} wins</ListLabel>

					<ListDescription>{raceName(call.entry)}</ListDescription>
				</ListItem>
			)}
		</List>
	)
}
