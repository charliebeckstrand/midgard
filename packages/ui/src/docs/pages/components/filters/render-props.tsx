import { useState } from 'react'
import { Label } from 'ui/fieldset'
import { Filters, FiltersBar, FiltersField, FiltersRow, FiltersSuffix } from 'ui/filters'
import { Input } from 'ui/input'
import { NumberInput } from 'ui/number-input'
import { FiltersReset, FilterValue } from './parts.tsx'

type Value = {
	search: string | undefined
	minPrice: number | undefined
	maxPrice: number | undefined
}

export default function RenderProps() {
	const [filters, setFilters] = useState<Value>({
		search: undefined,
		minPrice: undefined,
		maxPrice: undefined,
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
					<FiltersField<number | null> name="minPrice">
						{({ value, onValueChange }) => (
							<>
								<Label>Min price</Label>
								<NumberInput placeholder="0" min={0} value={value} onValueChange={onValueChange} />
							</>
						)}
					</FiltersField>
					<FiltersField<number | null> name="maxPrice">
						{({ value, onValueChange }) => (
							<>
								<Label>Max price</Label>
								<NumberInput
									placeholder="1000"
									min={0}
									value={value}
									onValueChange={onValueChange}
								/>
							</>
						)}
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
