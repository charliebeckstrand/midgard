'use client'

import { type ComponentProps, memo, type ReactNode } from 'react'
import { TableBody, TableHeader, TableRow } from '../../components/table'
import { cn, dataAttr } from '../../core'
import type { PaletteColor } from '../../core/recipe'
import { useIntl } from '../../primitives/intl/use-intl'
import { MountHold } from '../../primitives/mount'
import { useLocale } from '../../providers/locale'
import { k } from '../../recipes/kata/grid'
import { aggregateLabelSpan, hasAggregation, renderAggregate } from './engine/grid-aggregate'
import { NO_PADDING, NO_ROWS } from './engine/grid-constants'
import { gridMessages } from './engine/grid-messages'
import { type PinnedCellChrome, pinnedCellProps, pinnedSpanProps } from './engine/grid-pin/styles'
import type { GridWindowRowProps } from './engine/grid-row/shell'
import { GridAggregateCells } from './grid-aggregate-cells'
import { GridNavCell, useGridNavStopProps } from './grid-nav-cell'
import type { GridColumn } from './types'
import { useGridNavContext } from './use-grid-navigation'
import { useGridRevealHold } from './use-grid-reveal-hold'
import type { GridColumnPinning } from './use-grid-table'

/**
 * Resolves the grand-total row's state off the grid's: whether it renders, and
 * the rows it aggregates. It renders when `grandTotalRow` is set, a visible
 * aggregating column exists, and rows are actually shown. Those rows are the
 * full filtered set that `useGridTable` collects from its client view. It holds all
 * pages and the flat leaves. One source therefore serves the grouped,
 * paginated, and flat cases alike. Under server pagination the supplied page is
 * all the grid holds, so the total sums that page. That is the ceiling of what
 * a client-side aggregate can see. Manual grouping stands the row down entirely
 * (`manualGrouped`). The filtered set there carries the consumer's
 * group-header rows as data, and the backend owns the figures.
 *
 * @internal
 */
export function resolveGrandTotal<T>(args: {
	grandTotalRow: boolean | undefined
	columns: GridColumn<T>[]
	hasRows: boolean
	loading: boolean
	showingError: boolean
	/** Whether manual (server-side) grouping is active, which stands the grand total down. */
	manualGrouped?: boolean
	/** The full filtered row set (`GridTableResult.grandTotalRows`). */
	rows: readonly T[]
}): { active: boolean; rows: readonly T[] } {
	const { grandTotalRow, columns, hasRows, loading, showingError, manualGrouped, rows } = args

	const active =
		grandTotalRow === true &&
		hasRows &&
		!loading &&
		!showingError &&
		!manualGrouped &&
		hasAggregation(columns)

	return { active, rows: active ? rows : NO_ROWS }
}

/** Props for {@link GridGrandTotalBody}. @internal */
type GridGrandTotalBodyProps<T> = {
	/** Resolved grand-total state from {@link resolveGrandTotal}. */
	grandTotal: { active: boolean; rows: readonly T[] }
	columns: GridColumn<T>[]
	/** Frozen-column controls, so a pinned column's total sticks like its data cells. `null` when none. */
	pinning: GridColumnPinning | null
	/** Whether the grid runs `role="grid"` semantics, gating the global row index. */
	gridSemantics: boolean
	/** The grid's resolved aria row count: the grand total's own index when it shows. */
	ariaRowCount: number
}

/**
 * The grand-total row in its own `<tbody>`, so it closes the body whichever
 * branch (grouped, virtualized, or flat) rendered the rows above it. Renders
 * nothing when inactive, keeping the conditional off the grid body. Its global
 * `aria-rowindex` is the grid's last row, but only under grid semantics: a
 * plain table conveys the row natively.
 *
 * @internal
 */
export function GridGrandTotalBody<T>({
	grandTotal,
	columns,
	pinning,
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
				pinning={pinning}
				aria-rowindex={gridSemantics && ariaRowCount > 0 ? ariaRowCount : undefined}
			/>
		</TableBody>
	)
}

