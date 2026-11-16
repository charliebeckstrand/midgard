// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { User } from 'auth'
import { writeCookie } from 'ui/core'
import { UIProvider } from 'ui/providers/ui'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NumbersStats } from '../api/stats-api'
import { GameBoard } from '../components/game-board'
import { GameSettingsProvider } from '../components/game-settings'
import { createGame } from '../utilities/game'
import { dailySeed } from '../utilities/seed'

const address = vi.hoisted(() => ({ pathname: '/charlie' }))

vi.mock('next/navigation', () => ({ usePathname: () => address.pathname }))

afterEach(cleanup)

/** Renders the board of the seed `charlie` at its address, with Auto-draw on by default, as the page does. */
function renderBoard(
	autoDraw = true,
	{
		seed = 'charlie',
		client = new QueryClient(),
		user,
	}: { seed?: string; client?: QueryClient; user?: User } = {},
) {
	// The browser reads the setting from its cookie, and the server render from the provider.
	writeCookie('numbers-auto-draw', autoDraw ? 'on' : 'off')

	address.pathname = `/${seed}`

	return render(
		<QueryClientProvider client={client}>
			<UIProvider>
				<GameSettingsProvider settings={{ autoDraw, showScore: true, difficulty: 'normal' }}>
					<GameBoard seed={seed} user={user} />
				</GameSettingsProvider>
			</UIProvider>
		</QueryClientProvider>,
	)
}

describe('GameBoard', () => {
	it('keeps the run of the page at the mount, so the readout shows the first number with no roll from 0', () => {
		const { container } = renderBoard()

		const first = String(createGame('charlie').deck[0])

		expect(container.querySelector('[data-slot="odometer-display"]')?.textContent).toBe(first)
	})
})

describe('GameBoard daily notice', () => {
	/** A client whose cache holds the stats of today, with a saved daily score of 12, as after the header menu read them. */
	const cachedStats = (today: string) => {
		const client = new QueryClient()

		const mode = {
			played: 1,
			wins: 0,
			best: 12,
			average: 12,
			scores: [],
			streak: 1,
			bestStreak: 1,
			dailyScore: 12,
		}

		client.setQueryData<NumbersStats>(['numbers-stats', today], { solo: mode, vsCpu: mode })

		return client
	}

	it('shows an alert at the top on a replay of the daily puzzle, which closes and gives the focus to Reset', () => {
		const today = dailySeed(new Date())

		const { container } = renderBoard(true, {
			seed: today,
			client: cachedStats(today),
			user: { id: 'user-1', is_verified: true } as User,
		})

		// The announcer adds live regions of its own, so the query names the slot.
		const alert = container.querySelector<HTMLElement>('[data-slot="alert"]')

		if (!alert) throw new Error('The board has no alert.')

		expect(alert.getAttribute('role')).toBe('status')

		// The alert has no icon: its only icon is the X of the close button.
		expect(alert.querySelectorAll('svg')).toHaveLength(1)

		expect(alert.textContent).toContain("You already played today's puzzle")
		expect(alert.textContent).toContain(
			"Your score of 12 / 20 is saved. This replay won't change your streak.",
		)

		// The alert comes before the bar of the drawn number.
		const reset = screen.getByRole('button', { name: 'Reset' })

		expect(alert.compareDocumentPosition(reset) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

		fireEvent.click(within(alert).getByRole('button', { name: 'Close' }))

		expect(container.querySelector('[data-slot="alert"]')).toBeNull()
		expect(document.activeElement).toBe(reset)
	})
})

describe('GameBoard Reset', () => {
	beforeEach(() => window.history.replaceState(null, '', '/charlie'))

	it('starts a new run at once while no number is placed', () => {
		renderBoard()

		fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

		expect(window.location.pathname).not.toBe('/charlie')
		expect(screen.queryByRole('alertdialog')).toBeNull()
	})

	it('asks to confirm while the run goes on with a placed number, and keeps the run on Cancel', async () => {
		renderBoard()

		fireEvent.click(screen.getByRole('button', { name: 'Slot 10' }))

		fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

		const dialog = await screen.findByRole('alertdialog')

		fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

		await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())

		expect(window.location.pathname).toBe('/charlie')
		expect(screen.getByRole('button', { name: /^Slot 10, / })).toBeTruthy()
	})

	it('starts a new run when the reader confirms', async () => {
		renderBoard()

		fireEvent.click(screen.getByRole('button', { name: 'Slot 10' }))

		fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

		const dialog = await screen.findByRole('alertdialog')

		fireEvent.click(within(dialog).getByRole('button', { name: 'Reset' }))

		await waitFor(() => expect(window.location.pathname).not.toBe('/charlie'))

		expect(screen.queryByRole('button', { name: /^Slot 10, / })).toBeNull()
	})

	it('gives the focus to Reset when a pressed Draw ends the run, because the bar then has no Draw', () => {
		// jsdom has no `scrollIntoView`, and the bust mark scrolls into view.
		Element.prototype.scrollIntoView = vi.fn()

		renderBoard(false)

		/** Focuses `button` and presses it, as a key press does. */
		const press = (button: HTMLElement) => {
			button.focus()

			fireEvent.click(button, { detail: 0 })
		}

		// Each number goes in the first slot that can take it, so the slots fill
		// from the top, and a later number that is smaller has no slot.
		for (let turn = 0; turn < 20; turn++) {
			const draw = screen.queryByRole('button', { name: 'Draw' })

			if (!draw) break

			press(draw)

			const slot = screen
				.queryAllByRole('button', { name: /^Slot \d+$/ })
				.find((button) => !(button as HTMLButtonElement).disabled)

			if (!slot) break

			press(slot)
		}

		expect(screen.queryByRole('button', { name: 'Draw' })).toBeNull()
		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Reset' }))
	})
})
