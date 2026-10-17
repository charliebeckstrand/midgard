// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	indexBoard,
	reuseColumnIds,
	targetColumnIndex,
} from '../../modules/kanban/engine/kanban-board'

type Card = { id: string }

type Column = { id: string; items: Card[] }

const getKey = (card: Card) => card.id

const columns: Column[] = [
	{ id: 'todo', items: [{ id: 'a' }, { id: 'b' }] },
	{ id: 'done', items: [{ id: 'c' }] },
	{ id: 'later', items: [] },
]

describe('indexBoard', () => {
	const board = indexBoard(columns, getKey)

	it('gives the column and the row of each card', () => {
		expect(board.places.get('b')).toEqual({ columnIndex: 0, itemIndex: 1 })

		expect(board.places.get('c')).toEqual({ columnIndex: 1, itemIndex: 0 })
	})

	it('gives the index of each column, also an empty one', () => {
		expect(board.columnIndexes.get('later')).toBe(2)
	})

	it('has no place for a key that names no card', () => {
		expect(board.places.get('missing')).toBeUndefined()
	})
})

describe('targetColumnIndex', () => {
	const board = indexBoard(columns, getKey)

	it('reads a column id as that column', () => {
		expect(targetColumnIndex(board, 'done')).toBe(1)
	})

	it('reads a card key as the column that holds the card', () => {
		expect(targetColumnIndex(board, 'b')).toBe(0)
	})

	it('gives -1 for an id that names neither', () => {
		expect(targetColumnIndex(board, 'missing')).toBe(-1)
	})
})

describe('reuseColumnIds', () => {
	it('keeps the array of a column whose keys do not change', () => {
		const prev = reuseColumnIds({}, columns, getKey)

		const next = reuseColumnIds(
			prev,
			[columns[0] as Column, { id: 'done', items: [] }, columns[2] as Column],
			getKey,
		)

		expect(next).not.toBe(prev)

		expect(next.todo).toBe(prev.todo)

		expect(next.done).toEqual([])
	})

	it('gives the same record when no column changed', () => {
		const prev = reuseColumnIds({}, columns, getKey)

		expect(reuseColumnIds(prev, structuredClone(columns), getKey)).toBe(prev)
	})

	it('gives a new record when a column goes', () => {
		const prev = reuseColumnIds({}, columns, getKey)

		expect(reuseColumnIds(prev, columns.slice(0, 2), getKey)).not.toBe(prev)
	})
})
