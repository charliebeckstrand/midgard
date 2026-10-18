// @vitest-environment node
import type { Active, Over } from '@dnd-kit/core'
import { describe, expect, it } from 'vitest'
import {
	describeCard,
	describeMove,
	describeReturn,
	kanbanAnnouncements,
} from '../../modules/kanban/engine/kanban-announcements'
import { intlEn } from '../../primitives/intl/intl-catalog'

type Card = { id: string }

type Column = { id: string; items: Card[] }

const start: Column[] = [
	{ id: 'todo', items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] },
	{ id: 'done', items: [{ id: 'd' }] },
	{ id: 'later', items: [] },
]

const names = {
	card: (id: string) => id.toUpperCase(),
	column: (id: string) => ({ todo: 'Todo', done: 'Done', later: 'Later' })[id] ?? id,
}

const at = (id: string) => ({ id }) as Active & Over

/** The announcements while the columns of the last commit are `columns`. */
const announce = (columns: Column[]) =>
	kanbanAnnouncements(
		intlEn,
		() => columns,
		() => start,
		(card: Card) => card.id,
		names,
	)

describe('kanbanAnnouncements', () => {
	it('names the card, its position, and its column on the drag start', () => {
		expect(announce(start).onDragStart({ active: at('a') })).toBe(
			'Picked up A, position 1 of 3 in Todo.',
		)
	})

	it('gives the slot of the card under the pointer in the same column', () => {
		expect(announce(start).onDragOver({ active: at('a'), over: at('c') })).toBe(
			'A moved to position 3 of 3 in Todo.',
		)
	})

	it('puts the card before the card under the pointer in a different column', () => {
		expect(announce(start).onDragOver({ active: at('a'), over: at('d') })).toBe(
			'A moved to position 1 of 2 in Done.',
		)
	})

	it('puts the card last over a different column', () => {
		expect(announce(start).onDragOver({ active: at('a'), over: at('later') })).toBe(
			'A moved to position 1 of 1 in Later.',
		)
	})

	it('says nothing over no target', () => {
		expect(announce(start).onDragOver({ active: at('a'), over: null })).toBeUndefined()
	})

	it('drops at the slot under the pointer in the column that holds the card', () => {
		// The drag-over moved the card to Done before the drop.
		const moved: Column[] = [
			{ id: 'todo', items: [{ id: 'b' }, { id: 'c' }] },
			{ id: 'done', items: [{ id: 'a' }, { id: 'd' }] },
			{ id: 'later', items: [] },
		]

		expect(announce(moved).onDragEnd({ active: at('a'), over: at('d') })).toBe(
			'Dropped A, position 2 of 2 in Done.',
		)
	})

	it('drops in place with no target', () => {
		expect(announce(start).onDragEnd({ active: at('b'), over: null })).toBe(
			'Dropped B, position 2 of 3 in Todo.',
		)
	})

	it('returns the card to its slot at the drag start on a cancel', () => {
		const moved: Column[] = [
			{ id: 'todo', items: [{ id: 'b' }, { id: 'c' }] },
			{ id: 'done', items: [{ id: 'd' }, { id: 'a' }] },
			{ id: 'later', items: [] },
		]

		expect(announce(moved).onDragCancel({ active: at('a'), over: null })).toBe(
			'Returned A to position 1 of 3 in Todo.',
		)
	})
})

describe('the sentences of a move', () => {
	const slot = { columnId: 'done', position: 2, count: 3 }

	it('names a card with no slot by its name only', () => {
		expect(describeCard(intlEn, names, 'a', null)).toBe('A')
	})

	it('names a card with its position and its column', () => {
		expect(describeCard(intlEn, names, 'a', slot)).toBe('A, position 2 of 3 in Done')
	})

	it('gives one sentence for a move in the column and across the board', () => {
		expect(describeMove(intlEn, names, 'a', slot)).toBe('A moved to position 2 of 3 in Done.')
	})

	it('returns a card with no slot by its name only', () => {
		expect(describeReturn(intlEn, names, 'a', null)).toBe('Returned A.')
	})
})
