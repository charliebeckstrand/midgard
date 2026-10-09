'use client'

import { Check, X } from 'lucide-react'
import {
	type MouseEvent,
	type ReactNode,
	useEffect,
	useEffectEvent,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { cn } from '../../core'
import { focusWithoutReveal } from '../../hooks/use-truncation'
import { k } from '../../recipes/kata/grid'
import { useGridCellEditing } from './context'
import { columnLabel } from './engine/grid-column/label'
import {
	EDITOR_FOCUSABLE,
	type EditorKind,
	type GridDraftKey,
	inferEditorKind,
	isBlankDraft,
	NEW_ROW_KEY,
} from './engine/grid-editing-utilities'
import { GridEditInputs } from './grid-edit-inputs'
import type {
	GridEditingSession,
	GridSettleControls as SettleControls,
} from './grid-editing-context'
import type { GridColumn } from './types'

/**
 * Props for the mounted editor: the cell plus the session's staging and exit
 * callbacks. The row key of the new-row slot is {@link NEW_ROW_KEY}. @internal
 */
type GridCellEditorProps<T> = {
	rowIdx: number
	rowKey: GridDraftKey
	row: T
	column: GridColumn<T>
	/** The editor to infer, where the row holds no value to infer it from, as in the new-row slot. */
	kind?: EditorKind
	/** Whether the editor of this column of the new-row slot takes focus now. */
	claimSlot?: (columnId: string | number) => boolean
	/**
	 * Reads the row that `validate` checks, at each render. The new-row slot
	 * passes it, because its row is in the draft store, and a keystroke in one
	 * editor does not render the others.
	 */
	readRow?: () => T
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
export function keepFocus(event: MouseEvent<HTMLButtonElement>) {
	event.preventDefault()
}

/**
 * Scrolls the error message of an editor into view as it mounts. A ref callback
 * for the message of {@link GridCellEditor}, so the scroll runs in the commit,
 * before the browser paints.
 *
 * @remarks The message renders below the cell (`top-full`). A cell at the bottom
 * or right edge of the scroll container can therefore clip it. The message
 * mounts when an error shows and the cell no longer clips its content. It stays
 * while the error stays, so the scroll runs once for each error. `nearest` does
 * nothing when the message fits, so the view does not move (WCAG 1.4.10).
 * @internal
 */
function revealMessage(node: HTMLSpanElement | null) {
	node?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

/**
 * The error message of {@link GridCellEditor}, below the cell. It mounts only
 * once the cell stops clipping its content, so the scroll of
 * {@link revealMessage} measures the layout that shows.
 *
 * @remarks An editor that opens with an error mounts before its cell lets the
 * content overflow (see `GridCellEditingContext`). A scroll in that commit
 * reveals only the clipped part of the message, and the message then shows
 * past the edge of the scroll container. @internal
 */
function GridEditMessage({ id, children }: { id: string; children: ReactNode }) {
	const cell = useGridCellEditing()

	if (cell && !cell.editing) return null

	return (
		<span ref={revealMessage} id={id} role="alert" className={cn(k.edit.error.base)}>
			{children}
		</span>
	)
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
	claimSlot,
	readRow,
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

	// Stages the typed entry of the released editor, with the newest `update`.
	const seedTypedEntry = useEffectEvent(() => {
		const typed = dataKey !== null ? entrySeed(dataKey, column.id) : undefined

		if (typed !== undefined) update(typed)
	})

	useEffect(() => {
		const released = wasHeld.current && !held

		wasHeld.current = held

		if (released) seedTypedEntry()
	}, [held])

	const hostRef = useRef<HTMLSpanElement>(null)

	// Tell the truncating content of the cell that an editor is open, before the
	// focus claim below. The focus arms the truncation reveal, and the reveal
	// must not reparent the editor that the focus went to.
	const markEditing = useGridCellEditing()?.markEditing

	useLayoutEffect(() => {
		if (!markEditing) return

		markEditing(true)

		return () => markEditing(false)
	}, [markEditing])

	// Focus into a held editor moves the session onto its cell, so the session
	// keys and the settle controls act on the cell that has focus.
	useEffect(() => {
		const host = hostRef.current

		if (!held || !host || dataKey === null) return

		const resume = () => resumeCell(dataKey, column.id)

		host.addEventListener('focusin', resume)

		return () => host.removeEventListener('focusin', resume)
	}, [held, resumeCell, dataKey, column.id])

	// Take the focus an entry left for this cell, after each commit: as the editor
	// mounts, or as the session comes to hold an editor that is already mounted.
	// The claim succeeds only while the intent names this cell and the cell is
	// open, and it then drops the intent, so each later run is a no-op. The editor
	// sits inside its cell's truncation span, and this effect runs during React's
	// commit. The helper keeps the span's arm off its synchronous flush, which
	// cannot run here and warns.
	useEffect(() => {
		const claimed = dataKey === null ? claimSlot?.(column.id) : claimFocus(dataKey, column.id)

		if (!claimed) return

		const editor = hostRef.current?.querySelector<HTMLElement>(EDITOR_FOCUSABLE)

		if (editor) focusWithoutReveal(editor)
	})

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

	const error =
		(checked ? column.validate?.(draft, readRow ? readRow() : row) : null) ?? refusal ?? null

	// Links the editor to its message (aria-describedby) so the error reaches AT,
	// not just sighted users (WCAG 1.3.1 / 3.3.1).
	const errorId = useId()

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
			unset={newRow}
		/>
	)

	return (
		<span ref={hostRef} className={cn(k.edit.host, error && k.edit.error.ring)}>
			<span data-slot="grid-edit-slot" className={cn(k.edit.slot)}>
				{body}
			</span>

			<GridSettleControls
				label={label}
				controls={settle}
				settle={(outcome) => dataKey !== null && endSession(dataKey, outcome)}
			/>

			{error && <GridEditMessage id={errorId}>{error}</GridEditMessage>}
		</span>
	)
}
