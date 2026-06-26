'use client'

import { Search } from 'lucide-react'
import { Icon } from '../../components/icon'
import { Input } from '../../components/input'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import type { GridGlobalFilterView } from './use-grid-table'

/** Props for {@link GridFilter}. @internal */
type GridFilterProps = {
	filter: GridGlobalFilterView
}

const SEARCH_ICON = <Icon icon={<Search />} />

/**
 * Quick-search field for a filterable {@link Grid}: a labeled text input that
 * drives the engine's global filter through {@link GridGlobalFilterView}.
 *
 * @internal
 */
export function GridFilter({ filter }: GridFilterProps) {
	return (
		<div data-slot="grid-filter" className={cn(k.filter.bar)}>
			<Input
				type="search"
				value={filter.value}
				onChange={(event) => filter.setValue(event.target.value)}
				placeholder={filter.placeholder}
				aria-label={filter.placeholder}
				prefix={SEARCH_ICON}
			/>
		</div>
	)
}
