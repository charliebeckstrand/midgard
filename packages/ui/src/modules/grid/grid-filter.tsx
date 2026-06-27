'use client'

import { SearchInput } from '../../components/search-input'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import type { GridGlobalFilterView } from './use-grid-table'

/** Props for {@link GridFilter}. @internal */
type GridFilterProps = {
	filter: GridGlobalFilterView
}

/**
 * Quick-search field for a filterable {@link Grid}: a {@link SearchInput} that
 * drives the engine's global filter through {@link GridGlobalFilterView}.
 *
 * @internal
 */
export function GridFilter({ filter }: GridFilterProps) {
	return (
		<div data-slot="grid-filter" className={cn(k.filter.bar)}>
			<SearchInput
				value={filter.value}
				onChange={(event) => filter.setValue(event.target.value)}
				onClear={() => filter.setValue('')}
				placeholder={filter.placeholder}
				aria-label={filter.placeholder}
			/>
		</div>
	)
}
