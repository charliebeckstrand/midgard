'use client'

import { Check, Plus, X } from 'lucide-react'
import {
	type MouseEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
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
	type EditorKind,
	type GridDraftKey,
	inferEditorKind,
	isBlankDraft,
	isCellEditing,
	isColumnEditable,
	NEW_ROW_KEY,
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

/**
 * Props for the mounted editor: the cell plus the session's staging and exit
 * callbacks. The row key of the new-row slot is {@link NEW_ROW_KEY}. @internal
 */
type GridCellEditorProps<T> = Omit<GridEditingCellProps<T>, 'render' | 'colIdx' | 'rowKey'> & {
	rowKey: GridDraftKey
	/** The editor to infer, where the row holds no value to infer it from, as in the new-row slot. */
	kind?: EditorKind
	/** Adds the new-row slot, for its Add control. */
	addRow?: () => void
	/** Whether the editor of this column of the new-row slot takes focus now. */
	claimSlot?: (columnId: string | number) => boolean
} & Pick<
		GridEditingSession,
		| 'stageDraft'
		| 'unstageDraft'
		| 'readDraft'
		| 'endSession'
		| 'entrySeed'
		| 'claimFocus'
		| 'resumeCell'
		| 'managed'
	> & {
		/** The settle controls beside the editor, as the session decides them. */
		settle: SettleControls
		/**
		 * Whether a refusal holds this editor open beside a cell-scoped session.
		 * Focus into it then moves the session onto the cell.
		 */
		held: boolean
	}

/** The Add control of the new-row slot. @internal */
const ADD_ROW_LABEL = 'Add row'

/**
 * The Add control of the new-row slot, on its last editable cell. Unlike the
 * settle pair, it is in the tab order. Tab does not commit in the slot, so the
 * control takes no key from an editor. It is also the keyboard route to an
 * add from a listbox, or from a slot that keeps Enter. While an add is in
 * flight it is `aria-disabled`, and a press does nothing.
 *
 * @internal
 */
export function GridAddRowButton({
	addRow,
	pending = false,
}: {
	addRow: () => void
	pending?: boolean
}) {
	return (
		<span className={cn(k.edit.settle)}>
			<Button
				type="button"
				variant="bare"
				color="green"
				aria-label={ADD_ROW_LABEL}
				aria-disabled={pending || undefined}
				data-slot="grid-new-row-add"
				onMouseDown={keepFocus}
				onClick={addRow}
			>
				<Icon icon={<Plus />} />
			</Button>
		</span>
	)
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
	settle: (outcome: 'save' | 'discard' | 'add') => void
}) {
	if (controls === 'none') return null

	if (controls === 'add') return <GridAddRowButton addRow={() => settle('add')} />

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
 * display value, and mirrors each change into the session's staged drafts.
 * The value starts as the typed character of a type-to-edit entry, else as the
 * cell's staged draft, else as the cell's current value. The session owns the
 * draft, so an unmount neither commits nor drops it. The grid stays unrendered
 * as the user types. Renders the
 * column's {@link GridColumn.editCell} slot, or the editor inferred from the cell
 * value's primitive type. A failed `validate` rings the editor and shows the
 * message beneath the cell; Escape reverts the cell. A draft that an async
 * commit refused shows its error on the same surface, until the next edit.
 *
 * @remarks The new-row slot mounts it too, under {@link NEW_ROW_KEY}. There
 * its label names the new row, and `validate` reads a cell only once it holds
 * a value, so an empty row shows no error.
 *
 * @internal
 */
export function GridCellEditor<T>({
	rowIdx,
	rowKey,
	row,
	column,
	stageDraft,
	unstageDraft,
	readDraft,
	endSession,
	entrySeed,
	claimFocus,
	resumeCell,
	managed,
	settle,
	held,
	kind,
	addRow,
	claimSlot,
}: GridCellEditorProps<T>) {
	const seed = column.field != null ? row[column.field] : undefined

	// The key of a data row, or `null` in the new-row slot. The slot is in no
	// session, so the session's entry, focus, and exit calls skip it.
	const dataKey = rowKey === NEW_ROW_KEY ? null : rowKey

	const newRow = dataKey === null

	// Read once, as the editor mounts. The entry that typed it clears it after
	// the focus hand-off, so a later render must not read it again.
	const [entry] = useState(() => (dataKey === null ? undefined : entrySeed(dataKey, column.id)))

	// A typed entry replaces the cell's value. Otherwise the editor shows the
	// cell's staged draft when it has one. The draft belongs to the session, so
	// an editor that mounts again, after a page change or a scroll, shows the
	// value that will commit, not the row's value.
	const [draft, setDraft] = useState<unknown>(() => {
		if (entry !== undefined) return entry

		const staged = readDraft(rowKey, column.id)

		return staged === undefined ? seed : staged.value
	})

	// A typed character is an edit, so it stages like one. Staging here rather
	// than at entry keeps a declined entry from leaving a draft behind. The row
	// is the one the editor mounted with, so a new row object from the consumer
	// does not stage the entry a second time.
	const [mountRow] = useState(row)

	useEffect(() => {
		if (entry !== undefined) stageDraft(rowKey, column.id, entry, mountRow)
	}, [entry, stageDraft, rowKey, column.id, mountRow])

	// The error of a commit that the consumer refused, read once as the editor
	// mounts. A typed entry is an edit, so it clears the error.
	const [refusal, setRefusal] = useState(() =>
		entry === undefined ? readDraft(rowKey, column.id)?.error : undefined,
	)

	const update = (next: unknown) => {
		setDraft(next)

		setRefusal(undefined)

		stageDraft(rowKey, column.id, next, row)
	}

	// A held editor is already mounted when the session comes to hold it, so a
	// type-to-edit entry reaches it here rather than at mount. This runs before
	// the focus claim below, which drops the entry's intents.
	const wasHeld = useRef(held)

	// biome-ignore lint/correctness/useExhaustiveDependencies: only the change of `held` asks for the seed; `update` is a new closure on each render.
	useEffect(() => {
		const released = wasHeld.current && !held

		wasHeld.current = held

		const typed = released && dataKey !== null ? entrySeed(dataKey, column.id) : undefined

		if (typed !== undefined) update(typed)
	}, [held])

	const hostRef = useRef<HTMLSpanElement>(null)

	// Focus into a held editor moves the session onto its cell, so the session
	// keys and the settle controls act on the cell that has focus.
	useEffect(() => {
		const host = hostRef.current

		if (!held || !host || dataKey === null) return

		const resume = () => resumeCell(dataKey, column.id)

		host.addEventListener('focusin', resume)

		return () => host.removeEventListener('focusin', resume)
	}, [held, resumeCell, dataKey, column.id])

	// Take the focus an entry left for this cell, as the editor mounts or as the
	// session comes to hold it. The editor sits inside its cell's truncation span,
	// and this effect runs during React's commit. The helper keeps the span's
	// arm off its synchronous flush, which cannot run here and warns.
	// biome-ignore lint/correctness/useExhaustiveDependencies: `settle` changes as the session comes to hold an editor that is already mounted, and that re-runs the claim.
	useEffect(() => {
		const claimed = dataKey === null ? claimSlot?.(column.id) : claimFocus(dataKey, column.id)

		if (!claimed) return

		const editor = hostRef.current?.querySelector<HTMLElement>(EDITOR_FOCUSABLE)

		if (editor) focusWithoutReveal(editor)
	}, [settle, claimFocus, claimSlot, dataKey, column.id])

	const cancel = () => {
		setDraft(seed)

		setRefusal(undefined)

		unstageDraft(rowKey, column.id)
	}

	// Names the cell for every control in it, so the editor and the settle pair
	// read as one thing to a screen reader rather than unrelated widgets.
	// `columnLabel` is the module's one column-naming rule, and it degrades to the
	// column id rather than to a position that shifts as columns move.
	const label = `${columnLabel(column)}, ${newRow ? 'new row' : `row ${rowIdx + 1}`}`

	const ariaLabel = `Edit ${label}`

	// A cell of the new-row slot with no value adds nothing, so it has nothing
	// for `validate` to refuse yet.
	const checked = column.validate && !(newRow && isBlankDraft(draft))

	const error = (checked ? column.validate?.(draft, row) : null) ?? refusal ?? null

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

				// The new-row slot adds only on an explicit add, so a slot's
				// commit there only stages.
				if (managed && dataKey !== null) endSession(dataKey, 'save')
			},
			cancel,
			ariaLabel,
			required: column.required ?? false,
		})
	) : (
		<GridEditInputs
			kind={kind ?? inferEditorKind(seed)}
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
				settle={(outcome) =>
					outcome === 'add' ? addRow?.() : dataKey !== null && endSession(dataKey, outcome)
				}
			/>

			{error && (
				<span ref={messageRef} id={errorId} role="alert" className={cn(k.edit.error)}>
					{error}
				</span>
			)}
		</span>
	)
}

