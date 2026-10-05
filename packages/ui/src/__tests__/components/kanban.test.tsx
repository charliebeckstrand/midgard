import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	Kanban,
	KanbanCard,
	KanbanCardHandle,
	KanbanCardSkeleton,
	KanbanColumn,
	KanbanColumnBody,
	KanbanColumnHeader,
	KanbanColumnTitle,
} from '../../components/kanban'
import {
	allBySlot,
	bySlot,
	expectAnnouncement,
	fireEvent,
	getSlot,
	present,
	renderUI,
	screen,
	within,
} from '../helpers'
import { axe } from '../helpers/axe'

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
			onReorder={onValueChange}
			aria-label="Board"
		>
			{columns.map((column) => (
				<KanbanColumn key={column.id} value={column.id} aria-label={column.title}>
					<KanbanColumnHeader>
						<KanbanColumnTitle>{column.title}</KanbanColumnTitle>
					</KanbanColumnHeader>
					<KanbanColumnBody empty="Empty">
						{column.items.map((item) => (
							<KanbanCard key={item.id} value={item.id}>
								<KanbanCardHandle />
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
			onReorder={(next) => {
				setCols(next)

				onValueChange?.(next)
			}}
		>
			{cols.map((column) => (
				<KanbanColumn key={column.id} value={column.id} aria-label={column.title}>
					<KanbanColumnHeader>
						<KanbanColumnTitle>{column.title}</KanbanColumnTitle>
					</KanbanColumnHeader>
					<KanbanColumnBody empty="Empty">
						{column.items.map((item) => (
							<KanbanCard key={item.id} value={item.id}>
								<KanbanCardHandle />
								{item.title}
							</KanbanCard>
						))}
					</KanbanColumnBody>
				</KanbanColumn>
			))}
		</Kanban>
	)
}

/** The card of `id` on the board. */
const cardOf = (root: HTMLElement, id: string) =>
	present(root.querySelector(`[data-card-id="${id}"]`), `[data-card-id="${id}"]`)

/** The handle of the card of `id`: the keyboard stop of the card. */
const handleOf = (root: HTMLElement, id: string) =>
	present(
		root.querySelector<HTMLElement>(`[data-slot="kanban-card-handle"][data-card-id="${id}"]`),
		`handle ${id}`,
	)

describe('Kanban', () => {
	it('renders a labeled data-slot="kanban" root with one KanbanColumn per column', () => {
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
			<Kanban columns={empty} getKey={(item: Item) => item.id} aria-label="Board">
				<KanbanColumn value="empty">
					<KanbanColumnHeader>
						<KanbanColumnTitle>Empty</KanbanColumnTitle>
					</KanbanColumnHeader>
					<KanbanColumnBody empty="No cards">
						{emptyColumn.items.map((item) => (
							<KanbanCard key={item.id} value={item.id}>
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
			<Kanban columns={columns} getKey={(item: Item) => item.id} aria-label="Board">
				<KanbanColumn value="todo">
					<KanbanColumnBody>
						<KanbanCard value="1">One</KanbanCard>
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
			<Kanban
				columns={columns}
				getKey={(item: Item) => item.id}
				onReorder={() => {}}
				disabled
				aria-label="Board"
			>
				<KanbanColumn value="todo">
					<KanbanColumnBody>
						<KanbanCard value="1">One</KanbanCard>
					</KanbanColumnBody>
				</KanbanColumn>
			</Kanban>,
		)

		const card = bySlot(container, 'kanban-card')

		expect(card).toHaveAttribute('data-disabled')

		expect(card).not.toHaveAttribute('data-readonly')
	})

	it('marks cards interactive, and puts the drag role on the handle, not on the card', () => {
		const { container } = renderUI(<Board onValueChange={() => {}} />)

		const card = getSlot(container, 'kanban-card')

		expect(card).not.toHaveAttribute('data-disabled')

		expect(card).not.toHaveAttribute('data-readonly')

		// The card has no role over its content and no tab stop.
		expect(card).not.toHaveAttribute('aria-label')

		expect(card).not.toHaveAttribute('role')

		expect(card).not.toHaveAttribute('aria-roledescription')

		expect(card).not.toHaveAttribute('tabindex')

		// The handle is a native button named from the card content, and dnd-kit
		// gives it the role description and the instructions.
		const handle = screen.getByRole('button', { name: 'Drag One' })

		expect(handle).toBe(handleOf(container, '1'))

		expect(handle.tagName).toBe('BUTTON')

		expect(handle).not.toHaveAttribute('role')

		expect(handle).toHaveAttribute('aria-roledescription')

		expect(handle).toHaveAttribute('aria-describedby')
	})

	it('keeps the role and the name of a control inside an interactive card', async () => {
		const { container } = renderUI(
			<Kanban
				columns={columns}
				getKey={(item: Item) => item.id}
				onReorder={() => {}}
				aria-label="Board"
			>
				<KanbanColumn value="todo" aria-label="Todo">
					<KanbanColumnBody>
						<KanbanCard value="1" aria-label="One">
							<KanbanCardHandle />
							One
							<button type="button">Edit</button>
							<a href="#one">Open</a>
						</KanbanCard>
					</KanbanColumnBody>
				</KanbanColumn>
			</Kanban>,
		)

		expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()

		expect(screen.getByRole('link', { name: 'Open' })).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Drag One' })).toBeInTheDocument()

		const results = await axe(container)

		expect(results.violations).toEqual([])
	})

	it('names the handle from its own aria-label', () => {
		renderUI(
			<Kanban
				columns={columns}
				getKey={(item: Item) => item.id}
				onReorder={() => {}}
				aria-label="Board"
			>
				<KanbanColumn value="todo">
					<KanbanColumnBody>
						<KanbanCard value="1">
							<KanbanCardHandle aria-label="Move the first card" />
							One
						</KanbanCard>
					</KanbanColumnBody>
				</KanbanColumn>
			</Kanban>,
		)

		const handle = screen.getByRole('button', { name: 'Move the first card' })

		expect(handle).not.toHaveAttribute('aria-labelledby')
	})

	it('renders no handle on a read-only board', () => {
		const { container } = renderUI(
			<Kanban columns={columns} getKey={(item: Item) => item.id} aria-label="Board">
				<KanbanColumn value="todo">
					<KanbanColumnBody>
						<KanbanCard value="1">
							<KanbanCardHandle />
							One
						</KanbanCard>
					</KanbanColumnBody>
				</KanbanColumn>
			</Kanban>,
		)

		expect(bySlot(container, 'kanban-card-handle')).toBeNull()

		expect(screen.queryByRole('button')).toBeNull()
	})

	it('renders the handle as a disabled picture on a disabled board', () => {
		const { container } = renderUI(
			<Kanban
				columns={columns}
				getKey={(item: Item) => item.id}
				onReorder={() => {}}
				disabled
				aria-label="Board"
			>
				<KanbanColumn value="todo">
					<KanbanColumnBody>
						<KanbanCard value="1">
							<KanbanCardHandle />
							One
						</KanbanCard>
					</KanbanColumnBody>
				</KanbanColumn>
			</Kanban>,
		)

		const handle = getSlot(container, 'kanban-card-handle')

		expect(handle.tagName).toBe('SPAN')

		expect(handle).toHaveAttribute('aria-hidden', 'true')

		expect(handle).toHaveAttribute('data-disabled')

		expect(screen.queryByRole('button')).toBeNull()
	})

	it('warns when an interactive card holds no handle', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		renderUI(
			<Kanban
				columns={columns}
				getKey={(item: Item) => item.id}
				onReorder={() => {}}
				aria-label="Board"
			>
				<KanbanColumn value="todo">
					<KanbanColumnBody>
						<KanbanCard value="1">One</KanbanCard>
					</KanbanColumnBody>
				</KanbanColumn>
			</Kanban>,
		)

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('holds no <KanbanCardHandle>'))

		warn.mockRestore()
	})

	it('does not warn for an interactive card with a handle', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		renderUI(<Board onValueChange={() => {}} />)

		expect(warn).not.toHaveBeenCalled()

		warn.mockRestore()
	})

	it('honors a custom aria-label on an interactive card, and names the handle from it', () => {
		const { container } = renderUI(
			<Kanban
				columns={columns}
				getKey={(item: Item) => item.id}
				onReorder={() => {}}
				aria-label="Board"
			>
				<KanbanColumn value="todo">
					<KanbanColumnBody>
						<KanbanCard value="1" aria-label="Card One">
							<KanbanCardHandle />
							One
						</KanbanCard>
					</KanbanColumnBody>
				</KanbanColumn>
			</Kanban>,
		)

		// The card has no role, so its list item carries the name.
		expect(screen.getByRole('listitem', { name: 'Card One' })).toBe(
			getSlot(container, 'kanban-card-item'),
		)

		expect(getSlot(container, 'kanban-card')).not.toHaveAttribute('aria-label')

		expect(screen.getByRole('button', { name: 'Drag Card One' })).toBe(
			getSlot(container, 'kanban-card-handle'),
		)
	})

	it('names a read-only card as a list item of its column body', () => {
		const { container } = renderUI(
			<Kanban columns={columns} getKey={(item: Item) => item.id} aria-label="Board">
				<KanbanColumn value="todo">
					<KanbanColumnBody>
						<KanbanCard value="1" aria-label="Card One">
							One
						</KanbanCard>
					</KanbanColumnBody>
				</KanbanColumn>
			</Kanban>,
		)

		const card = getSlot(container, 'kanban-card')

		expect(card.tagName).toBe('LI')

		expect(card).toHaveAttribute('aria-label', 'Card One')

		expect(bySlot(container, 'kanban-column-body')?.tagName).toBe('UL')
	})

	it('names a disabled card, and leaves no ARIA result for axe to review', async () => {
		const { container } = renderUI(
			<Kanban
				columns={columns}
				getKey={(item: Item) => item.id}
				onReorder={() => {}}
				disabled
				aria-label="Board"
			>
				<KanbanColumn value="todo" aria-label="Todo">
					<KanbanColumnBody>
						<KanbanCard value="1" aria-label="Card One">
							One
						</KanbanCard>
					</KanbanColumnBody>
				</KanbanColumn>
			</Kanban>,
		)

		expect(bySlot(container, 'kanban-card')).toHaveAttribute('aria-label', 'Card One')

		// A name on an element with no role reads as "incomplete", not as a
		// violation, so the check reads both result types.
		const results = await axe(container)

		expect(results.violations).toEqual([])

		expect(results.incomplete.map((result) => result.id)).not.toContain('aria-prohibited-attr')
	})

	it('lists the cards of an interactive body in li items, and keeps an empty body out of a list', () => {
		const { container } = renderUI(
			<Kanban
				columns={columns}
				getKey={(item: Item) => item.id}
				onReorder={() => {}}
				aria-label="Board"
			>
				<KanbanColumn value="todo">
					<KanbanColumnBody>
						<KanbanCard value="1">
							<KanbanCardHandle />
							One
						</KanbanCard>
					</KanbanColumnBody>
				</KanbanColumn>
			</Kanban>,
		)

		const list = screen.getByRole('list')

		expect(list).toBe(bySlot(container, 'kanban-column-body'))

		const [item] = within(list).getAllByRole('listitem')

		// The handle button is inside the list item, and the card is not a button.
		expect(within(present(item, 'listitem')).getByRole('button', { name: 'Drag One' })).toBe(
			bySlot(container, 'kanban-card-handle'),
		)

		expect(bySlot(container, 'kanban-card')).not.toHaveAttribute('role')

		const empty = renderUI(
			<Kanban columns={columns} getKey={(item: Item) => item.id} aria-label="Board">
				<KanbanColumn value="todo">
					<KanbanColumnBody empty="No cards" />
				</KanbanColumn>
			</Kanban>,
		)

		expect(bySlot(empty.container, 'kanban-column-body')?.tagName).toBe('DIV')

		expect(empty.container.querySelector('ul, li')).toBeNull()
	})

	it('marks an interactive card as lifted on Space, and clears it when the handle blurs', () => {
		const { container } = renderUI(<Board onValueChange={() => {}} />)

		const card = getSlot(container, 'kanban-card')

		const handle = handleOf(container, '1')

		handle.focus()

		fireEvent.keyDown(handle, { key: ' ' })

		expect(card).toHaveAttribute('data-lifted')

		fireEvent.blur(handle)

		expect(card).not.toHaveAttribute('data-lifted')
	})
})

describe('KanbanColumnBody', () => {
	// Conditional card slots that are all false render nothing. The body must
	// count rendered children, not slots, so the placeholder shows and the
	// read-only list role drops.
	// Both cards are items of the column, so a rendered pair names no stray card.
	const pairColumns: Column[] = [
		{
			id: 'todo',
			title: 'Todo',
			items: [
				{ id: '1', title: 'One' },
				{ id: '2', title: 'Two' },
			],
		},
	]

	function EmptyBody({ show, pair }: { show: boolean; pair: boolean }) {
		return (
			<Kanban columns={pairColumns} getKey={(item: Item) => item.id} aria-label="Board">
				<KanbanColumn value="todo">
					{pair ? (
						<KanbanColumnBody empty="No cards">
							{show && <KanbanCard value="1">One</KanbanCard>}
							{show && <KanbanCard value="2">Two</KanbanCard>}
						</KanbanColumnBody>
					) : (
						<KanbanColumnBody empty="No cards">
							{show && <KanbanCard value="1">One</KanbanCard>}
						</KanbanColumnBody>
					)}
				</KanbanColumn>
			</Kanban>
		)
	}

	it.each([
		['two false slots', true],
		['one false slot', false],
	])('shows the empty placeholder for %s', (_name, pair) => {
		const { container } = renderUI(<EmptyBody show={false} pair={pair} />)

		expect(screen.getByText('No cards')).toBeInTheDocument()

		expect(bySlot(container, 'kanban-column-body')?.tagName).toBe('DIV')
	})

	it('keeps the list for a rendered slot on a read-only board', () => {
		const { container } = renderUI(<EmptyBody show pair />)

		expect(screen.queryByText('No cards')).not.toBeInTheDocument()

		expect(bySlot(container, 'kanban-column-body')?.tagName).toBe('UL')
	})

	it('renders children when the column has cards, omitting the empty fallback', () => {
		const { container } = renderUI(<Board />)

		// With non-empty items the fallback element does not render.
		expect(screen.queryByText('Empty')).not.toBeInTheDocument()

		expect(bySlot(container, 'kanban-card')).toBeInTheDocument()
	})

	it('renders nothing when the column is empty and no fallback is provided', () => {
		const { container } = renderUI(
			<Kanban
				columns={[{ id: 'x', title: 'X', items: [] }]}
				getKey={(i: Item) => i.id}
				aria-label="Board"
			>
				<KanbanColumn value="x">
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
	const itemIds = (next: Column[], columnId: string) =>
		next.find((column) => column.id === columnId)?.items.map((item) => item.id)

	it('moves focus between cards with arrow keys when no card is lifted', () => {
		const { container } = renderUI(<KeyboardBoard />)

		handleOf(container, 'a').focus()

		fireEvent.keyDown(handleOf(container, 'a'), { key: 'ArrowDown' })

		expect(document.activeElement).toBe(handleOf(container, 'b'))

		fireEvent.keyDown(handleOf(container, 'b'), { key: 'ArrowRight' })

		expect(document.activeElement).toBe(handleOf(container, 'd'))
	})

	it('reorders within the column when a lifted card is moved down', () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(<KeyboardBoard onValueChange={onValueChange} />)

		const handle = handleOf(container, 'a')

		handle.focus()

		fireEvent.keyDown(handle, { key: ' ' })

		expect(cardOf(container, 'a')).toHaveAttribute('data-lifted')

		fireEvent.keyDown(handle, { key: 'ArrowDown' })

		expect(onValueChange).toHaveBeenCalledTimes(1)

		expect(itemIds(onValueChange.mock.calls[0]?.[0], 'todo')).toEqual(['b', 'a', 'c'])
	})

	it('moves a lifted card into the next column with ArrowRight', () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(<KeyboardBoard onValueChange={onValueChange} />)

		const handle = handleOf(container, 'a')

		handle.focus()

		fireEvent.keyDown(handle, { key: ' ' })

		fireEvent.keyDown(handle, { key: 'ArrowRight' })

		const next = onValueChange.mock.calls[0]?.[0]

		expect(itemIds(next, 'todo')).toEqual(['b', 'c'])

		expect(itemIds(next, 'done')).toEqual(['d', 'a'])
	})

	it('drops a lifted card on Escape without reordering', () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(<KeyboardBoard onValueChange={onValueChange} />)

		const handle = handleOf(container, 'a')

		handle.focus()

		fireEvent.keyDown(handle, { key: ' ' })

		expect(cardOf(container, 'a')).toHaveAttribute('data-lifted')

		fireEvent.keyDown(handle, { key: 'Escape' })

		expect(cardOf(container, 'a')).not.toHaveAttribute('data-lifted')

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('ignores arrow keys held with a modifier', () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(<KeyboardBoard onValueChange={onValueChange} />)

		const handle = handleOf(container, 'a')

		handle.focus()

		fireEvent.keyDown(handle, { key: 'ArrowDown', shiftKey: true })

		expect(document.activeElement).toBe(handle)

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('leaves Space and arrow keys to a control inside a card', () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(
			<Kanban
				columns={columns}
				getKey={(item: Item) => item.id}
				onReorder={onValueChange}
				aria-label="Board"
			>
				<KanbanColumn value="todo">
					<KanbanColumnBody>
						<KanbanCard value="1">
							<KanbanCardHandle />
							<input aria-label="Note" />
						</KanbanCard>
					</KanbanColumnBody>
				</KanbanColumn>
			</Kanban>,
		)

		const input = screen.getByRole('textbox', { name: 'Note' })

		input.focus()

		expect(fireEvent.keyDown(input, { key: ' ' })).toBe(true)

		expect(fireEvent.keyDown(input, { key: 'ArrowDown' })).toBe(true)

		expect(getSlot(container, 'kanban-card')).not.toHaveAttribute('data-lifted')

		expect(document.activeElement).toBe(input)
	})
})

describe('Kanban keyboard announcements', () => {
	// Dependent keydowns fire synchronously (each fireEvent is act-flushed) so the
	// lifted state can't be lost to an `await` yielding mid-sequence; only the
	// final message is awaited.
	const liftedCard = (container: HTMLElement) => {
		const handle = handleOf(container, 'a')

		handle.focus()

		fireEvent.keyDown(handle, { key: ' ' })

		return handle
	}

	it('announces the card name, column, and position on lift', async () => {
		liftedCard(renderUI(<KeyboardBoard />).container)

		await expectAnnouncement('Picked up A, position 1 of 3 in Todo', 'assertive')
	})

	it('announces the new position on a within-column move', async () => {
		const handle = liftedCard(renderUI(<KeyboardBoard />).container)

		fireEvent.keyDown(handle, { key: 'ArrowDown' })

		await expectAnnouncement('A moved to position 2 of 3 in Todo', 'assertive')
	})

	it('announces a cross-column move with the target column name', async () => {
		const handle = liftedCard(renderUI(<KeyboardBoard />).container)

		fireEvent.keyDown(handle, { key: 'ArrowRight' })

		await expectAnnouncement('A moved to Done, position 2 of 2', 'assertive')
	})

	it('announces the drop', async () => {
		const handle = liftedCard(renderUI(<KeyboardBoard />).container)

		fireEvent.keyDown(handle, { key: 'Enter' })

		await expectAnnouncement('Dropped A, position 1 of 3 in Todo', 'assertive')
	})
})

describe('KanbanColumn naming', () => {
	it('names the column group from its title when no aria-label is given', () => {
		renderUI(
			<Kanban columns={columns} getKey={(item: Item) => item.id} aria-label="Board">
				{columns.map((column) => (
					<KanbanColumn key={column.id} value={column.id}>
						<KanbanColumnHeader>
							<KanbanColumnTitle>{column.title}</KanbanColumnTitle>
						</KanbanColumnHeader>
					</KanbanColumn>
				))}
			</Kanban>,
		)

		// The group's aria-labelledby resolves to the rendered title.
		expect(screen.getByRole('group', { name: 'Todo' })).toBeInTheDocument()

		expect(screen.getByRole('group', { name: 'Done' })).toBeInTheDocument()
	})

	it('adds no region landmark for a column, so the board is the one region', () => {
		renderUI(
			<Kanban columns={columns} getKey={(item: Item) => item.id} aria-label="Board">
				{columns.map((column) => (
					<KanbanColumn key={column.id} value={column.id}>
						<KanbanColumnHeader>
							<KanbanColumnTitle>{column.title}</KanbanColumnTitle>
						</KanbanColumnHeader>
					</KanbanColumn>
				))}
			</Kanban>,
		)

		expect(
			screen.getAllByRole('region').map((region) => region.getAttribute('aria-label')),
		).toEqual(['Board'])
	})

	it('renders the title as a level 3 heading, or at the level that it is given', () => {
		renderUI(
			<Kanban columns={columns} getKey={(item: Item) => item.id} aria-label="Board">
				<KanbanColumn value="todo">
					<KanbanColumnHeader>
						<KanbanColumnTitle>Todo</KanbanColumnTitle>
					</KanbanColumnHeader>
				</KanbanColumn>
				<KanbanColumn value="done">
					<KanbanColumnHeader>
						<KanbanColumnTitle level={2}>Done</KanbanColumnTitle>
					</KanbanColumnHeader>
				</KanbanColumn>
			</Kanban>,
		)

		expect(screen.getByRole('heading', { level: 3, name: 'Todo' })).toBeInTheDocument()

		expect(screen.getByRole('heading', { level: 2, name: 'Done' })).toBeInTheDocument()
	})

	it('omits aria-labelledby when no title is rendered, so it never dangles', () => {
		const { container } = renderUI(
			<Kanban columns={columns} getKey={(item: Item) => item.id} aria-label="Board">
				{columns.map((column) => (
					<KanbanColumn key={column.id} value={column.id} />
				))}
			</Kanban>,
		)

		const sections = container.querySelectorAll('[data-slot="kanban-column"]')

		expect(sections).toHaveLength(2)

		for (const section of sections) {
			expect(section).not.toHaveAttribute('aria-labelledby')
		}
	})

	it('keeps the title ids of two boards with the same column keys apart', () => {
		const board = (label: string) => (
			<Kanban columns={columns} getKey={(item: Item) => item.id} aria-label={label}>
				{columns.map((column) => (
					<KanbanColumn key={column.id} value={column.id}>
						<KanbanColumnHeader>
							<KanbanColumnTitle>{`${label} ${column.title}`}</KanbanColumnTitle>
						</KanbanColumnHeader>
					</KanbanColumn>
				))}
			</Kanban>
		)

		renderUI(
			<>
				{board('First')}
				{board('Second')}
			</>,
		)

		const ids = allBySlot(document.body, 'kanban-column-title').map((title) => title.id)

		expect(new Set(ids).size).toBe(ids.length)

		expect(screen.getByRole('group', { name: 'Second Todo' })).toBeInTheDocument()
	})
})

describe('Kanban key joins', () => {
	// The board takes data and structure apart and joins them by key, which
	// nothing in the type enforces. Both halves warn.
	it('warns when a column key names no column in the data', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		renderUI(
			<Kanban columns={columns} getKey={(item: Item) => item.id} aria-label="Board">
				<KanbanColumn value="nope" />
			</Kanban>,
		)

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('names no column'))

		warn.mockRestore()
	})

	it('warns when a card key names no item in its column', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		renderUI(
			<Kanban columns={columns} getKey={(item: Item) => item.id} aria-label="Board">
				<KanbanColumn value="todo">
					<KanbanCard value="nope">Ghost</KanbanCard>
				</KanbanColumn>
			</Kanban>,
		)

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('names no item'))

		warn.mockRestore()
	})
})

describe('KanbanCardSkeleton', () => {
	it('hides its card from assistive technology and draws two lines', () => {
		const { container } = renderUI(<KanbanCardSkeleton />)

		const root = present(container.firstElementChild, 'skeleton')

		expect(root).toHaveAttribute('aria-hidden', 'true')

		expect(allBySlot(container, 'placeholder')).toHaveLength(2)
	})

	it('renders a list item, so it is a valid child of the list of a real column', () => {
		const { container } = renderUI(
			<Kanban columns={columns} getKey={(item: Item) => item.id} aria-label="Board">
				<KanbanColumn value="todo" aria-label="Todo">
					<KanbanColumnBody>
						<KanbanCardSkeleton />
						<KanbanCardSkeleton />
					</KanbanColumnBody>
				</KanbanColumn>
			</Kanban>,
		)

		const body = getSlot(container, 'kanban-column-body')

		expect(body.tagName).toBe('UL')

		expect([...body.children].map((child) => child.tagName)).toEqual(['LI', 'LI'])
	})
})
