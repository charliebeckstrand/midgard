'use client'

import type { Row } from '@tanstack/react-table'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { TableCell, TableRow } from '../../components/table'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/grid'
import type { GridGroupBy } from './grid-data-types'

/** A group value rendered for the header label: `—` for an empty value, else its string form. @internal */
function formatGroupValue(value: unknown): string {
	return value == null || value === '' ? '—' : String(value)
}

/** Props for {@link GridGroupRow}. @internal */
type GridGroupRowProps<T> = {
	/** The engine's group-header row (`row.getIsGrouped()`). */
	row: Row<T>
	/** Columns the header spans — the full visible column count. */
	colSpan: number
	/** The grouped column id, read for the group's shared value. */
	columnId: string | number
	/** Header-label override; falls back to `value (count)`. */
	renderHeader: GridGroupBy['renderHeader']
}

/**
 * A group-header row: a full-width `<tr>` spanning every column, carrying a bare
 * disclosure button that toggles the group's expansion — the group's shared value
 * and row count (`Developer (3)`) at the start, a chevron at the trailing edge
 * that rotates as the group opens. A {@link GridGroupBy.renderHeader} override
 * replaces the value/count label; the toggle and chevron stay.
 *
 * @internal
 */
export function GridGroupRow<T>({ row, colSpan, columnId, renderHeader }: GridGroupRowProps<T>) {
	const expanded = row.getIsExpanded()

	// Single-level grouping: the group's immediate sub-rows are its leaf rows, so
	// their count is the group size (post-filter, since filtering prunes sub-rows).
	const count = row.subRows.length

	const value = row.getGroupingValue(String(columnId))

	const label: ReactNode = renderHeader
		? renderHeader({ columnId, value, count })
		: `${formatGroupValue(value)} (${count})`

	return (
		<TableRow data-group-row data-expanded={dataAttr(expanded)}>
			<TableCell colSpan={colSpan} className={cn(k.rowGroup.rail)}>
				<Button
					variant="bare"
					block
					onClick={row.getToggleExpandedHandler()}
					aria-expanded={expanded}
					aria-label={`${expanded ? 'Collapse' : 'Expand'} group ${formatGroupValue(value)}`}
					className={cn(k.rowGroup.toggle)}
				>
					<span className={cn(k.rowGroup.label)}>{label}</span>
					<Icon
						icon={expanded ? <ChevronDown /> : <ChevronRight />}
						className={cn(k.rowGroup.chevron)}
					/>
				</Button>
			</TableCell>
		</TableRow>
	)
}
