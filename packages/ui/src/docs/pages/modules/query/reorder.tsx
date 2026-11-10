import { useState } from 'react'
import { QueryBuilder, type QueryGroup, QuerySummary } from 'ui/query'
import { Stack } from 'ui/stack'
import { fields, filters } from './data.ts'

export default function Reorder() {
	const [query, setQuery] = useState<QueryGroup>(filters)

	// Drag a grip, or press Space on it and use the arrow keys. A node moves
	// among its siblings between the AND and OR separators, which stay in their
	// positions. Drag a node over another group to move it there, or press the
	// left or right arrow while it is lifted.
	return (
		<Stack gap="md">
			<QueryBuilder fields={fields} value={query} onValueChange={setQuery} reorder />
			<QuerySummary value={query} fields={fields} />
		</Stack>
	)
}
