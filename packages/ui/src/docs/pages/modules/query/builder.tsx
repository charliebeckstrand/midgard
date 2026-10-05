import { useState } from 'react'
import { JsonTree } from 'ui/json-tree'
import { QueryBuilder, type QueryGroup, QuerySummary } from 'ui/query'
import { Stack } from 'ui/stack'
import { fields, seed } from './data.ts'

export default function Builder() {
	const [query, setQuery] = useState<QueryGroup>(seed)

	// The summary reads the same tree as the builder. It hides when no rule
	// puts a constraint on the rows. The values are strings, so the tree is JSON.
	return (
		<Stack gap="md">
			<QueryBuilder fields={fields} value={query} onValueChange={setQuery} />
			<QuerySummary value={query} fields={fields} />
			<JsonTree data={query} defaultExpandDepth={0} />
		</Stack>
	)
}
