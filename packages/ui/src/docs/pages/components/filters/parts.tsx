import { Button } from 'ui/button'
import { FiltersClear, useFilters } from 'ui/filters'
import { JsonTree } from 'ui/json-tree'

export function FilterValue({
	expanded,
	onExpandedChange,
}: {
	expanded: Set<string>
	onExpandedChange: (expanded: Set<string>) => void
}) {
	const { value } = useFilters()

	return (
		<JsonTree
			data={JSON.parse(JSON.stringify(value))}
			expanded={expanded}
			onExpandedChange={onExpandedChange}
		/>
	)
}

export function ResetButton() {
	const { activeCount } = useFilters()

	if (activeCount === 0) return null

	return (
		<FiltersClear>
			<Button variant="soft" color="red">
				Reset
			</Button>
		</FiltersClear>
	)
}
