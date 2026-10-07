/**
 * List's per-item mount cost, split by whether the list is reorderable. An
 * `onReorder` arms the dnd-kit sortable context and wires every item as a
 * draggable, so the read-only rung at the same item count is the floor those
 * sensors sit above.
 */

import { describe } from 'vitest'
import { List } from '../components/list'
import { ListItem } from '../components/list/list-item'
import { noop } from '../utilities/noop'
import { makeListItems } from './fixtures'
import { mountBench, mountBenches } from './harness'

const getKey = (item: { id: string }) => item.id

function renderItem(item: { title: string }) {
	return <ListItem>{item.title}</ListItem>
}

// Built at collection time: only the render belongs inside the timed region.
const SIZES = [100, 500, 1_000].map((count) => makeListItems(count))

const items1k = SIZES[2] as { id: string; title: string }[]

describe('List · reorderable (onReorder provided)', () => {
	mountBenches(
		SIZES,
		(items) => `${items.length.toLocaleString()} items`,
		(items) => (
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
