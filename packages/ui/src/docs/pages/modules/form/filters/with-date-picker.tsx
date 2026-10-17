import { useState } from 'react'
import { DatePicker } from 'ui/date-picker'
import { Label } from 'ui/fieldset'
import {
	FormFilters,
	FormFiltersBar,
	FormFiltersField,
	FormFiltersRow,
	FormFiltersSuffix,
} from 'ui/form'
import { Input } from 'ui/input'
import { Select, SelectLabel, SelectOption } from 'ui/select'
import { FiltersReset, FilterValue } from './parts.tsx'

type Value = {
	search: string | undefined
	dateRange: [Date, Date] | undefined
	category: string | undefined
}

export default function WithDatePicker() {
	const [filters, setFilters] = useState<Value>({
		search: undefined,
		dateRange: undefined,
		category: undefined,
	})

	const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

	return (
		<FormFilters
			aria-label="Filters"
			value={filters}
			onValueChange={setFilters}
			onClear={() => setExpanded(new Set())}
		>
			<FormFiltersBar>
				<FormFiltersRow>
					<FormFiltersField name="search">
						<Label>Search</Label>
						<Input placeholder="Search" />
					</FormFiltersField>
					<FormFiltersField name="dateRange">
						<Label>Date range</Label>
						<DatePicker range />
					</FormFiltersField>
					<FormFiltersField name="category">
						<Label>Category</Label>
						<Select nullable placeholder="All categories" displayValue={(value: string) => value}>
							<SelectOption value="engineering">
								<SelectLabel>Engineering</SelectLabel>
							</SelectOption>
							<SelectOption value="design">
								<SelectLabel>Design</SelectLabel>
							</SelectOption>
							<SelectOption value="marketing">
								<SelectLabel>Marketing</SelectLabel>
							</SelectOption>
						</Select>
					</FormFiltersField>
				</FormFiltersRow>
				<FiltersReset />
			</FormFiltersBar>
			<FormFiltersSuffix>
				<FilterValue expanded={expanded} onExpandedChange={setExpanded} />
			</FormFiltersSuffix>
		</FormFilters>
	)
}
