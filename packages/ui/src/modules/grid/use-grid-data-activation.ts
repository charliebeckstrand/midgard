'use client'

import { type RefObject, useLayoutEffect, useMemo } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import {
	bridgeCellActivate,
	bridgeRowActivate,
	buildRovingCellActivate,
	keyboardActivation,
} from './engine/grid-row/bridges'
import type { GridDataProps, GridEditSource } from './grid-data-types'
import type { GridIndexRefs } from './use-grid-index'

/**
 * Writes the edit source into its ref, in a layout effect. The editing layer
 * reads the source value during render, and it reads the ref only in events
 * and effects. The call comes before the cursor, so the write comes before
 * the layout effects of the editing layer.
 *
 * @remarks
 * A child renders and runs its layout effects before this effect. Thus a child
 * must not read the ref in its render or in a layout effect, because there it
 * gets the source of the last commit.
 *
 * @internal
 */
function useGridEditSourceSync<T>(
	editSourceRef: RefObject<GridEditSource<T>>,
	source: GridEditSource<T>,
): void {
	useLayoutEffect(() => {
		editSourceRef.current = source
	}, [editSourceRef, source])
}

/**
 * Stabilizes a consumer event callback (`onRowClick`, `onCellClick`, and their
 * double-click counterparts) so the memoized rows hold across renders. It
 * returns a referentially-stable handler, or `undefined` when no callback is
 * set. That handler is a {@link useStableEvent} that reads the live callback,
 * so an inline consumer callback doesn't churn every row.
 *
 * @internal
 */
function useStableHandler<A extends unknown[]>(
	handler: ((...args: A) => void) | undefined,
): ((...args: A) => void) | undefined {
	const stable = useStableEvent((...args: A) => handler?.(...args))

	return handler ? stable : undefined
}

/**
 * The inputs of the cursor phase of {@link GridData} that come from the
 * consumer's click handlers: the stable handlers and their activation bridges.
 * It also writes the edit source into its ref, ahead of the cursor. The
 * read-only cursor and the editing cursor take the same activation.
 *
 * @internal
 */
export function useGridDataActivation<T>({
	refs,
	source,
	onRowClick,
	onCellClick,
	onRowDoubleClick,
	onCellDoubleClick,
}: Pick<
	GridDataProps<T>,
	'onRowClick' | 'onCellClick' | 'onRowDoubleClick' | 'onCellDoubleClick'
> & {
	refs: GridIndexRefs<T>
	/** The grid's own inputs, for the commit path of an edit. */
	source: GridEditSource<T>
}) {
	// The editing layer's commit path resolves a staged draft against the grid's
	// own inputs, not against the index refs: those narrow to what the window
	// renders, and a draft can outlive that window.
	useGridEditSourceSync(refs.editSourceRef, source)

	// Space on the active row toggles its selection. The toggle comes from the
	// view phase, after the engine resolves the row keys, so the cursor reads it
	// through a ref at key time.
	const toggleActiveRow = (rowIndex: number) => {
		const key = refs.rowKeysRef.current[rowIndex]

		if (key !== undefined) refs.toggleRowRef.current?.(key)
	}

	// Stable click handlers so the memoized rows don't churn when the consumer
	// passes inline callbacks; the cursor also activates its cell/row on Enter.
	const handleRowClick = useStableHandler(onRowClick)

	const handleCellClick = useStableHandler(onCellClick)

	const handleRowDoubleClick = useStableHandler(onRowDoubleClick)

	const handleCellDoubleClick = useStableHandler(onCellDoubleClick)

	// The handlers that Enter or Space fires: the click pair, or with no click
	// handler the double-click pair (see `keyboardActivation`).
	const activation = useMemo(
		() =>
			keyboardActivation({
				onCellClick: handleCellClick,
				onRowClick: handleRowClick,
				onCellDoubleClick: handleCellDoubleClick,
				onRowDoubleClick: handleRowDoubleClick,
			}),
		[handleCellClick, handleRowClick, handleCellDoubleClick, handleRowDoubleClick],
	)

	// Bridge the row handler into the cursor's Enter/Space activation (see `bridgeRowActivate`).
	const onRowActivate = useMemo(() => bridgeRowActivate(activation.onRow), [activation])

	// Cell-roving activation: a focused cell's Enter/Space fires the cell handler
	// then the row handler, the order a pointer click fires them in. Stable so
	// the memoized cells hold; only invoked while cell roving is active.
	const cellActivate = useMemo(() => buildRovingCellActivate(activation), [activation])

	// Bridge the cell handler the same way: the cursor hands over its display
	// indices, resolved to the cell context through the live refs at activation.
	const onCellActivate = useMemo(
		() => bridgeCellActivate(activation.onCell, refs),
		[activation, refs],
	)

	return {
		toggleActiveRow,
		handleRowClick,
		handleCellClick,
		handleRowDoubleClick,
		handleCellDoubleClick,
		onRowActivate,
		onCellActivate,
		cellActivate,
	}
}
