// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { savePlace } from '../../api/places-api'
import { placesKeys, useDeleteVisit } from '../../queries/places-queries'
import type { Place, PlaceDraft, Visit } from '../../types'
import { place } from '../fixtures'

vi.mock('../../api/places-api', () => ({ savePlace: vi.fn() }))

// A request that stays open until the test settles it.
function pending() {
	let resolve!: (place: Place) => void

	const promise = new Promise<Place>((done) => {
		resolve = done
	})

	return { promise, resolve }
}

// The stored place that a save of `draft` answers with.
function stored(draft: PlaceDraft, from: Place): Place {
	return {
		...from,
		visits: from.visits.filter((visit) =>
			draft.visits.some((kept) => kept.visitedAt === visit.visitedAt),
		),
	}
}

describe('useDeleteVisit', () => {
	it('keeps the first delete when a second one starts before the first answers', async () => {
		const visits: Visit[] = [
			{ id: 'v1', visitedAt: '2026-08-01', rating: 4, photos: [] },
			{ id: 'v2', visitedAt: '2026-08-02', rating: 4, photos: [] },
			{ id: 'v3', visitedAt: '2026-08-03', rating: 4, photos: [] },
		]

		const held = place('p1', { visits })

		const client = new QueryClient()

		client.setQueryData(placesKeys.all, [held])

		// Each save stays open until the test answers it, in the order they went out.
		const saves: { draft: PlaceDraft; request: ReturnType<typeof pending> }[] = []

		vi.mocked(savePlace).mockImplementation((_id, draft) => {
			const request = pending()

			saves.push({ draft, request })

			return request.promise
		})

		const wrapper = ({ children }: { children: ReactNode }) =>
			createElement(QueryClientProvider, { client }, children)

		const { result } = renderHook(() => useDeleteVisit(), { wrapper })

		// The menu of the open place passes the place of the last render. The
		// first delete has not answered, so both deletes see all three visits.
		const [v1, v2] = visits as [Visit, Visit, Visit]

		let done: Promise<unknown>[] = []

		act(() => {
			done = [
				result.current.mutateAsync({ place: held, visit: v1 }),
				result.current.mutateAsync({ place: held, visit: v2 }),
			]
		})

		for (const index of [0, 1]) {
			await vi.waitFor(() => expect(saves.length).toBeGreaterThan(index))

			const save = saves[index] as (typeof saves)[number]

			await act(async () => save.request.resolve(stored(save.draft, held)))
		}

		await Promise.all(done)

		expect(saves.at(-1)?.draft.visits.map((visit) => visit.visitedAt)).toEqual(['2026-08-03'])

		expect(
			client.getQueryData<Place[]>(placesKeys.all)?.[0]?.visits.map((visit) => visit.id),
		).toEqual(['v3'])
	})
})
