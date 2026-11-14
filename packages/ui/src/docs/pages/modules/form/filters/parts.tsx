import { FormFiltersClear, useFormFilters } from 'ui/form'
import { JsonTree } from 'ui/json-tree'
import { useDateFormat } from 'ui/providers/locale'
import { ResetButton } from '../../../../kit/reset-button.tsx'

export function FilterValue({
	expanded,
	onExpandedChange,
}: {
	expanded: Set<string>
	onExpandedChange: (expanded: Set<string>) => void
}) {
	const { value } = useFormFilters()

	const dayFormat = useDateFormat({ dateStyle: 'medium' })

	// A date shows as the reader writes it. Else the tree shows its ISO time in UTC,
	// which can fall on the day before. The text waits for hydration
	// (`useDateFormat`), and the filters hold no date until the reader picks one.
	const data = JSON.parse(
		JSON.stringify(value, function (this: Record<string, unknown>, key, entry) {
			const raw = this[key]

			return raw instanceof Date && dayFormat ? dayFormat.format(raw) : entry
		}),
	)

	return <JsonTree data={data} expanded={expanded} onExpandedChange={onExpandedChange} />
}

export function FiltersReset() {
	return (
		<FormFiltersClear>
			<ResetButton type="button" />
		</FormFiltersClear>
	)
}
