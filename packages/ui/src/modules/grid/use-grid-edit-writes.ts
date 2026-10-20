'use client'

import {
	type KeyboardEvent as ReactKeyboardEvent,
	type RefObject,
	useCallback,
	useMemo,
} from 'react'
import { announce } from '../../core'
import { useIntl } from '../../primitives/intl/use-intl'
import {
	describeHistoryMiss,
	describeWrite,
	type GridSaveOutcome,
} from './engine/grid-announcements'
import {
	type GridFillCell,
	type GridPasteCell,
	historyOutcome,
	type InFlightBatch,
	pasteChange,
	readHistoryCell,
	rowLookup,
	sendCells,
	writeTarget,
} from './engine/grid-edit-commit'
import {
	type GridHistoryCell,
	type GridHistoryStep,
	type GridPendingEntry,
	historyStep,
	historyValue,
	recordWrite,
} from './engine/grid-edit-history'
import { coordOf, type GridDraftStore, readKeyPress } from './engine/grid-editing-utilities'
import type { GridEditSource } from './grid-data-types'
import type { GridCellChange, GridEditableConfig } from './grid-editing-types'
import type { GridColumn } from './types'
import type { GridEditHistory } from './use-grid-edit-history'
import type { Coord } from './use-grid-navigation'

/**
 * Owns the writes that no session staged: a paste, a fill, and a step through
 * the undo history. Each goes through the one `onCommit` sink as a save does,
 * and is announced and tracked as the commit sweep does.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function useGridEditWrites<T>({
	drafts,
	editSourceRef,
	rowKeysRef,
	dataColumnsRef,
	moveTo,
	history,
	hasCommit,
	sendCommit,
	sendReject,
	trackBatch,
}: {
	drafts: GridDraftStore
	editSourceRef: RefObject<GridEditSource<T>>
	rowKeysRef: RefObject<(string | number)[]>
	/** Visible data columns in display order. */
	dataColumnsRef: RefObject<GridColumn<T>[]>
	moveTo: (coord: Coord) => void
	history: GridEditHistory
	/** Whether the config has an `onCommit` sink. */
	hasCommit: boolean
	sendCommit: GridEditableConfig['onCommit']
	sendReject: (refused: GridCellChange[]) => void
	/** Holds an async batch as pending until it settles (see `useGridEditSweep`). */
	trackBatch: (batch: InFlightBatch, entry: GridPendingEntry) => void
}) {
	const intl = useIntl()

	const { on: historyOn, record: recordEntry, take: takeStep } = history

	// Sends a batch of changes that no session staged through the sink, and
	// announces and tracks it as the commit sweep does. `rowOf` reads the live
	// rows, so a caller that already indexed them passes its own. A write that
	// no history value came from, such as a paste, passes `write`: its cells go
	// through the checks of a save, and its refusals, with the ones the caller
	// found, go to `onReject` in one call. Its saved cells are one entry in the
	// history. The announcement also counts the cells that the write skipped. A
	// history step passes its cells as `history`, so a refused batch puts them
	// back.
	const submitCells = useCallback(
		(
			changes: readonly GridCellChange[],
			outcome: GridSaveOutcome,
			rowOf: (rowKey: string | number) => T | undefined,
			write?: { refused: readonly GridCellChange[]; skipped: number },
			cells: readonly GridHistoryCell[] = [],
		) => {
			const { saved, inFlight, refused } = sendCells({
				changes,
				outcome,
				source: editSourceRef.current,
				rowOf,
				onCommit: hasCommit ? sendCommit : undefined,
				check: write !== undefined,
				history: cells,
			})

			const rejected = write ? [...write.refused, ...refused] : refused

			if (rejected.length > 0) sendReject(rejected)

			const message = describeWrite(
				intl,
				saved.columns,
				saved.row,
				outcome,
				(write?.skipped ?? 0) + rejected.length,
			)

			if (message) announce(message)

			recordWrite(saved.history, inFlight, recordEntry, trackBatch)
		},
		[editSourceRef, hasCommit, sendCommit, sendReject, recordEntry, trackBatch, intl],
	)

	// Writes the text of a paste into its cells, as one save. A cell that its
	// column cannot edit, that has no `field`, or that holds a draft is
	// skipped. A text that does not fit its cell is refused.
	const pasteCells = useCallback(
		(cells: readonly GridPasteCell[]) => {
			const source = editSourceRef.current

			const rowOf = rowLookup(source)

			const changes: GridCellChange[] = []

			const refused: GridCellChange[] = []

			let skipped = 0

			for (const cell of cells) {
				const drafted = drafts.read(cell.rowKey, cell.columnId) !== undefined

				const paste = drafted ? null : pasteChange(source, rowOf, cell)

				if (!paste) skipped++
				else if (paste.fits) changes.push(paste.change)
				else refused.push(paste.change)
			}

			submitCells(changes, 'pasted', rowOf, { refused, skipped })
		},
		[editSourceRef, drafts, submitCells],
	)

	// Writes the values of a fill into their cells, as one save. A fill skips
	// the cells that a paste skips.
	const fillCells = useCallback(
		(cells: readonly GridFillCell[]) => {
			const source = editSourceRef.current

			const rowOf = rowLookup(source)

			const changes: GridCellChange[] = []

			let skipped = 0

			for (const cell of cells) {
				const drafted = drafts.read(cell.rowKey, cell.columnId) !== undefined

				if (drafted || !writeTarget(source, rowOf, cell)) skipped++
				else changes.push(cell)
			}

			submitCells(changes, 'filled', rowOf, { refused: [], skipped })
		},
		[editSourceRef, drafts, submitCells],
	)

	// Moves the cursor to a cell that a history step wrote, when the grid shows
	// its row and its column.
	const moveToCell = useCallback(
		(cell: GridHistoryCell | undefined) => {
			if (!cell) return

			const coord = coordOf(rowKeysRef.current, dataColumnsRef.current, cell)

			if (coord.row !== -1 && coord.col !== -1) moveTo(coord)
		},
		[rowKeysRef, dataColumnsRef, moveTo],
	)

	// Takes one step through the history, and returns whether it wrote a cell.
	// The step sends the values that it writes through `onCommit`, as a save
	// does, so the consumer applies it as it applies a save. From a key, the
	// cursor moves to the first cell that the step writes, when the grid shows
	// its row and its column. With the history off, nothing happens.
	const stepHistory = useCallback(
		(step: GridHistoryStep, moveCursor: boolean): boolean => {
			if (!historyOn) return false

			const source = editSourceRef.current

			const rowOf = rowLookup(source)

			const result = takeStep(step, {
				current: (cell) => readHistoryCell(source, rowOf, cell),
				drafted: (cell) => drafts.read(cell.rowKey, cell.columnId) !== undefined,
			})

			if (result.status !== 'applied') {
				announce(describeHistoryMiss(intl, step, result.status))

				return false
			}

			const { cells } = result

			const changes = cells.map((cell) => ({
				rowKey: cell.rowKey,
				columnId: cell.columnId,
				value: historyValue(cell, step),
			}))

			submitCells(changes, historyOutcome(step), rowOf, undefined, cells)

			if (moveCursor) moveToCell(cells[0])

			return true
		},
		[historyOn, editSourceRef, takeStep, drafts, submitCells, moveToCell, intl],
	)

	// The step of the grid's `ref` handle. Focus is on the control that sent it,
	// so the cursor stays where it is.
	const stepFromHandle = useCallback(
		(step: GridHistoryStep) => stepHistory(step, false),
		[stepHistory],
	)

	// The history keys act on the tab stop only. In an open editor, the input
	// keeps Ctrl+Z for its own text. The keys are absent while the history is off.
	const historyKeys = useMemo(() => {
		if (!historyOn) return undefined

		return (event: ReactKeyboardEvent<HTMLTableElement>) => {
			if (event.target !== event.currentTarget || event.defaultPrevented) return

			const step = historyStep({ ...readKeyPress(event), shiftKey: event.shiftKey })

			if (step === null) return

			event.preventDefault()

			stepHistory(step, true)
		}
	}, [historyOn, stepHistory])

	return { pasteCells, fillCells, stepHistory: stepFromHandle, historyKeys }
}
