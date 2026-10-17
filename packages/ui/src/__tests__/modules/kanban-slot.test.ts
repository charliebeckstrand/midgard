// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { indexBoard } from '../../modules/kanban/engine/kanban-board'
import { currentSlot, overSlot } from '../../modules/kanban/engine/kanban-slot'

type Card = { id: string }

const board = indexBoard(
	[
		{ id: 'todo', items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] },
		{ id: 'done', items: [{ id: 'd' }] },
		{ id: 'later', items: [] },
	],
	(card: Card) => card.id,
)

describe('currentSlot', () => {
	it('gives the column, the 1-based position, and the count of a card', () => {
		expect(currentSlot(board, 'b')).toEqual({ columnId: 'todo', position: 2, count: 3 })
	})

	it('gives null for a card in no column', () => {
		expect(currentSlot(board, 'missing')).toBeNull()
	})
})

describe('overSlot', () => {
	it('takes the slot of the card under the pointer in the same column', () => {
		expect(overSlot(board, 'a', 'c')).toEqual({ columnId: 'todo', position: 3, count: 3 })
	})

	it('goes in before the card under the pointer in a different column', () => {
		expect(overSlot(board, 'a', 'd')).toEqual({ columnId: 'done', position: 1, count: 2 })
	})

	it('goes last over a different column', () => {
		expect(overSlot(board, 'a', 'later')).toEqual({ columnId: 'later', position: 1, count: 1 })
	})

	it('keeps the current slot over its own column', () => {
		expect(overSlot(board, 'b', 'todo')).toEqual({ columnId: 'todo', position: 2, count: 3 })
	})

	it('keeps the current slot over a target in no column', () => {
		expect(overSlot(board, 'b', 'missing')).toEqual({ columnId: 'todo', position: 2, count: 3 })
	})
})
