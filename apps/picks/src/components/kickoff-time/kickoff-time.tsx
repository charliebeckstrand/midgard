'use client'

import { DateTime } from 'ui/date-time'

/** The parts of a kickoff, such as `Sun 1:00 PM`. */
const PARTS = { weekday: 'short', hour: 'numeric', minute: '2-digit' } as const

/**
 * A kickoff time in the time zone of the reader. The server and the hydration
 * render give the time in the zone of the league, with its name.
 */
export function KickoffTime({ kickoff, className }: { kickoff: string; className?: string }) {
	return <DateTime value={kickoff} format={PARTS} className={className} />
}
