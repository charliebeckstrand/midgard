'use client'

import type { Row } from '@tanstack/react-table'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ReactNode, Ref } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { TableCell, TableRow } from '../../components/table'
import { cn, dataAttr } from '../../core'
import type { PaletteColor } from '../../core/recipe'
import { k } from '../../recipes/kata/grid'
import { aggregateLabelSpan, hasAggregation } from './engine/grid-aggregate'
import { groupValueLabel } from './engine/grid-column/label'
import { GridAggregateCells } from './grid-aggregate-cells'
import type { GridGroupBy } from './grid-data-types'
import type { GridColumn } from './types'

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
	/** The group's overlay color: colors the leading rail and washes the header's aggregate cells; `undefined` leaves them neutral. */
	color?: PaletteColor
	/** The measure ref of a windowed body, which reads the row height. */
	measureRef?: Ref<HTMLTableRowElement>
	/** The row's index in the item list of a windowed body, written as `data-index`. */
	dataIndex?: number
	/** The 1-based `aria-rowindex` under grid semantics; omitted on a plain table. */
	ariaRowIndex?: number
}

/**
 * A group-header row carrying a bare disclosure button that toggles the group's
 * expansion. The group's shared value and row count (`Developer (3)`) sit at the
 * start. A chevron at the trailing edge points right while collapsed and down
 * while expanded. A
 * {@link GridGroupBy.renderHeader} override replaces the value/count label; the
 * toggle and chevron stay. Without aggregation the row is one full-width cell.
 * Once any column aggregates, the label spans only the columns before the first
 * aggregated one, and each aggregated column carries the group's figure. A
 * collapsed group therefore still reads its totals off its header.
 *
 * @internal
 */
export function GridGroupRow<T>({
	row,
	columns,
	columnId,
	renderHeader,
	color,
	measureRef,
	dataIndex,
	ariaRowIndex,
}: GridGroupRowProps<T>) {
	const expanded = row.getIsExpanded()

	// Single-level grouping: the group's immediate sub-rows are its leaf rows, so
	// their count is the group size (post-filter, since filtering prunes sub-rows).
	const count = row.subRows.length

	const value = row.getGroupingValue(String(columnId))

	const label: ReactNode = renderHeader
		? renderHeader({ columnId, value, count })
		: `${groupValueLabel(value)} (${count})`

	const aggregated = hasAggregation(columns)

	const span = aggregated ? aggregateLabelSpan(columns) : columns.length

	return (
		// `data-group-key` (the shared value) lets the group-header context menu
		// resolve the right-clicked group for the row manager and its color/expand items.
		<TableRow
			ref={measureRef}
			data-index={dataIndex}
			aria-rowindex={ariaRowIndex}
			data-group-row
			data-group-key={String(value)}
			data-expanded={dataAttr(expanded)}
		>
			<TableCell
				colSpan={span}
				className={cn(k.rowGroup.rail.padded, color && k.rowGroup.rail.color[color])}
			>
				<Button
					type="button"
					variant="bare"
					onClick={row.getToggleExpandedHandler()}
					aria-expanded={expanded}
					aria-label={`${expanded ? 'Collapse' : 'Expand'} group ${groupValueLabel(value)}`}
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
					color={color}
				/>
			)}
		</TableRow>
	)
}
