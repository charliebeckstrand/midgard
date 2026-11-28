// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { savePicks } from '../api/predictions-api'
import { picksKeys, useDeletePicks, useSavePicks } from '../queries/picks-queries'
import type { SeasonPicks, WeekPicks } from '../types'

vi.mock('../api/predictions-api', () => ({
	savePicks: vi.fn(),
	deletePicks: vi.fn(async () => undefined),
}))

function week(team: string): WeekPicks {
	return { '401': { team, line: -3.5 } }
}

/** A client with the picks of 2025 and 2026 in the cache, and the hook rendered on it. */
function setup<T>(held: SeasonPicks | undefined, hook: () => T) {
	const client = new QueryClient()

	client.setQueryData<SeasonPicks>(picksKeys.picks(2025), { 1: week('KC') })

	if (held) client.setQueryData(picksKeys.picks(2026), held)

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	)

	const { result } = renderHook(hook, { wrapper })

	const read = (season: number) => client.getQueryData<SeasonPicks>(picksKeys.picks(season))

	return { read, result }
}

describe('useSavePicks', () => {
	it('puts the stored picks in their week, and keeps the other weeks and seasons', async () => {
		vi.mocked(savePicks).mockResolvedValue(week('PHI'))

		const { read, result } = setup({ 1: week('BUF'), 2: week('DAL') }, () => useSavePicks(2026))

		await act(() => result.current.mutateAsync({ week: 2, picks: { '401': 'PHI' } }))

		expect(read(2026)).toEqual({ 1: week('BUF'), 2: week('PHI') })

		expect(read(2025)).toEqual({ 1: week('KC') })
	})

	it('starts the season when the cache holds no picks for it', async () => {
		vi.mocked(savePicks).mockResolvedValue(week('PHI'))

		const { read, result } = setup(undefined, () => useSavePicks(2026))

		await act(() => result.current.mutateAsync({ week: 3, picks: { '401': 'PHI' } }))

		expect(read(2026)).toEqual({ 3: week('PHI') })
	})
})

describe('useDeletePicks', () => {
	it('removes only that week, and keeps the other weeks and seasons', async () => {
		const { read, result } = setup({ 1: week('BUF'), 2: week('DAL') }, () => useDeletePicks(2026))

		await act(() => result.current.mutateAsync(1))

		expect(read(2026)).toEqual({ 2: week('DAL') })

		expect(read(2025)).toEqual({ 1: week('KC') })
	})
})
