import { FormFiltersClear, useFormFilters } from 'ui/form'
import { JsonTree } from 'ui/json-tree'
import { ResetButton } from '../../../../kit/reset-button.tsx'

export function FilterValue({
	expanded,
	onExpandedChange,
}: {
	expanded: Set<string>
	onExpandedChange: (expanded: Set<string>) => void
}) {
	const { value } = useFormFilters()

	return (
		<JsonTree
			data={JSON.parse(JSON.stringify(value))}
			expanded={expanded}
			onExpandedChange={onExpandedChange}
		/>
	)
}

export function FiltersReset() {
	const { activeCount } = useFormFilters()

	if (activeCount === 0) return null

	return (
		<FormFiltersClear>
			<ResetButton type="button" />
		</FormFiltersClear>
	)
}
