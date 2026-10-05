'use client'

import { LEAGUE_ZONE, useLocalTime } from '../../utilities/use-local-time'

/** The parts of a kickoff, such as `Sun 1:00 PM`. */
const PARTS = { weekday: 'short', hour: 'numeric', minute: '2-digit' } as const

/** A kickoff in the time zone of the reader. */
const localFormat = new Intl.DateTimeFormat('en-US', PARTS)

/** A kickoff in the zone of the league, with the name of the zone, such as `Sun 1:00 PM EDT`. */
const leagueFormat = new Intl.DateTimeFormat('en-US', {
	...PARTS,
	timeZone: LEAGUE_ZONE,
	timeZoneName: 'short',
})

/**
 * A kickoff time in the time zone of the reader. The server and the hydration
 * render give the time in the zone of the league, with its name.
 */
export function KickoffTime({ kickoff, className }: { kickoff: string; className?: string }) {
	const local = useLocalTime()

	return (
		<time dateTime={kickoff} className={className}>
			{(local ? localFormat : leagueFormat).format(new Date(kickoff))}
		</time>
	)
}
