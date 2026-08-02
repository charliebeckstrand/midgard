/**
 * List's per-item mount cost, split by whether the list is reorderable. An
 * `onReorder` arms the dnd-kit sortable context and wires every item as a
 * draggable, so the read-only rung at the same item count is the floor those
 * sensors sit above.
 */

import { describe } from 'vitest'
import { List } from '../components/list'
import { ListItem } from '../components/list/list-item'
import { makeListItems } from './fixtures'
import { mountBench, mountBenches, noop } from './harness'

const getKey = (item: { id: string }) => item.id

function renderItem(item: { title: string }) {
	return <ListItem>{item.title}</ListItem>
}

// Built at collection time: only the render belongs inside the timed region.
const SIZES = [100, 500, 1_000].map((count) => ({ count, items: makeListItems(count) }))

const items1k = makeListItems(1_000)

describe('List · reorderable (onReorder provided)', () => {
	mountBenches(
		SIZES,
		({ count }) => `${count.toLocaleString()} items`,
		({ items }) => (
			<List items={items} getKey={getKey} onReorder={noop}>
				{renderItem}
			</List>
		),
	)
})

describe('List · read-only (no onReorder)', () => {
	mountBench('1,000 items', () => (
		<List items={items1k} getKey={getKey}>
			{renderItem}
		</List>
	))
})
