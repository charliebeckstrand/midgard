// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { User } from 'auth'
import { UIProvider } from 'ui/providers/ui'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readBoard } from '../api/leaderboard-api'
import { readStats } from '../api/stats-api'
import { NumbersMenu } from '../components/numbers-menu/numbers-menu'
import { RunPreloadProvider } from '../components/run-preload'
import type { Route } from '../utilities/seed'

// The menu loads the Stats dialog and its bar chart in idle time (`useIdleLoad`).
// This import loads that module before the cases run. Thus a case waits for the
// dialog to open, not for the first transform of the module. On a slow machine,
// that transform took longer than the budget of `findByRole`.
import '../components/stats-dialog'

vi.mock('../api/stats-api', () => ({ readStats: vi.fn() }))

vi.mock('../api/leaderboard-api', () => ({ readBoard: vi.fn() }))

const push = vi.fn()

const prefetch = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, prefetch }) }))

/** A user, verified or not. */
const makeUser = (verified: boolean) => ({ id: 'user-1', is_verified: verified }) as User

/** Renders the closed menu with the providers of the app, on a page of `route`. */
function renderMenu(user?: User, route: Route = 'solo') {
	return render(
		<QueryClientProvider client={new QueryClient()}>
			<UIProvider>
				<NumbersMenu user={user} route={route} />
			</UIProvider>
		</QueryClientProvider>,
	)
}

beforeEach(() => {
	// jsdom has no `ResizeObserver`, and the open menu watches its parts with one.
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	)

	vi.mocked(readBoard).mockResolvedValue({ players: 0, entries: [] })

	vi.useFakeTimers({ toFake: ['Date'] })

	vi.setSystemTime(new Date(2026, 10, 16, 12))
})

afterEach(() => {
	cleanup()

	vi.useRealTimers()

	vi.unstubAllGlobals()

	vi.clearAllMocks()
})

describe('NumbersMenu', () => {
	it('lists the modes in order, Standard then Vs CPU, with Leaderboard between two dividers', async () => {
		renderMenu()

		fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

		const menu = (await screen.findAllByRole('menuitem'))[0]?.closest('[role="menu"]')

		const rows = [...(menu?.querySelectorAll('[role="menuitem"], hr') ?? [])].map((row) =>
			row.tagName === 'HR' ? '---' : row.textContent,
		)

		// A divider above and below Leaderboard sets it apart from the routes and the account.
		expect(rows).toEqual(['Standard', 'Vs CPU', '---', 'Leaderboard', '---', 'Sign in'])
	})

	it('reads the boards of today when the menu opens, so the leaderboard opens with its rows', async () => {
		renderMenu()

		expect(readBoard).not.toHaveBeenCalled()

		fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

		await waitFor(() => expect(readBoard).toHaveBeenCalledTimes(2))

		for (const mode of ['solo', 'vsCpu'] as const) {
			expect(readBoard).toHaveBeenCalledWith('20261116', mode)
		}
	})

	it.each([
		['solo', 'Standard'],
		['vsCpu', 'Vs CPU'],
	] as const)(
		'marks the item of the route %s as the current item, in bold',
		async (route, label) => {
			renderMenu(undefined, route)

			fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

			// The test reads the rows that the query found, as the test of the order does.
			const items = await screen.findAllByRole('menuitem')

			for (const name of ['Standard', 'Vs CPU']) {
				const item = items.find((row) => row.textContent === name)

				const current = name === label

				expect(item?.getAttribute('aria-current')).toBe(current ? 'true' : null)
				expect(item?.classList.contains('font-extrabold')).toBe(current)
			}
		},
	)

	it('reads the stats of a verified reader when the menu opens, so Stats opens with them', async () => {
		vi.mocked(readStats).mockResolvedValue({} as Awaited<ReturnType<typeof readStats>>)

		renderMenu(makeUser(true))

		expect(readStats).not.toHaveBeenCalled()

		fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

		await waitFor(() => expect(readStats).toHaveBeenCalledTimes(1))
	})

	it('opens Stats, whose code loads in idle time after the mount, for a signed-in reader', async () => {
		// The idle load runs at once here.
		vi.stubGlobal('requestIdleCallback', (call: () => void) => {
			call()

			return 0
		})

		const mode = { played: 1, wins: 0, best: 5, average: 5, scores: [], winRate: null }

		vi.mocked(readStats).mockResolvedValue({ solo: mode, vsCpu: mode })

		renderMenu(makeUser(true))

		fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

		fireEvent.click(await screen.findByRole('menuitem', { name: 'Stats' }))

		expect(await screen.findByRole('dialog', { name: 'Stats' })).toBeTruthy()
	})

	it.each([
		['with no verified email', makeUser(false)],
		['with no session', undefined],
	])('reads no stats for a reader %s', async (_, user) => {
		renderMenu(user)

		fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

		await waitFor(() => expect(readBoard).toHaveBeenCalledTimes(2))

		expect(readStats).not.toHaveBeenCalled()
	})

	it.each([
		['Standard', /^\/[a-z0-9]{6}$/],
		['Vs CPU', /^\/vs\/[a-z0-9]{6}$/],
	])(
		'goes from %s to the address of a new seed at once, with no redirect',
		async (name, address) => {
			renderMenu()

			fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

			const item = await screen.findByRole('menuitem', { name })

			// The click is not for the browser, so the link does not go to its own address.
			expect(fireEvent.click(item)).toBe(false)

			expect(push).toHaveBeenCalledTimes(1)
			expect(push.mock.calls[0]?.[0]).toMatch(address)
		},
	)

	it.each([
		['solo', 'Vs CPU'],
		['vsCpu', 'Standard'],
	] as const)('on the %s route, goes from %s to the preloaded seed', async (route, name) => {
		// The preload runs in idle time, here at once.
		vi.stubGlobal('requestIdleCallback', (call: () => void) => {
			call()

			return 0
		})

		render(
			<QueryClientProvider client={new QueryClient()}>
				<UIProvider>
					<RunPreloadProvider vsCpu={route === 'vsCpu'}>
						<NumbersMenu route={route} />
					</RunPreloadProvider>
				</UIProvider>
			</QueryClientProvider>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

		fireEvent.click(await screen.findByRole('menuitem', { name }))

		expect(push).toHaveBeenCalledWith(prefetch.mock.calls[0]?.[0])
	})

	it('leaves a click with a modifier to the browser, which opens the address of the item', async () => {
		renderMenu()

		fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

		const item = await screen.findByRole('menuitem', { name: 'Vs CPU' })

		expect(item.getAttribute('href')).toBe('/vs')

		// The listener runs after the handlers of React. It reads the click, then
		// stops the navigation, which jsdom does not implement.
		let forBrowser = false

		window.addEventListener(
			'click',
			(event) => {
				forBrowser = !event.defaultPrevented

				event.preventDefault()
			},
			{ once: true },
		)

		fireEvent.click(item, { metaKey: true })

		expect(forBrowser).toBe(true)

		expect(push).not.toHaveBeenCalled()
	})
})
