'use client'

// The frozen-column view of the grid. It reads no engine table, and
// `useGridTable` calls it (see `use-grid-table.ts`). It calls
// `useGridPinnedOffsets` through the module of that hook, so a test can
// replace the measurement.

import type { ColumnPinningState } from '@tanstack/react-table'
import { type RefObject, useLayoutEffect, useMemo, useState } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import { useStableValue } from '../../hooks/use-stable-value'
import {
	EMPTY_FROZEN_LAYOUT,
	type FrozenLayout,
	frozenLayout,
	sameFrozenLayout,
	sameFrozenStructure,
} from './engine/grid-pin/layout'
import type { FrozenOffsets } from './engine/grid-pin/measure'
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
	const { hasPinned, left, right, widths, containerRef } = args

	const sections = {
		left: left.map((column) => column.id),
		right: right.map((column) => column.id),
	}

	// The first render has no measurement yet, so the store starts at the layout of
	// the engine's widths, which is the layout of that render.
	const [offsets] = useState(() =>
		createFrozenOffsetStore(hasPinned ? frozenLayout(sections, widths, null) : EMPTY_FROZEN_LAYOUT),
	)

	// Writes a measurement that the observer of `useGridPinnedOffsets` takes, through
	// the offset store, as the layout effect below writes a commit.
	const write = useStableEvent((measured: FrozenOffsets) => {
		const next = frozenLayout(sections, widths, measured)

		const prev = offsets.commit(next)

		const container = containerRef?.current

		if (container) writeFrozenOffsets(container, prev, next)
	})

	const measured = useGridPinnedOffsets({
		frozen: hasPinned,
		engineSized: args.resizable,
		pinning: args.columnPinning,
		columns: args.visibleColumns,
		containerRef,
		write,
	})

	const layout = useStableValue<FrozenLayout>(
		hasPinned ? frozenLayout(sections, widths, measured) : EMPTY_FROZEN_LAYOUT,
		sameFrozenLayout,
	)

	const structure = useStableValue<FrozenLayout>(layout, sameFrozenStructure)

	useLayoutEffect(() => {
		const prev = offsets.commit(layout)

		const container = containerRef?.current

		if (container && prev !== layout) writeFrozenOffsets(container, prev, layout)
	}, [offsets, layout, containerRef])

	return useMemo(
		() => (hasPinned ? buildColumnPinning(structure, offsets) : null),
		[hasPinned, structure, offsets],
	)
}
