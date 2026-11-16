// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render } from '@testing-library/react'
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
