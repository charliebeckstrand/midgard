import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { type Seed, seededQuery } from '../queries'

const key = ['list'] as const

// The client of an app, with the stale time of the apps.
function setup() {
	const client = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } })

	const queryFn = vi.fn(async () => 'fetched')

	// Opens the page with `seed`: a reader mounts on the query. The result closes the page.
	const open = (seed: Seed<string>) => {
		const observer = new QueryObserver(client, { queryKey: key, queryFn, ...seededQuery(seed) })

		const unsubscribe = observer.subscribe(() => undefined)

		return { read: () => observer.getCurrentResult().data, close: unsubscribe }
	}

	return { client, queryFn, open }
}

// Waits until the query client removes the entry, which `gcTime: 0` does on a timer.
function dropped(client: QueryClient) {
	return vi.waitFor(() => expect(client.getQueryCache().find({ queryKey: key })).toBeUndefined())
}

describe('seededQuery', () => {
	it('shows the seed on the first visit, with no fetch', () => {
		const { queryFn, open } = setup()

		const page = open({ data: 'first', readAt: Date.now() })

		expect(page.read()).toBe('first')

		expect(queryFn).not.toHaveBeenCalled()
	})

	it('shows the newer seed of a revisit, with no fetch', async () => {
		const { client, queryFn, open } = setup()

		open({ data: 'first', readAt: Date.now() }).close()

		await dropped(client)

		const page = open({ data: 'second', readAt: Date.now() })

		expect(page.read()).toBe('second')

		expect(queryFn).not.toHaveBeenCalled()
	})

	it('drops the entry when the page closes', async () => {
		const { client, open } = setup()

		open({ data: 'first', readAt: Date.now() }).close()

		await dropped(client)
	})

	it('fetches when the seed is older than the stale time, such as on a back navigation', async () => {
		const { queryFn, open } = setup()

		const page = open({ data: 'first', readAt: Date.now() - 60_000 })

		await vi.waitFor(() => expect(page.read()).toBe('fetched'))

		expect(queryFn).toHaveBeenCalledTimes(1)
	})

	it('keeps a write to the cache while the page is open', () => {
		const { client, open } = setup()

		const page = open({ data: 'first', readAt: Date.now() })

		client.setQueryData(key, 'written')

		expect(page.read()).toBe('written')
	})
})
