'use client'

import { useInteractions } from '@floating-ui/react'
import { Check, X } from 'lucide-react'
import { useComposedRefs } from 'motion/react'
import {
	type MouseEvent,
	type ReactNode,
	type RefObject,
	useCallback,
	useEffect,
	useEffectEvent,
	useId,
	useLayoutEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react'
import { Button } from '../../components/button'
import { Control } from '../../components/control'
import { Icon } from '../../components/icon'
import { cn, createContext, dataAttr } from '../../core'
import { useFloatingPanel } from '../../hooks/use-floating-panel'
import { FloatingSurface } from '../../primitives/floating-surface'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/grid'
import type { GridEditingSession, GridSettleControls as SettleControls } from './context'
import { useGridCellEditing } from './context'
import { columnLabel } from './engine/grid-column/label'
import {
	COMMIT_REFUSED,
	EDITOR_FOCUSABLE,
	type EditorKind,
	type GridDraftKey,
	inferEditorKind,
	isBlankDraft,
	NEW_ROW_KEY,
} from './engine/grid-editing-utilities'
import { gridMessages } from './engine/grid-messages'
import { spokenRowNumber } from './engine/grid-row/shell'
import { clearStickyChrome, obscuringInsets } from './engine/grid-sticky-insets'
import { GridEditInputs } from './grid-edit-inputs'
import type { GridColumn } from './types'
import { useGridEditGrow } from './use-grid-edit-grow'
import { useGridEditPick } from './use-grid-edit-pick'

/**
 * Props for the mounted editor: the cell plus the session's staging and exit
 * callbacks. The row key of the new-row slot is {@link NEW_ROW_KEY}. @internal
 */
type GridCellEditorProps<T> = {
	rowIndex: number
	rowKey: GridDraftKey
	row: T
	column: GridColumn<T>
	/** The editor to infer, where the row holds no value to infer it from, as in the new-row slot. */
	kind?: EditorKind
	/** Whether the editor of this column of the new-row slot takes focus now. */
	claimSlot?: (columnId: string | number) => boolean
	/**
	 * The display content of the cell. It holds the height that the cell has at
	 * rest under the editor of a data cell, so the row keeps its height as it
	 * opens. The new-row slot has none.
	 */
	rest?: ReactNode
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
	| 'hasEntry'
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
	{ outcome: 'save', name: gridMessages.saveCell, color: 'green', icon: <Check /> },
	{ outcome: 'discard', name: gridMessages.discardCell, color: 'red', icon: <X /> },
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
 * Whether Floating UI has placed the column below the cell
 * ({@link GridEditBelow}). Floating UI places the column after it mounts. Until
 * then the column is at the origin of the page. @internal
 */
const [GridEditPlacedContext, useGridEditPlaced] = createContext<boolean>('GridEditPlaced')

/**
 * The error message of {@link GridCellEditor}, below the cell. It mounts only
 * once the cell stops clipping its content. It scrolls into view once Floating
 * UI places the column that holds it, before the browser paints.
 *
 * @remarks The message floats below the cell, or above it when the viewport has
 * no space below. A message that is taller than either space can still go past
 * the edge of the viewport. It stays while the error stays, so the scroll runs
 * once for each error. `nearest` does nothing when the message fits, so the
 * view does not move (WCAG 1.4.10).
 *
 * The column mounts with the message where the cell shows no settle controls,
 * as in the new-row slot. Until Floating UI places it, the column is at the
 * origin of the page. A scroll at that point moves the page to the top, so the
 * scroll waits for the placement.
 *
 * An editor that opens with an error mounts before its cell lets the content
 * overflow (see `GridCellEditingContext`). A scroll in that commit reveals only
 * the clipped part of the message, and the message then shows past the edge
 * of the scroll container. @internal
 */
function GridEditMessage({ id, children }: { id: string; children: ReactNode }) {
	const cell = useGridCellEditing()

	const placed = useGridEditPlaced()

	const [node, setNode] = useState<HTMLSpanElement | null>(null)

	useLayoutEffect(() => {
		if (placed) node?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
	}, [placed, node])

	if (cell && !cell.editing) return null

	return (
		<span ref={setNode} id={id} role="alert" className={cn(k.edit.error.base)}>
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
	const intl = useIntl()

	if (controls === 'none') return null

	const actions =
		controls === 'both'
			? SETTLE_ACTIONS
			: SETTLE_ACTIONS.filter((action) => action.outcome === 'discard')

	return (
		<span className={cn(k.edit.settle)}>
			{actions.map((action) => (
				<Button
					key={action.outcome}
					type="button"
					variant="bare"
					color={action.color}
					aria-label={intl.formatMessage(action.name, { cell: label })}
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
 * a value, so an empty row shows no error. After a blocked add, a required cell
 * with no value shows its error as a refusal, until the next edit.
 *
 * @internal
 */
export function GridCellEditor<T>({
	rowIndex,
	rowKey,
	row,
	column,
	stageDraft,
	unstageDraft,
	readDraft,
	endSession,
	entrySeed,
	hasEntry,
	claimFocus,
	resumeCell,
	managed,
	settle,
	held,
	kind,
	claimSlot,
	rest,
	readRow,
}: GridCellEditorProps<T>) {
	const intl = useIntl()

	const seed = column.field != null ? row[column.field] : undefined

	// The key of a data row, or `null` in the new-row slot. The slot is in no
	// session, so the session's entry, focus, and exit calls skip it.
	const dataKey = rowKey === NEW_ROW_KEY ? null : rowKey

	const newRow = dataKey === null

	// Read once, as the editor mounts. The entry that typed it clears it after
	// the focus hand-off, so a later render must not read it again.
	const [entry] = useState(() => (dataKey === null ? undefined : entrySeed(dataKey, column.id)))

	// Whether an entry on this cell mounted the editor, read once as it mounts.
	// A choice editor then opens its panel.
	const [entered] = useState(() => dataKey !== null && hasEntry(dataKey, column.id))

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

	// The number that a screen reader speaks for the row of the cell, so the name
	// of the editor and the position of the row agree. The row is in the
	// document only after the mount, so the first render counts one header row
	// above the data. Each render reads the number again, because a sort or a
	// panel above the row can move it.
	const [spokenRow, setSpokenRow] = useState(rowIndex + 2)

	useLayoutEffect(() => {
		const row = hostRef.current?.closest('tr')

		const number = row ? spokenRowNumber(row) : spokenRow

		// A set of the same number can still render the editor again.
		if (number !== spokenRow) setSpokenRow(number)
	})

	// Tell the truncating content of the cell that an editor is open, before the
	// focus claim below. The focus arms the truncation reveal, and the reveal
	// must not reparent the editor that the focus went to.
	const markEditing = useGridCellEditing()?.markEditing

	useLayoutEffect(() => {
		if (!markEditing) return

		markEditing(true)

		return () => markEditing(false)
	}, [markEditing])

	// An entry on a cell whose editor is already open moves focus into the editor,
	// and the editor claims the entry's intents here. A typed entry replaces the draft.
	const claimOpenEntry = useEffectEvent(() => {
		if (dataKey === null) return

		const typed = entrySeed(dataKey, column.id)

		if (claimFocus(dataKey, column.id) && typed !== undefined) update(typed)
	})

	useEffect(() => {
		const host = hostRef.current

		if (!host) return

		const claim = () => claimOpenEntry()

		host.addEventListener('focusin', claim)

		return () => host.removeEventListener('focusin', claim)
	}, [])

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

		if (!newRow) {
			editor?.focus()

			return
		}

		// The new-row slot stays in view, so a claim there does not scroll the
		// page. The grid scrolls on its own to show the cell, clear of the
		// sticky Add cell and of a pinned column, as the cursor does.
		editor?.focus({ preventScroll: true })

		const cell = hostRef.current?.closest('td')

		if (cell) clearStickyChrome(cell, obscuringInsets(cell))
	})

	const cancel = () => {
		setDraft(seed)

		setRefusal(undefined)

		unstageDraft(rowKey, column.id)
	}

	// Whether a cell-scoped session holds this cell. The session shows settle
	// controls on that one cell alone (see `settleControls`).
	const holds = settle !== 'none'

	const commitPick = useGridEditPick(hostRef, holds)

	// Stages a final value, such as a pick, and commits the cell where a
	// cell-scoped session holds it, as F2 does. Under row scope the row
	// commits as one, so a final value of one cell only stages. So does a cell
	// of the new-row slot, which adds only on an explicit add.
	const commit = (next: unknown) => {
		if (next !== undefined) update(next)

		if (holds && dataKey !== null) commitPick(() => endSession(dataKey, 'save'))
	}

	// Names the cell for every control in it, so the editor and the settle pair
	// read as one thing to a screen reader rather than unrelated widgets.
	// `columnLabel` is the module's one column-naming rule, and it degrades to the
	// column id rather than to a position that shifts as columns move.
	const label = newRow
		? intl.formatMessage(gridMessages.cellInNewRow, { column: columnLabel(column) })
		: intl.formatMessage(gridMessages.cellInRow, { column: columnLabel(column), row: spokenRow })

	const ariaLabel = intl.formatMessage(gridMessages.editCell, { cell: label })

	// A cell of the new-row slot with no value adds nothing, so it has nothing
	// for `validate` to refuse yet.
	const checked = column.validate && !(newRow && isBlankDraft(draft))

	const invalid = checked ? column.validate?.(draft, readRow ? readRow() : row) : null

	// The grid's own refusal is a fixed English sentinel, so it shows in the
	// language of the reader. A refusal that the consumer wrote shows as it is.
	const refused =
		refusal === COMMIT_REFUSED ? intl.formatMessage(gridMessages.commitRefused) : refusal

	const error = invalid ?? refused ?? null

	// Links the editor to its message (aria-describedby) so the error reaches AT,
	// not just sighted users (WCAG 1.3.1 / 3.3.1).
	const errorId = useId()

	const body = column.editCell ? (
		column.editCell({
			row,
			value: draft,
			onValueUpdate: update,
			// The session keys need no wiring here: Enter and Escape reach the
			// session through the grid table's key surface, as from every other
			// editor.
			commit,
			cancel,
			ariaLabel,
			required: column.required ?? false,
			entered,
		})
	) : (
		<GridEditInputs
			kind={kind ?? inferEditorKind(seed)}
			draft={draft}
			onValueUpdate={update}
			commit={commit}
			cancel={cancel}
			ariaLabel={ariaLabel}
			error={error}
			errorId={errorId}
			required={column.required}
			managed={managed}
			unset={newRow}
			entered={entered}
		/>
	)

	return (
		<GridEditHost
			hostRef={hostRef}
			newRow={newRow}
			rest={rest}
			error={error}
			errorId={errorId}
			label={label}
			settle={settle}
			onSettle={(outcome) => dataKey !== null && endSession(dataKey, outcome)}
		>
			{body}
		</GridEditHost>
	)
}

/**
 * The floating column below the cell of an editor: the settle controls, then
 * the error message. Floating UI anchors it to `anchor`: the cell, or the
 * editor while it grows past the cell. A `null` anchor hides it. The scroll area of the grid does not
 * clip it. Below the last row, it shows past the bottom of the grid. At the
 * bottom of the viewport, it flips above the cell. It hides while the cell is
 * out of view. The settle controls take no focus, so the column keeps the
 * focus in the editor, and a press on a control is not a leave of the session.
 * @internal
 */
function GridEditBelow({ anchor, children }: { anchor: HTMLElement | null; children: ReactNode }) {
	const open = anchor !== null

	const { refs, floatingStyles, placement, isPositioned } = useFloatingPanel({
		placement: 'bottom-end',
		open,
		reference: anchor,
		offset: 0,
		matchReferenceWidth: true,
	})

	const { getFloatingProps } = useInteractions([])

	return (
		<FloatingSurface
			open={open}
			setFloating={refs.setFloating}
			floatingStyles={floatingStyles}
			getFloatingProps={getFloatingProps}
			data-side={placement.split('-')[0]}
			className={cn(k.edit.below)}
		>
			<GridEditPlacedContext value={isPositioned}>{children}</GridEditPlacedContext>
		</FloatingSurface>
	)
}

/**
 * Whether a control in `slot` is expanded, such as a listbox trigger or a
 * date input with its panel open. A control stamps `aria-expanded` as its
 * panel opens and closes, so a mutation observer follows it.
 * @internal
 */
function useExpanded(slot: HTMLElement | null): boolean {
	const subscribe = useCallback(
		(notify: () => void) => {
			if (!slot) return () => {}

			const observer = new MutationObserver(notify)

			observer.observe(slot, { subtree: true, attributeFilter: ['aria-expanded'] })

			return () => observer.disconnect()
		},
		[slot],
	)

	return useSyncExternalStore(
		subscribe,
		() => slot?.querySelector('[aria-expanded="true"]') != null,
		() => false,
	)
}

/**
 * The host of {@link GridCellEditor}: the editor, and the settle controls and
 * the error message that float below the cell ({@link GridEditBelow}). They
 * hide while a control of the editor is expanded, because its panel opens
 * below the cell too. A data
 * cell draws the frame and the focus ring of its editor (`k.edit.cell`), so the
 * editor takes the `bare` surface and the full width of the cell. The display
 * content stays under the editor, out of sight, and holds the height of the
 * cell. The new-row slot has no cursor ring, so its editors keep their frame.
 * @internal
 */
function GridEditHost({
	hostRef,
	newRow,
	rest,
	error,
	errorId,
	label,
	settle,
	onSettle,
	children,
}: {
	hostRef: RefObject<HTMLSpanElement | null>
	newRow: boolean
	rest: ReactNode
	error: string | null
	errorId: string
	label: string
	settle: SettleControls
	onSettle: (outcome: 'save' | 'discard') => void
	children: ReactNode
}) {
	// The cell that the floating column anchors to.
	const [cell, setCell] = useState<HTMLElement | null>(null)

	const anchorCell = useCallback((node: HTMLSpanElement | null) => {
		setCell(node?.closest<HTMLElement>('td') ?? null)
	}, [])

	const ref = useComposedRefs(hostRef, anchorCell)

	const { ref: slotRef, style: growStyle, grown, slot } = useGridEditGrow(newRow ? null : cell)

	// The panel of an expanded control opens below the cell too, so the column
	// below the cell hides while the panel is open. The panel holds the focus,
	// and its keys settle the choice.
	const expanded = useExpanded(slot)

	const message = error && <GridEditMessage id={errorId}>{error}</GridEditMessage>

	if (newRow) {
		return (
			<span ref={ref} className={cn(k.edit.host, error && k.edit.error.ring)}>
				<span data-slot="grid-edit-slot" className={cn(k.edit.slot)}>
					{children}
				</span>

				{message && <GridEditBelow anchor={cell}>{message}</GridEditBelow>}
			</span>
		)
	}

	return (
		<span
			ref={ref}
			data-slot="grid-edit-host"
			data-invalid={dataAttr(error !== null)}
			className={cn(k.edit.host)}
		>
			<span aria-hidden inert className={cn(k.edit.rest)}>
				{rest}
			</span>

			<span
				ref={slotRef}
				data-slot="grid-edit-slot"
				data-grown={dataAttr(grown)}
				style={growStyle}
				className={cn(k.edit.slot, grown && k.edit.grown)}
			>
				<Control variant="bare">{children}</Control>
			</span>

			{(settle !== 'none' || message) && (
				<GridEditBelow anchor={expanded ? null : grown ? slot : cell}>
					<GridSettleControls label={label} controls={settle} settle={onSettle} />

					{message}
				</GridEditBelow>
			)}
		</span>
	)
}
