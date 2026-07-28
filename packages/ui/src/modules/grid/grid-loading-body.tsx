import type { ReactElement } from 'react'
import { TableBody, TableCell, TableRow } from '../../components/table'
import { TextSkeleton } from '../../components/text'
import { cn } from '../../core'
import { rangeKeys } from '../../utilities'
import { GRID_LOADING_ROWS } from './engine/grid-constants'
import { pinnedCellProps } from './engine/grid-pin/styles'
import type { GridColumn } from './types'
import type { GridColumnPinning } from './use-grid-table'

/** Props for {@link GridSkeletonCells}. @internal */
type GridSkeletonCellsProps<T> = {
	/** The visible columns, in render order; each takes one skeleton cell. */
	columns: GridColumn<T>[]
	/**
	 * Frozen-column controls, so a pinned column's placeholder cell sticks to the
	 * same edge its header and data cells do. `null` when nothing is frozen.
	 */
	pinning: GridColumnPinning | null
	/** Extra classes for the leading cell — the group rail on a manual-group placeholder. */
	leadingClassName?: string
}

/**
 * One {@link TextSkeleton} cell per visible column — the contents of every
 * placeholder row the grid draws (the whole-body loading state, an expanded
 * manual group awaiting its children, an infinite-scroll batch in flight).
 *
 * Each cell carries the same per-column chrome a data cell does: the column's
 * `className` and, for a frozen column, the sticky position and offset
 * (see {@link pinnedCellProps}). Without them a pinned column's placeholder
 * scrolls while its header stays stuck, so the loading row's cells land under
 * the wrong headers — the columns to its side appear to shift.
 *
 * @internal
 */
export function GridSkeletonCells<T>({
	columns,
	pinning,
	leadingClassName,
}: GridSkeletonCellsProps<T>): ReactElement[] {
	return columns.map((col, index) => {
		const pinned = pinnedCellProps(pinning, col)

		return (
			<TableCell
				key={col.id}
				className={cn(index === 0 && leadingClassName, pinned.className)}
				style={pinned.style}
			>
				<TextSkeleton />
			</TableCell>
		)
	})
}

/**
 * Body for {@link Grid} while `loading`: {@link GRID_LOADING_ROWS} placeholder
 * rows of {@link GridSkeletonCells}, drawn in place of the data rows.
 * Column-aware where the generic `TableLoading` is not — each skeleton sits in
 * the grid's own column, frozen ones included, so the placeholders hold the
 * layout the arriving rows land in.
 *
 * @internal
 */
export function GridLoadingBody<T>({
	columns,
	pinning,
}: {
	/** The visible columns, in render order. */
	columns: GridColumn<T>[]
	/** Frozen-column controls threaded to each placeholder cell; `null` when none. */
	pinning: GridColumnPinning | null
}) {
	return (
		<TableBody>
			{rangeKeys(GRID_LOADING_ROWS, 'grid-loading').map((rowKey) => (
				<TableRow key={rowKey}>
					<GridSkeletonCells columns={columns} pinning={pinning} />
				</TableRow>
			))}
		</TableBody>
	)
}
