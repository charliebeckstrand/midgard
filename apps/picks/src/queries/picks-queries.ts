'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type Seed, seededQuery } from 'shared/queries'
import { deletePicks, listPicks, savePicks } from '../api/predictions-api'
import type { Game, SeasonPicks, TeamPicks } from '../types'

/** The query keys, in one place, so a reader and a writer name the same entry. */
export const picksKeys = {
	picks: (season: number) => ['picks', season] as const,
	games: (season: number, week: number) => ['games', season, week] as const,
}

/**
 * Every pick of the user in `season`. `initial` is what the page read on the
 * server (see `seededQuery`), so the buttons of each week show their true state
 * on the first paint.
 */
export function usePicks(season: number, initial: Seed<SeasonPicks>) {
	return useQuery({
		queryKey: picksKeys.picks(season),
		queryFn: () => listPicks(season),
		...seededQuery(initial),
	})
}

/**
 * The games of one week, from the route handler that reads the scoreboard. The
 * form asks for them only while it is `active`, and keeps them while it closes.
 */
export function useWeekGames(season: number, week: number | null, active: boolean) {
	return useQuery({
		queryKey: picksKeys.games(season, week ?? 0),
		queryFn: async ({ signal }): Promise<Game[]> => {
			const response = await fetch(`/api/scoreboard/${season}/${week}`, { signal })

			if (!response.ok) throw new Error('The games did not load. Try again.')

			return response.json()
		},
		enabled: active && week !== null,
	})
}

/** Writes the picks of one week, and puts what was stored into the cache. */
export function useSavePicks(season: number) {
	const client = useQueryClient()

	return useMutation({
		mutationFn: ({ week, picks }: { week: number; picks: TeamPicks }) =>
			savePicks(season, week, picks),
		// The prediction sheet shows the error.
		meta: { inlineError: true },
		onSuccess: (stored, { week }) => {
			client.setQueryData<SeasonPicks>(picksKeys.picks(season), (held) => ({
				...held,
				[week]: stored,
			}))
		},
	})
}

/** Deletes the picks of one week, and takes them out of the cache. A failure shows in a toast. */
export function useDeletePicks(season: number) {
	const client = useQueryClient()

	return useMutation({
		mutationFn: (week: number) => deletePicks(season, week),
		onSuccess: (_, week) => {
			client.setQueryData<SeasonPicks>(picksKeys.picks(season), (held) => {
				const { [week]: _removed, ...rest } = held ?? {}

				return rest
			})
		},
	})
}
