import { Label } from 'ui/fieldset'
import {
	FormFilters,
	FormFiltersBar,
	FormFiltersField,
	type FormFiltersProps,
	FormFiltersRow,
} from 'ui/form'
import { Input } from 'ui/input'
import { Select, SelectLabel, SelectOption } from 'ui/select'
import { FiltersReset } from './parts.tsx'

const statuses = [
	{ value: 'active', label: 'Active' },
	{ value: 'inactive', label: 'Inactive' },
]

const getLabel = (value: string) =>
	statuses.find((status) => status.value === value)?.label ?? value

export default function FiltersPlayground(props: FormFiltersProps) {
	return (
		<FormFilters {...props} aria-label="Filters">
			<FormFiltersBar>
				<FormFiltersRow>
					<FormFiltersField name="search">
						<Label>Search</Label>
						<Input placeholder="Search" />
					</FormFiltersField>
					<FormFiltersField name="status">
						<Label>Status</Label>
						<Select nullable placeholder="All statuses" displayValue={getLabel}>
							{statuses.map((status) => (
								<SelectOption key={status.value} value={status.value}>
									<SelectLabel>{status.label}</SelectLabel>
								</SelectOption>
							))}
						</Select>
					</FormFiltersField>
				</FormFiltersRow>
				<FiltersReset />
			</FormFiltersBar>
		</FormFilters>
	)
}
