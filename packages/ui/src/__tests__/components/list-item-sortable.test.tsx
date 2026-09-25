import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { describe, expect, it } from 'vitest'
import { type ListItemContextValue, useListItemContext } from '../../components/list/context'
import { ListItemSortable } from '../../components/list/list-item-sortable'
import { renderUI } from '../helpers'

/**
 * dnd-kit renders each sortable item again when the item under the pointer
 * changes. The item context keeps its identity while its values hold, so the
 * rows that did not move hold too.
 */
describe('ListItemSortable', () => {
	it('keeps the item context identity across a render with the same values', () => {
		const seen: ListItemContextValue[] = []

		function Probe() {
			seen.push(useListItemContext())

			return null
		}

		const tree = (tick: number) => (
			<DndContext>
				<SortableContext items={['a']}>
					<ListItemSortable id="a">
						<Probe key={tick} />
					</ListItemSortable>
				</SortableContext>
			</DndContext>
		)

		const { rerender } = renderUI(tree(0))

		// dnd-kit sets the transition on the render after the mount.
		rerender(tree(1))

		rerender(tree(2))

		expect(seen).toHaveLength(3)

		expect(seen[2]).toBe(seen[1])
	})
})
