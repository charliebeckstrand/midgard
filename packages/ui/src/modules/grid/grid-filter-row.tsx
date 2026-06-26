'use client'

import { Input } from '../../components/input'
import { TableHeader, TableRow } from '../../components/table'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import type { GridColumn } from './types'
import type { GridColumnFilter } from './use-grid-table'

/** Props for {@link GridFilterRow}. @internal */
type GridFilterRowProps<T> = {
	columns: GridColumn<T>[]
	filters: GridColumnFilter
}

/** A column's accessible filter label: its `title` when a string, else the stringified id. @internal */
function filterLabel(column: Pick<GridColumn<unknown>, 'id' | 'title'>): string {
	return typeof column.title === 'string' ? column.title : String(column.id)
}

/**
 * Filter row beneath the {@link Grid} header: a text input per filterable column
 * (others render an empty cell to hold column alignment), each wired to the
 * engine's per-column filter. Presentational — it carries no `aria-rowindex`, so
 * the grid's row-index scheme is unaffected.
 *
 * @internal
 */
export function GridFilterRow<T>({ columns, filters }: GridFilterRowProps<T>) {
	return (
		<TableRow data-slot="grid-filter-row" className={cn(k.filter.row)}>
			{columns.map((col) => (
				<TableHeader key={col.id} className={cn(k.filter.cell)}>
					{filters.canFilter(col.id) ? (
						<Input
							type="search"
							value={filters.getValue(col.id)}
							onChange={(event) => filters.setValue(col.id, event.target.value)}
							aria-label={`Filter ${filterLabel(col)}`}
							placeholder="Filter"
						/>
					) : null}
				</TableHeader>
			))}
		</TableRow>
	)
}
