import { describe, expect, it } from 'vitest'
import {
	Kanban,
	KanbanCard,
	KanbanCardHandle,
	KanbanColumn,
	KanbanColumnBody,
} from '../../components/kanban'
import { allBySlot, getSlot, renderUI } from '../helpers'

/**
 * A kanban card keeps touch scrolling, and its handle is the touch drag
 * surface, as the dashboard card and grip do. With `touch-none` on the card, a
 * finger on a card cannot pan the column or the board.
 */
describe('kanban card touch-action (real browser)', () => {
	const columns = [{ id: 'todo', items: [{ id: 'a' }, { id: 'b' }] }]

	it('lets the card pan, and keeps the handle touch-none', () => {
		const { container } = renderUI(
			<Kanban
				columns={columns}
				getKey={(i: { id: string }) => i.id}
				onReorder={() => {}}
				aria-label="Board"
			>
				<KanbanColumn value="todo" aria-label="Todo">
					<KanbanColumnBody>
						{columns[0]?.items.map((item) => (
							<KanbanCard key={item.id} value={item.id}>
								<KanbanCardHandle />
								<span>{item.id}</span>
							</KanbanCard>
						))}
					</KanbanColumnBody>
				</KanbanColumn>
			</Kanban>,
		)
		const [card] = allBySlot(container, 'kanban-card')
		if (!card) throw new Error('expected a card')
		const handle = getSlot(card, 'kanban-card-handle')
		expect(getComputedStyle(handle).touchAction).toBe('none')
		expect(getComputedStyle(card).touchAction).not.toBe('none')
	})
})