/** Props for {@link GridTotalRow}. @internal */
type GridTotalRowProps<T> = {
	/** The visible columns, in render order. */
	columns: GridColumn<T>[]
	/** The rows this total aggregates: a group's leaves, or the whole filtered set. */
	rows: readonly T[]
	/** Frozen-column controls, so the cells over a pinned column stick like its data cells. `null` when none. */
	pinning: GridColumnPinning | null
	/** A group total hides with its collapsed group; the grand total always shows. */
	variant: 'group' | 'grand'
	/**
	 * Whether the row's group is expanded: a collapsed group's total collapses
	 * with its leaves. Grand totals ignore it.
	 * @defaultValue true
	 */
	expanded?: boolean
	/**
	 * Whether an open group total mounts at the closed track and then opens over
	 * the transition, with the leaves above it. A windowed body sets it on the
	 * rows that fit in one viewport when their group expands. A total that is
	 * already mounted ignores it, and the grand variant ignores it.
	 * @defaultValue false
	 */
	enter?: boolean
	/**
	 * The label in the leading cell.
	 * @defaultValue `'Total'`, in the language of the reader.
	 */
	label?: ReactNode
	/** The group's overlay color, coloring the group total's leading rail; ignored on the grand variant. */
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
	pinned,
	cellProps,
	children,
}: {
	/** The cursor props of the cell (see {@link useGridNavStopProps}). */
	cellProps?: ComponentProps<'td'>
	/** Whether the reveal renders open: the row's reveal hold, not `expanded`. */
	open: boolean
	pad: string
	rail?: boolean
	/** The group's overlay color: colors the leading rail when `rail` is set. */
	color?: PaletteColor
	colSpan?: number
	colId?: string | number
	/** The pinned chrome of the cell, which also carries the column's `className` (see {@link pinnedCellProps}). */
	pinned: PinnedCellChrome
	children: ReactNode
}) {
	return (
		<td
			{...cellProps}
			colSpan={colSpan}
			data-grid-col={colId}
			className={cn(
				// The leading cell carries the group rail: in the group's color when set
				// (layered over the neutral tint), else neutral.
				rail && k.row.group.rail.border,
				rail && color && k.row.group.rail.color[color],
				pinned.className,
			)}
			style={pinned.style ? { ...NO_PADDING, ...pinned.style } : NO_PADDING}
			data-grid-pin={pinned.pin}
		>
			<div className={cn(k.row.group.reveal.track)} data-open={dataAttr(open)}>
				<div className={cn(k.row.group.reveal.clip)}>
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
 * variant closes the whole body over the full filtered set. The label span
 * ends at a frozen boundary, so each cell over a frozen column sticks with that
 * column (see `aggregateLabelSpan`).
 *
 * @internal
 */
function GridTotalRowImpl<T>({
	columns,
	rows,
	pinning,
	variant,
	expanded = true,
	enter = false,
	label: labelProp,
	color,
	navKey,
	...windowRow
}: GridTotalRowProps<T>) {
	const intl = useIntl()

	const label = labelProp ?? intl.formatMessage(gridMessages.total)

	const span = aggregateLabelSpan(columns, pinning)

	const labelPinned = pinnedSpanProps(pinning, columns.slice(0, span))

	// The two variants share the label span and nothing else (different trees,
	// and only the group one collapses), so the group row is its own component
	// rather than a branch whose hold the grand variant would have to carry.
	if (variant === 'group') {
		return (
			<GridGroupTotalRow<T>
				columns={columns}
				rows={rows}
				pinning={pinning}
				span={span}
				labelPinned={labelPinned}
				expanded={expanded}
				enter={enter}
				label={label}
				color={color}
				navKey={navKey}
				windowRow={windowRow}
			/>
		)
	}

	return (
		<TableRow data-total-row="grand" {...windowRow}>
			{/* The label is the row header of the totals, so each total reads with it. */}
			<TableHeader
				scope="row"
				colSpan={span}
				className={cn(k.aggregate.label, labelPinned.className)}
				style={labelPinned.style}
				data-grid-pin={labelPinned.pin}
			>
				{label}
			</TableHeader>

			<GridAggregateCells columns={columns} rows={rows} from={span} pinning={pinning} />
		</TableRow>
	)
}

/**
 * Memoized {@link GridTotalRowImpl}. A body render that leaves the total's props as they were does not render it again. @internal
 */
export const GridTotalRow = memo(GridTotalRowImpl) as typeof GridTotalRowImpl

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
	pinning,
	span,
	labelPinned,
	expanded,
	enter,
	label,
	color,
	navKey,
	windowRow,
}: {
	navKey: string | undefined
	columns: GridColumn<T>[]
	rows: readonly T[]
	pinning: GridColumnPinning | null
	/** Columns the leading label cell spans, resolved once by {@link GridTotalRow}. */
	span: number
	/** The pinned chrome of the label cell, resolved with the span. */
	labelPinned: PinnedCellChrome
	expanded: boolean
	/** Whether an open row mounts closed and opens over the transition (see {@link useGridRevealHold}). */
	enter: boolean
	label: ReactNode
	color?: PaletteColor
	/** The props that a windowed body gives the row. */
	windowRow: GridWindowRowProps
}) {
	const reveal = useGridRevealHold(expanded, enter)

	const { locale } = useLocale()

	const pad = k.row.group.reveal.pad

	const stopProps = useGridNavStopProps(navKey ?? '')

	// Under the cursor, a client-grouped grid is a treegrid, and a total sits
	// at the level of its group's leaves.
	const tree = useGridNavContext().enabled && navKey !== undefined

	// A collapsed group's total is clipped to nothing with its leaves; take it out
	// of the accessibility tree too, matching the leaf rows (WCAG 1.3.1).
	return (
		<MountHold hold={reveal.hold} name="grid-total-row">
			<TableRow
				{...windowRow}
				data-total-row="group"
				aria-hidden={expanded ? undefined : true}
				aria-level={tree ? 2 : undefined}
				inert={!expanded}
				onTransitionEnd={reveal.onTransitionEnd}
			>
				<GroupRevealCell
					open={reveal.open}
					pad={cn(pad, k.aggregate.label)}
					rail
					color={color}
					colSpan={span}
					pinned={labelPinned}
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
						pinned={pinnedCellProps(pinning, column)}
					>
						{renderAggregate(column, rows, locale)}
					</GroupRevealCell>
				))}
			</TableRow>
		</MountHold>
	)
}
