import { type ReactElement, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { List, ListItem } from '../../components/list'
import {
	Kanban,
	KanbanCard,
	KanbanCardHandle,
	KanbanColumn,
	KanbanColumnBody,
} from '../../modules/kanban'
import { createGroup, QueryBuilder, type QueryRule } from '../../modules/query'
import { allBySlot, getSlot, renderUI, screen } from '../helpers'

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

	/**
	 * Lifts the first item, disables the surface, and enables it again. The item
	 * must be at rest while disabled, and the next arrow must not move it.
	 */
	async function liftThenDisable(
		surface: (disabled: boolean) => ReactElement,
		parts: {
			handle: () => HTMLElement
			lifted: () => boolean
			order: () => (string | undefined)[]
		},
	) {
		const { rerender } = renderUI(surface(false))

		parts.handle().focus()

		await userEvent.keyboard(' ')

		await expect.poll(parts.lifted).toBe(true)

		rerender(surface(true))

		expect(parts.lifted()).toBe(false)

		rerender(surface(false))

		parts.handle().focus()

		await userEvent.keyboard('{ArrowDown}')

		// Not lifted, so the arrow moves focus and not the item.
		expect(parts.order()).toEqual(['a', 'b'])
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

		const cards = () => allBySlot(document.body, 'kanban-card')

		await liftThenDisable((disabled) => <Board disabled={disabled} />, {
			handle: () => getSlot(cards()[0] as HTMLElement, 'kanban-card-handle'),
			// A disabled card has no `data-lifted`, so the class of the lift is the
			// difference from a card that was never lifted.
			lifted: () => {
				const [first, second] = cards()

				return first?.hasAttribute('data-lifted') || first?.className !== second?.className
			},
			order: () => cards().map((card) => card.dataset.cardId),
		})
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

		const rows = () => allBySlot(document.body, 'list-item')

		await liftThenDisable((disabled) => <Rows disabled={disabled} />, {
			handle: () => rows()[0] as HTMLElement,
			lifted: () => !!rows()[0]?.hasAttribute('data-lifted'),
			order: () => rows().map((row) => row.dataset.itemId),
		})
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

		const grip = () => screen.getByRole('button', { name: 'Reorder Name contains a' })

		await liftThenDisable((disabled) => <Builder disabled={disabled} />, {
			handle: grip,
			lifted: () => grip().hasAttribute('data-dragging'),
			order: () => allBySlot(document.body, 'query-sortable').map((node) => node.dataset.nodeId),
		})
	})
})
