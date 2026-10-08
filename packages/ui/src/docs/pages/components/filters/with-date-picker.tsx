import { useState } from 'react'
import { DatePicker } from 'ui/date-picker'
import { Label } from 'ui/fieldset'
import { Filters, FiltersBar, FiltersField, FiltersRow, FiltersSuffix } from 'ui/filters'
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
					<FiltersField name="dateRange">
						<Label>Date range</Label>
						<DatePicker range />
					</FiltersField>
					<FiltersField name="category">
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
