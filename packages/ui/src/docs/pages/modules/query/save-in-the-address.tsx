import { useState } from 'react'
import { Code } from 'ui/code'
import { QueryBuilder, type QueryGroup, serializeQuery } from 'ui/query'
import { Stack } from 'ui/stack'
import { fields, seed } from './data.ts'

// `serializeQuery` writes the query as the value of a search param. On load,
// `parseQuery(params.get('q'), { fields })` reads it back, and repairs or drops
// a rule that a reader changed by hand.
export default function SaveInTheAddress() {
	const [query, setQuery] = useState<QueryGroup>(seed)

	const param = serializeQuery(query)

	return (
		<Stack gap="md">
			<QueryBuilder fields={fields} value={query} onValueChange={setQuery} />
			<Code>{param}</Code>
		</Stack>
	)
}
