'use client'

import type { Table } from '@tanstack/react-table'
import { useRef } from 'react'
import { isDataColumn } from '../../utilities'
import {
	EMPTY_FROZEN_LAYOUT,
	type FrozenLayout,
	frozenLayout,
	sameFrozenLayout,
} from './engine/grid-pin/layout'
import type { FrozenOffsets } from './engine/grid-pin/measure'
import {
	deriveVisibleColumns,
	type GridColumnResize,
	sameElements,
} from './engine/grid-table/views'
import type { GridColumn } from './types'

/**
 * Holds a re-derived value at its previous reference while `same` reports the two
 * equal, so a render that resolved the same facts hands the memos below it the
 * identity they already hold. The shape the snapshots in this file share: each
 * reads the engine live every render, and republishes only on a real change.
 *
 * @internal
 */
function useStableValue<T>(candidate: T, same: (previous: T, next: T) => boolean): T {
	const ref = useRef(candidate)

	const stable = same(ref.current, candidate) ? ref.current : candidate

	ref.current = stable

	return stable
}

/**
 * The engine-resolved {@link deriveVisibleColumns} list, recomputed each render
 * (the leaf columns read live engine state) but held at a stable reference while
 * its contents are element-wise unchanged — so the header and the memos keyed on
 * it don't churn between renders.
 *
 * @internal
 */
export function useVisibleColumns<T>(table: Table<T>): GridColumn<T>[] {
	return useStableValue(deriveVisibleColumns(table), sameElements)
}

/**
 * Per-visible-column width snapshot for the body cells' truncation detector:
 * `undefined` while a column drag is in flight — so the memoized cells hold
 * frame-to-frame — and the settled engine width otherwise. Its change after a
 * resize settles (or a keyboard `nudge`, which moves the width with no drag)
 * re-renders just that column's cells, re-running their overflow measure against
 * the new width; the header reads no snapshot, re-rendering on its own `width`
 * prop. Held at a stable reference while element-wise unchanged, so a drag frame
 * doesn't churn every row.
 *
 * @internal
 */
export function useColumnSettleWidths<T>(
	columns: GridColumn<T>[],
	resize: GridColumnResize | null,
	resizing: boolean,
): (number | undefined)[] {
	return useStableValue(
		columns.map((col) =>
			resize && !resizing && isDataColumn(col) ? resize.getSize(col.id) : undefined,
		),
		sameElements,
	)
}

/**
 * The frozen columns' resolved chrome ({@link frozenLayout}), recomputed each
 * render — the engine's pin state and column sizes both read live — but held at a
 * stable reference while every frozen column keeps its edge, its offset, and the
 * boundary. This reference is what carries a frozen-layout change across the
 * memo boundaries the pinned chrome rides (see {@link FrozenLayout}): pin a
 * second column and the boundary rule moves off the first, drag a frozen column
 * wider and the ones behind it track it frame by frame instead of settling at the
 * end of the drag.
 *
 * The hold keeps that cost to the frames that earn it. A drag on a scrolling
 * column moves no frozen offset, so the layout compares equal and no row
 * re-renders; only a drag that shifts the frozen stack re-renders it.
 *
 * @param frozen - Whether any column is frozen; an unfrozen grid resolves nothing.
 * @internal
 */
export function useFrozenLayout<T>(
	frozen: boolean,
	table: Table<T>,
	measured: FrozenOffsets | null,
): FrozenLayout {
	return useStableValue(
		frozen ? frozenLayout(table, measured) : EMPTY_FROZEN_LAYOUT,
		sameFrozenLayout,
	)
}
