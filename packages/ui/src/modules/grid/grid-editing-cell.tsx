'use client'

import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import { GridEditInputs } from './grid-edit-inputs'
import { type GridRowEditing, useGridRowEditing } from './grid-editing-context'
import { inferEditorKind, isColumnEditable } from './grid-editing-utilities'
import type { GridColumn } from './types'
import { GridNavCell } from './use-grid-navigation-columns'

/** Props for the editing-aware data cell and its mounted editor. @internal */
type GridEditingCellProps<T> = {
	rowIdx: number
	colIdx: number
	rowKey: string | number
	row: T
	column: GridColumn<T>
	/** The column's display renderer (`col.cell`), shown when the row is not being edited. */
	render: ((row: T) => ReactNode) | undefined
}

/** Props for the mounted editor: the cell plus the row-editing staging and session callbacks. @internal */
type GridCellEditorProps<T> = Omit<GridEditingCellProps<T>, 'render'> &
	Pick<GridRowEditing, 'stageDraft' | 'unstageDraft' | 'commitRowEdit' | 'cancelRowEdit'>

/**
 * A cell's in-place editor while its row is in edit mode. Owns its live display
 * value (seeded from the cell's current value) and mirrors each change into the
 * grid's staged drafts; the grid stays unrendered as the user types. Renders the
 * column's {@link GridColumn.editCell} slot, or the editor inferred from the cell
 * value's primitive type. A failed `validate` rings the editor and shows the
 * message beneath the cell; Escape reverts the cell.
 *
 * @internal
 */
function GridCellEditor<T>({
	rowIdx,
	colIdx,
	rowKey,
	row,
	column,
	stageDraft,
	unstageDraft,
	commitRowEdit,
	cancelRowEdit,
}: GridCellEditorProps<T>) {
	const seed = column.field != null ? row[column.field] : undefined

	const [draft, setDraft] = useState<unknown>(seed)

	const update = (next: unknown) => {
		setDraft(next)

		stageDraft(rowKey, column.id, next)
	}

	const cancel = () => {
		setDraft(seed)

		unstageDraft(rowKey, column.id)
	}

	// Grid-owned session exits (`trigger: 'doubleClick'`), bound to this row;
	// `undefined` under a consumer-owned session, standing the session keys down.
	const commitRow = commitRowEdit ? () => commitRowEdit(rowKey) : undefined

	const cancelRow = cancelRowEdit ? () => cancelRowEdit(rowKey) : undefined

	const ariaLabel =
		typeof column.title === 'string'
			? `Edit ${column.title}, row ${rowIdx + 1}`
			: `Edit row ${rowIdx + 1} column ${colIdx + 1}`

	const error = column.validate ? column.validate(draft, row) : null

	// Links the editor to its message (aria-describedby) so the error reaches AT,
	// not just sighted users (WCAG 1.3.1 / 3.3.1).
	const errorId = useId()

	// The message renders below the cell (`top-full`), so a cell at the scroll
	// container's bottom or right edge can clip it. Scroll it into view when it first
	// appears — `nearest` is a no-op when it already fits, so it doesn't yank the
	// view while the error persists (WCAG 1.4.10).
	const messageRef = useRef<HTMLSpanElement>(null)

	const hasError = error != null

	useEffect(() => {
		if (hasError) messageRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
	}, [hasError])

	const body = column.editCell ? (
		column.editCell({
			row,
			value: draft,
			onValueUpdate: update,
			// A slot can stage a final value in one call (e.g. a select's pick); the
			// row's save flushes the staged values, so there is no per-cell close.
			// Under a grid-owned session the slot's commit also saves the row.
			commit: (next) => {
				if (next !== undefined) update(next)

				commitRow?.()
			},
			cancel,
			ariaLabel,
			required: column.required ?? false,
		})
	) : (
		<GridEditInputs
			kind={inferEditorKind(seed)}
			draft={draft}
			onValueUpdate={update}
			cancel={cancel}
			ariaLabel={ariaLabel}
			error={error}
			errorId={errorId}
			required={column.required}
			commitRow={commitRow}
			cancelRow={cancelRow}
		/>
	)

	return (
		<span className={cn(k.edit.host, error && k.edit.errorRing)}>
			{body}

			{error && (
				<span ref={messageRef} id={errorId} role="alert" className={cn(k.edit.error)}>
					{error}
				</span>
			)}
		</span>
	)
}

/**
 * One data cell of an editable grid. When its row key is in the editable set and
 * the column binds an editor, it mounts {@link GridCellEditor}; otherwise it
 * renders the column's display content through {@link GridNavCell} (which carries
 * the active-cursor ring). The editable set flips only on a row toggle, so cells
 * don't re-render as the user types.
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
	const { editableRows, stageDraft, unstageDraft, commitRowEdit, cancelRowEdit } =
		useGridRowEditing()

	if (editableRows.has(rowKey) && isColumnEditable(column)) {
		return (
			<GridCellEditor
				rowIdx={rowIdx}
				colIdx={colIdx}
				rowKey={rowKey}
				row={row}
				column={column}
				stageDraft={stageDraft}
				unstageDraft={unstageDraft}
				commitRowEdit={commitRowEdit}
				cancelRowEdit={cancelRowEdit}
			/>
		)
	}

	return (
		<GridNavCell row={rowIdx} col={colIdx}>
			{render?.(row)}
		</GridNavCell>
	)
}
