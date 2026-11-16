// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { User } from 'auth'
import type { ReactNode } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { seed as withReadTime } from 'shared/queries'
import { writeCookie } from 'ui/core'
import { UIProvider } from 'ui/providers/ui'
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
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
			winRate: null,
		}

		client.setQueryData<NumbersStats>(['numbers-stats', today], { solo: mode, vsCpu: mode })

		return client
	}

	it('shows an alert at the top on a replay of the daily puzzle, which closes and gives the focus to the next control', () => {
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
		expect(alert.textContent).toContain("Replays don't change your score.")

		// The alert comes before the slots. Auto-draw drew a number, so the first
		// slot that can take it is the next control.
		const slot = screen
			.getAllByRole('button', { name: /^Slot / })
			.find((button) => !button.hasAttribute('disabled'))

		if (!slot) throw new Error('The board has no open slot.')

		expect(alert.compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

		fireEvent.click(within(alert).getByRole('button', { name: 'Close' }))

		expect(container.querySelector('[data-slot="alert"]')).toBeNull()
		expect(document.activeElement).toBe(slot)
	})
})

describe('GameBoard daily notice from the server', () => {
	const mode = {
		played: 1,
		wins: 0,
		best: 12,
		average: 12,
		scores: [],
		streak: 1,
		bestStreak: 1,
		dailyScore: 12,
		winRate: null,
	}

	const user = { id: 'user-1', is_verified: true } as User

	/** The board of the daily puzzle of `today` with the stats that the server read, in a new cache, as on a load. */
	const tree = (today: string): ReactNode => (
		<QueryClientProvider client={new QueryClient()}>
			<UIProvider>
				<GameSettingsProvider settings={{ autoDraw: true, showScore: true, difficulty: 'normal' }}>
					<GameBoard
						seed={today}
						user={user}
						stats={{ today, stats: withReadTime({ solo: mode, vsCpu: mode }) }}
					/>
				</GameSettingsProvider>
			</UIProvider>
		</QueryClientProvider>
	)

	it('has the alert in the markup of the server, and keeps it through the hydration', async () => {
		const today = dailySeed(new Date())

		writeCookie('numbers-auto-draw', 'on')

		address.pathname = `/${today}`

		const container = document.body.appendChild(document.createElement('div'))

		let root: Root | undefined

		// Testing Library unmounts only the roots that its own `render` made.
		onTestFinished(() => {
			act(() => root?.unmount())

			container.remove()
		})

		container.innerHTML = renderToString(tree(today))

		const served = container.querySelector('[data-slot="alert"]')

		expect(served?.textContent).toContain("You already played today's puzzle")

		const errors: unknown[] = []

		await act(async () => {
			root = hydrateRoot(container, tree(today), {
				onRecoverableError: (error) => errors.push(error),
			})
		})

		expect(errors).toEqual([])

		// The hydration keeps the alert of the server, and the browser has the same day.
		expect(container.querySelector('[data-slot="alert"]')).toBe(served)
	})

	it('closes the alert after the hydration when the day of the browser is another day', async () => {
		const today = dailySeed(new Date())

		// The server read the stats of the day before, for the seed of the page.
		const yesterday = dailySeed(new Date(Date.now() - 24 * 60 * 60 * 1000))

		address.pathname = `/${yesterday}`

		const container = document.body.appendChild(document.createElement('div'))

		let root: Root | undefined

		onTestFinished(() => {
			act(() => root?.unmount())

			container.remove()
		})

		container.innerHTML = renderToString(tree(yesterday))

		expect(container.querySelector('[data-slot="alert"]')).not.toBeNull()

		const errors: unknown[] = []

		await act(async () => {
			root = hydrateRoot(container, tree(yesterday), {
				onRecoverableError: (error) => errors.push(error),
			})
		})

		expect(errors).toEqual([])

		expect(today).not.toBe(yesterday)
		expect(container.querySelector('[data-slot="alert"]')).toBeNull()
	})
})

describe('GameBoard Reset', () => {
	beforeEach(() => window.history.replaceState(null, '', '/charlie'))

	it('has no Reset on a daily puzzle, of today or of another day, because a new seed is not the daily', () => {
		renderBoard(true, { seed: dailySeed(new Date()) })

		expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull()

		cleanup()

		renderBoard(true, { seed: '20261101' })

		expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull()
	})

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

	/** Plays the run with key presses until it ends: each number goes in the first slot that can take it. */
	const playToEnd = () => {
		/** Focuses `button` and presses it, as a key press does. */
		const press = (button: HTMLElement) => {
			button.focus()

			fireEvent.click(button, { detail: 0 })
		}

		// The slots fill from the top, so a later number that is smaller has no slot.
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
	}

	it('gives the focus to Reset when a pressed Draw ends the run, because the bar then has no Draw', () => {
		// jsdom has no `scrollIntoView`, and the bust mark scrolls into view.
		Element.prototype.scrollIntoView = vi.fn()

		renderBoard(false)

		playToEnd()

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Reset' }))
	})

	it('gives the focus to Share when a daily puzzle ends, because the board has no Reset', () => {
		Element.prototype.scrollIntoView = vi.fn()

		renderBoard(false, { seed: '20261101' })

		playToEnd()

		expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Share' }))
	})
})
