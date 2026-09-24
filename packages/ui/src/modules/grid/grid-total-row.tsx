'use client'

import type { Table } from '@tanstack/react-table'
import { type ComponentProps, type ReactNode, useMemo } from 'react'
import { TableBody, TableCell, TableRow } from '../../components/table'
import { cn, dataAttr } from '../../core'
import type { PaletteColor } from '../../core/recipe'
import { Hold } from '../../primitives/mount'
import type { DensityLevel } from '../../providers/density'
import { k } from '../../recipes/kata/grid'
import { aggregateLabelSpan, hasAggregation, renderAggregate } from './engine/grid-aggregate'
import { NO_PADDING } from './engine/grid-constants'
import type { GridWindowRowProps } from './engine/grid-row/shell'
import { GridAggregateCells } from './grid-aggregate-cells'
import type { GridColumn } from './types'
import { GridNavCell, useGridNavStopProps } from './use-grid-navigation-columns'
import { useGridRevealHold } from './use-grid-reveal-hold'

/** Stable empty row model read while the grand total is inactive, so its memo doesn't rebuild. @internal */
const NO_ROWS: never[] = []

/**
 * Resolves the grand-total row's state off the grid's: whether it renders, and
 * the rows it aggregates. It renders when `grandTotalRow` is set, a visible
 * aggregating column exists, and rows are actually shown. Those rows are the
 * full filtered set, read from the engine's filtered row model. It holds all
 * pages, because filtering precedes pagination, and the flat leaves, because it
 * precedes grouping. One source therefore serves the grouped, paginated, and
 * flat cases alike. Under server pagination the supplied page is all the grid
 * holds, so the total sums that page. That is the ceiling of what a client-side
 * aggregate can see. Manual grouping stands the row down entirely
 * (`manualGrouped`). The engine's filtered model there carries the consumer's
 * group-header rows as data, and the backend owns the figures.
 *
 * @internal
 */
export function useGridGrandTotal<T>(args: {
	grandTotalRow: boolean | undefined
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
		grandTotalRow === true &&
		hasRows &&
		!loading &&
		!showingError &&
		!manualGrouped &&
		hasAggregation(columns)

	// Only materialize the filtered model when the row actually shows; an inactive
	// grand total must not force the whole filtered set to compute each render.
	const filtered = active ? table.getFilteredRowModel().rows : NO_ROWS

	const rows = useMemo(() => filtered.map((row) => row.original), [filtered])

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
				aria-rowindex={gridSemantics && ariaRowCount > 0 ? ariaRowCount : undefined}
			/>
		</TableBody>
	)
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
	/** The group's overlay color, washing the group total's cells at low opacity; ignored on the grand variant. */
	color?: PaletteColor
	/**
	 * The item key of a group total in the keyboard cursor's order. Its label cell
	 * is then the row's one cursor stop. Ignored on the grand variant.
	 */
	navKey?: string
} & GridWindowRowProps

/** A group total cell's collapsible body: the same CSS-grid reveal the group's leaf cells ride. @internal */
function GroupRevealCell({
	open,
	pad,
	rail,
	color,
	colSpan,
	colId,
	className,
	cellProps,
	children,
}: {
	/** The cursor props of the cell (see {@link useGridNavStopProps}). */
	cellProps?: ComponentProps<'td'>
	/** Whether the reveal renders open — the row's reveal hold, not `expanded`. */
	open: boolean
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
			{...cellProps}
			colSpan={colSpan}
			data-grid-col={colId}
			className={cn(
				// The leading cell carries the group rail — in the group's color when set
				// (layered over the neutral tint), else neutral; a colored group also
				// washes each cell's fill.
				rail && k.rowGroup.rail.padded,
				rail && color && k.rowGroup.rail.color[color],
				color && k.rowGroup.tint[color],
				className,
			)}
			style={NO_PADDING}
		>
			<div className={cn(k.rowGroup.reveal.track)} data-open={dataAttr(open)}>
				<div className={cn(k.rowGroup.reveal.clip)}>
					<div className={cn(pad)}>{children}</div>
				</div>
			</div>
		</td>
	)
}

/**
 * A total row: a leading label cell spanning the columns before the first
 * aggregated one, then one aggregate cell per remaining column. The `'group'`
 * variant sits under its group's leaves and carries the group rail. It collapses
 * with the group through the same CSS reveal the leaves ride. The `'grand'`
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
	color,
	navKey,
	...windowRow
}: GridTotalRowProps<T>) {
	const span = aggregateLabelSpan(columns)

	// The two variants share the label span and nothing else — different trees,
	// and only the group one collapses — so the group row is its own component
	// rather than a branch whose hold the grand variant would have to carry.
	if (variant === 'group') {
		return (
			<GridGroupTotalRow<T>
				columns={columns}
				rows={rows}
				span={span}
				expanded={expanded}
				label={label}
				density={density}
				color={color}
				navKey={navKey}
				windowRow={windowRow}
			/>
		)
	}

	return (
		<TableRow data-total-row="grand" {...windowRow}>
			<TableCell colSpan={span} className={cn(k.aggregate.label)}>
				{label}
			</TableCell>

			<GridAggregateCells columns={columns} rows={rows} from={span} />
		</TableRow>
	)
}

/**
 * A group's total row. It collapses with its group through the same CSS reveal
 * the leaves ride. It rests alongside them once that reveal lands, so its
 * aggregates stop recomputing on every body render.
 *
 * @internal
 */
function GridGroupTotalRow<T>({
	columns,
	rows,
	span,
	expanded,
	label,
	density,
	color,
	navKey,
	windowRow,
}: {
	navKey: string | undefined
	columns: GridColumn<T>[]
	rows: T[]
	/** Columns the leading label cell spans, resolved once by {@link GridTotalRow}. */
	span: number
	expanded: boolean
	label: ReactNode
	density: DensityLevel
	color?: PaletteColor
	/** The props that a windowed body gives the row. */
	windowRow: GridWindowRowProps
}) {
	const reveal = useGridRevealHold(expanded)

	const pad = k.rowGroup.reveal.pad({ density })

	const stopProps = useGridNavStopProps(navKey ?? '')

	// A collapsed group's total is clipped to nothing with its leaves; take it out
	// of the accessibility tree too, matching the leaf rows (WCAG 1.3.1).
	return (
		<Hold hold={reveal.hold} name="grid-total-row">
			<TableRow
				{...windowRow}
				data-total-row="group"
				aria-hidden={expanded ? undefined : true}
				inert={!expanded}
				onTransitionEnd={reveal.onTransitionEnd}
			>
				<GroupRevealCell
					open={reveal.open}
					pad={cn(pad, k.aggregate.label)}
					rail
					color={color}
					colSpan={span}
					cellProps={navKey === undefined ? undefined : stopProps}
				>
					{label}
					{navKey !== undefined && <GridNavCell stop={navKey} />}
				</GroupRevealCell>

				{columns.slice(span).map((column) => (
					<GroupRevealCell
						key={column.id}
						open={reveal.open}
						pad={cn(pad, k.aggregate.cell)}
						color={color}
						colId={column.id}
						className={column.className}
					>
						{renderAggregate(column, rows)}
					</GroupRevealCell>
				))}
			</TableRow>
		</Hold>
	)
}
