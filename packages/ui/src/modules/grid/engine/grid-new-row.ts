import type { GridEditableConfig } from '../grid-editing-types'
import type { GridNewRowPosition } from '../use-grid-navigation'
import { type GridDraft, type GridDraftStore, NEW_ROW_KEY } from './grid-editing-utilities'
import { NEW_ROW_ADD_COLUMN_ID } from './grid-new-row-column'

/**
 * Where the new-row slot shows, or `null` when the config cannot show it. The
 * slot needs a grid-owned session, whose keys add and clear it, and an
 * `onRowAdd` to take the row. `managed` is whether the grid owns the session.
 * @internal
 */
export function resolveNewRow(
	config: GridEditableConfig | undefined,
	managed: boolean,
): GridNewRowPosition {
	if (!managed || config?.newRow == null || config.onRowAdd == null) return null

	return config.newRow
}

/**
 * The data column whose cursor cell a key from a cell of the slot leaves on,
 * from the cell's `data-grid-new-col`. The Add column is not a stop of the
 * cursor. A key from its control therefore leaves on the last data column.
 *
 * @internal
 */
export function slotColumnOf(
	attr: string | null,
	columns: readonly { id: string | number }[],
): string | number | undefined {
	if (attr === NEW_ROW_ADD_COLUMN_ID) return columns.at(-1)?.id

	return columns.find((column) => String(column.id) === attr)?.id
}

/** An add that `onRowAdd` returned as a promise, with the drafts it holds as pending. @internal */
export type NewRowFlight = { cells: [string | number, GridDraft][] }

/**
 * Stages the values of a refused add again, with the errors. A refusal can
 * name a cell with no value, such as a required field. That cell gets an
 * empty draft that carries the error. @internal
 */
export function restoreRefused(
	drafts: GridDraftStore,
	flight: NewRowFlight,
	refused: Map<string | number, string>,
): void {
	for (const [columnId, draft] of flight.cells)
		drafts.settle(NEW_ROW_KEY, columnId, draft, { error: refused.get(columnId), reopen: false })

	const drafted = new Set(flight.cells.map(([columnId]) => columnId))

	for (const [columnId, error] of refused) {
		if (drafted.has(columnId)) continue

		drafts.stage(NEW_ROW_KEY, columnId, undefined, null)

		const record = drafts.read(NEW_ROW_KEY, columnId)

		if (record) record.error = error
	}
}
