import { useState } from 'react'
import { QueryBuilder, QueryChips, type QueryGroup } from 'ui/query'
import { Stack } from 'ui/stack'
import { fields, filters } from './data.ts'

export default function Chips() {
	const [query, setQuery] = useState<QueryGroup>(filters)

	// Remove a chip to remove its rule, or click AND or OR to change it. The
	// builder shows each change.
	return (
		<Stack gap="md">
			<QueryChips value={query} fields={fields} onValueChange={setQuery} />
			<QueryBuilder fields={fields} value={query} onValueChange={setQuery} />
		</Stack>
	)
}
