'use client'

import { keepPreviousData, queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { type BoardMode, readBoard } from '../api/leaderboard-api'

/** The boards of each day, in the order of the tabs of the leaderboard. */
const BOARD_MODES: BoardMode[] = ['solo', 'vsCpu']

/**
 * The prefix of the query keys of the board `mode` of the day `date`, for each
 * reader. A new run on that board makes them stale.
 */
export const boardKey = (date: string, mode: BoardMode) => ['numbers-board', date, mode] as const

/**
 * The query of the board `mode` of the day `date` (`YYYYMMDD`) for the reader
 * `viewer`: the id of the signed-in user, or `null`. The answer holds the row of
 * the reader, so the key holds the reader. A sign-in keeps the query cache of
 * the page, and the board of a reader with no session does not answer for the
 * signed-in reader.
 */
const boardQuery = (date: string, mode: BoardMode, viewer: string | null) =>
	queryOptions({
		queryKey: [...boardKey(date, mode), viewer] as const,
		queryFn: () => readBoard(date, mode),
	})

/**
 * The board `mode` of the day `date` for the reader `viewer` (see
 * {@link boardQuery}). A reader with no session can read it too. While a new day
 * loads, the board of the last day stays as placeholder data, so the table keeps
 * its rows and its height until the new rows arrive.
 */
export function useBoard(date: string, mode: BoardMode, viewer: string | null) {
	return useQuery({ ...boardQuery(date, mode, viewer), placeholderData: keepPreviousData })
}

/**
 * Reads the boards of a day for the reader `viewer` ahead of their tabs. The
 * menu reads the boards of today when it opens, so the leaderboard opens with
 * its rows, and the leaderboard reads the boards of each day that the arrows go
 * to, so a tab opens with its rows.
 */
export function usePrefetchBoards(viewer: string | null) {
	const client = useQueryClient()

	return useCallback(
		(date: string) => {
			for (const mode of BOARD_MODES) void client.prefetchQuery(boardQuery(date, mode, viewer))
		},
		[client, viewer],
	)
}
