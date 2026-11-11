// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement as h } from 'react'
import { seed } from 'shared/queries'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ElectionDrawer } from '../components/election-drawer'
import { ElectionRacesProvider } from '../components/election-drawer/context'
import { type Election, findContest, findElection } from '../elections/registry'
import { useDrawerArrived } from '../hooks/use-drawer'
import { readNationalRace, readRace } from '../server/civic-race'
import { atlasCountyNames } from '../server/county-names'
import { readEntries } from '../utilities/results'
import gaSenate from './fixtures/ga-senate.json'
import house from './fixtures/house.json'
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

const houseContest = findContest(midterms, 'house')

if (houseContest === undefined) throw new Error('The registry has no 2026 House.')

const races = [
	{ contest, entries: readEntries(contest, readNationalRace(87528, senate)) },
	{ contest: houseContest, entries: readEntries(houseContest, readNationalRace(87524, house)) },
]

/** The Georgia Senate race, as the page seeds it. */
const georgia = seed(readRace(87087, gaSenate, '13', atlasCountyNames))

/** The Drawer of a page, which reads its step from the address. */
function drawer(client: QueryClient, raceSeed: typeof georgia | null = georgia) {
	return h(QueryClientProvider, {
		client,
		children: h(ElectionRacesProvider, {
			races,
			children: h(ElectionDrawer, { election, seed: raceSeed }),
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

	it('shows a county in detail, and holds the layout across counties', () => {
		const county = (fips: string) => `/2026/us/midterms?region=ga&office=senate&county=${fips}`

		window.history.replaceState(null, '', county('13001'))

		const client = new QueryClient()

		const view = render(drawer(client))

		const selected = (name: string) =>
			screen.getByRole('tab', { name }).getAttribute('aria-selected')

		// Detailed shows the party of each candidate, as the overview of the race does.
		expect(selected('Detailed')).toBe('true')
		expect(screen.getByText('Republican')).toBeTruthy()

		fireEvent.click(screen.getByRole('tab', { name: 'Condensed' }))

		expect(screen.queryByText('Republican')).toBeNull()

		act(() => {
			window.history.pushState(null, '', county('13003'))

			view.rerender(drawer(client))
		})

		expect(selected('Condensed')).toBe('true')
	})

	it('gives each crumb that leads back the address of its step', () => {
		window.history.replaceState(null, '', '/2026/us/midterms?region=ga&office=senate&county=13001')

		render(drawer(new QueryClient()))

		const href = (name: string) => screen.getByRole('link', { name }).getAttribute('href')

		// A new tab or a copied link opens the step of the crumb, not the county.
		expect(href('Georgia')).toBe('/2026/us/midterms?region=ga')
		expect(href('Senate')).toBe('/2026/us/midterms?region=ga&office=senate')
	})

	it('gives the last crumb no link when the race has no county of the address', () => {
		window.history.replaceState(null, '', '/2026/us/midterms?region=ga&office=senate&county=99999')

		render(drawer(new QueryClient()))

		expect(screen.getByRole('link', { name: 'Georgia' })).toBeTruthy()

		expect(screen.queryByRole('link', { name: 'Senate' })).toBeNull()
	})

	it('tells a screen reader when the district search matches nothing', () => {
		window.history.replaceState(null, '', '/2026/us/midterms?region=ga&office=house')

		render(drawer(new QueryClient()))

		// The status is in the page before its text, so a screen reader reads the text when it comes.
		const status = screen.getByRole('status')

		expect(status.textContent).toBe('')

		fireEvent.change(screen.getByRole('searchbox', { name: 'Search districts and candidates' }), {
			target: { value: 'zzzz' },
		})

		expect(screen.getByRole('status').textContent).toBe('No district matches.')
	})

	it('keeps the rows of a race when the race loads', () => {
		window.history.replaceState(null, '', '/2026/us/midterms?region=ga&office=senate')

		/** The terms of the facts, and the lines of the head: the title and the trail. */
		const shape = () => ({
			terms: Array.from(document.querySelectorAll('dt'), (term) => term.textContent),
			head: screen.getByRole('navigation').parentElement?.childElementCount,
		})

		// The race of a click is not seeded, so it loads in the Drawer.
		const loading = render(drawer(new QueryClient(), null))

		const before = shape()

		loading.unmount()

		// civicAPI called Georgia, but gives no time of the call.
		expect(georgia.data.calledAt).toBeNull()

		render(drawer(new QueryClient()))

		expect(shape()).toEqual(before)
		expect(before.terms).toEqual(['Total votes', 'Polls closed', 'Called'])
		expect(screen.getByText('Unknown')).toBeTruthy()
		// A general election has no line of its kind.
		expect(screen.queryByText('General election')).toBeNull()
	})

	it('tells the page that the panel is up only once it arrives', async () => {
		window.history.replaceState(null, '', '/2026/us/midterms')

		const client = new QueryClient()

		/** Shows whether the panel is up, as the ring of the map reads it. */
		function Probe() {
			return h('output', { 'data-testid': 'arrived' }, String(useDrawerArrived()))
		}

		const page = () => h('div', null, drawer(client), h(Probe))

		const view = render(page())

		const arrived = () => screen.getByTestId('arrived').textContent

		// A closed Drawer is not up, so the next open waits for its arrival.
		expect(arrived()).toBe('false')

		act(() => {
			window.history.pushState(null, '', '/2026/us/midterms?region=ga&office=senate')

			view.rerender(page())
		})

		// The commit that opens the panel does not mark it up.
		expect(screen.getByRole('dialog')).toBeTruthy()
		expect(arrived()).toBe('false')

		await waitFor(() => expect(arrived()).toBe('true'))

		act(() => {
			window.history.pushState(null, '', '/2026/us/midterms')

			view.rerender(page())
		})

		expect(arrived()).toBe('false')
	})
})
