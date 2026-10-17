import { describe, expect, it } from 'vitest'
import { columnName } from '../../modules/kanban/kanban-names'
import { attach } from '../helpers/attach'

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
