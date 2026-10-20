'use client'

import {
	type RefObject,
	useCallback,
	useEffect,
	useEffectEvent,
	useLayoutEffect,
	useRef,
} from 'react'
import { announce } from '../../core'
import { useMountedRef } from '../../hooks/use-mounted-ref'
import { useIntl } from '../../primitives/intl/use-intl'
import type { createActiveEditStore } from './engine/grid-active-edit-store'
import { describeCommit, describeDiscard, describeSettle } from './engine/grid-announcements'
import { EMPTY_SET } from './engine/grid-constants'
import {
	dropStrandedHolds,
	flushClosedCells,
	type InFlightBatch,
	rowLookup,
	settleDrafts,
} from './engine/grid-edit-commit'
import {
	type GridHistoryCell,
	type GridHistoryEntry,
	type GridHistoryStep,
	type GridPendingEntry,
	recordWrite,
	settlePendingEntry,
} from './engine/grid-edit-history'
import type { CellRequest } from './engine/grid-edit-transition'
import {
	type GridActiveEdit,
	type GridDraftStore,
	isCellEditing,
	NEW_ROW_KEY,
	readRefusals,
	trackSink,
} from './engine/grid-editing-utilities'
import type { GridEditSource } from './grid-data-types'
import type { GridCellChange, GridEditableConfig } from './grid-editing-types'

