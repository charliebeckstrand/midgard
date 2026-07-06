'use client'

import type { Table } from '@tanstack/react-table'
import { type ReactNode, useMemo } from 'react'
import { TableBody, TableCell, TableRow } from '../../components/table'
import { cn, dataAttr } from '../../core'
import type { PaletteColor } from '../../core/recipe'
import type { DensityLevel } from '../../providers/density'
import { k } from '../../recipes/kata/grid'
import {
	aggregateColumn,
	aggregateLabelSpan,
	formatAggregate,
	hasAggregation,
} from './grid-aggregate'
import type { GridColumn } from './types'

/**
 * Resolves the grand-total row's state off the grid's: whether it renders —
 * `grandTotalRow` set, a visible aggregating column, and rows actually shown —
 * and the rows it aggregates. Those are the full filtered set, read from the
 * engine's filtered row model: all pages (filtering precedes pagination) and
 * the flat leaves (it precedes grouping), so one source serves the grouped,
 * paginated, and flat cases alike. Under server pagination the supplied page is
 * all the grid holds, so the total sums that page — the ceiling of what a
 * client-side aggregate can see. Manual grouping stands the row down entirely
 * (`manualGrouped`): the engine's filtered model there carries the consumer's
 * group-header rows as data, and the backend owns the figures.
 *
 * @internal
 */
export function useGridGrandTotal<T>(args: {
	grandTotalRow: 'bottom' | undefined
	columns: GridColumn<T>[]
	hasRows: boolean
	loading: boolean
	showingError: boolean
	/** Whether manual (server-side) grouping is active, which stands the grand total down. */
	manualGrouped?: boolean
	table: Table<T>
}): { active: boolean; rows: T[] } {
	const { grandTotalRow, columns, hasRows, loading, showingError, manualGrouped, table } = args

	const active =
		grandTotalRow === 'bottom' &&
		hasRows &&
		!loading &&
		!showingError &&
		!manualGrouped &&
		hasAggregation(columns)

	const filtered = table.getFilteredRowModel().rows

	const rows = useMemo(
		() => (active ? filtered.map((row) => row.original) : []),
		[active, filtered],
	)

	return { active, rows }
}

/** Props for {@link GridGrandTotalBody}. @internal */
type GridGrandTotalBodyProps<T> = {
	/** Resolved grand-total state from {@link useGridGrandTotal}. */
	grandTotal: { active: boolean; rows: T[] }
	columns: GridColumn<T>[]
	/** Whether the grid runs `role="grid"` semantics, gating the global row index. */
	gridSemantics: boolean
	/** The grid's resolved aria row count — the grand total's own index when it shows. */
	ariaRowCount: number
}

/**
 * The grand-total row in its own `<tbody>`, so it closes the body whichever
 * branch — grouped, virtualized, or flat — rendered the rows above it. Renders
 * nothing when inactive, keeping the conditional off the grid body. Its global
 * `aria-rowindex` is the grid's last row, but only under grid semantics — a
 * plain table conveys the row natively.
 *
 * @internal
 */
export function GridGrandTotalBody<T>({
	grandTotal,
	columns,
	gridSemantics,
	ariaRowCount,
}: GridGrandTotalBodyProps<T>) {
	if (!grandTotal.active) return null

	return (
		<TableBody data-slot="grid-grand-total">
			<GridTotalRow<T>
				columns={columns}
				rows={grandTotal.rows}
				variant="grand"
				ariaRowIndex={gridSemantics && ariaRowCount > 0 ? ariaRowCount : undefined}
			/>
		</TableBody>
	)
}

/**
 * One column's rendered aggregate: its {@link GridColumn.aggCell} over the
 * value and rows, else the default formatting; `null` for a column with no
 * aggregation, so its cell stays empty.
 *
 * @internal
 */
export function renderAggregate<T>(column: GridColumn<T>, rows: T[]): ReactNode {
	if (column.aggFunc === undefined) return null

	const value = aggregateColumn(column, rows)

	return column.aggCell ? column.aggCell({ value, rows }) : formatAggregate(value)
}

/** Props for {@link GridAggregateCells}. @internal */
type GridAggregateCellsProps<T> = {
	/** The visible columns, in render order. */
	columns: GridColumn<T>[]
	/** The rows behind the aggregates. */
	rows: T[]
	/** The first column index to render — the cells after the row's label span. */
	from: number
	/** The group's overlay color, tinting each aggregate cell at low opacity; `undefined` leaves them untinted. */
	color?: PaletteColor
}

