'use client'

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { Button } from '../../components/button'
import { Drawer, DrawerBody, DrawerFooter, DrawerPanel, DrawerTitle } from '../../components/drawer'
import { Field, Label, Message } from '../../components/fieldset'
import { Sheet, SheetBody, SheetFooter, SheetPanel, SheetTitle } from '../../components/sheet'
import { intlMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { Stack } from '../../structure/stack'
import { Form, FormSubmit } from '../form'
import type { GridEditingSession } from './context'
import { columnLabel } from './engine/grid-column/label'
import {
	COMMIT_REFUSED,
	EDITOR_FOCUSABLE,
	type GridActiveEdit,
	inferEditorKind,
	isColumnEditable,
} from './engine/grid-editing-utilities'
import { gridMessages } from './engine/grid-messages'
import { rowName } from './engine/grid-row/cell'
import type { GridEditSource } from './grid-data-types'
import { GridEditInputs } from './grid-edit-inputs'
import { GridOverlayDensity } from './grid-region'
import type { GridColumn } from './types'

/**
 * What the overlay edits: the cell that a cell-scoped session holds, or the
 * first open row with `columnId` `null`. @internal
 */
type OverlayTarget = { rowKey: string | number; columnId: string | number | null }

/** The values of the form of the overlay. The fields stage into the session, not the form. @internal */
const NO_VALUES = {}

/**
 * Reads the target of the overlay from the store. An expanded row comes first,
 * and shows whole. The overlay of a form shows nothing else. On a phone, the
 * cell that a session holds comes next, and a row that the consumer opened
 * shows whole. The snapshot is the store's own cell, or a row key, so a read
 * with no change is the same value. @internal
 */
function readTarget(
	store: GridEditingSession['activeEditStore'],
	shows: 'open' | 'expanded',
): GridActiveEdit | string | number | null {
	const expanded = store.expanded()

	if (expanded !== null && store.rows().has(expanded)) return expanded

	if (shows === 'expanded') return null

	const cell = store.get()

	if (cell !== null && store.rows().has(cell.rowKey)) return cell

	const [first] = store.rows()

	return first ?? null
}

/** The target that a snapshot of {@link readTarget} names. @internal */
function toTarget(snapshot: GridActiveEdit | string | number | null): OverlayTarget | null {
	if (snapshot === null) return null

	if (typeof snapshot === 'object') return snapshot

	return { rowKey: snapshot, columnId: null }
}

/** Whether two targets name the same row and the same cell. @internal */
function sameTarget(a: OverlayTarget | null, b: OverlayTarget | null): boolean {
	if (a === null || b === null) return a === b

	return a.rowKey === b.rowKey && a.columnId === b.columnId
}

/** The slots of each overlay. The two panels share their slot props. @internal */
const PARTS = {
	drawer: { Title: DrawerTitle, Body: DrawerBody, Footer: DrawerFooter },
	sheet: { Title: SheetTitle, Body: SheetBody, Footer: SheetFooter },
}

/** Props for {@link GridEditOverlay}. @internal */
type GridEditOverlayProps<T> = {
	/** The overlay to edit in: a drawer from the bottom edge, or a sheet from the side. */
	kind: 'drawer' | 'sheet'
	/**
	 * The rows that the overlay shows: each open row, as on a phone, or only
	 * the expanded row, as the form on a wider screen.
	 */
	shows: 'open' | 'expanded'
	session: GridEditingSession
	/** The visible columns of the grid, in display order. The overlay shows the editable ones. */
	columns: GridColumn<T>[]
	/** The grid's own rows, which the overlay finds the open row in. */
	source: GridEditSource<T>
}

/**
 * The overlay that a phone edits in ({@link GridEditableConfig.overlay}), and
 * the form of an expanded row ({@link GridRowActionsContext.expand}). It shows
 * the editors of the expanded row, of the open row, or of the one cell that a
 * cell-scoped session holds, with Cancel and Save. The editors stage into the session as the
 * editors in the table do. Save ends the session as Enter does, and Cancel,
 * Escape, and a press outside the overlay end it as Escape does.
 *
 * Save holds the overlay open, with its spinner, until the commit settles. An
 * async commit that the consumer refuses opens the row again with its errors.
 * Under cell scope the refused cell is held beside the session, so the overlay
 * moves the session back onto it. A form expands its row again. A consumer that declines the exit keeps the
 * overlay open, and Save settles with nothing committed. Save does nothing
 * while a {@link GridColumn.validate} refuses a value: the field shows why.
 *
 * @remarks The overlay is a sibling of the table in the React tree, so its keys
 * and focus moves do not reach the key surface of the table.
 *
 * @internal
 */
export function GridEditOverlay<T>({
	kind,
	shows,
	session,
	columns,
	source,
}: GridEditOverlayProps<T>) {
	const intl = useIntl()

	const {
		activeEditStore: store,
		readDraft,
		endSession,
		saveSession,
		resumeCell,
		expandRow,
		collapseRow,
		showOverlay,
		focusTarget,
	} = session

	// The element that focus returns to as the overlay closes. The session names
	// it as Save or Cancel ends the row, so focus does not return to an element
	// that had the focus before, in this grid or another.
	const returnRef = useRef<HTMLElement | null>(null)

	const snapshot = useSyncExternalStore(
		store.subscribe,
		() => readTarget(store, shows),
		() => null,
	)

	const target = toTarget(snapshot)

	// The target that the overlay shows. It stays while a save settles and while
	// the overlay slides out, after the session let it go.
	const [shown, setShown] = useState<OverlayTarget | null>(target)

	if (target !== null && !sameTarget(target, shown)) setShown(target)

	// Whether a save waits for its commit.
	const [busy, setBusy] = useState(false)

	// A counter that a settled save raises. The fields mount again, and read
	// the drafts that a refusal staged again with their errors.
	const [settled, setSettled] = useState(0)

	// Whether the overlay has finished opening. The panel reports it once per
	// arrival through its `onOpenComplete`.
	const [landed, setLanded] = useState(false)

	const open = target !== null || busy

	const shownKey = shown?.rowKey ?? null

	// The row actions of the shown row change once the overlay is up. A close
	// clears the row, and the next arrival names it again.
	useEffect(() => {
		showOverlay(open && landed ? shownKey : null)
	}, [open, landed, shownKey, showOverlay])

	if (!open && landed) setLanded(false)

	// Whether the overlay was open at the last commit. The expanded row clears
	// as the overlay closes, and not before it opens: a controlled `rows` opens
	// the row a render after the expand.
	const wasOpenRef = useRef(false)

	useEffect(() => {
		if (open) wasOpenRef.current = true
		else if (wasOpenRef.current) {
			wasOpenRef.current = false

			collapseRow()
		}
	}, [open, collapseRow])

	const row =
		shown === null
			? undefined
			: source.rows.find((item, index) => source.getKey(item, index) === shown.rowKey)

	const fields =
		shown === null || row === undefined
			? []
			: columns.filter(
					(column) =>
						isColumnEditable(column) && (shown.columnId === null || column.id === shown.columnId),
				)

	if (shown === null || row === undefined) return null

	function save() {
		if (shown === null || row === undefined) return

		const { rowKey, columnId } = shown

		// A column that refuses a value blocks the save. The drafts are read
		// now, because a field stages its value without a render of the overlay.
		const blocked = fields.some((column) => {
			const value = readDraft(rowKey, column.id)?.value ?? fieldValue(row, column)

			return column.validate?.(value, row) != null
		})

		if (blocked) return

		returnRef.current = focusTarget(rowKey)

		const expanded = store.expanded() === rowKey

		setBusy(true)

		return saveSession(rowKey).then(() => {
			setBusy(false)

			setSettled((count) => count + 1)

			// A cell-scoped session holds a refused cell beside itself. A form
			// expands its row again, and the session moves back onto a refused
			// cell. The overlay then shows the error.
			const refused = fields.some((column) => readDraft(rowKey, column.id)?.error !== undefined)

			if (expanded) {
				if (refused && !store.rows().has(rowKey)) expandRow(rowKey)
			} else if (columnId !== null && refused) resumeCell(rowKey, columnId)
		})
	}

	function discard() {
		if (busy || shown === null) return

		returnRef.current = focusTarget(shown.rowKey)

		endSession(shown.rowKey, 'discard')
	}

	const name = rowName(intl, source.rowLabel?.(row), shown.rowKey)

	const only = shown.columnId === null ? undefined : fields[0]

	const title = intl.formatMessage(gridMessages.editCell, {
		cell: only ? columnLabel(only) : name,
	})

	const { Title, Body, Footer } = PARTS[kind]

	const content = (
		<Form defaultValues={NO_VALUES} onSubmit={save}>
			<Title>{title}</Title>

			<Body>
				<Stack gap="lg">
					{fields.map((column) => (
						<GridEditOverlayField
							key={`${String(shown.rowKey)}:${String(column.id)}:${settled}`}
							session={session}
							rowKey={shown.rowKey}
							row={row}
							column={column}
						/>
					))}
				</Stack>
			</Body>

			<Footer>
				<Button type="button" variant="outline" disabled={busy} onClick={discard}>
					{intl.formatMessage(intlMessages.cancel)}
				</Button>

				<FormSubmit color="blue">{intl.formatMessage(intlMessages.save)}</FormSubmit>
			</Footer>
		</Form>
	)

	const onOpenChange = (next: boolean) => {
		if (!next) discard()
	}

	return (
		<GridOverlayDensity>
			{kind === 'drawer' ? (
				<Drawer open={open} onOpenChange={onOpenChange}>
					<DrawerPanel
						height="fit"
						aria-label={title}
						returnFocusTo={returnRef}
						onOpenComplete={() => setLanded(true)}
					>
						{content}
					</DrawerPanel>
				</Drawer>
			) : (
				<Sheet open={open} onOpenChange={onOpenChange}>
					<SheetPanel
						aria-label={title}
						returnFocusTo={returnRef}
						onOpenComplete={() => setLanded(true)}
					>
						{content}
					</SheetPanel>
				</Sheet>
			)}
		</GridOverlayDensity>
	)
}

/** The value of the field of `column` on `row`, or `undefined` for a column with no field. @internal */
function fieldValue<T>(row: T, column: GridColumn<T>): unknown {
	return column.field != null ? row[column.field] : undefined
}

/** Props for {@link GridEditOverlayField}. @internal */
type GridEditOverlayFieldProps<T> = {
	session: GridEditingSession
	rowKey: string | number
	row: T
	column: GridColumn<T>
}

/**
 * One field of {@link GridEditOverlay}: the label of the column, its editor, and
 * the message of a value that {@link GridColumn.validate} or the consumer
 * refuses. The editor is the column's {@link GridColumn.editCell} slot, or the
 * one that the grid infers, as in the table. It starts from the typed entry,
 * else from the staged draft, else from the row, and stages each change.
 *
 * @internal
 */
function GridEditOverlayField<T>({ session, rowKey, row, column }: GridEditOverlayFieldProps<T>) {
	const intl = useIntl()

	const { stageDraft, unstageDraft, readDraft, entrySeed, claimFocus } = session

	const seed = fieldValue(row, column)

	const [entry] = useState(() => entrySeed(rowKey, column.id))

	const [draft, setDraft] = useState<unknown>(() => {
		if (entry !== undefined) return entry

		const staged = readDraft(rowKey, column.id)

		return staged === undefined ? seed : staged.value
	})

	const [refusal, setRefusal] = useState(() =>
		entry === undefined ? readDraft(rowKey, column.id)?.error : undefined,
	)

	const [mountRow] = useState(row)

	useEffect(() => {
		if (entry !== undefined) stageDraft(rowKey, column.id, entry, mountRow)
	}, [entry, stageDraft, rowKey, column.id, mountRow])

	const hostRef = useRef<HTMLDivElement>(null)

	// The cell that an entry named takes focus. Each later run drops nothing.
	useEffect(() => {
		if (!claimFocus(rowKey, column.id)) return

		const editor = hostRef.current?.querySelector<HTMLElement>(EDITOR_FOCUSABLE)

		editor?.focus()
	})

	const update = (next: unknown) => {
		setDraft(next)

		setRefusal(undefined)

		stageDraft(rowKey, column.id, next, row)
	}

	const cancel = () => {
		setDraft(seed)

		setRefusal(undefined)

		unstageDraft(rowKey, column.id)
	}

	const label = columnLabel(column)

	const invalid = column.validate?.(draft, row) ?? null

	const refused =
		refusal === COMMIT_REFUSED ? intl.formatMessage(gridMessages.commitRefused) : refusal

	const error = invalid ?? refused ?? null

	const errorId = useId()

	// Save commits the overlay, so a final value only stages.
	const commit = (next: unknown) => {
		if (next !== undefined) update(next)
	}

	const body = column.editCell ? (
		column.editCell({
			row,
			value: draft,
			onValueUpdate: update,
			commit,
			cancel,
			ariaLabel: label,
			required: column.required ?? false,
			entered: false,
		})
	) : (
		<GridEditInputs
			kind={inferEditorKind(seed)}
			draft={draft}
			onValueUpdate={update}
			commit={commit}
			cancel={cancel}
			ariaLabel={label}
			error={error}
			errorId={errorId}
			required={column.required}
			managed
		/>
	)

	return (
		<Field ref={hostRef} data-slot="grid-edit-overlay-field" severity={error ? 'error' : undefined}>
			<Label>{label}</Label>

			{body}

			{error && <Message id={errorId}>{error}</Message>}
		</Field>
	)
}
