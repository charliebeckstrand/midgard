'use client'

import { type RefObject, useMemo } from 'react'
import { announce } from '../../core/announcer'
import { useStableEvent } from '../../hooks/use-stable-event'
import { useIntl } from '../../primitives/intl/use-intl'
import { describePasteRows } from './engine/grid-announcements'
import { findColumn, isColumnEditable } from './engine/grid-edit/utilities'
import type { GridRowAddResult } from './engine/grid-new-row'
import { coercePaste } from './engine/grid-range/paste'
import { unguardField } from './engine/grid-range/tsv'
import type { GridEditSource } from './grid-data-types'
import type { GridColumn } from './types'
import type { GridNewRowPosition } from './use-grid-navigation'

/** One line of a paste after the last data row: each field with the id of its column. @internal */
export type GridPasteLine = readonly { columnId: string | number; text: string }[]

/**
 * The first value of a column in the rows, which gives a pasted text its kind,
 * as the editor of the new-row slot reads it. `undefined` with no such value.
 */
function sampleValue<T>(rows: readonly T[], field: keyof T): unknown {
	return rows.find((row) => row[field] != null)?.[field]
}

/**
 * The values of one line of a paste for the new-row slot, each by its column
 * id, and the count of its fields that the slot does not take. A field with text in a column that the
 * slot cannot edit, or that has no `field`, is skipped. So is a text that does
 * not fit the kind of its column, in a column with no `parse`. The text loses
 * the guard apostrophe of a copy. {@link GridColumn.parse} reads it in place of
 * the default reading, as it does for a data row, with the line as its row:
 * the values of the line as the grid reads them with no `parse`, keyed by
 * `field`, as `validate` reads the row of the slot.
 */
function readLine<T>(source: GridEditSource<T>, line: GridPasteLine) {
	const read: { column: GridColumn<T>; text: string; value: unknown }[] = []

	const row: Record<string, unknown> = {}

	let skipped = 0

	for (const { columnId, text: raw } of line) {
		const text = unguardField(raw)

		const column = findColumn(source.columns, columnId)

		const field = column?.field

		const editable = column !== undefined && field != null && isColumnEditable(column)

		// The default reading gives the row of `parse`. A column with `parse`
		// reads the text through it in place of the default, as a data row does.
		const value = editable ? coercePaste(text, sampleValue(source.rows, field)) : null

		if (!editable || (!value && !column.parse)) {
			if (text.trim() !== '') skipped++

			continue
		}

		read.push({ column, text, value: value?.value })

		if (value) row[String(field)] = value.value
	}

	const entries = read.map(
		({ column, text, value }) =>
			[column.id, column.parse ? column.parse(text, row as T) : value] as const,
	)

	return { entries, skipped }
}

/**
 * Adds the lines of a paste after the last data row through the new-row slot,
 * one line at a time, as if the user typed each line into the slot and
 * pressed Enter. Each line waits for the add of the line before it. The slot
 * runs its checks, `onRowAdd`, and its pending state for each line.
 *
 * At the first refused line, the paste stops. That line stays in the slot
 * with its errors and focus, so the user can fix it and add it. A slot that
 * holds an entry of the user, or an add in flight, takes no line, so the
 * paste stops at the last row. One message speaks for the whole paste, after
 * the message of the cells that it wrote into the data rows. The rows that a
 * paste adds are not in the history, as no add of the slot is.
 *
 * `undefined` when the grid shows no new-row slot, so the paste stops at the
 * last row.
 *
 * @internal
 */
export function useGridPasteRows<T>({
	position,
	editSourceRef,
	submitRow,
	holdsEntry,
	stageRow,
}: {
	position: GridNewRowPosition
	editSourceRef: RefObject<GridEditSource<T>>
	submitRow: (quiet: boolean) => GridRowAddResult
	holdsEntry: () => boolean
	stageRow: (entries: readonly (readonly [string | number, unknown])[]) => void
}): ((lines: readonly GridPasteLine[], lead: string | null) => Promise<void>) | undefined {
	const intl = useIntl()

	const paste = useStableEvent(async (lines: readonly GridPasteLine[], lead: string | null) => {
		const speak = (outcome: Parameters<typeof describePasteRows>[1]) =>
			announce(describePasteRows(intl, outcome, lead))

		if (holdsEntry()) {
			speak({ added: 0, refused: 0, rest: lines.length, skipped: 0, held: true })

			return
		}

		let added = 0

		let skipped = 0

		for (const [index, line] of lines.entries()) {
			const read = readLine(editSourceRef.current, line)

			skipped += read.skipped

			stageRow(read.entries)

			const result = await submitRow(true)

			if (result === 'added') added++

			if (result === 'refused' || result === 'busy') {
				const refused = result === 'refused' ? 1 : 0

				speak({ added, refused, rest: lines.length - index - refused, skipped, held: false })

				return
			}
		}

		speak({ added, refused: 0, rest: 0, skipped, held: false })
	})

	return useMemo(() => (position === null ? undefined : paste), [position, paste])
}
