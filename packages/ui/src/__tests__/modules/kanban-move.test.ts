// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { indexBoard } from '../../modules/kanban/engine/kanban-board'
import {
	dragOverMove,
	dropMove,
	type KanbanMove,
	moveCard,
	stepAcrossColumns,
	stepInColumn,
} from '../../modules/kanban/engine/kanban-move'
import { overSlot } from '../../modules/kanban/engine/kanban-slot'

type Card = { id: string }

type Column = { id: string; title: string; items: Card[] }

const columns: Column[] = [
	{ id: 'todo', title: 'Todo', items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] },
	{ id: 'done', title: 'Done', items: [{ id: 'd' }] },
	{ id: 'later', title: 'Later', items: [] },
]

const board = indexBoard(columns, (card: Card) => card.id)

/** The card keys of each column after `move`. */
const keys = (move: KanbanMove<Column> | null) =>
	move?.columns.map((column) => column.items.map((card) => card.id))

describe('moveCard', () => {
	it('reorders a card in its column', () => {
		const move = moveCard(board, { columnIndex: 0, itemIndex: 0 }, { columnIndex: 0, itemIndex: 2 })

		expect(keys(move)).toEqual([['b', 'c', 'a'], ['d'], []])

		expect(move?.slot).toEqual({ columnId: 'todo', position: 3, count: 3 })
	})

	it('moves a card to an index of another column', () => {
		const move = moveCard(board, { columnIndex: 0, itemIndex: 1 }, { columnIndex: 1, itemIndex: 0 })

		expect(keys(move)).toEqual([['a', 'c'], ['b', 'd'], []])

		expect(move?.slot).toEqual({ columnId: 'done', position: 1, count: 2 })
	})

	it('keeps each column that the move does not touch, and its metadata', () => {
		const move = moveCard(board, { columnIndex: 0, itemIndex: 0 }, { columnIndex: 1, itemIndex: 1 })

		expect(move?.columns[2]).toBe(columns[2])

		expect(move?.columns[1]?.title).toBe('Done')
	})

	it('does not change the board it reads', () => {
		moveCard(board, { columnIndex: 0, itemIndex: 0 }, { columnIndex: 1, itemIndex: 0 })

		expect(columns[0]?.items.map((card) => card.id)).toEqual(['a', 'b', 'c'])
	})

	it('gives null for a place off the board', () => {
		expect(
			moveCard(board, { columnIndex: 5, itemIndex: 0 }, { columnIndex: 0, itemIndex: 0 }),
		).toBeNull()
	})
})

describe('dragOverMove', () => {
	it('puts the card before the card under the pointer in another column', () => {
		expect(keys(dragOverMove(board, 'a', 'd'))).toEqual([['b', 'c'], ['a', 'd'], []])
	})

	it('puts the card last over another column', () => {
		expect(keys(dragOverMove(board, 'a', 'later'))).toEqual([['b', 'c'], ['d'], ['a']])
	})

	it('leaves a move in the same column to the drop', () => {
		expect(dragOverMove(board, 'a', 'c')).toBeNull()

		expect(dragOverMove(board, 'a', 'todo')).toBeNull()
	})

	it('gives the slot that the pointer announcement gives', () => {
		expect(dragOverMove(board, 'a', 'd')?.slot).toEqual(overSlot(board, 'a', 'd'))
	})

	it('gives null for a card or a target that is not on the board', () => {
		expect(dragOverMove(board, 'missing', 'd')).toBeNull()

		expect(dragOverMove(board, 'a', 'missing')).toBeNull()
	})
})

describe('dropMove', () => {
	it('takes the slot of the card under the pointer in the same column', () => {
		expect(keys(dropMove(board, 'a', 'c'))).toEqual([['b', 'c', 'a'], ['d'], []])
	})

	it('gives null over the column, over a card of another column, or over itself', () => {
		expect(dropMove(board, 'a', 'todo')).toBeNull()

		expect(dropMove(board, 'a', 'd')).toBeNull()

		expect(dropMove(board, 'a', 'a')).toBeNull()
	})
})

describe('stepInColumn', () => {
	it('moves the card one slot down', () => {
		const move = stepInColumn(board, 'a', 1)

		expect(keys(move)).toEqual([['b', 'a', 'c'], ['d'], []])

		expect(move?.slot).toEqual({ columnId: 'todo', position: 2, count: 3 })
	})

	it('does not wrap at the ends of the column', () => {
		expect(stepInColumn(board, 'a', -1)).toBeNull()

		expect(stepInColumn(board, 'c', 1)).toBeNull()
	})
})

describe('stepAcrossColumns', () => {
	it('moves the card to the end of the next column', () => {
		const move = stepAcrossColumns(board, 'b', 1)

		expect(keys(move)).toEqual([['a', 'c'], ['d', 'b'], []])

		expect(move?.slot).toEqual({ columnId: 'done', position: 2, count: 2 })
	})

	it('steps into an empty column', () => {
		expect(keys(stepAcrossColumns(board, 'd', 1))).toEqual([['a', 'b', 'c'], [], ['d']])
	})

	it('does not wrap at the first or the last column', () => {
		expect(stepAcrossColumns(board, 'a', -1)).toBeNull()

		const moved = stepAcrossColumns(board, 'd', 1)?.columns ?? []

		expect(
			stepAcrossColumns(
				indexBoard(moved, (card: Card) => card.id),
				'd',
				1,
			),
		).toBeNull()
	})
})
