'use client'

import type { ClassValue } from 'clsx'
import { memo, type ReactElement } from 'react'
import { TableBody, TableCell, TableRow } from '../../components/table'
import { TextSkeleton } from '../../components/text'
import { cn } from '../../core'
import { rangeKeys } from '../../utilities'
import { GRID_LOADING_ROWS } from './engine/grid-constants'
import { pinnedCellProps } from './engine/grid-pin/styles'
import type { GridColumn } from './types'
import type { GridColumnPinning } from './use-grid-table'

/** Keys for the loading body's fixed-length placeholder run; hoisted, the count being a constant. @internal */
const LOADING_ROW_KEYS = rangeKeys(GRID_LOADING_ROWS, 'grid-loading')

/** Props for {@link GridSkeletonCells}. @internal */
type GridSkeletonCellsProps<T> = {
	/** The visible columns, in render order; each takes one skeleton cell. */
	columns: GridColumn<T>[]
	/** Frozen-column controls; `null` when nothing is frozen. */
	pinning: GridColumnPinning | null
	/** Extra classes for the leading cell — the group rail on a manual-group placeholder. */
	leadingClassName?: ClassValue
}

/**
 * One {@link TextSkeleton} cell per visible column — the contents of every
 * placeholder row the grid draws (the whole-body loading state, an expanded
 * manual group awaiting its children, an infinite-scroll batch in flight).
 *
 * Each cell carries the same per-column chrome a data cell does: the column's
 * `className` and, for a frozen column, the sticky position and offset (see
 * {@link pinnedCellProps}). Without them a pinned column's placeholder scrolls
 * while its header stays stuck, so the row's cells land under the wrong headers
 * and the columns beside them read as pushed aside.
 *
 * A placeholder carries no `data-grid-col`, unlike every cell holding content:
 * that attribute is what the autosizer's body scan collects (see
 * `measureColumnIntrinsics`), and a leafless skeleton cell measures at its own
 * current width — folding that into a column's running-max content width would
 * hold the columns at whatever the loading state happened to be.
 *
 * @internal
 */
function GridSkeletonCellsImpl<T>({
	columns,
	pinning,
	leadingClassName,
}: GridSkeletonCellsProps<T>): ReactElement {
	return (
		<>
			{columns.map((col, index) => {
				const pinned = pinnedCellProps(pinning, col)

				return (
					<TableCell
						key={col.id}
						className={index === 0 ? cn(leadingClassName, pinned.className) : pinned.className}
						style={pinned.style}
					>
						<TextSkeleton />
					</TableCell>
				)
			})}
		</>
	)
}

/**
 * Memoized {@link GridSkeletonCellsImpl}: the infinite-scroll trailer draws its
 * cells from inside the virtualized body, which re-renders on every scroll
 * frame — this keeps the per-column pinning resolution off that path. @internal
 */
export const GridSkeletonCells = memo(GridSkeletonCellsImpl) as typeof GridSkeletonCellsImpl

/** Props for {@link GridSkeletonRows} and {@link GridLoadingBody}. @internal */
type GridSkeletonRowsProps<T> = {
	/** The visible columns, in render order. */
	columns: GridColumn<T>[]
	/** Frozen-column controls threaded to each placeholder cell; `null` when none. */
	pinning: GridColumnPinning | null
}

/**
 * The {@link GRID_LOADING_ROWS} placeholder rows {@link GridLoadingBody} draws,
 * without its `<tbody>` — for a caller that owns the body and holds this
 * silhouette in place of part of it (the windowed body, whose loading rows sit
 * between its spacers and its trailing infinite-scroll states).
 *
 * @internal
 */
export function GridSkeletonRows<T>({ columns, pinning }: GridSkeletonRowsProps<T>): ReactElement {
	return (
		<>
			{LOADING_ROW_KEYS.map((rowKey) => (
				<TableRow key={rowKey}>
					<GridSkeletonCells columns={columns} pinning={pinning} />
				</TableRow>
			))}
		</>
	)
}

/**
 * Body for {@link Grid} while `loading`: {@link GRID_LOADING_ROWS} placeholder
 * rows of {@link GridSkeletonCells}, drawn in place of the data rows.
 * Column-aware where the generic `TableLoading` is not, so the placeholders hold
 * the layout the arriving rows land in.
 *
 * @internal
 */
export function GridLoadingBody<T>({ columns, pinning }: GridSkeletonRowsProps<T>) {
	return (
		<TableBody>
			<GridSkeletonRows columns={columns} pinning={pinning} />
		</TableBody>
	)
}
