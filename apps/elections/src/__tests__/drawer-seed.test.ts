// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCountyShapes } from '../api/county-api'
import { ElectionDrawer } from '../components/election-drawer'
import { ElectionRacesProvider } from '../components/election-drawer/context'
import { loadCountyMap } from '../components/race-detail/load-county-map'
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
		const map = await readSeed('region=ga&office=senate&view=counties')

		expect(map?.race.data.id).toBe(87087)
		expect(map?.shapes?.features.length).toBe(159)

		expect((await readSeed('region=ga&office=senate'))?.shapes).toBeNull()

		// A county shows the race in that county, and no map.
		expect(
			(await readSeed('region=ga&office=senate&view=counties&county=13121'))?.shapes,
		).toBeNull()

		expect(await readSeed('region=ga')).toBeNull()
	})
})

describe('ElectionDrawer', () => {
	it('draws the map of a reload on the map from the seed, with no read of the shapes', async () => {
		window.history.replaceState(null, '', '/2026/us/midterms?region=ga&office=senate&view=counties')

		const seed = await readSeed('region=ga&office=senate&view=counties')

		// The chunk of the map loads first. The lazy map then mounts within the act,
		// with no wait on a timer.
		await loadCountyMap()

		await act(async () => {
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
})
