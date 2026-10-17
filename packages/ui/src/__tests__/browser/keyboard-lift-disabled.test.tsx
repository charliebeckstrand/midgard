import { type ReactNode, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import {
	Kanban,
	KanbanCard,
	KanbanCardHandle,
	KanbanColumn,
	KanbanColumnBody,
} from '../../components/kanban'
import { List, ListItem } from '../../components/list'
import { createGroup, QueryBuilder, type QueryRule } from '../../modules/query'
import { act, allBySlot, getSlot, renderUI, screen } from '../helpers'

/**
 * A keyboard lift ends when its surface stops taking a lift. A disabled board,
 * list, or query builder swaps or disables the handle, so focus leaves the
 * handle with no blur, and a lift that stays shows a raised item. Then the
 * first arrow after the surface turns enabled again moves the item, with no
 * Space and no "Picked up" announcement.
 *
 * Rides the real browser for real focus and a real blur.
 */
describe('keyboard lift on disable (real browser)', () => {
	type Item = { id: string; label: string }

	const items: Item[] = [
		{ id: 'a', label: 'Alpha' },
		{ id: 'b', label: 'Bravo' },
	]

	let setDisabled: (disabled: boolean) => void = () => {}

	/** Holds the disabled flag of the surface, so the test can toggle it. */
	function Toggle({ children }: { children: (disabled: boolean) => ReactNode }) {
		const [disabled, set] = useState(false)

		setDisabled = set

		return children(disabled)
	}

	const toggle = async (disabled: boolean) => {
		await act(async () => setDisabled(disabled))
	}

	it('drops the lift of a Kanban card when the board turns disabled', async () => {
		type Column = { id: string; items: Item[] }

		function Board({ disabled }: { disabled: boolean }) {
			const [columns, setColumns] = useState<Column[]>([{ id: 'todo', items }])

			return (
				<Kanban
					columns={columns}
					getKey={(item: Item) => item.id}
					onReorder={setColumns}
					disabled={disabled}
					aria-label="Board"
				>
					{columns.map((column) => (
						<KanbanColumn key={column.id} value={column.id} aria-label="Todo">
							<KanbanColumnBody>
								{column.items.map((item) => (
									<KanbanCard key={item.id} value={item.id}>
										<KanbanCardHandle />
										<span>{item.label}</span>
									</KanbanCard>
								))}
							</KanbanColumnBody>
						</KanbanColumn>
					))}
				</Kanban>
			)
		}

		const { container } = renderUI(<Toggle>{(disabled) => <Board disabled={disabled} />}</Toggle>)

		const order = () => allBySlot(container, 'kanban-card').map((card) => card.dataset.cardId)

		const card = () => getSlot(container, 'kanban-card')

		getSlot(card(), 'kanban-card-handle').focus()

		await userEvent.keyboard(' ')

		await expect.poll(() => card().hasAttribute('data-lifted')).toBe(true)

		await toggle(true)

		expect(card().className).toBe(allBySlot(container, 'kanban-card')[1]?.className)

		await toggle(false)

		expect(card().hasAttribute('data-lifted')).toBe(false)

		getSlot(card(), 'kanban-card-handle').focus()

		await userEvent.keyboard('{ArrowDown}')

		// Not lifted, so the arrow moves focus and not the card.
		expect(order()).toEqual(['a', 'b'])
	})

	it('drops the lift of a List row when the list turns disabled', async () => {
		function Rows({ disabled }: { disabled: boolean }) {
			const [rows, setRows] = useState(items)

			return (
				<List items={rows} getKey={(item) => item.id} onReorder={setRows} disabled={disabled}>
					{(item) => <ListItem>{item.label}</ListItem>}
				</List>
			)
		}

		const { container } = renderUI(<Toggle>{(disabled) => <Rows disabled={disabled} />}</Toggle>)

		const order = () => allBySlot(container, 'list-item').map((row) => row.dataset.itemId)

		const row = () => getSlot(container, 'list-item')

		row().focus()

		await userEvent.keyboard(' ')

		await expect.poll(() => row().hasAttribute('data-lifted')).toBe(true)

		await toggle(true)

		expect(row().hasAttribute('data-lifted')).toBe(false)

		await toggle(false)

		row().focus()

		await userEvent.keyboard('{ArrowDown}')

		expect(order()).toEqual(['a', 'b'])
	})

	it('drops the lift of a query rule when the builder turns disabled', async () => {
		const rule = (id: string): QueryRule => ({
			id,
			type: 'rule',
			combinator: 'and',
			field: 'name',
			operator: 'contains',
			value: id,
		})

		function Builder({ disabled }: { disabled: boolean }) {
			const [query, setQuery] = useState(() => createGroup('and', [rule('a'), rule('b')]))

			return (
				<QueryBuilder
					fields={[{ name: 'name', label: 'Name', type: 'text' }]}
					value={query}
					onValueChange={setQuery}
					disabled={disabled}
					reorder
				/>
			)
		}

		const { container } = renderUI(<Toggle>{(disabled) => <Builder disabled={disabled} />}</Toggle>)

		const order = () => allBySlot(container, 'query-sortable').map((node) => node.dataset.nodeId)

		const grip = () => screen.getByRole('button', { name: 'Reorder Name contains a' })

		grip().focus()

		await userEvent.keyboard(' ')

		await expect.poll(() => grip().hasAttribute('data-dragging')).toBe(true)

		await toggle(true)

		expect(grip().hasAttribute('data-dragging')).toBe(false)

		await toggle(false)

		grip().focus()

		await userEvent.keyboard('{ArrowDown}')

		expect(order()).toEqual(['a', 'b'])
	})
})
