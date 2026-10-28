'use client'
import { memo } from 'react'
import { TableCell, TableRow } from '../../components/table'
import { cn, dataAttr } from '../../core'
import type { PaletteColor } from '../../core/recipe'
import { k } from '../../recipes/kata/grid'
import { aggregateLabelSpan, hasAggregation } from './engine/grid-aggregate'
import type { GridGroup } from './engine/grid-group/tree'
import { groupItemKey } from './engine/grid-items/items'
import { pinnedSpanProps } from './engine/grid-pin/styles'
import type { GridWindowRowProps } from './engine/grid-row/shell'
import { GridAggregateCells } from './grid-aggregate-cells'
import type { GridGroupBy } from './grid-data-types'
import { GridGroupDisclosure } from './grid-group-disclosure'
import { GridNavCell, useGridNavStopProps } from './grid-nav-cell'
import type { GridColumn } from './types'
import { useGridNavContext } from './use-grid-navigation'
import type { GridColumnPinning } from './use-grid-table'

/** Props for {@link GridGroupRow}. @internal */
type GridGroupRowProps<T> = {
	/** The group this row heads. */
	group: GridGroup<T>
	/** Opens or closes a group, by its id. */
	onToggle: (id: string) => void
	/** The visible columns, in render order: the label span and aggregate cells derive from them. */
	columns: GridColumn<T>[]
	/** The grouped column id, which a `renderHeader` override receives. */
	columnId: string | number
	/** Header-label override; falls back to `value (count)`. */
	renderHeader: GridGroupBy['renderHeader']
	/** The group's overlay color: colors the leading rail and washes the header's aggregate cells; `undefined` leaves them neutral. */
	color?: PaletteColor
	/** Frozen-column controls, so the cells over a pinned column stick like its data cells. `null` when none. */
	pinning: GridColumnPinning | null
} & GridWindowRowProps

/**
 * A group-header row carrying a bare disclosure button that toggles the group's
 * expansion. The group's shared value and row count (`Developer (3)`) sit at the
 * start. A chevron at the trailing edge points right while collapsed and down
 * while expanded. A
 * {@link GridGroupBy.renderHeader} override replaces the value/count label; the
 * toggle and chevron stay. Without aggregation the row is one full-width cell.
 * Once any column aggregates, the label spans only the columns before the first
 * aggregated one, and each aggregated column carries the group's figure. A
 * collapsed group therefore still reads its totals off its header. The label
 * span ends at a frozen boundary, so each cell over a frozen column sticks with
 * that column (see `aggregateLabelSpan`).
 *
 * @internal
 */
function GridGroupRowImpl<T>({
	group,
	onToggle,
	columns,
	columnId,
	renderHeader,
	color,
	pinning,
	...windowRow
}: GridGroupRowProps<T>) {
	const { expanded, value } = group

	// The group size, after the filters, since filtering prunes the leaves.
	const count = group.leaves.length

	const aggregated = hasAggregation(columns)

	const span = aggregated ? aggregateLabelSpan(columns, pinning) : columns.length

	const pinned = pinnedSpanProps(pinning, columns.slice(0, span))

	const navKey = groupItemKey(group.id)

	const stopProps = useGridNavStopProps(navKey)

	// The cursor makes a client-grouped grid a treegrid. The header is its top level.
	const tree = useGridNavContext().enabled

	return (
		// `data-group-key` (the text key of the group) lets the group-header
		// context menu resolve the right-clicked group for the row manager and its
		// color/expand items.
		<TableRow
			{...windowRow}
			data-group-row
			data-group-key={group.key}
			data-expanded={dataAttr(expanded)}
			aria-level={tree ? 1 : undefined}
			aria-expanded={tree ? expanded : undefined}
		>
			<TableCell
				{...stopProps}
				colSpan={span}
				className={cn(
					k.row.group.rail.border,
					color && k.row.group.rail.color[color],
					pinned.className,
				)}
				style={pinned.style}
				data-grid-pin={pinned.pin}
			>
				<GridGroupDisclosure
					value={value}
					count={count}
					columnId={columnId}
					renderHeader={renderHeader}
					expanded={expanded}
					onToggle={() => onToggle(group.id)}
				/>
				<GridNavCell stop={navKey} />
			</TableCell>

			{aggregated && (
				<GridAggregateCells
					columns={columns}
					rows={group.rows}
					from={span}
					color={color}
					pinning={pinning}
				/>
			)}
		</TableRow>
	)
}

/**
 * Memoized {@link GridGroupRowImpl}. A body render that leaves the header's props as they were does not render it again. @internal
 */
export const GridGroupRow = memo(GridGroupRowImpl) as typeof GridGroupRowImpl
