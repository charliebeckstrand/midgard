import { useDeferredValue, useState } from 'react'
import { JsonTree } from 'ui/json-tree'
import { SearchInput } from 'ui/search-input'
import { sample } from './sample.ts'

export default function SearchWithFilter() {
	const [search, setSearch] = useState('')

	const deferredSearch = useDeferredValue(search)

	return (
		<>
			<SearchInput
				aria-label="Filter tree"
				placeholder="Filter tree"
				value={search}
				onValueChange={setSearch}
			/>
			<JsonTree data={sample} search={{ value: deferredSearch, filter: true }} />
		</>
	)
}