/**
 * The aggregate cells after an aggregate row's label span: one `<td>` per
 * remaining visible column, carrying the column's aggregate where it declares
 * one and staying empty otherwise, so every figure sits under its own column. A
 * `color` washes each cell in the group's hue at low opacity.
 *
 * @internal
 */
export function GridAggregateCells<T>({ columns, rows, from, color }: GridAggregateCellsProps<T>) {
	return columns.slice(from).map((column) => (
		<TableCell
			key={column.id}
			data-grid-col={column.id}
			className={cn(k.aggregate.cell, color && k.rowGroup.tint[color], column.className)}
		>
			{renderAggregate(column, rows)}
		</TableCell>
	))
}

/** Props for {@link GridTotalRow}. @internal */
type GridTotalRowProps<T> = {
	/** The visible columns, in render order. */
	columns: GridColumn<T>[]
	/** The rows this total aggregates — a group's leaves, or the whole filtered set. */
	rows: T[]
	/** A group total hides with its collapsed group; the grand total always shows. */
	variant: 'group' | 'grand'
	/**
	 * Whether the row's group is expanded — a collapsed group's total collapses
	 * with its leaves. Grand totals ignore it.
	 * @defaultValue true
	 */
	expanded?: boolean
	/**
	 * The label in the leading cell.
	 * @defaultValue 'Total'
	 */
	label?: ReactNode
	/** Density padding for the group variant's collapsible cells. */
	density?: DensityLevel
	/** Global `aria-rowindex` under grid semantics; omitted on a plain table. */
	ariaRowIndex?: number
	/** The group's overlay color, washing the group total's cells at low opacity; ignored on the grand variant. */
	color?: PaletteColor
}

/** A group total cell's collapsible body: the same CSS-grid reveal the group's leaf cells ride. @internal */
function GroupRevealCell({
	expanded,
	pad,
	rail,
	color,
	colSpan,
	colId,
	className,
	children,
}: {
	expanded: boolean
	pad: string
	rail?: boolean
	/** The group's overlay color: tints the cell fill, and colors the leading rail when `rail` is set. */
	color?: PaletteColor
	colSpan?: number
	colId?: string | number
	className?: string
	children: ReactNode
}) {
	return (
		<td
			colSpan={colSpan}
			data-grid-col={colId}
			className={cn(
				// The leading cell carries the group rail — in the group's color when set
				// (layered over the neutral tint), else neutral; a colored group also
				// washes each cell's fill.
				rail && k.rowGroup.rail,
				rail && color && k.rowGroup.railColor[color],
				color && k.rowGroup.tint[color],
				className,
			)}
			style={{ padding: 0 }}
		>
			<div className={cn(k.rowGroup.reveal)} data-open={dataAttr(expanded)}>
				<div className={cn(k.rowGroup.revealClip)}>
					<div className={cn(pad)}>{children}</div>
				</div>
			</div>
		</td>
	)
}

/**
 * A total row: a leading label cell spanning the columns before the first
 * aggregated one, then one aggregate cell per remaining column. The `'group'`
 * variant sits under its group's leaves, carries the group rail, and collapses
 * with the group through the same CSS reveal the leaves ride; the `'grand'`
 * variant closes the whole body over the full filtered set.
 *
 * @internal
 */
export function GridTotalRow<T>({
	columns,
	rows,
	variant,
	expanded = true,
	label = 'Total',
	density = 'snug',
	ariaRowIndex,
	color,
}: GridTotalRowProps<T>) {
	const span = aggregateLabelSpan(columns)

	if (variant === 'grand') {
		return (
			<TableRow data-total-row="grand" aria-rowindex={ariaRowIndex}>
				<TableCell colSpan={span} className={cn(k.aggregate.label)}>
					{label}
				</TableCell>

				<GridAggregateCells columns={columns} rows={rows} from={span} />
			</TableRow>
		)
	}

	const pad = k.rowGroup.revealPad({ density })

	// A collapsed group's total is clipped to nothing with its leaves; take it out
	// of the accessibility tree too, matching the leaf rows (WCAG 1.3.1).
	return (
		<TableRow data-total-row="group" aria-hidden={expanded ? undefined : true} inert={!expanded}>
			<GroupRevealCell
				expanded={expanded}
				pad={cn(pad, k.aggregate.label)}
				rail
				color={color}
				colSpan={span}
			>
				{label}
			</GroupRevealCell>

			{columns.slice(span).map((column) => (
				<GroupRevealCell
					key={column.id}
					expanded={expanded}
					pad={cn(pad, k.aggregate.cell)}
					color={color}
					colId={column.id}
					className={column.className}
				>
					{renderAggregate(column, rows)}
				</GroupRevealCell>
			))}
		</TableRow>
	)
}
