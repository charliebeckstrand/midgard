import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Kanban, KanbanCard, KanbanColumn, KanbanColumnBody } from '../../components/kanban'
import { List } from '../../components/list'
import { ListItem } from '../../components/list/list-item'
import { useSortableItem } from '../../hooks'
import { act, fireEvent, renderUI } from '../helpers'

/**
 * A keyboard lift renders only the item that lifts and the item that drops. A
 * keyboard move on a board renders no card in a column that the move does not
 * touch.
 *
 * The lifted id was in the list context and in the board context, and the key
 * handlers depended on it and on the items. A lift therefore gave the context a
 * new value, and each item rendered. A move did the same on each card of the
 * board. Each item now reads its own lift from a keyed store, and the key
 * handlers keep their identity.
 *
 * The list count reads the calls of `ListItem`. The board count reads the
 * `useSortableItem` call that each card makes when it renders. The counts need
 * module mocks, so this suite sits in `boundary/`. The keys drive the tests,
 * not a pointer drag (CONVENTIONS.md §10.3).
 */
vi.mock('../../components/list/list-item', async (importActual) => {
	const actual = await importActual<typeof import('../../components/list/list-item')>()

	return { ...actual, ListItem: vi.fn(actual.ListItem) }
})

vi.mock('../../hooks', async (importActual) => {
	const actual = await importActual<typeof import('../../hooks')>()

	return { ...actual, useSortableItem: vi.fn(actual.useSortableItem) }
})

type Item = { id: string; title: string }

const items: Item[] = Array.from({ length: 100 }, (_, index) => ({
	id: `item-${index}`,
	title: `Item ${index}`,
}))

function ReorderList() {
	const [value, setValue] = useState(items)

	return (
		<List items={value} getKey={(item) => item.id} onReorder={setValue} aria-label="Items">
			{(item) => <ListItem>{item.title}</ListItem>}
		</List>
	)
}

type Column = { id: string; items: Item[] }

const columns: Column[] = ['todo', 'doing', 'done'].map((id) => ({
	id,
	items: Array.from({ length: 30 }, (_, index) => ({
		id: `${id}-${index}`,
		title: `${id} ${index}`,
	})),
}))

function Board() {
	const [value, setValue] = useState(columns)

	return (
		<Kanban
			columns={value}
			getKey={(item: Item) => item.id}
			onReorder={setValue}
			aria-label="Board"
		>
			{value.map((column) => (
				<KanbanColumn key={column.id} value={column.id} aria-label={column.id}>
					<KanbanColumnBody>
						{column.items.map((item) => (
							<KanbanCard key={item.id} value={item.id}>
								{item.title}
							</KanbanCard>
						))}
					</KanbanColumnBody>
				</KanbanColumn>
			))}
		</Kanban>
	)
}

/** Presses `key` on `element`, and flushes the refocus frame. */
function press(element: Element, key: string) {
	act(() => {
		fireEvent.keyDown(element, { key })
	})
}

/** The card ids that rendered since the last clear. */
function renderedCards() {
	return vi.mocked(useSortableItem).mock.calls.map(([options]) => String(options.id))
}

function card(container: HTMLElement, id: string): HTMLElement {
	const element = container.querySelector<HTMLElement>(
		`[data-slot="kanban-card"][data-card-id="${id}"]`,
	)

	if (!element) throw new Error(`no card ${id}`)

	return element
}

describe('keyboard lift renders', () => {
	beforeEach(() => {
		vi.mocked(ListItem).mockClear()

		vi.mocked(useSortableItem).mockClear()
	})

	it('renders only the lifted list item for a lift', () => {
		const { container } = renderUI(<ReorderList />)

		const row = container.querySelector('[data-slot="list-item"][data-item-id="item-5"]')

		if (!row) throw new Error('no row')

		vi.mocked(ListItem).mockClear()

		press(row, ' ')

		expect(row).toHaveAttribute('data-lifted')

		expect(vi.mocked(ListItem).mock.calls.length).toBeLessThanOrEqual(2)

		vi.mocked(ListItem).mockClear()

		press(row, 'Escape')

		expect(row).not.toHaveAttribute('data-lifted')

		expect(vi.mocked(ListItem).mock.calls.length).toBeLessThanOrEqual(2)
	})

	it('renders only the lifted card for a lift', () => {
		const { container } = renderUI(<Board />)

		vi.mocked(useSortableItem).mockClear()

		press(card(container, 'todo-3'), ' ')

		expect(card(container, 'todo-3')).toHaveAttribute('data-lifted')

		expect(renderedCards().length).toBeLessThanOrEqual(2)
	})

	it('renders no card of an untouched column for a move', () => {
		const { container } = renderUI(<Board />)

		press(card(container, 'todo-3'), ' ')

		vi.mocked(useSortableItem).mockClear()

		// Moves the card from `todo` to `doing`. The `done` column stays as it is.
		press(card(container, 'todo-3'), 'ArrowRight')

		expect(card(container, 'todo-3').closest('section')).toHaveAttribute('aria-label', 'doing')

		expect(renderedCards().filter((id) => id.startsWith('done-'))).toEqual([])
	})
})
