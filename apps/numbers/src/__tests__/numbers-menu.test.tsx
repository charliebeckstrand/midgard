// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { User } from 'auth'
import { UIProvider } from 'ui/providers/ui'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readBoard } from '../api/leaderboard-api'
import { readStats } from '../api/stats-api'
import { NumbersMenu } from '../components/numbers-menu/numbers-menu'
import type { Route } from '../utilities/seed'

vi.mock('../api/stats-api', () => ({ readStats: vi.fn() }))

vi.mock('../api/leaderboard-api', () => ({ readBoard: vi.fn() }))

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

	it.each([
		['with no verified email', makeUser(false)],
		['with no session', undefined],
	])('reads no stats for a reader %s', async (_, user) => {
		renderMenu(user)

		fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

		await waitFor(() => expect(readBoard).toHaveBeenCalledTimes(2))

		expect(readStats).not.toHaveBeenCalled()
	})
})
