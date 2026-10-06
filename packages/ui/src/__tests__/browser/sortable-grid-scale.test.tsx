import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { describe, expect, it } from 'vitest'
import { useSortableItem, useSortableList } from '../../hooks'
import { renderUI } from '../helpers'
import { drag } from './helpers/drag'

/**
 * Item 6: in `layout: 'grid'`, `rectSortingStrategy` returns `scaleX`/`scaleY`
 * for items of different sizes. `useSortableItem` writes `CSS.Transform`, which
 * carries the scale, so a neighbor squashes while the drag passes over it. The
 * expected style is a pure translate.
 */
type Item = { id: string; width: number }

const items: Item[] = [
	{ id: 'a', width: 50 },
	{ id: 'b', width: 150 },
	{ id: 'c', width: 100 },
]

function Tile({ item }: { item: Item }) {
	const { setNodeRef, attributes, listeners, style } = useSortableItem({ id: item.id })
	return (
		<div
			ref={setNodeRef}
			data-testid={item.id}
			{...attributes}
			{...listeners}
			style={{ ...style, width: item.width, height: 40, background: '#ccc' }}
		>
			{item.id}
		</div>
	)
}

function Board() {
	const { itemIds, strategy, dndContextProps } = useSortableList({
		items,
		getKey: (i) => i.id,
		layout: 'grid',
		onReorder: () => {},
	})
	return (
		<DndContext {...dndContextProps}>
			<SortableContext items={itemIds} strategy={strategy}>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, width: 400 }}>
					{items.map((item) => (
						<Tile key={item.id} item={item} />
					))}
				</div>
			</SortableContext>
		</DndContext>
	)
}

describe('useSortableItem in a grid of different-size items (real browser)', () => {
	it('moves a neighbor by translate only, with no scale', async () => {
		const { getByTestId } = renderUI(<Board />)
		const a = getByTestId('a')
		const b = getByTestId('b')
		const ra = a.getBoundingClientRect()
		const rb = b.getBoundingClientRect()
		const from = { x: ra.left + ra.width / 2, y: ra.top + ra.height / 2 }
		const to = { x: rb.left + rb.width / 2, y: rb.top + rb.height / 2 }
		const held = await drag(a, from, [
			{ x: from.x + 10, y: from.y },
			{ x: (from.x + to.x) / 2, y: to.y },
			to,
		])
		try {
			await expect.poll(() => b.style.transform).not.toBe('')
			expect(b.style.transform).not.toMatch(/scale/)
		} finally {
			await held.release()
		}
	})
})
