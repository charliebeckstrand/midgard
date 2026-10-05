import { useDeferredValue, useState } from 'react'
import { JsonTree } from 'ui/json-tree'
import { SearchInput } from 'ui/search-input'
import { sample } from './sample.ts'

export default function Search() {
	const [search, setSearch] = useState('')

	const deferredSearch = useDeferredValue(search)

	return (
		<>
			<SearchInput
				aria-label="Search tree"
				placeholder="Search tree"
				value={search}
				onValueChange={setSearch}
			/>
			<JsonTree data={sample} search={deferredSearch} />
		</>
	)
}
