'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deletePicks, listPicks, savePicks } from '../api/predictions-api'
import type { Game, SeasonPicks, WeekPicks } from '../types'

/** The query keys, in one place, so a reader and a writer name the same entry. */
export const picksKeys = {
	picks: (season: number) => ['picks', season] as const,
	games: (season: number, week: number) => ['games', season, week] as const,
}

/**
 * Every pick of the user in `season`. `initial` is what the page read on the
 * server, so the buttons of each week show their true state on the first paint.
 */
export function usePicks(season: number, initial: SeasonPicks) {
	return useQuery({
		queryKey: picksKeys.picks(season),
		queryFn: () => listPicks(season),
		initialData: initial,
	})
}

/**
 * The games of one week, from the route handler that reads the scoreboard. The
 * form asks for them only while it is open.
 */
export function useWeekGames(season: number, week: number | null) {
	return useQuery({
		queryKey: picksKeys.games(season, week ?? 0),
		queryFn: async ({ signal }): Promise<Game[]> => {
			const response = await fetch(`/api/scoreboard/${season}/${week}`, { signal })

			if (!response.ok) throw new Error('The games did not load. Try again.')

			return response.json()
		},
		enabled: week !== null,
	})
}

/** Writes the picks of one week, and puts what was stored into the cache. */
export function useSavePicks(season: number) {
	const client = useQueryClient()

	return useMutation({
		mutationFn: ({ week, picks }: { week: number; picks: WeekPicks }) =>
			savePicks(season, week, picks),
		onSuccess: (stored, { week }) => {
			client.setQueryData<SeasonPicks>(picksKeys.picks(season), (held) => ({
				...held,
				[week]: stored,
			}))
		},
	})
}

/** Deletes the picks of one week, and takes them out of the cache. */
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
