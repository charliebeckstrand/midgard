// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { createElement as h, type ReactNode } from 'react'
import type { Seed } from 'shared/queries'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchRace } from '../api/race-api'
import { useRace } from '../queries/race-queries'
import { readRace } from '../server/civic-race'
import { atlasCountyNames } from '../server/county-names'
import type { Race } from '../types'
import gaSenate from './fixtures/ga-senate.json'

vi.mock('../api/race-api', () => ({ fetchRace: vi.fn() }))

const georgia = readRace(87087, gaSenate, '13', atlasCountyNames)

/** The race as a later read gives it, with a new total for its first candidate. */
const later: Race = {
	...georgia,
	candidates: georgia.candidates.map((candidate, index) =>
		index === 0 ? { ...candidate, votes: candidate.votes + 1000 } : candidate,
	),
}

let client: QueryClient

function wrapper({ children }: { children: ReactNode }) {
	return h(QueryClientProvider, { client }, children)
}

beforeEach(() => {
	client = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } })

	vi.mocked(fetchRace).mockReset()
})

afterEach(cleanup)

describe('useRace', () => {
	it('shows the seed of the page with no read', () => {
		const { result } = renderHook(() => useRace(87087, { data: georgia, readAt: Date.now() }), {
			wrapper,
		})

		expect(result.current.data).toBe(georgia)

		expect(fetchRace).not.toHaveBeenCalled()
	})

	it('takes the newer seed of a refresh, with no read', async () => {
		const readAt = Date.now()

		const { result, rerender } = renderHook(
			({ seed }: { seed: Seed<Race> }) => useRace(87087, seed),
			{
				wrapper,
				initialProps: { seed: { data: georgia, readAt } },
			},
		)

		rerender({ seed: { data: later, readAt: readAt + 60_000 } })

		// The cache shares the parts that did not change, so the data equals the seed but is not the same object.
		await waitFor(() => expect(result.current.data).toEqual(later))

		expect(fetchRace).not.toHaveBeenCalled()
	})

	it('keeps data that is newer than the seed', () => {
		const readAt = Date.now()

		client.setQueryData(['race', 87087], later, { updatedAt: readAt })

		const { result } = renderHook(
			() => useRace(87087, { data: georgia, readAt: readAt - 60_000 }),
			{
				wrapper,
			},
		)

		expect(result.current.data).toBe(later)
	})

	it('reads a race that the page did not seed', async () => {
		vi.mocked(fetchRace).mockResolvedValue(georgia)

		const { result } = renderHook(() => useRace(87087, null), { wrapper })

		await waitFor(() => expect(result.current.data).toBe(georgia))

		expect(fetchRace).toHaveBeenCalledTimes(1)
	})
})
