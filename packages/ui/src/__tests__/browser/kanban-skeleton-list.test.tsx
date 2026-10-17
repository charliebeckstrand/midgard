import { describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import {
	Kanban,
	KanbanCard,
	KanbanCardSkeleton,
	KanbanColumn,
	KanbanColumnBody,
} from '../../components/kanban'
import { renderUI } from '../helpers'

/**
 * Kanban column body with skeletons (real accessibility tree). A skeleton is an
 * `aria-hidden` `<li>`, so a body that holds only skeletons must not show AT a
 * list with no items. A body with real cards keeps its list, and the list
 * counts only the real cards.
 */
describe('Kanban skeleton list (real browser)', () => {
	type Item = { id: string; label: string }

	const getKey = (item: Item) => item.id

	it('hides a body that holds only skeletons', () => {
		renderUI(
			<Kanban columns={[{ id: 'todo', items: [] }]} getKey={getKey} aria-label="Board">
				<KanbanColumn value="todo" aria-label="Todo">
					<KanbanColumnBody>
						<KanbanCardSkeleton />
						<KanbanCardSkeleton />
					</KanbanColumnBody>
				</KanbanColumn>
			</Kanban>,
		)

		expect(page.getByRole('list').elements()).toHaveLength(0)
	})

	it('keeps the list of a body with real cards and skeletons', () => {
		const items = [{ id: 'a', label: 'Alpha' }]

		renderUI(
			<Kanban columns={[{ id: 'todo', items }]} getKey={getKey} aria-label="Board">
				<KanbanColumn value="todo" aria-label="Todo">
					<KanbanColumnBody>
						{items.map((item) => (
							<KanbanCard key={item.id} value={item.id}>
								{item.label}
							</KanbanCard>
						))}
						<KanbanCardSkeleton />
					</KanbanColumnBody>
				</KanbanColumn>
			</Kanban>,
		)

		expect(page.getByRole('list').elements()).toHaveLength(1)
		expect(page.getByRole('listitem').elements()).toHaveLength(1)
	})
})
