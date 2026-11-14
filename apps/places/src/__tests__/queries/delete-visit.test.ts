// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { deletePlace, savePlace } from '../../api/places-api'
import { placesKeys, useDeleteVisit } from '../../queries/places-queries'
import type { Place, PlaceDraft, Visit } from '../../types'
import { place } from '../fixtures'

vi.mock('../../api/places-api', () => ({ savePlace: vi.fn(), deletePlace: vi.fn() }))

// A request that stays open until the test settles it.
function pending<T>() {
	let resolve!: (value: T) => void

	const promise = new Promise<T>((done) => {
		resolve = done
	})

	return { promise, resolve }
}

function visit(id: string, visitedAt: string): Visit {
	return { id, visitedAt, rating: 4, photos: [] }
}

/**
 * A place with `visits` in the cache, and two deletes of its first two visits
 * that start before either answers. The menu of the open place passes the
 * place of the last render, so both deletes see every visit. Each request
 * answers in the order it went out.
 */
async function deleteTwo(visits: Visit[]) {
	const held = place('p1', { visits })

	const client = new QueryClient()

	client.setQueryData(placesKeys.all, [held])

	const saves: PlaceDraft[] = []

	const answers: (() => void)[] = []

	vi.mocked(savePlace).mockImplementation((_id, draft) => {
		const request = pending<Place>()

		saves.push(draft)

		// The stored place keeps the visits of the draft.
		answers.push(() =>
			request.resolve({
				...held,
				visits: held.visits.filter((kept) =>
					draft.visits.some((sent) => sent.visitedAt === kept.visitedAt),
				),
			}),
		)

		return request.promise
	})

	vi.mocked(deletePlace).mockImplementation(() => {
		const request = pending<void>()

		answers.push(() => request.resolve())

		return request.promise
	})

	const wrapper = ({ children }: { children: ReactNode }) =>
		createElement(QueryClientProvider, { client }, children)

	const { result } = renderHook(() => useDeleteVisit(), { wrapper })

	const [first, second] = visits as [Visit, Visit]

	let done: Promise<unknown>[] = []

	act(() => {
		done = [
			result.current.mutateAsync({ place: held, visit: first }),
			result.current.mutateAsync({ place: held, visit: second }),
		]
	})

	for (const index of [0, 1]) {
		await vi.waitFor(() => expect(answers.length).toBeGreaterThan(index))

		await act(async () => answers[index]?.())
	}

	await Promise.all(done)

	return { saves, cached: client.getQueryData<Place[]>(placesKeys.all) }
}

describe('useDeleteVisit', () => {
	it('keeps the first delete when a second one starts before the first answers', async () => {
		const { saves, cached } = await deleteTwo([
			visit('v1', '2026-08-01'),
			visit('v2', '2026-08-02'),
			visit('v3', '2026-08-03'),
		])

		expect(saves.at(-1)?.visits.map((kept) => kept.visitedAt)).toEqual(['2026-08-03'])

		expect(cached?.[0]?.visits.map((kept) => kept.id)).toEqual(['v3'])
	})

	it('deletes the place when the second delete removes its last visit', async () => {
		const { saves, cached } = await deleteTwo([
			visit('v1', '2026-08-01'),
			visit('v2', '2026-08-02'),
		])

		expect(saves).toHaveLength(1)

		expect(deletePlace).toHaveBeenCalledWith('p1')

		expect(cached).toEqual([])
	})
})
