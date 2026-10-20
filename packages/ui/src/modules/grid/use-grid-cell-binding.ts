'use client'

import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useControllable } from '../../hooks'
import {
	type CellRequest,
	type CrossRowEntry,
	planTransition,
	readControlledCell,
	readSettled,
	type SessionRow,
	type SettledCell,
	settledAt,
	settleOn,
	type TransitionPlan,
	writeRowsPlan,
} from './engine/grid-edit-transition'
import { type GridActiveEdit, sameCell } from './engine/grid-editing-utilities'
import type { GridEditSource } from './grid-data-types'
import type { GridEditableConfig } from './grid-editing-types'
import { UNEDITABLE_CELL_WARNING } from './use-grid-editing-warnings'

/**
 * Resolves the session's cell against the set. It owns the `cell`
 * controllable, the value the transition effect settled, and the mask of an
 * uncontrolled coord that stranded. @internal
 */
export function useActiveCell<T>({
	config,
	cellScoped,
	controlled,
	initialCell,
	editableRows,
	editSource,
	entry,
}: {
	config: GridEditableConfig | undefined
	cellScoped: boolean
	controlled: boolean
	initialCell: GridActiveEdit | null
	editableRows: Set<string | number>
	editSource: GridEditSource<T>
	entry: CrossRowEntry | null
}) {
	// The session's cell as the binding holds it, before the grid resolves it
	// against the set. Uncontrolled, the grid writes it at event time. Controlled,
	// the consumer writes it, and the grid only asks through the change report.
	const [value, setValue] = useControllable<GridActiveEdit>({
		value: cellScoped ? config?.cell : undefined,
		defaultValue: initialCell ?? undefined,
		onValueChange: (next) => config?.onCellChange?.(next),
	})

	const raw = value ?? null

	// The last value of a controlled binding that the transition effect acted on.
	// A value past it is in flight: the effect has yet to write the rows it needs.
	// State, because the render reads it: the effect sets it, and the render that
	// follows reads the new value before paint.
	const [settled, setSettled] = useState<SettledCell>({ raw: initialCell, cell: initialCell })

	const candidate = controlled ? readControlledCell(raw, settled, editableRows, editSource) : raw

	// An uncontrolled coord that stranded once stays dropped. Masking alone would
	// survive as state, so the same row re-entering the set later would revive a
	// cell nobody opened and mount its editor alone. The grid cannot clear the
	// state here without a change report, so it records the stranded value
	// instead. A controlled value is the consumer's own, so it reads again when
	// its row opens again.
	const [maskedCell, setMaskedCell] = useState<GridActiveEdit | null>(null)

	const masked = !controlled && candidate !== null && candidate === maskedCell

	// Three things strand the coord. A binding can decline an entry, so the row
	// never joins the set; a consumer save can drop an editing row from under the
	// session; and `scope` or `session` can change under a live session, which
	// leaves a coord the current config would never have written.
	const stranded =
		candidate !== null && !masked && (!cellScoped || !editableRows.has(candidate.rowKey))

	// A cross-row entry that the rows binding declined reads as the cell it left,
	// while that cell's row is still open. The transition effect then writes the
	// state back to it, so no mask is necessary.
	const declined =
		stranded &&
		!controlled &&
		cellScoped &&
		entry !== null &&
		sameCell(candidate, entry.to) &&
		editableRows.has(entry.from.rowKey)

	// Adjusting the state here is React's answer to a value gone stale against its
	// input, and it beats an effect that resynchronizes a render late.
	if (stranded && !controlled && !declined) setMaskedCell(candidate)

	const live = stranded || masked ? null : candidate

	const activeEdit = declined ? entry.from : live

	return { raw, setValue, settled, setSettled, activeEdit }
}

/**
 * Settles the session's cell after each commit. Under a controlled `cell` it
 * acts on each new value, whether the grid asked for it or the consumer set it,
 * and writes the rows that the value needs. Uncontrolled, it settles the
 * cross-row entry that the last event recorded. It warns once for a
 * consumer's cell that is not editable. @internal
 */
