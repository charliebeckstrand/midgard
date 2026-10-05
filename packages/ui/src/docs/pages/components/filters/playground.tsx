import { Label } from 'ui/fieldset'
import {
	Filters,
	FiltersBar,
	FiltersClear,
	FiltersField,
	type FiltersProps,
	FiltersRow,
} from 'ui/filters'
import { Input } from 'ui/input'
import { Select, SelectLabel, SelectOption } from 'ui/select'

export default function FiltersPlayground(props: FiltersProps) {
	return (
		<Filters {...props} aria-label="Filters">
			<FiltersBar>
				<FiltersRow>
					<FiltersField name="search">
						<Label>Search</Label>
						<Input placeholder="Search" />
					</FiltersField>
					<FiltersField name="status">
						<Label>Status</Label>
						<Select nullable placeholder="All statuses" displayValue={(value: string) => value}>
							<SelectOption value="active">
								<SelectLabel>Active</SelectLabel>
							</SelectOption>
							<SelectOption value="inactive">
								<SelectLabel>Inactive</SelectLabel>
							</SelectOption>
						</Select>
					</FiltersField>
				</FiltersRow>
				<FiltersClear>Clear</FiltersClear>
			</FiltersBar>
		</Filters>
	)
}
