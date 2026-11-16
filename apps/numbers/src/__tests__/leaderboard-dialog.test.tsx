// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { User } from 'auth'
import { UIProvider } from 'ui/providers/ui'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type Board, readBoard, readPlayer, savePlayer } from '../api/leaderboard-api'
import { LeaderboardDialog } from '../components/leaderboard-dialog'

vi.mock('../api/leaderboard-api', () => ({
	readBoard: vi.fn(),
	readPlayer: vi.fn(),
	savePlayer: vi.fn(),
}))

/** A user, verified or not. */
const makeUser = (verified: boolean) => ({ id: 'user-1', is_verified: verified }) as User

/** A board of `players` players with `entries`. */
const board = (players: number, entries: Board['entries']): Board => ({ players, entries })

/** Renders the open dialog with the providers of the app. */
function renderDialog(user: User) {
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

	vi.mocked(readPlayer).mockResolvedValue({ name: null })
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

		expect(readBoard).toHaveBeenCalledWith('20261116', 'solo')

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

		expect(await screen.findByText('No one has played this puzzle yet.')).toBeTruthy()

		fireEvent.click(screen.getByRole('button', { name: 'Earlier day' }))

		await waitFor(() => expect(readBoard).toHaveBeenCalledWith('20261115', 'solo'))

		expect(screen.queryByText('Today')).toBeNull()
	})

	it('reads the board of the Vs CPU mode', async () => {
		vi.mocked(readBoard).mockResolvedValue(board(0, []))

		renderDialog(makeUser(true))

		fireEvent.click(screen.getByRole('tab', { name: 'Vs CPU' }))

		await waitFor(() => expect(readBoard).toHaveBeenCalledWith('20261116', 'vsCpu'))
	})

	it('saves the leaderboard name, and an empty name as anonymous', async () => {
		vi.mocked(readBoard).mockResolvedValue(board(0, []))

		vi.mocked(readPlayer).mockResolvedValue({ name: 'Ada' })

		vi.mocked(savePlayer).mockImplementation(async (player) => player)

		renderDialog(makeUser(true))

		const field = await screen.findByLabelText('Leaderboard name')

		expect((field as HTMLInputElement).value).toBe('Ada')

		fireEvent.change(field, { target: { value: '  Grace  ' } })

		fireEvent.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => expect(vi.mocked(savePlayer).mock.lastCall?.[0]).toEqual({ name: 'Grace' }))

		fireEvent.change(field, { target: { value: ' ' } })

		fireEvent.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => expect(vi.mocked(savePlayer).mock.lastCall?.[0]).toEqual({ name: null }))
	})

	it('shows the board to a reader with no verified email, with no name field', async () => {
		vi.mocked(readBoard).mockResolvedValue(
			board(1, [{ rank: 1, name: 'Ada', score: 15, you: false }]),
		)

		renderDialog(makeUser(false))

		const table = await screen.findByRole('table')

		expect(await within(table).findByText('Ada')).toBeTruthy()

		expect(screen.getByText(/Verify your email to be on the leaderboard/)).toBeTruthy()

		expect(screen.queryByLabelText('Leaderboard name')).toBeNull()

		expect(readPlayer).not.toHaveBeenCalled()
	})
})
