import { useState } from 'react'
import { QueryBuilder, type QueryGroup, QuerySummary } from 'ui/query'
import { Stack } from 'ui/stack'
import { fields, filters } from './data.ts'

export default function Reorder() {
	const [query, setQuery] = useState<QueryGroup>(filters)

	// Drag a grip, press Space on it and use the arrow keys, or pick a move from
	// the Move button at the end of the node. A node moves among its siblings
	// between the AND and OR separators, which stay in their positions. Drag a
	// node over another group to move it there, press the left or right arrow
	// while it is lifted, or pick "Move into group" from the menu.
	return (
		<Stack gap="md">
			<QueryBuilder fields={fields} value={query} onValueChange={setQuery} reorder />
			<QuerySummary value={query} fields={fields} />
		</Stack>
	)
}
