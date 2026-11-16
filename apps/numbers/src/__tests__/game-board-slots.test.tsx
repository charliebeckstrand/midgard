// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { UIProvider } from 'ui/providers/ui'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GameBoardSlots } from '../components/game-board/game-board-slots'
import { type Game, SLOTS } from '../utilities/game'

/** A game with 342 and 385 in the first two slots, and 358 drawn: a bust, with the gap after the first slot. */
const bust: Game = {
	seed: 'test',
	deck: [],
	slots: [342, 385, ...Array.from({ length: SLOTS - 2 }, () => null)],
	drawn: 358,
	last: 358,
}

const scrollIntoView = vi.fn()

/** Renders one column of the bust: the column of the player with `onPlace`, or else the column of the CPU. */
function renderColumn(player: boolean) {
	return render(
		<UIProvider>
			<GameBoardSlots
				game={bust}
				status="bust"
				label={player ? 'You' : 'CPU'}
				onPlace={player ? () => {} : undefined}
			/>
		</UIProvider>,
	)
}

beforeEach(() => {
	// jsdom has no `scrollIntoView`.
	Element.prototype.scrollIntoView = scrollIntoView
})

afterEach(() => {
	cleanup()

	scrollIntoView.mockReset()
})

describe('GameBoardSlots', () => {
	it('scrolls the gap mark of the column of the player into view at a bust', () => {
		renderColumn(true)

		expect(scrollIntoView).toHaveBeenCalledTimes(1)
		expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
	})

	it('does not scroll the gap mark of the column of the CPU', () => {
		renderColumn(false)

		expect(scrollIntoView).not.toHaveBeenCalled()
	})

	it('keeps a filled slot at full strength, and dims an empty slot that is off', () => {
		renderColumn(true)

		const filled = screen.getByRole('button', { name: 'Slot 1, 342' })

		const empty = screen.getByRole('button', { name: 'Slot 3' })

		expect(filled).toHaveProperty('disabled', true)
		expect(filled.className).toContain('disabled:opacity-100')

		expect(empty).toHaveProperty('disabled', true)
		expect(empty.className).not.toContain('disabled:opacity-100')
	})
})
