import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	Kanban,
	KanbanCard,
	KanbanColumn,
	KanbanColumnBody,
	KanbanColumnHeader,
	KanbanColumnTitle,
} from '../../components/kanban'
import { allBySlot, bySlot, fireEvent, renderUI, screen, waitFor } from '../helpers'

type Item = { id: string; title: string }

type Column = { id: string; title: string; items: Item[] }

const columns: Column[] = [
	{ id: 'todo', title: 'Todo', items: [{ id: '1', title: 'One' }] },
	{ id: 'done', title: 'Done', items: [{ id: '2', title: 'Two' }] },
]

function Board({ onValueChange }: { onValueChange?: (next: Column[]) => void } = {}) {
	return (
		<Kanban
			columns={columns}
			getKey={(item: Item) => item.id}
			onValueChange={onValueChange}
			aria-label="Board"
		>
			{columns.map((column) => (
				<KanbanColumn key={column.id} columnId={column.id} aria-label={column.title}>
					<KanbanColumnHeader>
						<KanbanColumnTitle>{column.title}</KanbanColumnTitle>
					</KanbanColumnHeader>
					<KanbanColumnBody empty="Empty">
						{column.items.map((item) => (
							<KanbanCard key={item.id} cardId={item.id}>
								{item.title}
							</KanbanCard>
						))}
					</KanbanColumnBody>
				</KanbanColumn>
			))}
		</Kanban>
	)
}

// Stateful board with several cards so keyboard reorder and cross-card focus
// movement re-render against live state.
const keyboardColumns: Column[] = [
	{
		id: 'todo',
		title: 'Todo',
		items: [
			{ id: 'a', title: 'A' },
			{ id: 'b', title: 'B' },
			{ id: 'c', title: 'C' },
		],
	},
	{ id: 'done', title: 'Done', items: [{ id: 'd', title: 'D' }] },
]

function KeyboardBoard({ onValueChange }: { onValueChange?: (next: Column[]) => void } = {}) {
	const [cols, setCols] = useState(keyboardColumns)

	return (
		<Kanban
			columns={cols}
			getKey={(item: Item) => item.id}
			aria-label="Board"
			onValueChange={(next) => {
				setCols(next)

				onValueChange?.(next)
			}}
		>
			{cols.map((column) => (
				<KanbanColumn key={column.id} columnId={column.id} aria-label={column.title}>
					<KanbanColumnHeader>
						<KanbanColumnTitle>{column.title}</KanbanColumnTitle>
					</KanbanColumnHeader>
					<KanbanColumnBody empty="Empty">
						{column.items.map((item) => (
							<KanbanCard key={item.id} cardId={item.id}>
								{item.title}
							</KanbanCard>
						))}
					</KanbanColumnBody>
				</KanbanColumn>
			))}
		</Kanban>
	)
}

describe('Kanban', () => {
	it('renders a labelled data-slot="kanban" root with one KanbanColumn per column', () => {
		const { container } = renderUI(<Board />)

		const el = bySlot(container, 'kanban')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('SECTION')

		expect(bySlot(container, 'kanban')).toHaveAttribute('aria-label', 'Board')

		expect(allBySlot(container, 'kanban-column')).toHaveLength(2)
	})
})

