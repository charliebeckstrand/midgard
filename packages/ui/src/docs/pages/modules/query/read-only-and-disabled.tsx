import { QueryChips } from 'ui/query'
import { Stack } from 'ui/stack'
import { fields, filters } from './data.ts'

export default function ReadOnlyAndDisabled() {
	return (
		<Stack gap="md">
			<QueryChips aria-label="Read-only filters" fields={fields} defaultValue={filters} readOnly />
			<QueryChips aria-label="Disabled filters" fields={fields} defaultValue={filters} disabled />
		</Stack>
	)
}