/**
 * Commits the cells that the session closed, and settles what each commit
 * waits on. The sweep runs after each render, and sends the drafts of each
 * closed cell through `onCommit`, one batch per row. An async batch holds its
 * drafts as pending until its promise settles. A refused draft is staged again,
 * with its error. A Save of the phone overlay waits here for its row to commit,
 * and settles at once when the consumer declines the exit.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function useGridEditSweep<T>({
	cellScoped,
	editableRows,
	activeEdit,
	drafts,
	activeEditStore,
	editableRowsRef,
	activeEditRef,
	sweptRef,
	gridClosedRef,
	requestRef,
	editSourceRef,
	setEditableRows,
	exitSession,
	bump,
	recordEntry,
	restoreStep,
	hasCommit,
	sendCommit,
	sendReject,
}: {
	cellScoped: boolean
	/** The rows that edit in this render. */
	editableRows: Set<string | number>
	/** The cell that a cell-scoped session edits in this render. */
	activeEdit: GridActiveEdit | null
	drafts: GridDraftStore
	activeEditStore: ReturnType<typeof createActiveEditStore>
	editableRowsRef: RefObject<Set<string | number>>
	activeEditRef: RefObject<GridActiveEdit | null>
	/** The open state that the last sweep saw. The sweep writes it. */
	sweptRef: RefObject<{ rows: Set<string | number>; cell: GridActiveEdit | null }>
	/** The rows that the grid itself closed since the last sweep. */
	gridClosedRef: RefObject<Set<string | number>>
	/** The move that a controlled binding has yet to apply. */
	requestRef: RefObject<CellRequest | null>
	editSourceRef: RefObject<GridEditSource<T>>
	setEditableRows: (next: (prev: Set<string | number> | undefined) => Set<string | number>) => void
	exitSession: (rowKey: string | number, outcome: 'save' | 'discard', reseatFocus: boolean) => void
	/** Forces one render of the grid. */
	bump: () => void
	recordEntry: (entry: GridHistoryEntry) => void
	restoreStep: (step: GridHistoryStep, refused: readonly GridHistoryCell[]) => void
	/** Whether the config has an `onCommit` sink. */
	hasCommit: boolean
	sendCommit: GridEditableConfig['onCommit']
	sendReject: (refused: GridCellChange[]) => void
}) {
	const intl = useIntl()

	// The saves of the overlay that wait for their row to commit, by row key. The
	// commit sweep settles a save whose row closed. A save whose row stays open
	// was declined, and settles at once (see `settleDeclinedSaves`).
	const saveWaitersRef = useRef(new Map<string | number, (() => void)[]>())

	// Settles the saves of each row in `rowKeys` that is still open. The consumer
	// kept the row, or a controlled `cell` kept the session, so nothing commits
	// and the overlay stays open with its values.
	const settleDeclinedSaves = useCallback(
		(rowKeys: Iterable<string | number>) => {
			const waitersByRow = saveWaitersRef.current

			for (const rowKey of rowKeys) {
				const waiters = waitersByRow.get(rowKey)

				if (!waiters || !editableRowsRef.current.has(rowKey)) continue

				waitersByRow.delete(rowKey)

				for (const waiter of waiters) waiter()
			}
		},
		[editableRowsRef],
	)

	// The save of the overlay: the exit of Enter, settled when its commit does.
	// A row that is not open has nothing to commit.
	const saveSession = useCallback(
		(rowKey: string | number) =>
			new Promise<void>((resolve) => {
				if (!editableRowsRef.current.has(rowKey)) {
					resolve()

					return
				}

				const waiters = saveWaitersRef.current.get(rowKey) ?? []

				saveWaitersRef.current.set(rowKey, [...waiters, resolve])

				exitSession(rowKey, 'save', true)

				// A render must follow, even where the consumer declines the rows
				// write, so that the effect below sees the answer.
				bump()
			}),
		[editableRowsRef, exitSession, bump],
	)

	// Settles the saves whose exit the consumer declined. A controlled move
	// waits for `settleBinding`, which comes after this effect and settles a
	// declined move itself. Any other exit has its answer in this commit.
	useLayoutEffect(() => {
		if (requestRef.current === null) settleDeclinedSaves(saveWaitersRef.current.keys())
	})

	// Whether the grid is mounted. A commit that settles after the unmount
	// changes nothing and announces nothing.
	const mountedRef = useMountedRef()

	// The refused rows that a settle asked `rows` to open again. `bump` forces
	// the render that tells an applied write from a declined one.
	const awaitingReopenRef = useRef(new Set<string | number>())

	// The announcements of the effects below. An effect event reads the newest
	// intl, so a change of locale does not run an effect again.
	const announceDiscard = useEffectEvent((dropped: number) =>
		announce(describeDiscard(intl, dropped)),
	)

	const announceCommit = useEffectEvent((columns: readonly string[], row: string | undefined) =>
		announce(describeCommit(intl, columns, row)),
	)

	// A controlled `rows` that declines to open a refused row again chose to
	// close it, so the refused drafts of that row drop. Without this, they
	// would commit again at the next sweep of an unrelated transition.
	useEffect(() => {
		const awaiting = awaitingReopenRef.current

		if (awaiting.size === 0) return

		const declined = new Set([...awaiting].filter((rowKey) => !editableRows.has(rowKey)))

		awaiting.clear()

		if (declined.size === 0) return

		// An add settles the new-row slot, and never a batch, so the slot test never
		// fails. It narrows the key to a data row key for `declined`.
		const dropped = drafts.drop(
			(rowKey, _, draft) =>
				rowKey !== NEW_ROW_KEY && declined.has(rowKey) && draft.error !== undefined,
		)

		// A dropped draft can change what a cell shows, so the cells read again.
		if (dropped > 0) {
			activeEditStore.notify()

			announceDiscard(dropped)
		}
	})

	// Settles one async batch. An accepted draft leaves the store, and the cell
	// reads the row again. A refused draft is staged again, with its error, and
	// focus stays where it is. Under row scope the refused row opens again.
	// Under cell scope a refused cell opens beside the session, unless the
	// session holds it. One polite announcement speaks the batch.
	const settleBatch = useCallback(
		(batch: InFlightBatch, refused: Map<string | number, string>, entry: GridPendingEntry) => {
			const { rowKey } = batch

			// A cell-scoped session holds one cell, so a refused cell opens beside
			// it. A cell that the session holds already needs no mark.
			const reopen = (columnId: string | number) =>
				cellScoped &&
				!isCellEditing({
					rowKey,
					columnId,
					editableRows: editableRowsRef.current,
					activeEdit: activeEditRef.current,
				})

			const { saved, failed, accepted } = settleDrafts({ batch, refused, drafts, reopen })

			const step = batch.outcome === 'undone' || batch.outcome === 'redone'

			// An accepted save goes into the entry of its write. An undo or a redo
			// moved its entry when it was sent, so it adds nothing.
			settlePendingEntry(
				entry,
				step ? [] : batch.history.filter((cell) => accepted.has(cell.columnId)),
				recordEntry,
			)

			if (saved.length + failed.length === 0) return

			activeEditStore.notify()

			// A refused cell of an undo or a redo goes back.
			if (step) {
				restoreStep(
					batch.outcome === 'undone' ? 'undo' : 'redo',
					batch.history.filter((cell) => refused.has(cell.columnId)),
				)
			}

			if (failed.length > 0 && !cellScoped && !editableRowsRef.current.has(rowKey)) {
				awaitingReopenRef.current.add(rowKey)

				setEditableRows((prev) => new Set(prev ?? EMPTY_SET).add(rowKey))

				// A render must follow even when a controlled `rows` declines the
				// write, so the check above sees the decline.
				bump()
			}

			announce(describeSettle(intl, saved, failed, batch.row, batch.outcome))
		},
		[
			cellScoped,
			drafts,
			activeEditStore,
			editableRowsRef,
			activeEditRef,
			setEditableRows,
			recordEntry,
			restoreStep,
			bump,
			intl,
		],
	)

	// Puts the drafts of an async batch back as pending, and settles them when
	// the promise does. A rejection refuses the whole batch. A refusal counts
	// only for a draft of the batch, on the row of the batch.
	const trackBatch = useCallback(
		(batch: InFlightBatch, entry: GridPendingEntry) => {
			for (const [columnId, draft] of batch.drafts) drafts.pend(batch.rowKey, columnId, draft)

			activeEditStore.notify()

			const takes = (refusal: { rowKey?: string | number; columnId: string | number }) =>
				refusal.rowKey === batch.rowKey && batch.drafts.has(refusal.columnId)

			trackSink(batch.result, mountedRef, (outcome) =>
				settleBatch(batch, readRefusals(outcome, batch.drafts.keys(), takes), entry),
			)
		},
		[drafts, activeEditStore, settleBatch, mountedRef],
	)

	// Settles each save whose row this sweep closed: at once for a commit that
	// ran, or when the async batches of its row settle. The batch settles its
	// drafts first, so a refused row is open again when the save settles.
	const settleSaves = useEffectEvent((inFlight: readonly InFlightBatch[]) => {
		for (const [rowKey, waiters] of saveWaitersRef.current) {
			if (editableRows.has(rowKey)) continue

			saveWaitersRef.current.delete(rowKey)

			const settle = () => {
				for (const waiter of waiters) waiter()
			}

			const results = inFlight
				.filter((batch) => batch.rowKey === rowKey)
				.map((batch) => batch.result)

			if (results.length === 0) settle()
			else void Promise.allSettled(results).then(settle)
		}
	})

	// Read by the sweep, so a new callback does not run the sweep again.
	const trackInFlight = useEffectEvent((batch: InFlightBatch, entry: GridPendingEntry) =>
		trackBatch(batch, entry),
	)

	// Commit the cells that the session closed in the render just past. The
	// drafts belong to the session, and this is where they land in the sink. The
	// open state answers it on its own, so no copy of the last render is kept to
	// diff against.
	useEffect(() => {
		const source = editSourceRef.current

		// One lookup serves the sweep, so no row is found by a second scan.
		const getRow = rowLookup(source)

		const dropped = dropStrandedHolds({
			drafts,
			before: sweptRef.current.rows,
			after: editableRows,
			gridClosed: gridClosedRef.current,
			getRow,
		})

		// A dropped draft can change what a cell shows, so the cells read again.
		if (dropped > 0) {
			activeEditStore.notify()

			announceDiscard(dropped)
		}

		sweptRef.current = { rows: editableRows, cell: activeEdit }

		const { saved, inFlight } = flushClosedCells({
			drafts,
			editableRows,
			activeEdit,
			source,
			getRow,
			onCommit: hasCommit ? sendCommit : undefined,
			onReject: sendReject,
		})

		// Announce the commit politely, without moving focus (WCAG 4.1.3). An
		// async batch announces as it settles.
		if (saved.columns.length > 0) announceCommit(saved.columns, saved.row)

		// One sweep is one user action, so its cells are one entry. With an async
		// batch, the entry records when the last batch settles.
		recordWrite(saved.history, inFlight, recordEntry, trackInFlight)

		settleSaves(inFlight)
	}, [
		drafts,
		editableRows,
		activeEdit,
		editSourceRef,
		sweptRef,
		gridClosedRef,
		activeEditStore,
		recordEntry,
		hasCommit,
		sendCommit,
		sendReject,
	])

	return { saveSession, settleDeclinedSaves, trackBatch }
}