describe('KanbanColumn', () => {
	it('renders with data-slot="kanban-column" and exposes the column id', () => {
		const { container } = renderUI(<Board />)

		const column = bySlot(container, 'kanban-column')

		expect(column).toBeInTheDocument()

		expect(column).toHaveAttribute('data-column-id', 'todo')
	})

	it('renders column header, title, and body slots with the title text', () => {
		const { container } = renderUI(<Board />)

		expect(bySlot(container, 'kanban-column-header')).toBeInTheDocument()

		expect(bySlot(container, 'kanban-column-title')).toBeInTheDocument()

		expect(bySlot(container, 'kanban-column-body')).toBeInTheDocument()

		expect(screen.getByText('Todo')).toBeInTheDocument()

		expect(screen.getByText('Done')).toBeInTheDocument()
	})

	it('renders an empty fallback when the column has no items', () => {
		const emptyColumn: Column = { id: 'empty', title: 'Empty', items: [] }

		const empty: Column[] = [emptyColumn]

		renderUI(
			<Kanban columns={empty} getKey={(item: Item) => item.id}>
				<KanbanColumn columnId="empty">
					<KanbanColumnHeader>
						<KanbanColumnTitle>Empty</KanbanColumnTitle>
					</KanbanColumnHeader>
					<KanbanColumnBody empty="No cards">
						{emptyColumn.items.map((item) => (
							<KanbanCard key={item.id} cardId={item.id}>
								{item.title}
							</KanbanCard>
						))}
					</KanbanColumnBody>
				</KanbanColumn>
			</Kanban>,
		)

		expect(screen.getByText('No cards')).toBeInTheDocument()
	})
})

describe('KanbanCard', () => {
	it('renders one data-slot="kanban-card" per item across all columns, exposing the card id', () => {
		const { container } = renderUI(<Board />)

		const card = bySlot(container, 'kanban-card')

		expect(card).toBeInTheDocument()

		expect(card).toHaveAttribute('data-card-id', '1')

		expect(allBySlot(container, 'kanban-card')).toHaveLength(2)
	})

	it('marks cards read-only (not disabled) and omits the aria-label when onValueChange is absent', () => {
		const { container } = renderUI(
			<Kanban columns={columns} getKey={(item: Item) => item.id}>
				<KanbanColumn columnId="todo">
					<KanbanColumnBody>
						<KanbanCard cardId="1">One</KanbanCard>
					</KanbanColumnBody>
				</KanbanColumn>
			</Kanban>,
		)

		const card = bySlot(container, 'kanban-card')

		expect(card).toHaveAttribute('data-readonly')

		expect(card).not.toHaveAttribute('data-disabled')

		expect(card).not.toHaveAttribute('aria-label')
	})

	it('marks cards disabled (not read-only) when the board is disabled', () => {
		const { container } = renderUI(
			<Kanban columns={columns} getKey={(item: Item) => item.id} onValueChange={() => {}} disabled>
				<KanbanColumn columnId="todo">
					<KanbanColumnBody>
						<KanbanCard cardId="1">One</KanbanCard>
					</KanbanColumnBody>
				</KanbanColumn>
			</Kanban>,
		)

		const card = bySlot(container, 'kanban-card')

		expect(card).toHaveAttribute('data-disabled')

		expect(card).not.toHaveAttribute('data-readonly')
	})

	it('marks cards interactive and lets their content name them when onValueChange is supplied', () => {
		const { container } = renderUI(<Board onValueChange={() => {}} />)

		const card = bySlot(container, 'kanban-card')

		expect(card).not.toHaveAttribute('data-disabled')

		expect(card).not.toHaveAttribute('data-readonly')

		// No forced aria-label: the card is named by its content; dnd-kit supplies
		// the draggable role and its keyboard-instructions description.
		expect(card).not.toHaveAttribute('aria-label')

		expect(card).toHaveAttribute('role', 'button')

		expect(card).toHaveAttribute('aria-roledescription')
	})

	it('honors a custom aria-label on an interactive card', () => {
		const { container } = renderUI(
			<Kanban columns={columns} getKey={(item: Item) => item.id} onValueChange={() => {}}>
				<KanbanColumn columnId="todo">
					<KanbanColumnBody>
						<KanbanCard cardId="1" aria-label="Card One">
							One
						</KanbanCard>
					</KanbanColumnBody>
				</KanbanColumn>
			</Kanban>,
		)

		expect(bySlot(container, 'kanban-card')).toHaveAttribute('aria-label', 'Card One')
	})

	it('marks an interactive card as lifted after pressing Space', async () => {
		const { container } = renderUI(<Board onValueChange={() => {}} />)

		const card = bySlot(container, 'kanban-card') as HTMLElement

		card.focus()

		const { fireEvent } = await import('@testing-library/react')

		fireEvent.keyDown(card, { key: ' ' })

		expect(card).toHaveAttribute('data-lifted')
	})

	it('clears the lifted attribute when the card blurs', async () => {
		const { container } = renderUI(<Board onValueChange={() => {}} />)

		const card = bySlot(container, 'kanban-card') as HTMLElement

		card.focus()

		const { fireEvent } = await import('@testing-library/react')

		fireEvent.keyDown(card, { key: ' ' })

		expect(card).toHaveAttribute('data-lifted')

		fireEvent.blur(card)

		expect(card).not.toHaveAttribute('data-lifted')
	})
})

