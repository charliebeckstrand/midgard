// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { UIProvider } from 'ui/providers/ui'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GameBoard } from '../components/game-board'
import { GameSettingsProvider } from '../components/game-settings'
import { createGame } from '../utilities/game'

vi.mock('next/navigation', () => ({ usePathname: () => '/charlie' }))

beforeEach(() => {
	// jsdom has no `ResizeObserver`, and the toolbar watches its parts with one.
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	)
})

afterEach(() => {
	cleanup()

	vi.unstubAllGlobals()
})

/** Renders the board of the seed `charlie` at its address, with Auto-draw on, as the page does. */
function renderBoard() {
	return render(
		<QueryClientProvider client={new QueryClient()}>
			<UIProvider>
				<GameSettingsProvider settings={{ autoDraw: true, showScore: true, difficulty: 'normal' }}>
					<GameBoard seed="charlie" />
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
})
