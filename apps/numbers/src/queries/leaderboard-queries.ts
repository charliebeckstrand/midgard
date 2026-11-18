'use client'

import { keepPreviousData, queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { type BoardMode, readBoard } from '../api/leaderboard-api'

/** The boards of each day, in the order of the tabs of the leaderboard. */
const BOARD_MODES: BoardMode[] = ['solo', 'vsCpu']

/** The query key of the board `mode` of the day `date`, which a new run on that board makes stale. */
export const boardKey = (date: string, mode: BoardMode) => ['numbers-board', date, mode] as const

/** The query of the board `mode` of the day `date` (`YYYYMMDD`). */
const boardQuery = (date: string, mode: BoardMode) =>
	queryOptions({ queryKey: boardKey(date, mode), queryFn: () => readBoard(date, mode) })

/**
 * The board `mode` of the day `date`. A reader with no session can read it too.
 * While a new day loads, the board of the last day stays as placeholder data, so
 * the table keeps its rows and its height until the new rows arrive.
 */
export function useBoard(date: string, mode: BoardMode) {
	return useQuery({ ...boardQuery(date, mode), placeholderData: keepPreviousData })
}

/**
 * Reads the boards of a day ahead of their tabs. The menu reads the boards
 * of today when it opens, so the leaderboard opens with its rows, and the
 * leaderboard reads the boards of each day that the arrows go to, so a tab opens
 * with its rows.
 */
export function usePrefetchBoards() {
	const client = useQueryClient()

	return useCallback(
		(date: string) => {
			for (const mode of BOARD_MODES) void client.prefetchQuery(boardQuery(date, mode))
		},
		[client],
	)
}