describe('KanbanColumnBody', () => {
	it('renders children when the column has cards, omitting the empty fallback', () => {
		const { container } = renderUI(<Board />)

		// With non-empty items the fallback element does not render.
		expect(screen.queryByText('Empty')).not.toBeInTheDocument()

		expect(bySlot(container, 'kanban-card')).toBeInTheDocument()
	})

	it('renders nothing when the column is empty and no fallback is provided', () => {
		const { container } = renderUI(
			<Kanban columns={[{ id: 'x', title: 'X', items: [] }]} getKey={(i: Item) => i.id}>
				<KanbanColumn columnId="x">
					<KanbanColumnBody />
				</KanbanColumn>
			</Kanban>,
		)

		const body = bySlot(container, 'kanban-column-body')

		expect(body).toBeInTheDocument()

		// No fallback supplied → no children rendered.
		expect(body?.children).toHaveLength(0)
	})
})

// Keyboard drag-and-drop: Space lifts a card, then arrows reorder it within
// and across columns, while un-lifted arrows move focus only.
// Reorders surface through onValueChange.
describe('Kanban keyboard reorder', () => {
	const cardOf = (root: HTMLElement, id: string) =>
		root.querySelector(`[data-card-id="${id}"]`) as HTMLElement

	const itemIds = (next: Column[], columnId: string) =>
		next.find((column) => column.id === columnId)?.items.map((item) => item.id)

	it('moves focus between cards with arrow keys when no card is lifted', () => {
		const { container } = renderUI(<KeyboardBoard />)

		cardOf(container, 'a').focus()

		fireEvent.keyDown(cardOf(container, 'a'), { key: 'ArrowDown' })

		expect(document.activeElement).toBe(cardOf(container, 'b'))

		fireEvent.keyDown(cardOf(container, 'b'), { key: 'ArrowRight' })

		expect(document.activeElement).toBe(cardOf(container, 'd'))
	})

	it('reorders within the column when a lifted card is moved down', () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(<KeyboardBoard onValueChange={onValueChange} />)

		const card = cardOf(container, 'a')

		card.focus()

		fireEvent.keyDown(card, { key: ' ' })

		expect(card).toHaveAttribute('data-lifted')

		fireEvent.keyDown(card, { key: 'ArrowDown' })

		expect(onValueChange).toHaveBeenCalledTimes(1)

		expect(itemIds(onValueChange.mock.calls[0]?.[0], 'todo')).toEqual(['b', 'a', 'c'])
	})

	it('moves a lifted card into the next column with ArrowRight', () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(<KeyboardBoard onValueChange={onValueChange} />)

		const card = cardOf(container, 'a')

		card.focus()

		fireEvent.keyDown(card, { key: ' ' })

		fireEvent.keyDown(card, { key: 'ArrowRight' })

		const next = onValueChange.mock.calls[0]?.[0]

		expect(itemIds(next, 'todo')).toEqual(['b', 'c'])

		expect(itemIds(next, 'done')).toEqual(['d', 'a'])
	})

	it('drops a lifted card on Escape without reordering', () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(<KeyboardBoard onValueChange={onValueChange} />)

		const card = cardOf(container, 'a')

		card.focus()

		fireEvent.keyDown(card, { key: ' ' })

		expect(card).toHaveAttribute('data-lifted')

		fireEvent.keyDown(card, { key: 'Escape' })

		expect(cardOf(container, 'a')).not.toHaveAttribute('data-lifted')

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('ignores arrow keys held with a modifier', () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(<KeyboardBoard onValueChange={onValueChange} />)

		const card = cardOf(container, 'a')

		card.focus()

		fireEvent.keyDown(card, { key: 'ArrowDown', shiftKey: true })

		expect(document.activeElement).toBe(card)

		expect(onValueChange).not.toHaveBeenCalled()
	})
})

