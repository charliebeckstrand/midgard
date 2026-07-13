'use client'

import {
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react'
import { cn } from '../../core'
import { focusWithoutReveal } from '../../hooks/use-truncation'
import { k } from '../../recipes/kata/grid'
import { inferEditorKind, isColumnEditable } from './engine/grid-editing-utilities'
import { GridEditInputs } from './grid-edit-inputs'
import { type GridRowEditing, type SessionMove, useGridRowEditing } from './grid-editing-context'
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
	Pick<
		GridRowEditing,
		| 'stageDraft'
		| 'unstageDraft'
		| 'claimPendingFocus'
		| 'commitRowEdit'
		| 'cancelRowEdit'
		| 'commitOnEnter'
	>

/** Focusable editor content inside an editing cell, in preference order. @internal */
const EDITOR_FOCUSABLE = 'input, select, textarea, button, [tabindex]'

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
	claimPendingFocus,
	commitRowEdit,
	cancelRowEdit,
	commitOnEnter,
}: GridCellEditorProps<T>) {
	const seed = column.field != null ? row[column.field] : undefined

	const [draft, setDraft] = useState<unknown>(seed)

	const hostRef = useRef<HTMLSpanElement>(null)

	// The grid-owned entry that began this session recorded which cell's editor
	// should take focus; the editor resolves that handshake here at mount —
	// whatever render pass mounted it — rather than the grid locating it from
	// outside. A typed-to-enter seed replaces the value (spreadsheet typing) in
	// the inferred text/number editors; slots and the listbox own their controls,
	// so a seed can't be injected there. Focus routes through the truncation-safe
	// helper: it fires a `focusin` that arms the cell's truncation span, whose
	// synchronous `flushSync` cannot flush during the commit this effect runs in.
	useEffect(() => {
		const claim = claimPendingFocus(rowKey, column.id)

		if (!claim) return

		const editor = hostRef.current?.querySelector<HTMLElement>(EDITOR_FOCUSABLE)

		if (editor) focusWithoutReveal(editor)

		if (claim.seed === undefined || column.editCell) return

		const kind = inferEditorKind(seed)

		const next =
			kind === 'text'
				? claim.seed
				: kind === 'number' && /^\d$/.test(claim.seed)
					? Number(claim.seed)
					: undefined

		if (next === undefined) return

		setDraft(next)

		stageDraft(rowKey, column.id, next)
	}, [claimPendingFocus, rowKey, column, seed, stageDraft])

	const update = (next: unknown) => {
		setDraft(next)

		stageDraft(rowKey, column.id, next)
	}

	const cancel = () => {
		setDraft(seed)

		unstageDraft(rowKey, column.id)
	}

	// Grid-owned session exits (`trigger: 'doubleClick'`), bound to this cell;
	// `undefined` under a consumer-owned session, standing the session keys down.
	// The slot's programmatic `commit` saves regardless of policy; the editors'
	// key commit (`commitRow`, whose move carries Enter ↓ resolved from this
	// cell's display coord) additionally requires `commitOn` to arm the keys.
	const commitSession = commitRowEdit ? () => commitRowEdit(rowKey) : undefined

	const commitRow =
		commitRowEdit && commitOnEnter
			? (move?: SessionMove) =>
					commitRowEdit(rowKey, move ? { move, from: { row: rowIdx, col: colIdx } } : undefined)
			: undefined

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
			// Under a grid-owned session the slot's commit also saves the session.
			commit: (next) => {
				if (next !== undefined) update(next)

				commitSession?.()
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
		<span ref={hostRef} className={cn(k.edit.host, error && k.edit.errorRing)}>
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
 * One data cell of an editable grid. While its editing flag is set in the
 * session store — its row is in the editable set and, cell-scoped, it is the
 * active edit — and the column binds an editor, it mounts
 * {@link GridCellEditor}; otherwise it renders the column's display content
 * through {@link GridNavCell} (which carries the active-cursor ring). The flag
 * is a per-cell store subscription, so a session transition re-renders only the
 * cells it touched, and staging is ref-held, so cells don't re-render as the
 * user types.
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
		store,
		stageDraft,
		unstageDraft,
		claimPendingFocus,
		commitRowEdit,
		cancelRowEdit,
		commitOnEnter,
	} = useGridRowEditing()

	const isCellEditing = useCallback(
		() => store.isCellEditing(rowKey, column.id),
		[store, rowKey, column.id],
	)

	const editing = useSyncExternalStore(store.subscribe, isCellEditing, isCellEditing)

	if (editing && isColumnEditable(column)) {
		return (
			<GridCellEditor
				rowIdx={rowIdx}
				colIdx={colIdx}
				rowKey={rowKey}
				row={row}
				column={column}
				stageDraft={stageDraft}
				unstageDraft={unstageDraft}
				claimPendingFocus={claimPendingFocus}
				commitRowEdit={commitRowEdit}
				cancelRowEdit={cancelRowEdit}
				commitOnEnter={commitOnEnter}
			/>
		)
	}

	return (
		<GridNavCell row={rowIdx} col={colIdx}>
			{render?.(row)}
		</GridNavCell>
	)
}
