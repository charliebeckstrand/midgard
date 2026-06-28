'use client'

import { type ReactNode, useState } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import { GridEditInputs } from './grid-edit-inputs'
import { useGridEditingCoord, useGridEditSession } from './grid-editing-context'
import { inferEditorKind } from './grid-editing-utilities'
import type { GridColumn } from './types'
import { GridNavCell } from './use-grid-navigation-columns'

/** Props for the editing-aware data cell and its mounted editor. @internal */
type GridEditingCellProps<T> = {
	rowIdx: number
	colIdx: number
	row: T
	column: GridColumn<T>
	/** The column's display renderer (`col.cell`), shown when the cell is not being edited. */
	render: ((row: T) => ReactNode) | undefined
}

/**
 * The active cell's in-place editor. Reads the live edit session and renders the
 * column's {@link GridColumn.editCell} slot, or the editor inferred from the
 * cell value's primitive type. A rejected validation rings the editor and shows
 * the message beneath the cell.
 *
 * @internal
 */
function GridCellEditor<T>({
	rowIdx,
	colIdx,
	row,
	column,
}: Omit<GridEditingCellProps<T>, 'render'>) {
	const session = useGridEditSession()

	// The editor owns its live display value, seeded once from the session; each
	// change mirrors into the grid's commit-read ref. The grid stays unrendered
	// while the user types.
	const [draft, setDraft] = useState<unknown>(session.initialDraft)

	const update = (next: unknown) => {
		setDraft(next)

		session.onValueUpdate(next)
	}

	const ariaLabel =
		typeof column.title === 'string'
			? `Edit ${column.title}, row ${rowIdx + 1}`
			: `Edit row ${rowIdx + 1} column ${colIdx + 1}`

	const current = column.field != null ? row[column.field] : undefined

	const body = column.editCell ? (
		column.editCell({
			row,
			value: draft,
			onValueUpdate: update,
			// A slot can stage-and-commit in one call (e.g. a select's pick) by
			// passing the chosen value; the draft write is synchronous, so the commit
			// reads it.
			commit: (next) => {
				if (next !== undefined) update(next)

				session.commit()
			},
			cancel: session.cancel,
			ariaLabel,
		})
	) : (
		<GridEditInputs
			kind={inferEditorKind(current)}
			draft={draft}
			onValueUpdate={update}
			commit={session.commit}
			cancel={session.cancel}
			ariaLabel={ariaLabel}
		/>
	)

	return (
		<span className={cn(k.edit.host, session.error && k.edit.errorRing)}>
			{body}

			{session.error && (
				<span role="alert" className={cn(k.edit.error)}>
					{session.error}
				</span>
			)}
		</span>
	)
}

/**
 * One data cell of an editable grid. When its coordinate is the open edit, it
 * mounts {@link GridCellEditor}; otherwise it renders the column's display
 * content through {@link GridNavCell}, which carries the active-cursor ring. The
 * editing flag comes from the coord context (it flips only on edit begin/end), so
 * cells don't re-render as the draft changes.
 *
 * @internal
 */
export function GridEditingCell<T>({
	rowIdx,
	colIdx,
	row,
	column,
	render,
}: GridEditingCellProps<T>) {
	const editingCoord = useGridEditingCoord()

	const isEditing =
		editingCoord != null && editingCoord.row === rowIdx && editingCoord.col === colIdx

	if (isEditing) {
		return <GridCellEditor rowIdx={rowIdx} colIdx={colIdx} row={row} column={column} />
	}

	return (
		<GridNavCell row={rowIdx} col={colIdx}>
			{render?.(row)}
		</GridNavCell>
	)
}
