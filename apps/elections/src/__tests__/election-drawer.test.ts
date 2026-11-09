// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { seed } from 'shared/queries'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ElectionDrawer } from '../components/election-drawer'
import { ElectionRacesProvider } from '../components/election-drawer/context'
import { type Election, findContest, findElection } from '../elections/registry'
import { readNationalRace, readRace } from '../server/civic-race'
import { atlasCountyNames } from '../server/county-names'
import { readEntries } from '../utilities/results'
import gaSenate from './fixtures/ga-senate.json'
import senate from './fixtures/senate.json'

vi.mock('next/navigation', () => ({
	usePathname: () => window.location.pathname,
	useSearchParams: () => new URLSearchParams(window.location.search),
}))

vi.mock('../api/race-api', () => ({ fetchRace: vi.fn(() => new Promise(() => {})) }))

vi.mock('../api/county-api', () => ({ fetchCountyShapes: vi.fn(() => new Promise(() => {})) }))

vi.mock('../components/race-detail/load-county-map', () => ({
	loadCountyMap: () => new Promise(() => {}),
}))

afterEach(cleanup)

// jsdom has no `ResizeObserver` and no layout, and the panel and the trail measure themselves.
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

/** The Georgia Senate race, as the page seeds it. */
const georgia = seed(readRace(87087, gaSenate, '13', atlasCountyNames))

/** The Drawer of a page, which reads its step from the address. */
function drawer(client: QueryClient) {
	return h(QueryClientProvider, {
		client,
		children: h(ElectionRacesProvider, {
			races,
			children: h(ElectionDrawer, { election, seed: georgia }),
		}),
	})
}

describe('ElectionDrawer', () => {
	it('opens a race on its overview again after the Drawer leaves the race', () => {
		const race = '/2026/us/midterms?region=ga&office=senate'

		window.history.replaceState(null, '', race)

		const client = new QueryClient()

		const view = render(drawer(client))

		/** Moves the address, as Back or a pick does, and renders the page again. */
		const goTo = (address: string) =>
			act(() => {
				window.history.pushState(null, '', address)

				view.rerender(drawer(client))
			})

		const selected = (name: string) =>
			screen.getByRole('tab', { name }).getAttribute('aria-selected')

		fireEvent.click(screen.getByRole('tab', { name: 'By county' }))

		expect(selected('By county')).toBe('true')

		goTo('/2026/us/midterms?region=ga')

		goTo(race)

		expect(selected('Overview')).toBe('true')
	})
})
