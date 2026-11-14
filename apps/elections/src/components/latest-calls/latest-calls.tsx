'use client'

import { List, ListDescription, ListItem, ListLabel } from 'ui/list'
import { Swatch } from 'ui/swatch'
import { Text } from 'ui/text'
import { TimeAgo } from 'ui/time-ago'
import type { Election } from '../../elections/registry'
import { useDrawerGo } from '../../hooks/use-drawer'
import { districtName } from '../../utilities/elections-url'
import { surname } from '../../utilities/race-math'
import { entryKey, entryStep, type RaceCall, type RaceEntry } from '../../utilities/results'

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
	calls: readonly RaceCall[]
}) {
	const go = useDrawerGo(election)

	if (calls.length === 0) {
		return (
			<Text tone="muted" className="text-sm">
				No race called yet.
			</Text>
		)
	}

	return (
		<List
			variant="plain"
			items={calls}
			getKey={(call) => entryKey(call.entry)}
			aria-label="Latest calls"
		>
			{(call) => (
				<ListItem
					onClick={() => go(entryStep(call.entry))}
					prefix={<Swatch color={call.winner.slot} label={call.winner.party} />}
					suffix={<TimeAgo value={call.at} className="text-zinc-500 dark:text-zinc-400" />}
				>
					<ListLabel>{surname(call.winner.name)} wins</ListLabel>

					<ListDescription>{raceName(call.entry)}</ListDescription>
				</ListItem>
			)}
		</List>
	)
}
