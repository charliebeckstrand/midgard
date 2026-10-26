import { FormFiltersClear, useFormFilters } from 'ui/form'
import { JsonTree } from 'ui/json-tree'
import { useIntl } from 'ui/primitives/intl'
import { ResetButton } from '../../../../kit/reset-button.tsx'

export function FilterValue({
	expanded,
	onExpandedChange,
}: {
	expanded: Set<string>
	onExpandedChange: (expanded: Set<string>) => void
}) {
	const { value } = useFormFilters()

	const { formatDate } = useIntl()

	// A date shows as the reader writes it. Else the tree shows its ISO time in UTC,
	// which can fall on the day before.
	const data = JSON.parse(
		JSON.stringify(value, function (this: Record<string, unknown>, key, entry) {
			const raw = this[key]

			return raw instanceof Date ? formatDate(raw, { dateStyle: 'medium' }) : entry
		}),
	)

	return <JsonTree data={data} expanded={expanded} onExpandedChange={onExpandedChange} />
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
