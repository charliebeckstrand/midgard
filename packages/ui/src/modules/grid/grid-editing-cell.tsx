'use client'

import { type ReactNode, useCallback, useSyncExternalStore } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import { isCellEditing, isColumnEditable } from './engine/grid-editing-utilities'
import { GridCellEditor } from './grid-cell-editor'
import {
	type GridSettleControls as SettleControls,
	useGridEditingSession,
} from './grid-editing-context'
import { searchedContent } from './grid-highlight-utilities'
import { GridNavCell } from './grid-nav-cell'
import type { GridColumn } from './types'

/** Props for the editing-aware data cell. @internal */
type GridEditingCellProps<T> = {
	rowIdx: number
	colIdx: number
	rowKey: string | number
	row: T
	column: GridColumn<T>
	/** The column's display renderer (`col.cell`), shown when the row is not being edited. */
	render: ((row: T) => ReactNode) | undefined
}

/**
 * Marks the `role="gridcell"` ancestor of `node` `aria-busy`, and returns the
 * cleanup that removes the mark. A ref callback for {@link GridPendingCell}.
 * @internal
 */
function markCellBusy(node: HTMLElement) {
	const cell = node.closest<HTMLElement>('[role="gridcell"]')

	cell?.setAttribute('aria-busy', 'true')

	return () => {
		cell?.removeAttribute('aria-busy')
	}
}

/**
 * A data cell whose commit is in flight. It shows the committed value, marks
 * the cell `aria-busy`, and pulses. The attribute goes on the cell itself,
 * the `role="gridcell"` element around this content, the way
 * {@link GridNavCell} writes `data-active`. @internal
 */
function GridPendingCell({ children }: { children: ReactNode }) {
	return (
		<span ref={markCellBusy} data-slot="grid-edit-pending" className={cn(k.edit.pending)}>
			{children}
		</span>
	)
}

/**
 * The row that a pending cell renders: `row` with the committed value in the
 * column's field. A consumer that applied the change already needs no copy.
 * A column with no `field` renders the row as it is.
 *
 * @remarks The copy keeps the row's prototype and its own property
 * descriptors, so the methods and getters of a class row still work. The
 * committed value is an own property that shadows a getter of the same name.
 * A private class field does not copy, so a method that reads one fails on
 * the copy. @internal
 */
function pendingRow<T>(row: T, column: GridColumn<T>, value: unknown): T {
	const field = column.field

	if (field == null || Object.is(row[field], value)) return row

	const copy: T = Object.create(Object.getPrototypeOf(row), Object.getOwnPropertyDescriptors(row))

	Object.defineProperty(copy, field, {
		value,
		writable: true,
		enumerable: true,
		configurable: true,
	})

	return copy
}

/** A data cell that shows its display content, not an editor. @internal */
const CELL_READING = 'reading'

/** A data cell whose commit is in flight. @internal */
const CELL_PENDING = 'pending'

/** A refused cell that the refusal holds open beside a cell-scoped session. @internal */
const CELL_HELD = 'held'

/**
 * One data cell of an editable grid. When its row key is in the editable set and
 * the column binds an editor, it mounts {@link GridCellEditor}. Otherwise it
 * renders the column's display content. Both render through {@link GridNavCell},
 * which carries the active-cursor ring. A cell-scoped session (`scope: 'cell'`)
 * narrows that to the one cell it names. A cell whose commit is in flight shows
 * the value as pending and mounts no editor, whatever the session holds. The
 * cell reads the coord and the editable set from the session's store through
 * its own flag. A session move therefore re-renders the two cells whose flag
 * flipped, and a row that opens re-renders only its own cells.
 *
 * @internal
 */
export function GridEditingCell<T>({
	rowIdx,
	colIdx,
	rowKey,
	row,
	column,
	render,
}: GridEditingCellProps<T>) {
	const {
		activeEditStore,
		stageDraft,
		unstageDraft,
		readDraft,
		endSession,
		entrySeed,
		claimFocus,
		settleControls,
		resumeCell,
		managed,
	} = useGridEditingSession()

	const columnId = column.id

	// The draft leads: a pending cell shows its value whatever the session
	// holds. A cell with no draft — every cell, most of the time — costs one probe
	// of an empty store and one of the editable set. An open editor then reads
	// its settle controls from the session, which owns that policy. The flag is
	// a string, so the store's notice re-renders only a cell whose answer changed.
	const readFlag = useCallback(():
		| SettleControls
		| typeof CELL_READING
		| typeof CELL_PENDING
		| typeof CELL_HELD => {
		const draft = readDraft(rowKey, columnId)

		if (draft?.status === 'pending') return CELL_PENDING

		const activeEdit = activeEditStore.get()

		const editableRows = activeEditStore.rows()

		if (!isCellEditing({ rowKey, columnId, editableRows, activeEdit }))
			return draft?.reopened ? CELL_HELD : CELL_READING

		return settleControls(rowKey, columnId)
	}, [activeEditStore, settleControls, readDraft, rowKey, columnId])

	const flag = useSyncExternalStore(activeEditStore.subscribe, readFlag, readFlag)

	if (flag === CELL_PENDING) {
		const value = readDraft(rowKey, columnId)?.value

		return (
			<GridNavCell row={rowIdx} col={colIdx}>
				<GridPendingCell>{render?.(pendingRow(row, column, value))}</GridPendingCell>
			</GridNavCell>
		)
	}

	// The editor keeps the cursor ring. Under the default `commitOn`, focus can
	// leave the grid with the editor open. When focus comes back, the cursor can
	// seat on this cell, and the ring is then the only mark of it (WCAG 2.4.7).
	if (flag !== CELL_READING && isColumnEditable(column)) {
		return (
			<GridNavCell row={rowIdx} col={colIdx}>
				<GridCellEditor
					rowIdx={rowIdx}
					rowKey={rowKey}
					row={row}
					column={column}
					stageDraft={stageDraft}
					unstageDraft={unstageDraft}
					readDraft={readDraft}
					endSession={endSession}
					entrySeed={entrySeed}
					claimFocus={claimFocus}
					resumeCell={resumeCell}
					managed={managed}
					settle={flag === CELL_HELD ? 'none' : flag}
					held={flag === CELL_HELD}
				/>
			</GridNavCell>
		)
	}

	return (
		<GridNavCell row={rowIdx} col={colIdx}>
			{searchedContent(column, render?.(row))}
		</GridNavCell>
	)
}
