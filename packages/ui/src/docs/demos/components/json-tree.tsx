import { useDeferredValue, useState } from 'react'
import { Button } from '../../../components/button'
import { collectJsonTreePaths, JsonTree } from '../../../components/json-tree'
import { SearchInput } from '../../../components/search-input'
import { Stack } from '../../../components/stack'
import { Example } from '../../engine'

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

const allSamplePaths = collectJsonTreePaths(sample)

function ExpandAllExample() {
	const [expanded, setExpanded] = useState<Set<string>>(allSamplePaths)

	const allExpanded = expanded.size === allSamplePaths.size

	return (
		<Stack gap="lg">
			<div>
				<Button
					variant="outline"
					onClick={() => setExpanded(allExpanded ? new Set() : allSamplePaths)}
				>
					{allExpanded ? 'Collapse all' : 'Expand all'}
				</Button>
			</div>
			<JsonTree data={sample} expanded={expanded} onExpandedChange={setExpanded} />
		</Stack>
	)
}

function SearchExample() {
	const [search, setSearch] = useState('')

	const deferredSearch = useDeferredValue(search)

	return (
		<>
			<SearchInput
				id="json-tree-search"
				placeholder="Search tree"
				autoComplete="off"
				value={search}
				onChange={(event) => setSearch(event.target.value)}
				onClear={() => setSearch('')}
			/>

			<JsonTree data={sample} search={deferredSearch} defaultExpandDepth={1} />
		</>
	)
}

function FilterExample() {
	const [search, setSearch] = useState('')

	const deferredSearch = useDeferredValue(search)

	return (
		<>
			<SearchInput
				id="json-tree-filter-search"
				placeholder="Filter tree"
				autoComplete="off"
				value={search}
				onChange={(event) => setSearch(event.target.value)}
				onClear={() => setSearch('')}
			/>
			<JsonTree
				data={sample}
				search={{ value: deferredSearch, filter: true }}
				defaultExpandDepth={1}
			/>
		</>
	)
}

export function Demo() {
	return (
		<>
			<Example title="Default">
				<JsonTree data={sample} />
			</Example>

			<Example title="Expand all levels">
				<ExpandAllExample />
			</Example>

			<Example title="Collapsed by default">
				<JsonTree data={sample} defaultExpandDepth={0} />
			</Example>

			<Example title="Search">
				<SearchExample />
			</Example>

			<Example title="Search with filter">
				<FilterExample />
			</Example>

			<Example title="Arrays of primitives">
				<JsonTree
					data={['alpha', 'beta', 'gamma', 1, 2, 3, true, false, null]}
					defaultExpandDepth={Number.POSITIVE_INFINITY}
				/>
			</Example>
		</>
	)
}
