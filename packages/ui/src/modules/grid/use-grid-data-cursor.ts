'use client'

import {
	type Ref,
	type RefObject,
	useImperativeHandle,
	useLayoutEffect,
	useMemo,
	useState,
} from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import { resolveNewRowAddWidth, withNewRowAddColumn } from './engine/grid-new-row-column'
import {
	bridgeCellActivate,
	bridgeRowActivate,
	buildRovingCellActivate,
	composeCellDoubleClick,
} from './engine/grid-row/bridges'
import type { GridDataProps, GridEditSource, GridHandle } from './grid-data-types'
import type { GridColumn } from './types'
import { useGridCursor } from './use-grid-cursor'
import type { GridIndexRefs } from './use-grid-index'
import type { GridScrollRowIntoView } from './use-grid-navigation'

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
 * The cursor phase of {@link GridData}. It holds the stable click handlers and
 * their activation bridges, and the keyboard cursor with its editing layer. It
 * also holds the grid's imperative handle and the column of the new-row Add
 * control.
 *
 * @internal
 */
export function useGridDataCursor<T>({
	refs,
	navigable,
	range,
	editable,
	columns,
	source,
	onActiveCellChange,
	onRowClick,
	onCellClick,
	onRowDoubleClick,
	onCellDoubleClick,
	scrollRowIntoViewRef,
	scrollRef,
	tableRef,
	ref,
}: Pick<
	GridDataProps<T>,
	| 'editable'
	| 'range'
	| 'onActiveCellChange'
	| 'onRowClick'
	| 'onCellClick'
	| 'onRowDoubleClick'
	| 'onCellDoubleClick'
> & {
	refs: GridIndexRefs<T>
	/** Whether the keyboard cursor is on, after the grouping gates. */
	navigable: boolean
	/** The columns with the pin state applied. */
	columns: GridColumn<T>[]
	/** The grid's own inputs, for the commit path of an edit. */
	source: GridEditSource<T>
	/** Set by the virtualized body while it is mounted, else `null`. */
	scrollRowIntoViewRef: RefObject<GridScrollRowIntoView | null>
	/** The scroll container of a sticky or virtualized grid. */
	scrollRef: RefObject<HTMLDivElement | null>
	/** The grid `<table>`, the roving container and the cursor's tab stop. */
	tableRef: RefObject<HTMLTableElement | null>
	ref: Ref<GridHandle> | undefined
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

	// Bridge the row-click into the cursor's Enter/Space activation (see `bridgeRowActivate`).
	const onRowActivate = useMemo(() => bridgeRowActivate(handleRowClick), [handleRowClick])

	// Cell-roving activation: a focused cell's Enter/Space fires the cell click
	// then the row click, the same order (and pair) a pointer click fires. A grid
	// with no click handler fires the double-click pair instead. Stable so the
	// memoized cells hold; only invoked while cell roving is active.
	const cellActivate = useMemo(
		() =>
			buildRovingCellActivate({
				onCellClick: handleCellClick,
				onRowClick: handleRowClick,
				onCellDoubleClick: handleCellDoubleClick,
				onRowDoubleClick: handleRowDoubleClick,
			}),
		[handleCellClick, handleRowClick, handleCellDoubleClick, handleRowDoubleClick],
	)

	// Bridge the cell-click the same way: the cursor hands over its display
	// indices, resolved to the cell context through the live refs at activation.
	const onCellActivate = useMemo(
		() => bridgeCellActivate(handleCellClick, refs),
		[handleCellClick, refs],
	)

	// The cursor + editing layer: the augmented columns, the `<table>` cursor
	// props, the cursor store, and the row-editing-context wrapper. Inert for a
	// static grid.
	const cursor = useGridCursor<T>({
		navigable,
		range: range ?? false,
		editable,
		columns,
		onRowActivate,
		onCellActivate,
		onActiveCellChange,
		selectableRef: refs.selectableRef,
		toggleActiveRow,
		scrollRowIntoViewRef,
		scrollContainerRef: scrollRef,
		tableRef,
		refs,
		editSource: source,
	})

	// The grid's commands on its `ref` (see `GridHandle`).
	const { stepHistory } = cursor

	useImperativeHandle(
		ref,
		() => ({ undo: () => stepHistory('undo'), redo: () => stepHistory('redo') }),
		[stepHistory],
	)

	// Double-click-to-edit (under `editable.session: 'managed'`) rides the
	// built-in cell double-click event, ahead of the consumer's handler.
	const cellDoubleClick = useMemo(
		() => composeCellDoubleClick(cursor.editOnCellDoubleClick, handleCellDoubleClick),
		[cursor.editOnCellDoubleClick, handleCellDoubleClick],
	)

	// The new-row slot's Add control has a column of its own after the others
	// (see `withNewRowAddColumn`). It joins after the column order and visibility
	// state, so no saved state names it. It follows the configured slot, not the
	// loading state, so the column set stays stable. Its width is the one the Add
	// cell measures for its control, unless `newRowAdd.width` fixes it.
	const [measuredAddWidth, setMeasuredAddWidth] = useState<number | null>(null)

	const addWidth = resolveNewRowAddWidth(
		cursor.newRow !== null,
		editable?.newRowAdd,
		measuredAddWidth,
	)

	const engineColumns = useMemo(
		() => withNewRowAddColumn(cursor.columns, addWidth),
		[cursor.columns, addWidth],
	)

	return {
		cursor,
		handleRowClick,
		handleCellClick,
		handleRowDoubleClick,
		cellDoubleClick,
		cellActivate,
		engineColumns,
		setMeasuredAddWidth,
	}
}