export function useGridCellBinding<T>({
	controlled,
	raw,
	settled,
	setSettled,
	activeEdit,
	initialUneditable,
	entry,
	setEntry,
	setActiveCellValue,
	setEditableRows,
	editableRowsRef,
	activeEditRef,
	sessionRowRef,
	requestRef,
	gridClosedRef,
	awaitRowRef,
	editSourceRef,
	bump,
	settleFocus,
	unstageDraft,
	dropIntents,
	settleDeclinedSaves,
}: {
	controlled: boolean
	/** The session's cell as the binding holds it. */
	raw: GridActiveEdit | null
	settled: SettledCell
	setSettled: (next: SettledCell) => void
	/** The resolved cell of this render. */
	activeEdit: GridActiveEdit | null
	/** Whether the binding's first value names a cell that is not editable. */
	initialUneditable: boolean
	entry: CrossRowEntry | null
	setEntry: (next: CrossRowEntry | null) => void
	setActiveCellValue: (next: GridActiveEdit | null) => void
	setEditableRows: (next: (prev: Set<string | number> | undefined) => Set<string | number>) => void
	editableRowsRef: RefObject<Set<string | number>>
	activeEditRef: RefObject<GridActiveEdit | null>
	sessionRowRef: RefObject<SessionRow | null>
	requestRef: RefObject<CellRequest | null>
	gridClosedRef: RefObject<Set<string | number>>
	awaitRowRef: RefObject<boolean>
	editSourceRef: RefObject<GridEditSource<T>>
	bump: () => void
	settleFocus: (plan: TransitionPlan, blur: boolean) => void
	unstageDraft: (rowKey: string | number, columnId: string | number) => void
	dropIntents: () => void
	settleDeclinedSaves: (rowKeys: Iterable<string | number>) => void
}): void {
	// Warns once for a consumer's cell that is not editable: the initial value
	// here, and each later value in the transition effect below.
	const warnedRef = useRef(false)

	const warnUneditable = useCallback(() => {
		if (process.env.NODE_ENV === 'production' || warnedRef.current) return

		warnedRef.current = true

		console.warn(UNEDITABLE_CELL_WARNING)
	}, [])

	useEffect(() => {
		if (initialUneditable) warnUneditable()
	}, [initialUneditable, warnUneditable])

	// Acts on each new value of a controlled `cell`, whether the grid asked
	// for it or the consumer set it. It runs as a layout effect, so the editor the
	// value names is open before paint.
	//
	// - A value equal to the settled one moves nothing. A request that did not
	//   land was declined, so its intents drop.
	// - A value the grid asked for keeps the intents of its entry, and carries out
	//   the exits and the discard recorded with it.
	// - Any other value is a set from outside. Focus follows it into the grid only
	//   when focus is already there (WCAG 3.2.1).
	//
	// The rows follow the rules of a grid entry. The new cell's row opens, and a
	// row the session acquired closes as the session leaves it. `null` closes
	// the held row, as a save does.
	const applyTransition = useCallback(
		(raw: GridActiveEdit | null, from: SettledCell, request: CellRequest | null) => {
			const rows = editableRowsRef.current

			const plan = planTransition({
				from,
				raw,
				request,
				rows,
				sessionRow: sessionRowRef.current,
				source: editSourceRef.current,
			})

			if (raw !== null && plan.next === null) warnUneditable()

			setSettled(settleOn(plan, raw, readSettled(from, rows)))

			settleFocus(plan, request?.blur === true)

			if (plan.discard) unstageDraft(plan.discard.rowKey, plan.discard.columnId)

			// A waiting value keeps the session row until its row opens. An exit on
			// the way still takes the row that it closes.
			const sessionRow = sessionRowRef.current

			if (!plan.opens) sessionRowRef.current = plan.sessionRow
			else if (sessionRow && plan.endRows.has(sessionRow.rowKey)) sessionRowRef.current = null

			writeRowsPlan(plan, setEditableRows, gridClosedRef.current)

			// The render held the settled cell while this value waited for its row. A
			// render must follow, even where the consumer declines the rows write.
			if (raw === null || !rows.has(raw.rowKey)) bump()

			awaitRowRef.current = plan.opens
		},
		[
			editableRowsRef,
			sessionRowRef,
			editSourceRef,
			gridClosedRef,
			awaitRowRef,
			setSettled,
			warnUneditable,
			settleFocus,
			unstageDraft,
			setEditableRows,
			bump,
		],
	)

	// Lands a settled value that waits for its row, once that row is open. The
	// session then holds the new cell and the session row that it planned.
	const landWait = useCallback(
		(current: SettledCell): SettledCell => {
			const wait = current.wait

			if (!wait || !editableRowsRef.current.has(wait.cell.rowKey)) return current

			sessionRowRef.current = wait.sessionRow

			const landed = { raw: current.raw, cell: wait.cell }

			setSettled(landed)

			return landed
		},
		[editableRowsRef, sessionRowRef, setSettled],
	)

	// Settles an uncontrolled binding: the entry the last event recorded, and the
	// settled value that a switch to a controlled binding starts from.
	const settleUncontrolled = useCallback(
		(raw: GridActiveEdit | null) => {
			if (entry === null) return

			setEntry(null)

			// The render read a declined entry as the cell it left. Write the
			// state back to that cell, and report it, as the entry was reported.
			if (sameCell(raw, entry.to) && sameCell(activeEditRef.current, entry.from)) {
				sessionRowRef.current = entry.sessionRow

				setActiveCellValue(entry.from)
			}
		},
		[entry, setEntry, activeEditRef, sessionRowRef, setActiveCellValue],
	)

	// The cell that an uncontrolled binding held at its last commit, for a
	// switch to a controlled binding. A ref, not the settled state: the render
	// reads the settled value only while controlled, so a write on each move
	// would render the host once more for nothing.
	// Only an uncontrolled commit writes it, and a switch always follows one.
	const uncontrolledRef = useRef<GridActiveEdit | null>(activeEdit)

	const wasControlledRef = useRef(controlled)

	const settleBinding = useCallback(
		(raw: GridActiveEdit | null) => {
			const request = requestRef.current

			requestRef.current = null

			const switched = controlled && !wasControlledRef.current

			wasControlledRef.current = controlled

			if (!controlled) {
				settleUncontrolled(raw)

				uncontrolledRef.current = activeEditRef.current

				return
			}

			// A switch to a controlled binding starts from the cell that the
			// uncontrolled binding held.
			const held = uncontrolledRef.current

			const base = switched && !settledAt(settled, held) ? { raw: held, cell: held } : settled

			if (base !== settled) setSettled(base)

			const from = landWait(base)

			// An equal value moves nothing. A request that did not land was declined.
			if (!sameCell(raw, from.raw)) applyTransition(raw, from, request)
			else if (request) {
				dropIntents()

				settleDeclinedSaves(request.endRows)
			}
		},
		[
			requestRef,
			activeEditRef,
			controlled,
			settled,
			setSettled,
			settleUncontrolled,
			applyTransition,
			dropIntents,
			landWait,
			settleDeclinedSaves,
		],
	)

	// Settle the binding after each commit. It acts on a moved value, on a request,
	// whose render `bump` forces, so a declined move drops its intents, and on a
	// waiting value whose row has opened. With none of those, it changes nothing.
	useLayoutEffect(() => settleBinding(raw))
}
