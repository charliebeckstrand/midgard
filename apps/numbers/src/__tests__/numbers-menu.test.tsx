// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { User } from 'auth'
import { UIProvider } from 'ui/providers/ui'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readBoard } from '../api/leaderboard-api'
import { NumbersMenu } from '../components/numbers-menu/numbers-menu'

const { useStats } = vi.hoisted(() => ({
	useStats: vi.fn<(today: string, enabled: boolean) => { data: undefined }>(),
}))

vi.mock('../queries/stats-queries', () => ({ useStats }))

vi.mock('../api/leaderboard-api', () => ({ readBoard: vi.fn() }))

/** A user, verified or not. */
const makeUser = (verified: boolean) => ({ id: 'user-1', is_verified: verified }) as User

/** Renders the closed menu with the providers of the app. */
function renderMenu(user?: User) {
	return render(
		<QueryClientProvider client={new QueryClient()}>
			<UIProvider>
				<NumbersMenu user={user} />
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

	it('reads no stats for a reader with no verified email, or with no session', () => {
		renderMenu(makeUser(false))

		renderMenu()

		expect(useStats).toHaveBeenCalled()

		expect(useStats.mock.calls.every(([, enabled]) => !enabled)).toBe(true)
	})
})