describe('Kanban keyboard announcements', () => {
	const cardOf = (root: HTMLElement, id: string) =>
		root.querySelector(`[data-card-id="${id}"]`) as HTMLElement

	const liveRegion = () =>
		document.body.querySelector('[data-slot="live-region"][aria-live="assertive"]')

	// Dependent keydowns fire synchronously (each fireEvent is act-flushed) so the
	// lifted state can't be lost to an `await` yielding mid-sequence; only the
	// final message is awaited.
	const liftedCard = (container: HTMLElement) => {
		const card = cardOf(container, 'a')

		card.focus()

		fireEvent.keyDown(card, { key: ' ' })

		return card
	}

	it('announces the card name, column, and position on lift', async () => {
		liftedCard(renderUI(<KeyboardBoard />).container)

		await waitFor(() =>
			expect(liveRegion()).toHaveTextContent('Picked up A, position 1 of 3 in Todo'),
		)
	})

	it('announces the new position on a within-column move', async () => {
		const card = liftedCard(renderUI(<KeyboardBoard />).container)

		fireEvent.keyDown(card, { key: 'ArrowDown' })

		await waitFor(() =>
			expect(liveRegion()).toHaveTextContent('A moved to position 2 of 3 in Todo'),
		)
	})

	it('announces a cross-column move with the target column name', async () => {
		const card = liftedCard(renderUI(<KeyboardBoard />).container)

		fireEvent.keyDown(card, { key: 'ArrowRight' })

		await waitFor(() => expect(liveRegion()).toHaveTextContent('A moved to Done, position 2 of 2'))
	})

	it('announces the drop', async () => {
		const card = liftedCard(renderUI(<KeyboardBoard />).container)

		fireEvent.keyDown(card, { key: 'Enter' })

		await waitFor(() =>
			expect(liveRegion()).toHaveTextContent('Dropped A, position 1 of 3 in Todo'),
		)
	})
})

describe('KanbanColumn naming', () => {
	it('names the column section from its title when no aria-label is given', () => {
		renderUI(
			<Kanban columns={columns} getKey={(item: Item) => item.id} aria-label="Board">
				{columns.map((column) => (
					<KanbanColumn key={column.id} columnId={column.id}>
						<KanbanColumnHeader>
							<KanbanColumnTitle>{column.title}</KanbanColumnTitle>
						</KanbanColumnHeader>
					</KanbanColumn>
				))}
			</Kanban>,
		)

		// The section's aria-labelledby resolves to the rendered title.
		expect(screen.getByRole('region', { name: 'Todo' })).toBeInTheDocument()

		expect(screen.getByRole('region', { name: 'Done' })).toBeInTheDocument()
	})

	it('omits aria-labelledby when no title is rendered, so it never dangles', () => {
		const { container } = renderUI(
			<Kanban columns={columns} getKey={(item: Item) => item.id} aria-label="Board">
				{columns.map((column) => (
					<KanbanColumn key={column.id} columnId={column.id} />
				))}
			</Kanban>,
		)

		for (const section of container.querySelectorAll('[data-slot="kanban-column"]')) {
			expect(section).not.toHaveAttribute('aria-labelledby')
		}
	})
})
