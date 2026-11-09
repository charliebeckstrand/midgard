'use client'

import { useQuery } from '@tanstack/react-query'
import { type Seed, seededQuery } from 'shared/queries'
import { fetchRace } from '../api/race-api'
import type { Race } from '../types'

/** How often a race that is still counted reads again, as the pages refresh. */
const LIVE_INTERVAL = 60_000

/**
 * One race with its counties, for the Drawer, or no read for `null`. `seed` is
 * the race that the page read on the server for the step of the address, so a
 * reload paints the Drawer whole. It fills only the query of its own race.
 *
 * @param id - The race, or `null` for a step that shows no one race.
 * @param seed - The race that the page read, or `null`.
 * @param live - The votes are still counted and the Auto update setting is on,
 * so the race reads again each minute. A hidden tab skips these reads. A race
 * that is not live also does not read again when the window gets the focus.
 */
export function useRace(id: number | null, seed: Seed<Race> | null, live: boolean) {
	return useQuery({
		queryKey: ['race', id],
		queryFn: ({ signal }) => fetchRace(id ?? 0, signal),
		enabled: id !== null,
		refetchInterval: live ? LIVE_INTERVAL : false,
		refetchOnWindowFocus: live,
		...(seed !== null && seed.data.id === id ? seededQuery(seed) : {}),
	})
}
