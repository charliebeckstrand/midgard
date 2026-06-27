import type { ReactNode, RefObject } from 'react'
import { Alert } from '../../components/alert'
import { TableBody, TableEmpty, TableLoading } from '../../components/table'
import { type GridRowsProps, renderGridRow } from './grid-row'
import { GridVirtualizedBody } from './grid-virtualized-body'

/** Props for {@link GridBody}. @internal */
type GridBodyProps<T> = GridRowsProps<T> & {
	loading: boolean
	empty: ReactNode
	/** Error-state node shown in place of the body; `true` for a default alert. Takes precedence over `empty`. */
	error: ReactNode
	virtualize: {
		scrollRef: RefObject<HTMLDivElement | null>
		estimateSize: number
		overscan: number
	} | null
}

/**
 * Body for {@link Grid}: branches between the loading skeleton, the error slot,
 * the `empty` slot, the virtualized window, and the plain row map, threading
 * per-row state to each {@link GridRow}.
 *
 * @internal
 */
export function GridBody<T>(props: GridBodyProps<T>) {
	const { loading, rows, visibleColumns, empty, error, gridSemantics, rowIndexOffset, virtualize } =
		props

	if (loading) return <TableLoading columns={visibleColumns.length} />

	// An error state pre-empts the empty slot: a failed fetch has no rows, but the
	// cause isn't "no items". `true` renders a default error alert.
	if (error != null && error !== false) {
		return (
			<TableEmpty columns={visibleColumns.length}>
				{error === true ? (
					<Alert severity="error" variant="soft" title="Couldn't load data" block />
				) : (
					error
				)}
			</TableEmpty>
		)
	}

	if (rows.length === 0) return <TableEmpty columns={visibleColumns.length}>{empty}</TableEmpty>

	if (virtualize) {
		return <GridVirtualizedBody<T> {...props} {...virtualize} />
	}

	// Header occupies row 1; data rows are offset by 2, plus the page offset so a
	// paginated row reports its place in the full set. Only emitted under grid
	// semantics (a plain table conveys it natively).
	return (
		<TableBody>
			{rows.map((row, index) =>
				renderGridRow(props, row, index, gridSemantics ? rowIndexOffset + index + 2 : undefined),
			)}
		</TableBody>
	)
}
