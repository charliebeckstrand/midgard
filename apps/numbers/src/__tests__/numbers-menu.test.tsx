// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render } from '@testing-library/react'
import type { User } from 'auth'
import { UIProvider } from 'ui/providers/ui'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NumbersMenu } from '../components/numbers-menu/numbers-menu'

const { useStats } = vi.hoisted(() => ({
	useStats: vi.fn<(today: string, enabled: boolean) => { data: undefined }>(),
}))

vi.mock('../queries/stats-queries', () => ({ useStats }))

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
	useStats.mockReturnValue({ data: undefined })

	vi.useFakeTimers({ toFake: ['Date'] })

	vi.setSystemTime(new Date(2026, 10, 16, 12))
})

afterEach(() => {
	cleanup()

	vi.useRealTimers()

	vi.clearAllMocks()
})

describe('NumbersMenu', () => {
	it('reads the stats of the daily puzzle for a verified reader before the menu opens', () => {
		renderMenu(makeUser(true))

		expect(useStats).toHaveBeenLastCalledWith('20261116', true)
	})

	it('reads no stats for a reader with no verified email, or with no session', () => {
		renderMenu(makeUser(false))

		renderMenu()

		expect(useStats).toHaveBeenCalled()

		expect(useStats.mock.calls.every(([, enabled]) => !enabled)).toBe(true)
	})
})
