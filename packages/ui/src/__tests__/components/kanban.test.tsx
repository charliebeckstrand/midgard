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

function Board({ onChange }: { onChange?: (next: Column[]) => void } = {}) {
	return (
		<Kanban
			columns={columns}
			getItemKey={(item: Item) => item.id}
			onChange={onChange}
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
				getItemKey={(item: Item) => item.id}
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
			<Kanban columns={empty} getItemKey={(item: Item) => item.id}>
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
			<Kanban columns={columns} getItemKey={(item: Item) => item.id}>
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
})
