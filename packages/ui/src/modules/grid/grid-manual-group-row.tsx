'use client'

import type { Row } from '@tanstack/react-table'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { TableCell, TableRow } from '../../components/table'
import { TextSkeleton } from '../../components/text'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/grid'
import { aggAccessor, aggregateLabelSpan, formatAggregate, hasAggregation } from './grid-aggregate'
import { MANUAL_GROUP_PLACEHOLDER_ROWS } from './grid-constants'
import type { GridGroupBy, GridGroupHeaderRow } from './grid-data-types'
import { formatGroupValue } from './grid-group-row'
import type { GridColumn } from './types'

/**
 * One run of the manual grouped body: a group-header row (with its
 * {@link GridGroupHeaderRow} descriptor) followed by the leaf rows positionally
 * associated with it — or, for leaves preceding any header, a headerless run
 * that always renders expanded.
 *
 * @internal
 */
export type GridManualGroupSegment<T> = {
	/** The group-header engine row, or `null` for a leading headerless run. */
	header: Row<T> | null
	/** The header's descriptor, resolved once; `null` alongside a `null` header. */
	info: GridGroupHeaderRow | null
	/** The leaf rows under this header, in supplied order. */
	leaves: Row<T>[]
}

/**
 * Splits the manual display rows into {@link GridManualGroupSegment}s by
 * position: each group-header row (per the binding's `groupRow` resolver)
 * opens a segment collecting the leaves after it, up to the next header. Leaves
 * before any header collect into a leading headerless segment. Pure, so the
 * positional-association contract is unit-testable on its own.
 *
 * @internal
 */
export function segmentManualGroupRows<T>(
	rows: Row<T>[],
	groupRow: (row: T) => GridGroupHeaderRow | null,
): GridManualGroupSegment<T>[] {
	const segments: GridManualGroupSegment<T>[] = []

	let current: GridManualGroupSegment<T> | null = null

	for (const row of rows) {
		const info = groupRow(row.original)

		if (info) {
			current = { header: row, info, leaves: [] }

			segments.push(current)

			continue
		}

		if (!current) {
			current = { header: null, info: null, leaves: [] }

			segments.push(current)
		}

		current.leaves.push(row)
	}

	return segments
}

/**
 * A column's aggregate on a manual group-header row: the backend-computed value
 * read off the group row itself — through {@link aggAccessor}, the same
 * `value`-accessor-else-field path every client aggregate reads — rendered via
 * the column's {@link GridColumn.aggCell} (whose `rows` context is empty here:
 * the children may not be loaded) else the default formatting. `null` for a
 * column with no aggregation, so its cell stays empty.
 *
 * @internal
 */
function renderManualAggregate<T>(column: GridColumn<T>, row: T): ReactNode {
	if (column.aggFunc === undefined) return null

	const value = aggAccessor(column)(row)

	return column.aggCell ? column.aggCell({ value, rows: [] }) : formatAggregate(value)
}

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
		: `${formatGroupValue(info.value)} (${info.count})`

	const aggregated = hasAggregation(columns)

	const span = aggregated ? aggregateLabelSpan(columns) : columns.length

	return (
		<TableRow data-group-row data-expanded={dataAttr(expanded)}>
			<TableCell colSpan={span} className={cn(k.rowGroup.rail.padded)}>
				<Button
					variant="bare"
					onClick={() => toggle(info.key)}
					aria-expanded={expanded}
					aria-label={`${expanded ? 'Collapse' : 'Expand'} group ${formatGroupValue(info.value)}`}
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

			{aggregated &&
				columns.slice(span).map((column) => (
					<TableCell
						key={column.id}
						data-grid-col={column.id}
						className={cn(k.aggregate.cell, column.className)}
					>
						{renderManualAggregate(column, row)}
					</TableCell>
				))}
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
