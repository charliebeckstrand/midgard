// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { User } from 'auth'
import { Activity } from 'react'
import { writeCookie } from 'ui/core'
import { UIProvider } from 'ui/providers/ui'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { recordResult } from '../api/stats-api'
import { GameBoard } from '../components/game-board'
import { GameSettingsProvider } from '../components/game-settings'
import { useGameSetting } from '../hooks/use-game-setting'
import { createGame } from '../utilities/game'

const address = vi.hoisted(() => ({ pathname: '/charlie' }))

vi.mock('next/navigation', () => ({ usePathname: () => address.pathname }))

vi.mock('../api/stats-api', () => ({ readStats: vi.fn(), recordResult: vi.fn() }))

afterEach(cleanup)

/** Renders the board of the seed `charlie` at its address, with Auto-draw on by default, as the page does. */
function renderBoard(autoDraw = true, { seed = 'charlie' }: { seed?: string } = {}) {
	// The browser reads the setting from its cookie, and the server render from the provider.
	writeCookie('numbers-auto-draw', autoDraw ? 'on' : 'off')

	address.pathname = `/${seed}`

	return render(
		<QueryClientProvider client={new QueryClient()}>
			<UIProvider>
				<GameSettingsProvider
					settings={{ autoDraw, showScore: true, placementOrder: true, difficulty: 'normal' }}
				>
					<GameBoard seed={seed} />
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

	it('starts no run and counts no run when the reader left the run during the question', async () => {
		writeCookie('numbers-auto-draw', 'on')

		address.pathname = '/charlie'

		const user = { id: 'user-1', is_verified: true } as User

		const board = () => (
			<QueryClientProvider client={new QueryClient()}>
				<UIProvider>
					<GameSettingsProvider
						settings={{
							autoDraw: true,
							showScore: true,
							placementOrder: true,
							difficulty: 'normal',
						}}
					>
						<GameBoard seed="charlie" user={user} />
					</GameSettingsProvider>
				</UIProvider>
			</QueryClientProvider>
		)

		const view = render(board())

		fireEvent.click(screen.getByRole('button', { name: 'Slot 10' }))

		fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

		const dialog = await screen.findByRole('alertdialog')

		// Back while the question is open: the address changes, and the board follows it.
		window.history.replaceState(null, '', '/other')

		address.pathname = '/other'

		view.rerender(board())

		fireEvent.click(within(dialog).getByRole('button', { name: 'Reset' }))

		await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())

		// The run that the question named is gone, so the answer does nothing.
		expect(window.location.pathname).toBe('/other')
		expect(recordResult).not.toHaveBeenCalled()
	})

	it('counts no run when the reader went Back and Forward to the same address during the question', async () => {
		writeCookie('numbers-auto-draw', 'on')

		address.pathname = '/charlie'

		const user = { id: 'user-1', is_verified: true } as User

		const board = () => (
			<QueryClientProvider client={new QueryClient()}>
				<UIProvider>
					<GameSettingsProvider
						settings={{
							autoDraw: true,
							showScore: true,
							placementOrder: true,
							difficulty: 'normal',
						}}
					>
						<GameBoard seed="charlie" user={user} />
					</GameSettingsProvider>
				</UIProvider>
			</QueryClientProvider>
		)

		const view = render(board())

		fireEvent.click(screen.getByRole('button', { name: 'Slot 10' }))

		fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

		const dialog = await screen.findByRole('alertdialog')

		// Back, then Forward: the address comes back, and the board starts the run again.
		for (const pathname of ['/other', '/charlie']) {
			window.history.replaceState(null, '', pathname)

			address.pathname = pathname

			view.rerender(board())
		}

		fireEvent.click(within(dialog).getByRole('button', { name: 'Reset' }))

		await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())

		await act(async () => {})

		// The run that the question named is gone, so the answer does nothing.
		expect(window.location.pathname).toBe('/charlie')
		expect(recordResult).not.toHaveBeenCalled()
	})

	it('counts no run when Back went to another route during the question, and the board is held', async () => {
		writeCookie('numbers-auto-draw', 'on')

		address.pathname = '/charlie'

		const user = { id: 'user-1', is_verified: true } as User

		const page = (mode: 'visible' | 'hidden') => (
			<QueryClientProvider client={new QueryClient()}>
				<UIProvider>
					<GameSettingsProvider
						settings={{
							autoDraw: true,
							showScore: true,
							placementOrder: true,
							difficulty: 'normal',
						}}
					>
						<Activity mode={mode}>
							<GameBoard seed="charlie" user={user} />
						</Activity>
					</GameSettingsProvider>
				</UIProvider>
			</QueryClientProvider>
		)

		const view = render(page('visible'))

		fireEvent.click(screen.getByRole('button', { name: 'Slot 10' }))

		fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

		const dialog = await screen.findByRole('alertdialog')

		// Back to a page of the other mode: the board that asked is held, and its run stays.
		window.history.replaceState(null, '', '/vs/other')

		view.rerender(page('hidden'))

		fireEvent.click(within(dialog).getByRole('button', { name: 'Reset' }))

		await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())

		await act(async () => {})

		expect(window.location.pathname).toBe('/vs/other')
		expect(recordResult).not.toHaveBeenCalled()
	})

	it('starts a new seed from a date seed too, which is a seed as any other', () => {
		window.history.replaceState(null, '', '/20261101')

		renderBoard(true, { seed: '20261101' })

		fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

		expect(window.location.pathname).not.toBe('/20261101')
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

describe('GameBoard on a held route', () => {
	beforeEach(() => window.history.replaceState(null, '', '/charlie'))

	afterEach(() => vi.clearAllMocks())

	it('counts no left run when Auto-draw came on while the route was held', async () => {
		writeCookie('numbers-auto-draw', 'off')

		address.pathname = '/charlie'

		const user = { id: 'user-1', is_verified: true } as User

		let setAutoDraw: (value: boolean) => void = () => {}

		/** The Auto-draw switch of the other page, which stays on the screen. */
		function OtherPage() {
			setAutoDraw = useGameSetting('autoDraw')[1]

			return null
		}

		const page = (mode: 'visible' | 'hidden') => (
			<QueryClientProvider client={new QueryClient()}>
				<UIProvider>
					<GameSettingsProvider
						settings={{
							autoDraw: false,
							showScore: true,
							placementOrder: true,
							difficulty: 'normal',
						}}
					>
						{/* Cache Components holds the route that the reader leaves in an Activity. */}
						<Activity mode={mode}>
							<GameBoard seed="charlie" user={user} />
						</Activity>

						<OtherPage />
					</GameSettingsProvider>
				</UIProvider>
			</QueryClientProvider>
		)

		const view = render(page('visible'))

		fireEvent.click(screen.getByRole('button', { name: 'Draw' }))

		// The first number of `charlie` goes in Slot 1, so a smaller next number has no slot.
		fireEvent.click(screen.getByRole('button', { name: 'Slot 1' }))

		// The reader leaves, turns Auto-draw on on the other page, and goes Back.
		view.rerender(page('hidden'))

		act(() => setAutoDraw(true))

		view.rerender(page('visible'))

		// The write of a count starts in a microtask.
		await act(async () => {})

		// Back starts the run again from its start, and the left run does not count.
		expect(recordResult).not.toHaveBeenCalled()
		expect(screen.queryByRole('button', { name: /^Slot 1, / })).toBeNull()
	})

	it('starts a held run with no draw again when Auto-draw came on while the route was held', () => {
		writeCookie('numbers-auto-draw', 'off')

		address.pathname = '/charlie'

		let setAutoDraw: (value: boolean) => void = () => {}

		function OtherPage() {
			setAutoDraw = useGameSetting('autoDraw')[1]

			return null
		}

		const page = (mode: 'visible' | 'hidden') => (
			<QueryClientProvider client={new QueryClient()}>
				<UIProvider>
					<GameSettingsProvider
						settings={{
							autoDraw: false,
							showScore: true,
							placementOrder: true,
							difficulty: 'normal',
						}}
					>
						<Activity mode={mode}>
							<GameBoard seed="charlie" />
						</Activity>

						<OtherPage />
					</GameSettingsProvider>
				</UIProvider>
			</QueryClientProvider>
		)

		const view = render(page('visible'))

		view.rerender(page('hidden'))

		act(() => setAutoDraw(true))

		view.rerender(page('visible'))

		// With Auto-draw on, the bar has no Draw, so the run needs its first draw.
		expect(screen.queryByRole('button', { name: 'Draw' })).toBeNull()
		expect(
			screen
				.getAllByRole('button', { name: /^Slot \d+$/ })
				.some((slot) => !slot.hasAttribute('disabled')),
		).toBe(true)
	})
})

describe('GameBoard Auto-draw', () => {
	/** Renders the board with Auto-draw off, and gives the setter of the setting. */
	function renderWithSwitch() {
		writeCookie('numbers-auto-draw', 'off')

		address.pathname = '/charlie'

		const setter: { set: (value: boolean) => void } = { set: () => {} }

		function Switch() {
			setter.set = useGameSetting('autoDraw')[1]

			return null
		}

		render(
			<QueryClientProvider client={new QueryClient()}>
				<UIProvider>
					<GameSettingsProvider
						settings={{
							autoDraw: false,
							showScore: true,
							placementOrder: true,
							difficulty: 'normal',
						}}
					>
						<GameBoard seed="charlie" />

						<Switch />
					</GameSettingsProvider>
				</UIProvider>
			</QueryClientProvider>,
		)

		return setter
	}

	/** The settled number in the readout of the bar, which a screen reader hears. */
	const readout = () => document.querySelector('[data-slot="odometer-value"]')?.textContent

	const deck = createGame('charlie').deck

	it('draws when the setting comes on during a run, and not again when it goes off', () => {
		const setter = renderWithSwitch()

		expect(screen.getByRole('button', { name: 'Draw' })).toBeTruthy()

		act(() => setter.set(true))

		expect(screen.queryByRole('button', { name: 'Draw' })).toBeNull()
		expect(screen.getByRole('button', { name: 'Slot 1' }).hasAttribute('disabled')).toBe(false)

		act(() => setter.set(false))

		// The number still waits, so the bar shows Draw turned off.
		expect(screen.getByRole('button', { name: 'Draw' }).hasAttribute('disabled')).toBe(true)
		expect(readout()).toBe(String(deck[0]))
	})

	it('does not draw when the setting comes on while a number waits', () => {
		const setter = renderWithSwitch()

		fireEvent.click(screen.getByRole('button', { name: 'Draw' }))

		act(() => setter.set(true))

		expect(readout()).toBe(String(deck[0]))
	})
})
