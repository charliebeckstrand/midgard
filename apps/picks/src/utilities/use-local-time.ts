import { useSyncExternalStore } from 'react'

/** The zone of the league schedule. The server and the hydration render format in it. */
export const LEAGUE_ZONE = 'America/New_York'

/** A subscription that never fires, because the snapshot changes only at hydration. */
const subscribeNothing = () => () => {}

/**
 * Whether to format a date in the time zone of the reader. The server does
 * not know that zone, so the server and the hydration render give `false` and
 * format in {@link LEAGUE_ZONE}. The render after hydration gives `true`.
 */
export function useLocalTime(): boolean {
	return useSyncExternalStore(
		subscribeNothing,
		() => true,
		() => false,
	)
}
