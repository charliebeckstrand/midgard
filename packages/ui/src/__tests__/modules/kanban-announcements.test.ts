import type { Active, Over } from '@dnd-kit/core'
import { describe, expect, it } from 'vitest'
import { columnName, kanbanAnnouncements } from '../../modules/kanban/kanban-announcements'
import { attach } from '../helpers/attach'

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

describe('columnName', () => {
	const cards = `
		<ul>
			<li><div data-slot="kanban-card" data-card-id="a">Write the brief</div></li>
			<li><div data-slot="kanban-card" data-card-id="b">Review the copy</div></li>
		</ul>`

	/** A board with one column, `todo`, with the attributes and the content given. */
	const board = (attributes: string, content: string) => {
		const container = attach(document.createElement('div'))

		container.innerHTML = `<fieldset data-slot="kanban-column" data-column-id="todo" ${attributes}>${content}</fieldset>`

		return container
	}

	it('reads the header text only for a column with no name', () => {
		const container = board('', `<div data-slot="kanban-column-header">Todo</div>${cards}`)

		expect(columnName(container, 'todo')).toBe('Todo')
	})

	it('reads the header text when no aria-labelledby target resolves', () => {
		const container = board(
			'aria-labelledby="missing"',
			`<div data-slot="kanban-column-header">Todo</div>${cards}`,
		)

		expect(columnName(container, 'todo')).toBe('Todo')
	})

	it('reads the aria-label of the column', () => {
		const container = board(
			'aria-label="Backlog"',
			`<div data-slot="kanban-column-header">Todo</div>${cards}`,
		)

		expect(columnName(container, 'todo')).toBe('Backlog')
	})

	it('reads the title that aria-labelledby names', () => {
		const container = board(
			'aria-labelledby="todo-title"',
			`<div data-slot="kanban-column-header"><h3 id="todo-title">Todo</h3><button>Add</button></div>${cards}`,
		)

		expect(columnName(container, 'todo')).toBe('Todo')
	})

	it('gives an empty name for a column with no name and no header', () => {
		expect(columnName(board('', cards), 'todo')).toBe('')
	})
})
