import { MutationObserver, QueryClient } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setVisit } from '../../api/places-api'
import { placesKeys, setVisitMutation } from '../../queries/places-queries'
import type { Visits } from '../../types'

vi.mock('../../api/places-api', () => ({ setVisit: vi.fn() }))

afterEach(() => {
	vi.mocked(setVisit).mockReset()
})

// A request that stays open until the test settles it.
function pending() {
	let resolve!: (visits: Visits) => void

	let reject!: (error: Error) => void

	const promise = new Promise<Visits>((done, fail) => {
		resolve = done
		reject = fail
	})

	return { promise, resolve, reject }
}

function setup(visits: Visits) {
	const client = new QueryClient()

	client.setQueryData(placesKeys.visits, visits)

	const observer = new MutationObserver(client, setVisitMutation(client))

	const read = () => client.getQueryData<Visits>(placesKeys.visits)

	return { observer, read }
}

describe('setVisitMutation', () => {
	it('marks the region in the cache before the request answers', async () => {
		const request = pending()

		vi.mocked(setVisit).mockReturnValue(request.promise)

		const { observer, read } = setup({ states: [], countries: [] })

		const done = observer.mutate({ scope: 'states', region: 'Oregon', visited: true })

		await vi.waitFor(() => expect(read()?.states).toEqual(['Oregon']))

		request.resolve({ states: ['Oregon'], countries: [] })

		await done

		expect(read()).toEqual({ states: ['Oregon'], countries: [] })
	})

	it('unmarks the region in the cache before the request answers', async () => {
		vi.mocked(setVisit).mockReturnValue(pending().promise)

		const { observer, read } = setup({ states: ['Oregon', 'Utah'], countries: [] })

		void observer.mutate({ scope: 'states', region: 'Oregon', visited: false })

		await vi.waitFor(() => expect(read()?.states).toEqual(['Utah']))
	})

	it('puts the cache back when the request fails', async () => {
		const request = pending()

		vi.mocked(setVisit).mockReturnValue(request.promise)

		const { observer, read } = setup({ states: [], countries: ['Japan'] })

		const done = observer.mutate({ scope: 'states', region: 'Oregon', visited: true })

		await vi.waitFor(() => expect(read()?.states).toEqual(['Oregon']))

		request.reject(new Error('offline'))

		await done.catch(() => undefined)

		expect(read()).toEqual({ states: [], countries: ['Japan'] })
	})
})
