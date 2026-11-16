'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type Player, readBoard, readPlayer, savePlayer } from '../api/leaderboard-api'
import type { Mode } from '../api/stats-api'

/** The query key of every leaderboard, which a new name makes stale. */
const boardsKey = ['numbers-board'] as const

/** The query key of the leaderboard of `date` in `mode`, which a new run of that puzzle makes stale. */
export const boardKey = (date: string, mode: Mode) => [...boardsKey, date, mode] as const

const playerKey = ['numbers-player'] as const

/**
 * The leaderboard of the daily puzzle of `date` (`YYYYMMDD`) in `mode`. The
 * query runs only while `enabled`: the shared query client sends a `401` to
 * `/login`, so a reader with no session must send no request.
 */
export function useBoard(date: string, mode: Mode, enabled: boolean) {
	return useQuery({
		queryKey: boardKey(date, mode),
		queryFn: () => readBoard(date, mode),
		enabled,
	})
}

/** The leaderboard name of the reader, while `enabled`. */
export function usePlayer(enabled: boolean) {
	return useQuery({ queryKey: playerKey, queryFn: readPlayer, enabled })
}

/**
 * Saves the leaderboard name of the reader. The boards show the name, so each
 * board reads again. A failure shows in a toast.
 */
export function useSavePlayer() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: savePlayer,
		onSuccess: (player) => {
			client.setQueryData<Player>(playerKey, player)

			client.invalidateQueries({ queryKey: boardsKey })
		},
	})
}
