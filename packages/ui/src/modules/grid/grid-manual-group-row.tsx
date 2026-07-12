'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { TableCell, TableRow } from '../../components/table'
import { TextSkeleton } from '../../components/text'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/grid'
import { aggregateLabelSpan, hasAggregation } from './engine/grid-aggregate'
import { groupValueLabel } from './engine/grid-column/label'
import { MANUAL_GROUP_PLACEHOLDER_ROWS } from './engine/grid-constants'
import { GridAggregateCells } from './grid-aggregate-cells'
import type { GridGroupBy, GridGroupHeaderRow } from './grid-data-types'
import type { GridColumn } from './types'

/** Props for {@link GridManualGroupRow}. @internal */
type GridManualGroupRowProps<T> = {
	/** The consumer-supplied group-header row datum, carrying the backend's aggregates. */
	row: T
	/** The row's {@link GridGroupHeaderRow} descriptor: group key, shared value, child count. */
	info: GridGroupHeaderRow
	/** The visible columns, in render order — the label span and aggregate cells derive from them. */
	columns: GridColumn<T>[]
	/** The grouped column id, threaded to a `renderHeader` override's context. */
	columnId: string | number
	/** Header-label override; falls back to `value (count)`. */
	renderHeader: GridGroupBy['renderHeader']
	/** Whether this group is expanded (its key is in the binding's expanded set). */
	expanded: boolean
	/** Toggles the group's expansion through the binding. */
	toggle: (key: string | number) => void
}

/**
 * A manual-mode group-header row: the same disclosure chrome as the client
 * {@link GridGroupRow} — the group's value and child count (`Developer (3)`) at
 * the start, a rotating chevron at the trailing edge — but every figure comes
 * from the consumer's row rather than the engine: the label reads the
 * {@link GridGroupHeaderRow} descriptor (the backend's child count), expansion
 * is the binding's controlled key set, and once any column aggregates, each
 * aggregated column's cell shows the backend value carried on the group row
 * itself.
 *
 * @internal
 */
export function GridManualGroupRow<T>({
	row,
	info,
	columns,
	columnId,
	renderHeader,
	expanded,
	toggle,
}: GridManualGroupRowProps<T>) {
	const label: ReactNode = renderHeader
		? renderHeader({ columnId, value: info.value, count: info.count })
		: `${groupValueLabel(info.value)} (${info.count})`

	const aggregated = hasAggregation(columns)

	const span = aggregated ? aggregateLabelSpan(columns) : columns.length

	return (
		<TableRow data-group-row data-expanded={dataAttr(expanded)}>
			<TableCell colSpan={span} className={cn(k.rowGroup.rail.padded)}>
				<Button
					type="button"
					variant="bare"
					onClick={() => toggle(info.key)}
					aria-expanded={expanded}
					aria-label={`${expanded ? 'Collapse' : 'Expand'} group ${groupValueLabel(info.value)}`}
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

			{aggregated && <GridAggregateCells columns={columns} headerRow={row} from={span} />}
		</TableRow>
	)
}

/**
 * Placeholder skeleton rows for an expanded manual group whose children are
 * still loading: the group opened the instant its header was toggled, and while
 * the consumer's {@link GridGroupBy.onGroupExpand} fetch is in flight these fill
 * the gap — one {@link TextSkeleton} per column, the same silhouette the
 * whole-grid loading body draws, so the children arrive in the shape they load
 * into. Rendered `min(count, cap)` deep (see {@link MANUAL_GROUP_PLACEHOLDER_ROWS})
 * so an enormous group shows a brief affordance rather than thousands of rows,
 * and `aria-hidden` as a transient filler (like the infinite-scroll pending
 * row) — the leading cell carries the group rail so the loading rows sit under
 * the group as its children will.
 *
 * @internal
 */
export function GridManualGroupPlaceholderRows<T>({
	columns,
	count,
}: {
	/** The visible columns; each takes one skeleton cell per placeholder row. */
	columns: GridColumn<T>[]
	/** The group's backend child count; sets how many placeholders show (capped). */
	count: number
}): ReactElement[] {
	const rows = Math.min(count, MANUAL_GROUP_PLACEHOLDER_ROWS)

	return Array.from({ length: rows }, (_, rowIndex) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: a fixed-length skeleton run with no identity beyond position
		<TableRow key={rowIndex} data-group-placeholder aria-hidden="true">
			{columns.map((column, colIndex) => (
				<TableCell
					key={column.id}
					className={cn(colIndex === 0 && k.rowGroup.rail.border, column.className)}
				>
					<TextSkeleton />
				</TableCell>
			))}
		</TableRow>
	))
}
