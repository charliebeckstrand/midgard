import { describe, expect, it } from 'vitest'
import { readFilter, readLocation, readSort, writeLocation } from '../../utilities/recipes-url'

/** Reads an address the way the app does, from the query alone. */
function params(query: string): URLSearchParams {
	return new URLSearchParams(query)
}

describe('readFilter', () => {
	it('reads an address that says nothing as narrowing nothing', () => {
		expect(readFilter(params(''))).toEqual({})
	})

	it('reads the search text, trimmed', () => {
		expect(readFilter(params('q=%20dal%20'))).toEqual({ search: 'dal' })
	})

	it('drops an empty search rather than holding it', () => {
		expect(readFilter(params('q=%20%20'))).toEqual({})
	})

	it('reads every label the app knows and drops the rest', () => {
		expect(readFilter(params('label=quick&label=delicious&label=comfort'))).toEqual({
			labels: ['quick', 'comfort'],
		})
	})

	it('drops the labels field entirely when none survive', () => {
		expect(readFilter(params('label=delicious'))).toEqual({})
	})

	// The key is the whole of what it says, so its presence is the answer.
	it('reads the favourites key by its presence', () => {
		expect(readFilter(params('fav='))).toEqual({ favorite: true })

		expect(readFilter(params('fav=0'))).toEqual({ favorite: true })
	})
})

describe('readSort', () => {
	it('falls back to the reader’s own order where the address says nothing', () => {
		expect(readSort(params(''))).toBe('manual')
	})

	it('reads an order the app has', () => {
		expect(readSort(params('sort=most-cooked'))).toBe('most-cooked')
	})

	// A reader can type into the address bar, and a link can outlive the app that
	// wrote it.
	it('falls back rather than throwing on an order the app does not have', () => {
		expect(readSort(params('sort=by-vibes'))).toBe('manual')
	})
})

describe('writeLocation', () => {
	it('writes nothing for a location that says nothing', () => {
		expect(writeLocation({ filter: {}, sort: 'manual' }).toString()).toBe('')
	})

	it('leaves out the reader’s own order, which an unwritten address already means', () => {
		expect(writeLocation({ filter: {}, sort: 'name' }).toString()).toBe('sort=name')
	})

	it('writes one key per label', () => {
		expect(
			writeLocation({ filter: { labels: ['quick', 'comfort'] }, sort: 'manual' }).toString(),
		).toBe('label=quick&label=comfort')
	})

	it('leaves out a search that is only space', () => {
		expect(writeLocation({ filter: { search: '  ' }, sort: 'manual' }).toString()).toBe('')
	})

	it('round-trips every field it holds', () => {
		const location = {
			filter: { search: 'dal', labels: ['quick' as const], favorite: true as const },
			sort: 'most-cooked' as const,
		}

		expect(readLocation(params(writeLocation(location).toString()))).toEqual(location)
	})
})
