'use client'

import { type ReactNode, useCallback, useSyncExternalStore } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import { type GridSettleControls as SettleControls, useGridEditingSession } from './context'
import { isCellEditing, isColumnEditable } from './engine/grid-editing-utilities'
import { GridCellEditor } from './grid-cell-editor'
import type { GridEditableConfig } from './grid-editing-types'
import { searchedContent } from './grid-highlight-utilities'
import { GridNavCell } from './grid-nav-cell'
import type { GridColumn } from './types'

/** Props for the editing-aware data cell. @internal */
type GridEditingCellProps<T> = {
	rowIndex: number
	colIndex: number
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
function markBusy(node: HTMLElement) {
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
		<span ref={markBusy} data-slot="grid-edit-pending" className={cn(k.edit.pending)}>
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
export function pendingRow<T>(row: T, column: GridColumn<T>, value: unknown): T {
	const field = column.field

	if (field == null || Object.is(row[field], value)) return row

	const descriptors: PropertyDescriptorMap = Object.getOwnPropertyDescriptors(row)

	// A frozen row has descriptors that are not configurable, so set the field
	// in the map before the copy exists. A `defineProperty` on the copy throws.
	descriptors[field] = {
		value,
		writable: true,
		enumerable: true,
		configurable: true,
	}

	return Object.create(Object.getPrototypeOf(row), descriptors)
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
 * the value as pending and mounts no editor, whatever the session holds. On a
 * phone the open cell shows its content, and the overlay of the grid holds its
 * editor ({@link GridEditableConfig.overlay}). The
 * cell reads the coord and the editable set from the session's store through
 * its own flag. A session move therefore re-renders the two cells whose flag
 * flipped, and a row that opens re-renders only its own cells.
 *
 * @internal
 */
export function GridEditingCell<T>({
	rowIndex,
	colIndex,
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
		hasEntry,
		claimFocus,
		settleControls,
		resumeCell,
		managed,
		overlay,
	} = useGridEditingSession()

	const columnId = column.id

	// The draft leads: a pending cell shows its value whatever the session
	// holds. A cell with no draft (every cell, most of the time) costs one probe
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

		// The row edits in its form, so the cell shows its content.
		if (activeEditStore.expanded() === rowKey) return CELL_READING

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
			<GridNavCell row={rowIndex} col={colIndex}>
				<GridPendingCell>{render?.(pendingRow(row, column, value))}</GridPendingCell>
			</GridNavCell>
		)
	}

	// The editor keeps the cursor ring. Under the default `commitOn`, focus can
	// leave the grid with the editor open. When focus comes back, the cursor can
	// seat on this cell, and the ring is then the only mark of it (WCAG 2.4.7).
	// The overlay of a phone holds the open editors, so the cell shows its content.
	if (overlay === null && flag !== CELL_READING && isColumnEditable(column)) {
		return (
			<GridNavCell row={rowIndex} col={colIndex}>
				<GridCellEditor
					rowIndex={rowIndex}
					rowKey={rowKey}
					row={row}
					column={column}
					stageDraft={stageDraft}
					unstageDraft={unstageDraft}
					readDraft={readDraft}
					endSession={endSession}
					entrySeed={entrySeed}
					hasEntry={hasEntry}
					claimFocus={claimFocus}
					resumeCell={resumeCell}
					managed={managed}
					settle={flag === CELL_HELD ? 'none' : flag}
					held={flag === CELL_HELD}
					rest={render?.(row)}
				/>
			</GridNavCell>
		)
	}

	return (
		<GridNavCell row={rowIndex} col={colIndex}>
			{searchedContent(column, render?.(row))}
		</GridNavCell>
	)
}
