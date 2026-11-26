import { QueryBuilder, QueryChips } from 'ui/query'
import { Stack } from 'ui/stack'
import { fields, filters } from './data.ts'

export default function ReadOnlyAndDisabled() {
	// A read-only builder keeps each part in the tab order, so a reader can
	// reach each rule, but no part edits or moves the query. A disabled builder
	// leaves the tab order.
	return (
		<Stack gap="md">
			<QueryBuilder fields={fields} defaultValue={filters} readOnly reorder />
			<QueryBuilder fields={fields} defaultValue={filters} disabled />
			<QueryChips aria-label="Read-only filters" fields={fields} defaultValue={filters} readOnly />
			<QueryChips aria-label="Disabled filters" fields={fields} defaultValue={filters} disabled />
		</Stack>
	)
}
