import type { ReactNode, RefObject } from 'react'
import { TableBody, TableEmpty, TableLoading } from '../../components/table'
import { type GridRowsProps, renderGridRow } from './grid-row'
import { GridVirtualizedBody } from './grid-virtualized-body'

/** Props for {@link GridBody}. @internal */
type GridBodyProps<T> = GridRowsProps<T> & {
	loading: boolean
	empty: ReactNode
	virtualize: {
		scrollRef: RefObject<HTMLDivElement | null>
		estimateSize: number
		overscan: number
	} | null
}

/**
 * Body for {@link Grid}: branches between the loading skeleton, the `empty`
 * slot, the virtualized window, and the plain row map, threading per-row state
 * to each {@link GridRow}.
 *
 * @internal
 */
export function GridBody<T>(props: GridBodyProps<T>) {
	const { loading, rows, visibleColumns, empty, virtualize } = props

	if (loading) return <TableLoading columns={visibleColumns.length} />

	if (rows.length === 0) return <TableEmpty columns={visibleColumns.length}>{empty}</TableEmpty>

	if (virtualize) {
		return <GridVirtualizedBody<T> {...props} {...virtualize} />
	}

	return <TableBody>{rows.map((row, index) => renderGridRow(props, row, index))}</TableBody>
}
