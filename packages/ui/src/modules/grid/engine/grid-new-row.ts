import type { GridEditableConfig } from '../grid-editing-types'
import type { GridNewRowPosition } from '../use-grid-navigation'
import {
	type EditableColumn,
	type GridDraft,
	type GridDraftStore,
	isBlankDraft,
	isColumnEditable,
	NEW_ROW_KEY,
} from './grid-editing-utilities'
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
export function findSlotColumn(
	attr: string | null,
	columns: readonly { id: string | number }[],
): string | number | undefined {
	if (attr === NEW_ROW_ADD_COLUMN_ID) return columns.at(-1)?.id

	return columns.find((column) => String(column.id) === attr)?.id
}

/** An add that `onRowAdd` returned as a promise, with the drafts it holds as pending. @internal */
export type NewRowFlight = { cells: [string | number, GridDraft][] }

/**
 * Stages an empty draft that carries its error for each refused cell that
 * `drafted` does not hold, such as a required field with no value. The editor
 * of such a cell has no value to check, so the draft shows the error. @internal
 */
export function stageEmptyRefusals(
	drafts: GridDraftStore,
	refused: ReadonlyMap<string | number, string>,
	drafted: ReadonlySet<string | number>,
): void {
	for (const [columnId, error] of refused) {
		if (drafted.has(columnId)) continue

		drafts.stage(NEW_ROW_KEY, columnId, undefined, null)

		const record = drafts.read(NEW_ROW_KEY, columnId)

		if (record) record.error = error
	}
}

/**
 * Stages the values of a refused add again, with the errors. A refusal can
 * name a cell with no value, such as a required field. That cell gets an
 * empty draft that carries the error (see {@link stageEmptyRefusals}). @internal
 */
export function restoreRefused(
	drafts: GridDraftStore,
	flight: NewRowFlight,
	refused: Map<string | number, string>,
): void {
	for (const [columnId, draft] of flight.cells)
		drafts.settle(NEW_ROW_KEY, columnId, draft, { error: refused.get(columnId), reopen: false })

	stageEmptyRefusals(drafts, refused, new Set(flight.cells.map(([columnId]) => columnId)))
}

/** A column as the checks of an add read it. @internal */
type CheckedColumn = EditableColumn & {
	id: string | number
	required?: boolean
	validate?: (value: unknown, row: never) => string | null
}

/**
 * The cells of the new-row slot that `validate` refuses, keyed by column id,
 * with the error of each. `validate` checks each cell with a value. It also
 * checks a cell of a `required` column with no value, so a required field
 * that is empty can block the add. `values` is the row that `validate` reads.
 * @internal
 */
export function refuseNewRow(
	drafts: ReadonlyMap<string | number, GridDraft> | undefined,
	columns: readonly CheckedColumn[],
	values: Record<string, unknown>,
): Map<string | number, string> {
	const refused = new Map<string | number, string>()

	for (const column of columns) {
		if (!column.validate || !isColumnEditable(column)) continue

		const value = drafts?.get(column.id)?.value

		if (isBlankDraft(value) && !column.required) continue

		const error = column.validate(value, values as never)

		if (error != null) refused.set(column.id, error)
	}

	return refused
}

/**
 * The first column in `columns`, in display order, that `refused` names, or
 * `null` when it names none. Focus goes to its cell after a refused add.
 * @internal
 */
export function firstRefused(
	columns: readonly { id: string | number }[],
	refused: ReadonlyMap<string | number, string>,
): string | number | null {
	return columns.find((column) => refused.has(column.id))?.id ?? null
}
