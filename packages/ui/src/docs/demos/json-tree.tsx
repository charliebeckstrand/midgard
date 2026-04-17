'use client'

import { useDeferredValue, useState } from 'react'
import { Button } from '../../components/button'
import { JsonTree } from '../../components/json-tree'
import { SearchInput } from '../../components/search-input'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

const sample = {
	id: 42,
	name: 'Ada Lovelace',
	active: true,
	meta: null,
	tags: ['engineer', 'mathematician'],
	address: {
		city: 'London',
		zip: 'WC2N',
		geo: { lat: 51.507, lng: -0.127 },
	},
	orders: [
		{ id: 1, total: 19.99, shipped: true },
		{ id: 2, total: 7.5, shipped: false },
	],
}

function ExpandAllExample() {
	const [expanded, setExpanded] = useState(true)

	return (
		<Example title="Expand all levels">
			<Stack gap={3}>
				<div>
					<Button size="sm" variant="outline" onClick={() => setExpanded((v) => !v)}>
						{expanded ? 'Collapse all' : 'Expand all'}
					</Button>
				</div>
				<JsonTree
					key={String(expanded)}
					data={sample}
					defaultExpandDepth={expanded ? Number.POSITIVE_INFINITY : 0}
				/>
			</Stack>
		</Example>
	)
}

function SearchExample() {
	const [search, setSearch] = useState('')

	const deferredSearch = useDeferredValue(search)

	return (
		<Example
			title="Search"
			prefix={
				<SearchInput
					id="json-tree-search"
					placeholder="Search tree"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					onClear={() => setSearch('')}
				/>
			}
		>
			<JsonTree data={sample} search={deferredSearch} defaultExpandDepth={1} />
		</Example>
	)
}

function FilterExample() {
	const [search, setSearch] = useState('')

	const deferredSearch = useDeferredValue(search)

	return (
		<Example
			title="Search with filter"
			prefix={
				<SearchInput
					id="json-tree-filter-search"
					placeholder="Filter tree"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					onClear={() => setSearch('')}
				/>
			}
		>
			<JsonTree
				data={sample}
				search={{ value: deferredSearch, filter: true }}
				defaultExpandDepth={1}
			/>
		</Example>
	)
}

export default function JsonTreeDemo() {
	return (
		<Stack gap={6}>
			<Example title="Default">
				<JsonTree data={sample} />
			</Example>

			<ExpandAllExample />

			<Example title="Collapsed by default">
				<Sizer>
					<JsonTree data={sample} defaultExpandDepth={0} />
				</Sizer>
			</Example>

			<SearchExample />

			<FilterExample />

			<Example title="Arrays of primitives">
				<Sizer>
					<JsonTree
						data={['alpha', 'beta', 'gamma', 1, 2, 3, true, false, null]}
						defaultExpandDepth={Number.POSITIVE_INFINITY}
					/>
				</Sizer>
			</Example>
		</Stack>
	)
}
