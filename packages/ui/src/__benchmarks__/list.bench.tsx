/**
 * List's per-item mount cost, split by whether the list is reorderable. An
 * `onReorder` renders the list as a Motion `Reorder.Group`, and each item as a
 * `Reorder.Item` with its own drag controls and keyboard lift. The read-only
 * rung at the same item count (plain `ListItemStatic` rows) is the floor that
 * the reorder machinery sits above. The reorder parts load from a chunk of
 * their own, which `setup.ts` loads before the file.
 */

import { List, ListItem } from '../components/list'
import { noop } from '../utilities/noop'
import { compareBenches } from './compare'
import { makeListItems } from './fixtures'
import { mountBench, mountBenches } from './harness'

const getKey = (item: { id: string }) => item.id

function renderItem(item: { title: string }) {
	return <ListItem>{item.title}</ListItem>
}

// Built at collection time: only the render belongs inside the timed region.
const SIZES = [100, 500, 1_000].map((count) => makeListItems(count))

const items1k = SIZES[2] as { id: string; title: string }[]

compareBenches('List · reorderable (onReorder provided)', (bench) => {
	mountBenches(
		bench,
		SIZES,
		(items) => `${items.length.toLocaleString()} items`,
		(items) => (
			<List items={items} getKey={getKey} onReorder={noop}>
				{renderItem}
			</List>
		),
	)
})

compareBenches('List · read-only (no onReorder)', (bench) => {
	mountBench(bench, '1,000 items', () => (
		<List items={items1k} getKey={getKey}>
			{renderItem}
		</List>
	))
})
