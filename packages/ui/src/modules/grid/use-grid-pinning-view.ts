'use client'

// The frozen-column view of the grid. It reads no engine table, and
// `useGridTable` calls it (see `use-grid-table.ts`). It calls
// `useGridPinnedOffsets` through the module of that hook, so a test can
// replace the measurement.

import type { ColumnPinningState } from '@tanstack/react-table'
import { type RefObject, useLayoutEffect, useMemo, useState } from 'react'
import { useStableValue } from '../../hooks/use-stable-value'
import {
	EMPTY_FROZEN_LAYOUT,
	type FrozenLayout,
	frozenLayout,
	sameFrozenLayout,
	sameFrozenStructure,
} from './engine/grid-pin/layout'
import { createFrozenOffsetStore, writeFrozenOffsets } from './engine/grid-pin/offsets'
import type { EngineColumn } from './engine/grid-table/features'
import { buildColumnPinning, type GridColumnPinning } from './engine/grid-table/pinning-view'
import type { GridColumn } from './types'
import { useGridPinnedOffsets } from './use-grid-pinned-offsets'

/**
 * The {@link GridColumnPinning} value, or `null` when no column is frozen.
 *
 * @remarks
 * A frozen column sticks at the summed width of the frozen columns ahead of it.
 * Those widths are the rendered ones only under the fixed-layout colgroup that
 * a resizable grid lays out from them. A non-resizable grid lays out `auto` and
 * sizes each column to its content, so there the offsets are measured from the
 * rendered header instead. Without that, a stack of frozen columns spreads apart
 * by the difference, and the scrolling columns show through the gaps.
 *
 * The view holds its reference while each frozen column keeps its edge and
 * its boundary role. A drag on a scrolling column therefore re-renders no row.
 * A drag that shifts the frozen stack also re-renders no row. The layout effect
 * commits the new layout to the offset store, and writes the moved offsets to
 * the frozen cells before the browser paints. A new render of the full view
 * cost about half of a frozen resize, over 1,000 rows or more.
 *
 * @internal
 */
export function useGridPinningView<T>(args: {
	hasPinned: boolean
	resizable: boolean
	columnPinning: ColumnPinningState
	visibleColumns: GridColumn<T>[]
	containerRef: RefObject<HTMLElement | null> | undefined
	left: readonly EngineColumn<T>[]
	right: readonly EngineColumn<T>[]
	widths: ReadonlyMap<string, number>
}): GridColumnPinning | null {
	const { hasPinned, left, right, widths } = args

	const measured = useGridPinnedOffsets({
		frozen: hasPinned,
		engineSized: args.resizable,
		pinning: args.columnPinning,
		columns: args.visibleColumns,
		containerRef: args.containerRef,
	})

	const sections = {
		left: left.map((column) => column.id),
		right: right.map((column) => column.id),
	}

	const layout = useStableValue<FrozenLayout>(
		hasPinned ? frozenLayout(sections, widths, measured) : EMPTY_FROZEN_LAYOUT,
		sameFrozenLayout,
	)

	const structure = useStableValue<FrozenLayout>(layout, sameFrozenStructure)

	const [offsets] = useState(() => createFrozenOffsetStore(layout))

	const { containerRef } = args

	useLayoutEffect(() => {
		const previous = offsets.commit(layout)

		const container = containerRef?.current

		if (container && previous !== layout) writeFrozenOffsets(container, previous, layout)
	}, [offsets, layout, containerRef])

	return useMemo(
		() => (hasPinned ? buildColumnPinning(structure, offsets) : null),
		[hasPinned, structure, offsets],
	)
}
