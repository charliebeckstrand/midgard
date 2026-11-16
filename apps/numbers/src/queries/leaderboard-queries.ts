'use client'

import { useQuery } from '@tanstack/react-query'
import { type BoardMode, readBoard } from '../api/leaderboard-api'

/** The query key of the board `mode` of the day `date`, which a new run on that board makes stale. */
export const boardKey = (date: string, mode: BoardMode) => ['numbers-board', date, mode] as const

/**
 * The board `mode` of the day `date` (`YYYYMMDD`). A reader with no session can
 * read it too.
 */
export function useBoard(date: string, mode: BoardMode) {
	return useQuery({
		queryKey: boardKey(date, mode),
		queryFn: () => readBoard(date, mode),
	})
}
