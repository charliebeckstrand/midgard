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

		expect(screen.getByText('CPU (Hard)')).toBeTruthy()
		// No side has won, so no label has a check.
		expect(document.querySelector('.lucide-circle-check')).toBeNull()
	})

	it('names no level at the default level', () => {
		const game = createGame('k3x9q2')

		render(h(GameBoardFooter, { game, showScore: true, cpu: game, difficulty: 'normal' }), {
			wrapper,
		})

		expect(screen.getByText('CPU')).toBeTruthy()
	})

	it('marks the winner with a check, and keeps its label', () => {
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

		expect(screen.getByText('CPU (Easy)')).toBeTruthy()
		expect(screen.getAllByRole('img', { name: 'Winner' })).toHaveLength(1)
		expect(document.querySelectorAll('.lucide-circle-check')).toHaveLength(2)
	})

	it('marks a solo win with a check, and no other solo score', () => {
		const game = createGame('k3x9q2')

		const won = { ...game, slots: [...game.deck].sort((a, b) => a - b) }

		render(h(GameBoardFooter, { game: won, showScore: true, difficulty: 'normal' }), { wrapper })

		expect(screen.getByRole('img', { name: 'Winner' })).toBeTruthy()

		cleanup()

		render(h(GameBoardFooter, { game, showScore: true, difficulty: 'normal' }), { wrapper })

		expect(document.querySelector('.lucide-circle-check')).toBeNull()
	})

	it('makes a solo bust amber, with no check', () => {
		const game = createGame('k3x9q2')

		// The first slot holds 2, so the drawn 1 has no slot.
		const bust = { ...game, slots: [2, ...game.slots.slice(1)], drawn: 1 }

		const { container } = render(
			h(GameBoardFooter, { game: bust, showScore: true, difficulty: 'normal' }),
			{ wrapper },
		)

		expect(container.querySelector('.bg-amber-500\\/10')).toBeTruthy()
		expect(document.querySelector('.lucide-circle-check')).toBeNull()

		cleanup()

		// A run that goes on has no tint.
		const { container: playing } = render(
			h(GameBoardFooter, { game, showScore: true, difficulty: 'normal' }),
			{ wrapper },
		)

		expect(playing.querySelector('.bg-amber-500\\/10')).toBeNull()
	})

	it('gives the solo score a label only for a screen reader', () => {
		render(
			h(GameBoardFooter, { game: createGame('k3x9q2'), showScore: true, difficulty: 'normal' }),
			{
				wrapper,
			},
		)

		expect(screen.getByText('Score', { exact: false }).className).toContain('sr-only')
	})

	it('keeps the labels on a tie, with no check', () => {
		const game = createGame('k3x9q2')

		render(
			h(GameBoardFooter, {
				game,
				showScore: true,
				cpu: game,
				difficulty: 'hard',
				outcome: 'tie',
			}),
			{ wrapper },
		)

		expect(screen.getByText('You')).toBeTruthy()
		expect(screen.getByText('CPU (Hard)')).toBeTruthy()
		expect(document.querySelector('.lucide-circle-check')).toBeNull()
	})
})
