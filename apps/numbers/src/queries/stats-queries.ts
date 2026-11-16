'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toBoardMode } from '../api/leaderboard-api'
import { type NumbersStats, type RunResult, readStats, recordResult } from '../api/stats-api'
import { boardKey } from './leaderboard-queries'

/** The query key of the stats as of `today`, in one place, so the reader and the writer name the same entry. */
const statsKey = (today: string) => ['numbers-stats', today] as const

/**
 * The stats of the reader as of `today` (`YYYYMMDD`). The query runs only while
 * `enabled`: the shared query client sends a `401` to `/login`, so a reader with
 * no session must send no request.
 */
export function useStats(today: string, enabled: boolean) {
	return useQuery({
		queryKey: statsKey(today),
		queryFn: () => readStats(today),
		enabled,
	})
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
			client.setQueryData<NumbersStats>(statsKey(result.today), stats)

			const board = toBoardMode(result)

			if (board) client.invalidateQueries({ queryKey: boardKey(result.today, board) })
		},
	})
}
