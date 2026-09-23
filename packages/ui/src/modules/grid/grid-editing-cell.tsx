'use client'

import { Check, X } from 'lucide-react'
import {
	type MouseEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { cn } from '../../core'
import { focusWithoutReveal } from '../../hooks/use-truncation'
import { k } from '../../recipes/kata/grid'
import { columnLabel } from './engine/grid-column/label'
import {
	EDITOR_FOCUSABLE,
	inferEditorKind,
	isCellEditing,
	isColumnEditable,
} from './engine/grid-editing-utilities'
import { GridEditInputs } from './grid-edit-inputs'
import {
	type GridEditingSession,
	type GridSettleControls as SettleControls,
	useGridEditingSession,
} from './grid-editing-context'
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
type GridCellEditorProps<T> = Omit<GridEditingCellProps<T>, 'render' | 'colIdx'> &
	Pick<
		GridEditingSession,
		'stageDraft' | 'unstageDraft' | 'endSession' | 'entrySeed' | 'claimFocus' | 'managed'
	> & {
		/** The settle controls beside the editor, as the session decides them. */
		settle: SettleControls
	}

/** The two ways a cell-scoped session ends, as the controls that end it. @internal */
const SETTLE_ACTIONS = [
	{ outcome: 'save', verb: 'Save', color: 'green', icon: <Check /> },
	{ outcome: 'discard', verb: 'Discard', color: 'red', icon: <X /> },
] as const

/**
 * Keeps focus where it is on a press of a settle control. The press then
 * settles the session that holds focus, and it is not a focus move that a
 * commit on leave reads. Some browsers do not focus a button on a click, and
 * move focus to the grid's tab stop instead. @internal
 */
function keepFocus(event: MouseEvent<HTMLButtonElement>) {
	event.preventDefault()
}

/**
 * The settle controls beside the editor on the cell a cell-scoped session
 * holds: a save and a discard, or a discard alone. The session decides which
 * (see {@link GridEditingSession.settleControls}). Row scope shows none: its
 * whole row edits at once. The settle control there is the consumer's own row
 * action, at the granularity that matches. Here the grid owns the session and
 * nothing else on screen ends it, so this is the only visible way out for a
 * pointer. Under `commitOn: 'leaveEditor'` a move away saves, so only discard
 * shows.
 *
 * @remarks The controls sit outside the tab order. The keyboard settles a session
 * on the grid table's key surface instead: Tab, Enter, and F2 commit, and Escape
 * discards. Tab from the last control of the editor commits and moves. A
 * tabbable pair would take that Tab instead, and the editor would lose its
 * commit key. Tab is also the keyboard commit of the inline listbox, which spends its
 * own Enter on its menu (WCAG 2.1.1).
 *
 * @internal
 */
function GridSettleControls({
	label,
	controls,
	settle,
}: {
	/** Names the cell, so each control reads as belonging to the editor beside it. */
	label: string
	/** Which controls show; `'none'` renders nothing. */
	controls: SettleControls
	settle: (outcome: 'save' | 'discard') => void
}) {
	if (controls === 'none') return null

	const actions =
		controls === 'both' ? SETTLE_ACTIONS : SETTLE_ACTIONS.filter((a) => a.outcome === 'discard')

	return (
		<span className={cn(k.edit.settle)}>
			{actions.map((action) => (
				<Button
					key={action.outcome}
					type="button"
					variant="bare"
					color={action.color}
					aria-label={`${action.verb} ${label}`}
					tabIndex={-1}
					onMouseDown={keepFocus}
					onClick={() => settle(action.outcome)}
				>
					<Icon icon={action.icon} />
				</Button>
			))}
		</span>
	)
}

/**
 * A cell's in-place editor while its row is in edit mode. It owns its live
 * display value, and mirrors each change into the grid's staged drafts. The
 * value starts as the cell's current value, or as the typed character of a
 * type-to-edit entry. The grid stays unrendered as the user types. Renders the
 * column's {@link GridColumn.editCell} slot, or the editor inferred from the cell
 * value's primitive type. A failed `validate` rings the editor and shows the
 * message beneath the cell; Escape reverts the cell.
 *
 * @internal
 */
function GridCellEditor<T>({
	rowIdx,
	rowKey,
	row,
	column,
	stageDraft,
	unstageDraft,
	endSession,
	entrySeed,
	claimFocus,
	managed,
	settle,
}: GridCellEditorProps<T>) {
	const seed = column.field != null ? row[column.field] : undefined

	// Read once, as the editor mounts. The entry that typed it clears it after
	// the focus hand-off, so a later render must not read it again.
	const [entry] = useState(() => entrySeed(rowKey, column.id))

	const [draft, setDraft] = useState<unknown>(entry === undefined ? seed : entry)

	// A typed character is an edit, so it stages like one. Staging here rather
	// than at entry keeps a declined entry from leaving a draft behind.
	useEffect(() => {
		if (entry !== undefined) stageDraft(rowKey, column.id, entry)
	}, [entry, stageDraft, rowKey, column.id])

	const hostRef = useRef<HTMLSpanElement>(null)

	// Take the focus an entry left for this cell, as the editor mounts or as the
	// session comes to hold it. The editor sits inside its cell's truncation span,
	// and this effect runs during React's commit. The helper keeps the span's
	// arm off its synchronous flush, which cannot run here and warns.
	// biome-ignore lint/correctness/useExhaustiveDependencies: `settle` changes as the session comes to hold an editor that is already mounted, and that re-runs the claim.
	useEffect(() => {
		if (!claimFocus(rowKey, column.id)) return

		const editor = hostRef.current?.querySelector<HTMLElement>(EDITOR_FOCUSABLE)

		if (editor) focusWithoutReveal(editor)
	}, [settle, claimFocus, rowKey, column.id])

	const update = (next: unknown) => {
		setDraft(next)

		stageDraft(rowKey, column.id, next)
	}

	const cancel = () => {
		setDraft(seed)

		unstageDraft(rowKey, column.id)
	}

	// Names the cell for every control in it, so the editor and the settle pair
	// read as one thing to a screen reader rather than unrelated widgets.
	// `columnLabel` is the module's one column-naming rule, and it degrades to the
	// column id rather than to a position that shifts as columns move.
	const label = `${columnLabel(column)}, row ${rowIdx + 1}`

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

	const body = column.editCell ? (
		column.editCell({
			row,
			value: draft,
			onValueUpdate: update,
			// A slot can stage a final value in one call (e.g. a select's pick); the
			// row's save flushes the staged values, so there is no per-cell close.
			// Under a grid-owned session the slot's commit also saves the row. The
			// session keys need no wiring here: Enter and Escape reach the session
			// through the grid table's key surface, as from every other editor.
			commit: (next) => {
				if (next !== undefined) update(next)

				if (managed) endSession(rowKey, 'save')
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
			managed={managed}
		/>
	)

	return (
		<span ref={hostRef} className={cn(k.edit.host, error && k.edit.errorRing)}>
			{body}

			<GridSettleControls
				label={label}
				controls={settle}
				settle={(outcome) => endSession(rowKey, outcome)}
			/>

			{error && (
				<span ref={messageRef} id={errorId} role="alert" className={cn(k.edit.error)}>
					{error}
				</span>
			)}
		</span>
	)
}

/** A data cell that shows its display content, not an editor. @internal */
const CELL_READING = 'reading'

/**
 * One data cell of an editable grid. When its row key is in the editable set and
 * the column binds an editor, it mounts {@link GridCellEditor}. Otherwise it
 * renders the column's display content through {@link GridNavCell}, which carries
 * the active-cursor ring. A cell-scoped session (`scope: 'cell'`) narrows that
 * to the one cell it names. The cell reads that coord from the session's store
 * through its own flag, so a session move re-renders the two cells whose flag
 * flipped. The editable set flips only on a session transition, so cells don't
 * re-render as the user types.
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
		editableRows,
		activeEditStore,
		stageDraft,
		unstageDraft,
		endSession,
		entrySeed,
		claimFocus,
		settleControls,
		managed,
	} = useGridEditingSession()

	const columnId = column.id

	// `isCellEditing` leads because it bails on the editable-set lookup. A cell of
	// a row nobody is editing — every cell, most of the time — costs one probe.
	// An open editor then reads its settle controls from the session, which owns
	// that policy. The flag is a string, so the store's notice re-renders only a
	// cell whose answer changed.
	const readFlag = useCallback((): SettleControls | typeof CELL_READING => {
		const activeEdit = activeEditStore.get()

		if (!isCellEditing({ rowKey, columnId, editableRows, activeEdit })) return CELL_READING

		return settleControls(rowKey, columnId)
	}, [activeEditStore, settleControls, rowKey, columnId, editableRows])

	const flag = useSyncExternalStore(activeEditStore.subscribe, readFlag, readFlag)

	if (flag !== CELL_READING && isColumnEditable(column)) {
		return (
			<GridCellEditor
				rowIdx={rowIdx}
				rowKey={rowKey}
				row={row}
				column={column}
				stageDraft={stageDraft}
				unstageDraft={unstageDraft}
				endSession={endSession}
				entrySeed={entrySeed}
				claimFocus={claimFocus}
				managed={managed}
				settle={flag}
			/>
		)
	}

	return (
		<GridNavCell row={rowIdx} col={colIdx}>
			{render?.(row)}
		</GridNavCell>
	)
}
