// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { createElement as h, type ReactNode } from 'react'
import { UIProvider } from 'ui/providers/ui'
import { afterEach, describe, expect, it } from 'vitest'
import { GameBoardFooter } from '../components/game-board/game-board-footer'
import { createGame, playCpu, SLOTS } from '../utilities/game'

afterEach(cleanup)

/** The share menu of the bar uses the toasts of `UIProvider`. */
const wrapper = ({ children }: { children: ReactNode }) => h(UIProvider, null, children)

describe('GameBoardFooter', () => {
	it('names the level of the CPU in its label', () => {
		const game = createGame('k3x9q2')

		render(h(GameBoardFooter, { game, showScore: true, cpu: game, difficulty: 'hard' }), {
			wrapper,
		})

		expect(screen.getByText('Hard CPU')).toBeTruthy()
	})

	it('names the level of the CPU when the CPU wins', () => {
		// The player has no number in a slot, so the CPU wins.
		const cpu = playCpu('k3x9q2', SLOTS, 'easy')

		render(
			h(GameBoardFooter, {
				game: createGame('k3x9q2'),
				showScore: true,
				cpu,
				difficulty: 'easy',
				outcome: 'loss',
			}),
			{ wrapper },
		)

		expect(screen.getByText('Easy CPU wins')).toBeTruthy()
	})
})