/**
 * A data cell whose commit is in flight. It shows the committed value, marks
 * the cell `aria-busy`, and pulses. The attribute goes on the cell itself,
 * the `role="gridcell"` element around this content, the way
 * {@link GridNavCell} writes `data-active`. @internal
 */
export function GridPendingCell({ children }: { children: ReactNode }) {
	const ref = useRef<HTMLSpanElement>(null)

	useLayoutEffect(() => {
		const cell = ref.current?.closest<HTMLElement>('[role="gridcell"]')

		cell?.setAttribute('aria-busy', 'true')

		return () => {
			cell?.removeAttribute('aria-busy')
		}
	}, [])

	return (
		<span ref={ref} data-slot="grid-edit-pending" className={cn(k.edit.pending)}>
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
 * renders the column's display content through {@link GridNavCell}, which carries
 * the active-cursor ring. A cell-scoped session (`scope: 'cell'`) narrows that
 * to the one cell it names. A cell whose commit is in flight shows the value
 * as pending and mounts no editor, whatever the session holds. The cell reads that coord from the session's store
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

		if (!isCellEditing({ rowKey, columnId, editableRows, activeEdit }))
			return draft?.reopened ? CELL_HELD : CELL_READING

		return settleControls(rowKey, columnId)
	}, [activeEditStore, settleControls, readDraft, rowKey, columnId, editableRows])

	const flag = useSyncExternalStore(activeEditStore.subscribe, readFlag, readFlag)

	if (flag === CELL_PENDING) {
		const value = readDraft(rowKey, columnId)?.value

		return (
			<GridNavCell row={rowIdx} col={colIdx}>
				<GridPendingCell>{render?.(pendingRow(row, column, value))}</GridPendingCell>
			</GridNavCell>
		)
	}

	if (flag !== CELL_READING && isColumnEditable(column)) {
		return (
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
		)
	}

	return (
		<GridNavCell row={rowIdx} col={colIdx}>
			{render?.(row)}
		</GridNavCell>
	)
}
