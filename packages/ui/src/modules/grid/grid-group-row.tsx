'use client'

import type { Row } from '@tanstack/react-table'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { TableCell, TableRow } from '../../components/table'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/grid'
import { aggregateLabelSpan, hasAggregation } from './grid-aggregate'
import type { GridGroupBy } from './grid-data-types'
import { GridAggregateCells } from './grid-total-row'
import type { GridColumn } from './types'

/** A group value rendered for the header label: `—` for an empty value, else its string form. @internal */
function formatGroupValue(value: unknown): string {
	return value == null || value === '' ? '—' : String(value)
}

/** Props for {@link GridGroupRow}. @internal */
type GridGroupRowProps<T> = {
	/** The engine's group-header row (`row.getIsGrouped()`). */
	row: Row<T>
	/** The visible columns, in render order — the label span and aggregate cells derive from them. */
	columns: GridColumn<T>[]
	/** The grouped column id, read for the group's shared value. */
	columnId: string | number
	/** Header-label override; falls back to `value (count)`. */
	renderHeader: GridGroupBy['renderHeader']
}

/**
 * A group-header row carrying a bare disclosure button that toggles the group's
 * expansion — the group's shared value and row count (`Developer (3)`) at the
 * start, a chevron at the trailing edge that rotates as the group opens. A
 * {@link GridGroupBy.renderHeader} override replaces the value/count label; the
 * toggle and chevron stay. Without aggregation the row is one full-width cell;
 * once any column aggregates, the label spans only the columns before the first
 * aggregated one and each aggregated column carries the group's figure — so a
 * collapsed group still reads its totals off its header.
 *
 * @internal
 */
export function GridGroupRow<T>({ row, columns, columnId, renderHeader }: GridGroupRowProps<T>) {
	const expanded = row.getIsExpanded()

	// Single-level grouping: the group's immediate sub-rows are its leaf rows, so
	// their count is the group size (post-filter, since filtering prunes sub-rows).
	const count = row.subRows.length

	const value = row.getGroupingValue(String(columnId))

	const label: ReactNode = renderHeader
		? renderHeader({ columnId, value, count })
		: `${formatGroupValue(value)} (${count})`

	const aggregated = hasAggregation(columns)

	const span = aggregated ? aggregateLabelSpan(columns) : columns.length

	return (
		<TableRow data-group-row data-expanded={dataAttr(expanded)}>
			<TableCell colSpan={span} className={cn(k.rowGroup.rail)}>
				<Button
					variant="bare"
					onClick={row.getToggleExpandedHandler()}
					aria-expanded={expanded}
					aria-label={`${expanded ? 'Collapse' : 'Expand'} group ${formatGroupValue(value)}`}
					className="p-0"
					suffix={
						<Icon
							icon={expanded ? <ChevronDown /> : <ChevronRight />}
							className={cn(k.rowGroup.chevron)}
						/>
					}
				>
					{label}
				</Button>
			</TableCell>

			{aggregated && (
				<GridAggregateCells
					columns={columns}
					rows={row.subRows.map((leaf) => leaf.original)}
					from={span}
				/>
			)}
		</TableRow>
	)
}
