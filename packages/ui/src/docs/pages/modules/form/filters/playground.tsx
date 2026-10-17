import { Label } from 'ui/fieldset'
import {
	FormFilters,
	FormFiltersBar,
	FormFiltersClear,
	FormFiltersField,
	type FormFiltersProps,
	FormFiltersRow,
} from 'ui/form'
import { Input } from 'ui/input'
import { Select, SelectLabel, SelectOption } from 'ui/select'

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
						<Select nullable placeholder="All statuses" displayValue={(value: string) => value}>
							<SelectOption value="active">
								<SelectLabel>Active</SelectLabel>
							</SelectOption>
							<SelectOption value="inactive">
								<SelectLabel>Inactive</SelectLabel>
							</SelectOption>
						</Select>
					</FormFiltersField>
				</FormFiltersRow>
				<FormFiltersClear>Clear</FormFiltersClear>
			</FormFiltersBar>
		</FormFilters>
	)
}
