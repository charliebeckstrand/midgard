// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { User } from 'auth'
import { UIProvider } from 'ui/providers/ui'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readBoard } from '../api/leaderboard-api'
import { NumbersMenu } from '../components/numbers-menu/numbers-menu'
import type { Route } from '../utilities/seed'

const { useStats } = vi.hoisted(() => ({
	useStats:
		vi.fn<
			(
				today: string,
				enabled: boolean,
			) => { data: { solo: { dailyScore: number | null } } | undefined }
		>(),
}))

vi.mock('../queries/stats-queries', () => ({ useStats }))

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

	useStats.mockReturnValue({ data: undefined })

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
	it('reads the stats of the daily puzzle for a verified reader before the menu opens', () => {
		renderMenu(makeUser(true))

		expect(useStats).toHaveBeenLastCalledWith('20261116', true)
	})

	it('lists the modes in order: Standard, Vs CPU, then Daily puzzle, with Leaderboard between two dividers', async () => {
		vi.mocked(readBoard).mockResolvedValue({ players: 0, entries: [] })

		renderMenu()

		fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

		const menu = (await screen.findAllByRole('menuitem'))[0]?.closest('[role="menu"]')

		const rows = [...(menu?.querySelectorAll('[role="menuitem"], hr') ?? [])].map((row) =>
			row.tagName === 'HR' ? '---' : row.textContent,
		)

		// A divider above and below Leaderboard sets it apart from the routes and the account.
		expect(rows).toEqual([
			'Standard',
			'Vs CPU',
			'Daily puzzle',
			'---',
			'Leaderboard',
			'---',
			'Sign in',
		])
	})

	it('reads the three boards of today when the menu opens, so the leaderboard opens with its rows', async () => {
		vi.mocked(readBoard).mockResolvedValue({ players: 0, entries: [] })

		renderMenu()

		expect(readBoard).not.toHaveBeenCalled()

		fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

		await waitFor(() => expect(readBoard).toHaveBeenCalledTimes(3))

		for (const mode of ['daily', 'solo', 'vsCpu'] as const) {
			expect(readBoard).toHaveBeenCalledWith('20261116', mode)
		}
	})

	it.each([
		['solo', 'Standard'],
		['vsCpu', 'Vs CPU'],
		['daily', 'Daily puzzle'],
	] as const)(
		'marks the item of the route %s as the current item, in bold',
		async (route, label) => {
			vi.mocked(readBoard).mockResolvedValue({ players: 0, entries: [] })

			renderMenu(undefined, route)

			fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

			// The test reads the rows that the query found, as the test of the order does.
			const items = await screen.findAllByRole('menuitem')

			for (const name of ['Standard', 'Vs CPU', 'Daily puzzle']) {
				const item = items.find((row) => row.textContent === name)

				const current = name === label

				expect(item?.getAttribute('aria-current')).toBe(current ? 'true' : null)
				expect(item?.classList.contains('font-extrabold')).toBe(current)
			}
		},
	)

	it('shows the score of the daily puzzle of today in a green badge after its first run counts', async () => {
		vi.mocked(readBoard).mockResolvedValue({ players: 0, entries: [] })

		useStats.mockReturnValue({ data: { solo: { dailyScore: 12 } } })

		renderMenu(makeUser(true))

		fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

		const items = await screen.findAllByRole('menuitem')

		const badge = items
			.find((row) => row.textContent?.startsWith('Daily puzzle'))
			?.querySelector('[data-slot="badge"]')

		expect(badge?.textContent).toBe('12/20')
	})

	it('reads no stats for a reader with no verified email, or with no session', () => {
		renderMenu(makeUser(false))

		renderMenu()

		expect(useStats).toHaveBeenCalled()

		expect(useStats.mock.calls.every(([, enabled]) => !enabled)).toBe(true)
	})
})
