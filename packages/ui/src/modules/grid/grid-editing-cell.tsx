'use client'

import { Check, X } from 'lucide-react'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import {
	inferEditorKind,
	isCellEditing,
	isColumnEditable,
	isSameCell,
} from './engine/grid-editing-utilities'
import { GridEditInputs } from './grid-edit-inputs'
import { type GridEditingSession, useGridEditingSession } from './grid-editing-context'
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

/** Props for the mounted editor: the cell plus the session's staging and exit callbacks. @internal */
type GridCellEditorProps<T> = Omit<GridEditingCellProps<T>, 'render'> &
	Pick<GridEditingSession, 'stageDraft' | 'unstageDraft' | 'endSession'> & {
		/** Whether this cell is the one a cell-scoped session holds; shows the settle pair. */
		settling: boolean
	}

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
	endSession,
	settling,
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

	// The grid-owned save (`trigger: 'doubleClick'`), bound to this row;
	// `undefined` under a consumer-owned session, standing the session keys down.
	// There is no matching abandon here: Escape reaches the session through the
	// grid table's key surface, which every editor inherits without wiring.
	const commitRow = endSession && (() => endSession(rowKey, 'save'))

	// Names the cell for every control in it, so the editor and the settle pair
	// read as one thing to a screen reader rather than three unrelated widgets.
	const label =
		typeof column.title === 'string'
			? `${column.title}, row ${rowIdx + 1}`
			: `row ${rowIdx + 1} column ${colIdx + 1}`

	const ariaLabel = `Edit ${label}`

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

	// The settle pair, shown on the one cell a cell-scoped session holds. Row
	// scope leaves it off: the whole row edits at once there, and its settle
	// control is the consumer's own row action, at the granularity that matches.
	// Here the grid owns the session and nothing else on screen ends it, so this
	// is the only visible way out — and the only keyboard commit an editor that
	// spends its own Enter can have (WCAG 2.1.1), the listbox being the one that
	// does.
	const settle = settling && endSession && (
		<span className={cn(k.edit.settle)}>
			<Button
				type="button"
				variant="bare"
				color="green"
				aria-label={`Save ${label}`}
				className={cn(k.edit.settleButton)}
				onClick={() => endSession(rowKey, 'save')}
			>
				<Icon icon={<Check />} />
			</Button>
			<Button
				type="button"
				variant="bare"
				color="red"
				aria-label={`Discard ${label}`}
				className={cn(k.edit.settleButton)}
				onClick={() => endSession(rowKey, 'discard')}
			>
				<Icon icon={<X />} />
			</Button>
		</span>
	)

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
		/>
	)

	return (
		<span className={cn(k.edit.host, error && k.edit.errorRing)}>
			{body}

			{settle}

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
 * the active-cursor ring). A cell-scoped session (`scope: 'cell'`) narrows that
 * to the one cell it names. The editable set and the active cell flip only on a
 * session transition, so cells don't re-render as the user types.
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
	const { editableRows, activeEdit, stageDraft, unstageDraft, endSession } = useGridEditingSession()

	// `isCellEditing` leads because it bails on the editable-set lookup. A cell of
	// a row nobody is editing — every cell, most of the time — costs one probe.
	if (
		isCellEditing({ rowKey, columnId: column.id, editableRows, activeEdit }) &&
		isColumnEditable(column)
	) {
		return (
			<GridCellEditor
				rowIdx={rowIdx}
				colIdx={colIdx}
				rowKey={rowKey}
				row={row}
				column={column}
				stageDraft={stageDraft}
				unstageDraft={unstageDraft}
				endSession={endSession}
				settling={isSameCell(activeEdit, { rowKey, columnId: column.id })}
			/>
		)
	}

	return (
		<GridNavCell row={rowIdx} col={colIdx}>
			{render?.(row)}
		</GridNavCell>
	)
}
