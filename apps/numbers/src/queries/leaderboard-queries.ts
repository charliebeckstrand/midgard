'use client'

import { useQuery } from '@tanstack/react-query'
import { readBoard } from '../api/leaderboard-api'
import type { Mode } from '../api/stats-api'

/** The query key of the leaderboard of `date` in `mode`, which a new run of that puzzle makes stale. */
export const boardKey = (date: string, mode: Mode) => ['numbers-board', date, mode] as const

/**
 * The leaderboard of the daily puzzle of `date` (`YYYYMMDD`) in `mode`. A
 * reader with no session can read it too.
 */
export function useBoard(date: string, mode: Mode) {
	return useQuery({
		queryKey: boardKey(date, mode),
		queryFn: () => readBoard(date, mode),
	})
}
