// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { type NumbersStats, recordResult } from '../api/stats-api'
import { useRecordResult } from '../queries/stats-queries'

vi.mock('../api/stats-api', () => ({ readStats: vi.fn(), recordResult: vi.fn() }))

const TODAY = '20261116'

/** Renders `useRecordResult` with its own query client, and spies on what it makes stale. */
function renderRecorder() {
	const client = new QueryClient()

	const invalidate = vi.spyOn(client, 'invalidateQueries')

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)

	return { invalidate, ...renderHook(() => useRecordResult(), { wrapper }) }
}

afterEach(() => {
	vi.resetAllMocks()
})

describe('useRecordResult', () => {
	it.each([
		[{ seed: TODAY, mode: 'solo' }, 'daily'],
		[{ seed: 'k3x9q2', mode: 'solo' }, 'solo'],
		[{ seed: 'k3x9q2', mode: 'vsCpu' }, 'vsCpu'],
	] as const)('makes the board of the day of %j stale: %s', async (run, board) => {
		vi.mocked(recordResult).mockResolvedValue({} as NumbersStats)

		const { result, invalidate } = renderRecorder()

		result.current.mutate({ ...run, score: 10, today: TODAY })

		await waitFor(() =>
			expect(invalidate).toHaveBeenCalledWith({ queryKey: ['numbers-board', TODAY, board] }),
		)
	})
})
