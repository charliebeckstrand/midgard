// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render } from '@testing-library/react'
import { createElement as h } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCountyShapes } from '../api/county-api'
import { ElectionDrawer } from '../components/election-drawer'
import { ElectionRacesProvider } from '../components/election-drawer/context'
import { CountyMap } from '../components/race-detail/county-map'
import { type Election, findContest, findElection } from '../elections/registry'
import { readNationalRace, readRace } from '../server/civic-race'
import { atlasCountyNames } from '../server/county-names'
import { drawerSeed } from '../server/drawer'
import { race } from '../server/races'
import { readEntries } from '../utilities/results'
import gaSenate from './fixtures/ga-senate.json'
import senate from './fixtures/senate.json'

vi.mock('next/navigation', () => ({
	usePathname: () => window.location.pathname,
	useSearchParams: () => new URLSearchParams(window.location.search),
}))

vi.mock('next/server', () => ({ connection: async () => undefined }))

vi.mock('../server/races', () => ({ race: vi.fn() }))

vi.mock('../api/race-api', () => ({ fetchRace: vi.fn(() => new Promise(() => {})) }))

vi.mock('../api/county-api', () => ({ fetchCountyShapes: vi.fn(() => new Promise(() => {})) }))

afterEach(cleanup)

// jsdom has no `ResizeObserver` and no layout, and the panel, the trail, and the map measure themselves.
beforeEach(() => {
	Range.prototype.getBoundingClientRect = () => new DOMRect()

	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	)
})

const midterms = findElection('2026', 'us', 'midterms')

const contest = midterms && findContest(midterms, 'senate')

if (midterms === undefined || contest === undefined) {
	throw new Error('The registry has no 2026 Senate.')
}

const election: Election = midterms

const races = [{ contest, entries: readEntries(contest, readNationalRace(87528, senate)) }]

const georgia = readRace(87087, gaSenate, '13', atlasCountyNames)

vi.mocked(race).mockResolvedValue(georgia)

/** The seed of the Drawer for a query string. */
function readSeed(query: string) {
	const params = Object.fromEntries(new URLSearchParams(query))

	return drawerSeed(election, races, Promise.resolve(params))
}

describe('drawerSeed', () => {
	it('reads the county shapes only for the map of a race', async () => {
		const seed = await readSeed('region=ga&office=senate&view=counties')

		expect(seed?.race.data.id).toBe(87087)
		expect(seed?.map?.shapes.features.length).toBe(159)
		expect(seed?.map?.CountyMap).toBe(CountyMap)

		expect((await readSeed('region=ga&office=senate'))?.map).toBeNull()

		// A county shows the race in that county, and no map.
		expect((await readSeed('region=ga&office=senate&view=counties&county=13121'))?.map).toBeNull()

		expect(await readSeed('region=ga')).toBeNull()
	})
})

describe('ElectionDrawer', () => {
	it('draws the map of a reload on the map from the seed, with no read of the shapes', async () => {
		window.history.replaceState(null, '', '/2026/us/midterms?region=ga&office=senate&view=counties')

		const seed = await readSeed('region=ga&office=senate&view=counties')

		// The seed holds the map, so the first render draws it, with no wait for the chunk.
		act(() => {
			render(
				h(QueryClientProvider, {
					client: new QueryClient(),
					children: h(ElectionRacesProvider, {
						races,
						children: h(ElectionDrawer, { election, seed }),
					}),
				}),
			)
		})

		const plot = document.querySelector('[aria-label="Georgia Senate results by county"]')

		// The frame takes the ratio of the shapes of Georgia, not the default ratio of
		// a map with no shapes, and the counties draw.
		const frame = plot?.querySelector<HTMLElement>('[data-slot="aspect-ratio"]')

		expect(Number.parseFloat(frame?.style.aspectRatio ?? '')).toBeLessThan(1)
		expect(plot?.querySelectorAll('path[data-region-index]').length).toBeGreaterThan(0)

		expect(fetchCountyShapes).not.toHaveBeenCalled()
	})

	it('keeps the map of the first seed when a refresh gives a seed with no map', async () => {
		window.history.replaceState(null, '', '/2026/us/midterms?region=ga&office=senate&view=counties')

		const seed = await readSeed('region=ga&office=senate&view=counties')

		const client = new QueryClient()

		const tree = (next: typeof seed) =>
			h(QueryClientProvider, {
				client,
				children: h(ElectionRacesProvider, {
					races,
					children: h(ElectionDrawer, { election, seed: next }),
				}),
			})

		let rerender: (ui: ReturnType<typeof tree>) => void = () => {}

		act(() => {
			rerender = render(tree(seed)).rerender
		})

		const plot = document.querySelector('[aria-label="Georgia Senate results by county"]')

		// A refresh after a switch to Overview reads the seed again, with no map. The
		// map stays mounted, so it keeps its zoom.
		act(() => {
			rerender(tree(seed === null ? null : { ...seed, map: null }))
		})

		expect(plot?.isConnected).toBe(true)
		expect(document.querySelector('[aria-label="Georgia Senate results by county"]')).toBe(plot)
	})

	it('hydrates the times of a reload with the text of the server, so the Drawer stays open with no enter', async () => {
		window.history.replaceState(null, '', '/2026/us/midterms?region=ga&office=senate')

		const seed = await readSeed('region=ga&office=senate')

		const tree = () =>
			h(QueryClientProvider, {
				client: new QueryClient(),
				children: h(ElectionRacesProvider, {
					races,
					children: h(ElectionDrawer, { election, seed }),
				}),
			})

		const container = document.body.appendChild(document.createElement('div'))

		container.innerHTML = renderToString(tree())

		const panel = container.querySelector('[data-slot="dialog"]')

		expect(panel?.querySelector('time')?.textContent).toBe('Nov 3, 2026, 7:00 PM EST')

		// The engine of a browser can write other text for the same format, such as
		// `at` between the day and the time. A time that the browser formats again in
		// the hydration render then differs from the HTML, and React renders the
		// Drawer again from the start, with its enter.
		const prototype: { format: unknown } = Intl.DateTimeFormat.prototype

		vi.spyOn(prototype, 'format', 'get').mockReturnValue(() => 'Nov 3, 2026 at 7:00 PM EST')

		const errors: unknown[] = []

		await act(async () => {
			hydrateRoot(container, tree(), { onRecoverableError: (error) => errors.push(error) })
		})

		vi.restoreAllMocks()

		expect(errors).toEqual([])

		expect(document.querySelector('[data-slot="dialog"] time')?.textContent).toBe(
			'Nov 3, 2026, 7:00 PM EST',
		)
	})
})
