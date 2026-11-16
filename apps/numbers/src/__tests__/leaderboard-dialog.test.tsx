// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { User } from 'auth'
import { UIProvider } from 'ui/providers/ui'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type Board, readBoard } from '../api/leaderboard-api'
import { LeaderboardDialog } from '../components/leaderboard-dialog'

vi.mock('../api/leaderboard-api', () => ({
	readBoard: vi.fn(),
}))

/** A user, verified or not, with the name of their account. */
const makeUser = (verified: boolean, name: string | null = 'Grace') =>
	({ id: 'user-1', name, is_verified: verified }) as User

/** A board of `players` players with `entries`. */
const board = (players: number, entries: Board['entries']): Board => ({ players, entries })

/** Renders the open dialog with the providers of the app. */
function renderDialog(user?: User) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

	return render(
		<QueryClientProvider client={client}>
			<UIProvider>
				<LeaderboardDialog open onOpenChange={() => {}} user={user} />
			</UIProvider>
		</QueryClientProvider>,
	)
}

beforeEach(() => {
	// jsdom has no `ResizeObserver`, and the Segment and the dialog watch their parts with one.
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	)

	vi.useFakeTimers({ toFake: ['Date'] })

	vi.setSystemTime(new Date(2026, 10, 16, 12))
})

afterEach(() => {
	cleanup()

	vi.useRealTimers()

	vi.unstubAllGlobals()

	vi.resetAllMocks()
})

describe('LeaderboardDialog', () => {
	it('shows the board of today, with equal scores sharing a rank and the reader marked', async () => {
		vi.mocked(readBoard).mockResolvedValue(
			board(3, [
				{ rank: 1, name: 'Ada', score: 15, you: false },
				{ rank: 2, name: null, score: 12, you: false },
				{ rank: 2, name: 'Grace', score: 12, you: true },
			]),
		)

		renderDialog(makeUser(true))

		await screen.findByText('Ada')

		const rows = screen.getAllByRole('row')

		expect(readBoard).toHaveBeenCalledWith('20261116', 'daily')

		expect(rows.slice(1).map((row) => row.textContent)).toEqual([
			'1Ada15 / 20',
			'2Anonymous12 / 20',
			'2GraceYou12 / 20',
		])

		expect(rows[3]?.getAttribute('aria-current')).toBe('true')

		expect(screen.getByText('3 players')).toBeTruthy()
	})

	it('reads the board of an earlier day, and goes no later than today', async () => {
		vi.mocked(readBoard).mockResolvedValue(board(0, []))

		renderDialog(makeUser(true))

		const later = screen.getByRole('button', { name: 'Later day' })

		expect(later.hasAttribute('disabled')).toBe(true)

		expect(await screen.findByText('No one is on this board yet.')).toBeTruthy()

		fireEvent.click(screen.getByRole('button', { name: 'Earlier day' }))

		await waitFor(() => expect(readBoard).toHaveBeenCalledWith('20261115', 'daily'))

		expect(screen.queryByText('Today')).toBeNull()
	})

	it('reads the three boards of the day, in the order of the menu, and shows the board of each tab', async () => {
		vi.mocked(readBoard).mockImplementation(async (_date, mode) =>
			board(1, [{ rank: 1, name: `Top ${mode}`, score: 12, you: false }]),
		)

		renderDialog(makeUser(true))

		await screen.findByText('Top daily')

		expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
			'Solo',
			'Daily',
			'Vs CPU',
		])

		expect(screen.getByRole('tab', { name: 'Daily' }).getAttribute('aria-selected')).toBe('true')

		for (const mode of ['daily', 'solo', 'vsCpu'] as const) {
			expect(readBoard).toHaveBeenCalledWith('20261116', mode)
		}

		fireEvent.click(screen.getByRole('tab', { name: 'Solo' }))

		expect(await screen.findByText('Top solo')).toBeTruthy()

		fireEvent.click(screen.getByRole('tab', { name: 'Vs CPU' }))

		expect(await screen.findByText('Top vsCpu')).toBeTruthy()
	})

	it('keeps the rows of the last day, dimmed, until the rows of the new day arrive', async () => {
		// The answers for the earlier day, by board, held until the test lets them arrive.
		const arrive = new Map<string, (value: Board) => void>()

		vi.mocked(readBoard).mockImplementation((date, mode) =>
			date === '20261116'
				? Promise.resolve(board(1, [{ rank: 1, name: 'Ada', score: 15, you: false }]))
				: new Promise((resolve) => {
						arrive.set(mode, resolve)
					}),
		)

		renderDialog(makeUser(true))

		await screen.findByText('Ada')

		fireEvent.click(screen.getByRole('button', { name: 'Earlier day' }))

		const table = await screen.findByRole('table')

		await waitFor(() => expect(table.closest('[aria-busy="true"]')).toBeTruthy())

		expect(within(table).getByText('Ada')).toBeTruthy()

		arrive.get('daily')?.(board(1, [{ rank: 1, name: 'Grace', score: 9, you: false }]))

		expect(await within(table).findByText('Grace')).toBeTruthy()

		expect(table.closest('[aria-busy="true"]')).toBeNull()
	})

	it('tells a verified reader with no account name that they show as anonymous', async () => {
		vi.mocked(readBoard).mockResolvedValue(board(0, []))

		const { unmount } = renderDialog(makeUser(true, null))

		expect(
			await screen.findByText(/no name, so the leaderboard shows you as Anonymous/),
		).toBeTruthy()

		unmount()

		renderDialog(makeUser(true))

		await screen.findByText('No one is on this board yet.')

		expect(screen.queryByText(/shows you as Anonymous/)).toBeNull()
	})

	it('shows the board to a reader with no verified email, and asks for the verification', async () => {
		vi.mocked(readBoard).mockResolvedValue(
			board(1, [{ rank: 1, name: 'Ada', score: 15, you: false }]),
		)

		renderDialog(makeUser(false))

		const table = await screen.findByRole('table')

		expect(await within(table).findByText('Ada')).toBeTruthy()

		expect(screen.getByText(/Verify your email to be on the leaderboard/)).toBeTruthy()
	})

	it('shows the board to a reader with no session, and asks them to sign in', async () => {
		vi.mocked(readBoard).mockResolvedValue(
			board(1, [{ rank: 1, name: 'Ada', score: 15, you: false }]),
		)

		renderDialog()

		const table = await screen.findByRole('table')

		expect(await within(table).findByText('Ada')).toBeTruthy()

		expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/login')
	})
})
