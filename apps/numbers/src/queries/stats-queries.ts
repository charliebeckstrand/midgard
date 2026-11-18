'use client'

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { toBoardMode } from '../api/leaderboard-api'
import { type NumbersStats, type RunResult, readStats, recordResult } from '../api/stats-api'
import { boardKey } from './leaderboard-queries'

/** The query of the stats of the reader, in one place, so the reader and the writer name the same entry. */
const statsQuery = queryOptions({ queryKey: ['numbers-stats'] as const, queryFn: readStats })

/**
 * The stats of the reader. The query runs only while `enabled`: the shared
 * query client sends a `401` to `/login`, so a reader with no session must send
 * no request.
 */
export function useStats(enabled: boolean) {
	return useQuery({ ...statsQuery, enabled })
}

/**
 * Reads the stats ahead of the Stats dialog. The menu reads them when it opens,
 * so the dialog opens with its stats. Call it only for a verified user, for the
 * reason of {@link useStats}.
 */
export function usePrefetchStats() {
	const client = useQueryClient()

	return useCallback(() => void client.prefetchQuery(statsQuery), [client])
}

/**
 * Counts a finished run, and puts the stats of the answer into the cache. A run
 * that counts on a leaderboard of the day can change the score of the reader
 * on it, so that board reads again. A failure shows in a toast.
 */
export function useRecordResult() {
	const client = useQueryClient()

	return useMutation({
		mutationFn: recordResult,
		onSuccess: (stats, result: RunResult) => {
			client.setQueryData<NumbersStats>(statsQuery.queryKey, stats)

			const board = toBoardMode(result)

			if (board) client.invalidateQueries({ queryKey: boardKey(result.today, board) })
		},
	})
}
