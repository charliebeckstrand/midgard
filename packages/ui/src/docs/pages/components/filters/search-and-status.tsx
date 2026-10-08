import { useState } from 'react'
import { Label } from 'ui/fieldset'
import { Filters, FiltersBar, FiltersField, FiltersRow, FiltersSuffix } from 'ui/filters'
import { Input } from 'ui/input'
import { Select, SelectLabel, SelectOption } from 'ui/select'
import { FiltersReset, FilterValue } from './parts.tsx'

type Value = {
	search: string | undefined
	status: string | undefined
}

export default function SearchAndStatus() {
	const [filters, setFilters] = useState<Value>({ search: undefined, status: undefined })

	const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

	return (
		<Filters
			aria-label="Filters"
			value={filters}
			onValueChange={setFilters}
			onClear={() => setExpanded(new Set())}
		>
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
							<SelectOption value="pending">
								<SelectLabel>Pending</SelectLabel>
							</SelectOption>
						</Select>
					</FiltersField>
				</FiltersRow>
				<FiltersReset />
			</FiltersBar>
			<FiltersSuffix>
				<FilterValue expanded={expanded} onExpandedChange={setExpanded} />
			</FiltersSuffix>
		</Filters>
	)
}
