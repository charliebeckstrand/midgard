import { describe, expect, it } from 'vitest'
import {
	Kanban,
	KanbanCard,
	KanbanColumn,
	KanbanColumnBody,
	KanbanColumnHeader,
	KanbanColumnTitle,
} from '../../components/kanban'
import { allBySlot, bySlot, renderUI, screen } from '../helpers'

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

describe('Kanban', () => {
	it('renders with data-slot="kanban"', () => {
		const { container } = renderUI(<Board />)

		const el = bySlot(container, 'kanban')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('SECTION')
	})

	it('exposes the aria-label on the root', () => {
		const { container } = renderUI(<Board />)

		expect(bySlot(container, 'kanban')).toHaveAttribute('aria-label', 'Board')
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Kanban
				columns={columns}
				getKey={(item: Item) => item.id}
				className="custom"
				aria-label="Board"
			/>,
		)

		expect(bySlot(container, 'kanban')?.className).toContain('custom')
	})

	it('renders one KanbanColumn per column', () => {
		const { container } = renderUI(<Board />)

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

	it('renders column header, title, and body slots', () => {
		const { container } = renderUI(<Board />)

		expect(bySlot(container, 'kanban-column-header')).toBeInTheDocument()

		expect(bySlot(container, 'kanban-column-title')).toBeInTheDocument()

		expect(bySlot(container, 'kanban-column-body')).toBeInTheDocument()
	})

	it('renders the column title text', () => {
		renderUI(<Board />)

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
	it('renders with data-slot="kanban-card" and exposes the card id', () => {
		const { container } = renderUI(<Board />)

		const card = bySlot(container, 'kanban-card')

		expect(card).toBeInTheDocument()

		expect(card).toHaveAttribute('data-card-id', '1')
	})

	it('renders one card per item across all columns', () => {
		const { container } = renderUI(<Board />)

		expect(allBySlot(container, 'kanban-card')).toHaveLength(2)
	})

	it('renders the card content', () => {
		renderUI(<Board />)

		expect(screen.getByText('One')).toBeInTheDocument()

		expect(screen.getByText('Two')).toBeInTheDocument()
	})

	it('applies custom className on the card', () => {
		const { container } = renderUI(
			<Kanban columns={columns} getKey={(item: Item) => item.id}>
				<KanbanColumn columnId="todo">
					<KanbanColumnBody>
						<KanbanCard cardId="1" className="custom-card">
							One
						</KanbanCard>
					</KanbanColumnBody>
				</KanbanColumn>
			</Kanban>,
		)

		expect(bySlot(container, 'kanban-card')?.className).toContain('custom-card')
	})

	it('marks cards as disabled and omits the aria-label when the board is non-interactive', () => {
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

		expect(card).toHaveAttribute('data-disabled')

		expect(card).not.toHaveAttribute('aria-label')
	})

	it('marks cards as interactive and exposes the aria-label when onValueChange is supplied', () => {
		const { container } = renderUI(<Board onValueChange={() => {}} />)

		const card = bySlot(container, 'kanban-card')

		expect(card).not.toHaveAttribute('data-disabled')

		expect(card).toHaveAttribute('aria-label', 'Drag to reorder')
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

		// With non-empty items the fallback element should not render.
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
