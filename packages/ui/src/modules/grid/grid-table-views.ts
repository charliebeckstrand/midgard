'use client'

import type { Table } from '@tanstack/react-table'
import { useRef } from 'react'
import { isDataColumn } from '../../utilities'
import {
	deriveVisibleColumns,
	type GridColumnResize,
	sameElements,
} from './engine/grid-table/views'
import type { GridColumn } from './types'

/**
 * The engine-resolved {@link deriveVisibleColumns} list, recomputed each render
 * (the leaf columns read live engine state) but held at a stable reference while
 * its contents are element-wise unchanged — so the header and the memos keyed on
 * it don't churn between renders.
 *
 * @internal
 */
export function useVisibleColumns<T>(table: Table<T>): GridColumn<T>[] {
	const candidate = deriveVisibleColumns(table)

	const ref = useRef(candidate)

	const stable = sameElements(ref.current, candidate) ? ref.current : candidate

	ref.current = stable

	return stable
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
	const candidate = columns.map((col) =>
		resize && !resizing && isDataColumn(col) ? resize.getSize(col.id) : undefined,
	)

	const ref = useRef(candidate)

	const stable = sameElements(ref.current, candidate) ? ref.current : candidate

	ref.current = stable

	return stable
}
