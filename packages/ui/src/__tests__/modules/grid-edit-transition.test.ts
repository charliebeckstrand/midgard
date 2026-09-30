// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	crossRowEntry,
	initialSessionRow,
	moveSessionRow,
	planTransition,
	readControlledCell,
	readInitialCell,
	readSettled,
	type SettledCell,
	settledAt,
	settleOn,
	writeRowsPlan,
} from '../../modules/grid/engine/grid-edit-transition'
import type { GridEditSource } from '../../modules/grid/grid-data-types'
import type { GridEditableConfig } from '../../modules/grid/grid-editing-types'

type Row = { id: number; name: string; note: string }

const source: GridEditSource<Row> = {
	rows: [
		{ id: 1, name: 'Alice', note: '' },
		{ id: 2, name: 'Bob', note: '' },
		{ id: 3, name: 'Cleo', note: '' },
	],
	getKey: (row) => row.id,
	columns: [
		{ id: 'name', field: 'name' },
		{ id: 'note', field: 'note', readOnly: true },
	],
}

const at = (rowKey: number, columnId = 'name') => ({ rowKey, columnId })

/** A config with a sink, and the fields of `extra`. */
const config = (extra: Partial<GridEditableConfig>): GridEditableConfig => ({
	onCommit: () => {},
	...extra,
})

/** Applies each rows write of `writeRowsPlan` to `start`, in order. */
function rowsAfter(start: Set<string | number>, plan: ReturnType<typeof planTransition>) {
	const writes: Set<string | number>[] = []

	let rows = start

	writeRowsPlan(
		plan,
		(update) => {
			rows = update(rows)

			writes.push(rows)
		},
		new Set(),
	)

	return writes
}

describe('moveSessionRow', () => {
	it('keeps the held row, and marks a new row as acquired only when it was not open', () => {
		const held = { rowKey: 1, acquired: true }

		expect(moveSessionRow(held, 1, new Set([1]))).toEqual({ leaving: null, row: held })

		expect(moveSessionRow(held, 2, new Set([1]))).toEqual({
			leaving: 1,
			row: { rowKey: 2, acquired: true },
		})

		expect(moveSessionRow({ rowKey: 1, acquired: false }, 2, new Set([1, 2]))).toEqual({
			leaving: null,
			row: { rowKey: 2, acquired: false },
		})
	})
})

describe('initialSessionRow', () => {
	it('acquires the row only when the grid seeds it into an uncontrolled set', () => {
		expect(initialSessionRow(null, undefined)).toBeNull()

		expect(initialSessionRow(at(1), config({}))).toEqual({ rowKey: 1, acquired: true })

		expect(initialSessionRow(at(1), config({ defaultRows: new Set([1]) }))).toEqual({
			rowKey: 1,
			acquired: false,
		})

		expect(initialSessionRow(at(1), config({ rows: new Set() }))).toEqual({
			rowKey: 1,
			acquired: false,
		})
	})
})

describe('readInitialCell', () => {
	it('reads the controlled value before the default, and flags a cell that is not editable', () => {
		expect(readInitialCell(config({ cell: at(2), defaultCell: at(1) }), true, source)).toEqual({
			cell: at(2),
			uneditable: false,
		})

		expect(readInitialCell(config({ defaultCell: at(1, 'note') }), true, source)).toEqual({
			cell: null,
			uneditable: true,
		})

		expect(readInitialCell(config({ defaultCell: at(1) }), false, source)).toEqual({
			cell: null,
			uneditable: false,
		})
	})
})

describe('readSettled and settledAt', () => {
	const settled: SettledCell = {
		raw: at(2),
		cell: at(1),
		wait: { cell: at(2), sessionRow: { rowKey: 2, acquired: true } },
	}

	it('reads the waited cell once its row is open, else the held cell', () => {
		expect(readSettled(settled, new Set([1]))).toEqual(at(1))

		expect(readSettled(settled, new Set([1, 2]))).toEqual(at(2))
	})

	it('holds a cell only with no wait', () => {
		expect(settledAt(settled, at(2))).toBe(false)

		expect(settledAt({ raw: at(1), cell: at(1) }, at(1))).toBe(true)
	})
})

describe('readControlledCell', () => {
	const settled: SettledCell = { raw: at(1), cell: at(1) }

	it('reads a new value at once when its row is open and its cell is editable', () => {
		expect(readControlledCell(at(2), settled, new Set([1, 2]), source)).toEqual(at(2))
	})

	it('keeps the settled cell for a closed row or a cell that is not editable', () => {
		expect(readControlledCell(at(2), settled, new Set([1]), source)).toEqual(at(1))

		expect(readControlledCell(at(2, 'note'), settled, new Set([1, 2]), source)).toEqual(at(1))
	})
})

describe('crossRowEntry', () => {
	it('records an entry into a closed row from a held cell only', () => {
		const held = { rowKey: 1, acquired: true }

		expect(crossRowEntry(at(2), at(1), new Set([1]), held)).toEqual({
			to: at(2),
			from: at(1),
			sessionRow: held,
		})

		expect(crossRowEntry(at(2), at(1), new Set([1, 2]), held)).toBeNull()

		expect(crossRowEntry(at(2), null, new Set([1]), held)).toBeNull()
	})
})

describe('planTransition', () => {
	const base = {
		from: { raw: at(1), cell: at(1) } as SettledCell,
		request: null,
		rows: new Set<string | number>([1]),
		sessionRow: { rowKey: 1, acquired: true },
		source,
	}

	it('moves an acquired session row onto a closed row, and opens that row', () => {
		const plan = planTransition({ ...base, raw: at(2) })

		expect(plan).toMatchObject({
			next: at(2),
			asked: false,
			leaving: 1,
			sessionRow: { rowKey: 2, acquired: true },
			opens: true,
			writesRows: true,
		})

		expect(rowsAfter(new Set([1]), plan)).toEqual([new Set([2])])
	})

	it('closes the held row on null, as a save does', () => {
		const plan = planTransition({ ...base, raw: null })

		expect(plan).toMatchObject({ next: null, endRows: new Set([1]), sessionRow: null })

		expect(rowsAfter(new Set([1]), plan)).toEqual([new Set()])
	})

	it('reads a cell that is not editable as null', () => {
		expect(planTransition({ ...base, raw: at(2, 'note') }).next).toBeNull()
	})

	it('takes the exit rows and the discard of a request that the grid asked for', () => {
		const request = { to: at(3), endRows: new Set([1]), discard: at(1), blur: true }

		const plan = planTransition({ ...base, raw: at(3), request })

		expect(plan).toMatchObject({ asked: true, discard: at(1), opens: true })

		// An exit with an entry into a closed row writes the exit first, then the entry.
		expect(rowsAfter(new Set([1]), plan)).toEqual([new Set(), new Set([3])])
	})

	it('writes no rows for a move inside the held row', () => {
		const plan = planTransition({ ...base, raw: at(1) })

		expect(plan.writesRows).toBe(false)

		expect(rowsAfter(new Set([1]), plan)).toEqual([])
	})
})

describe('settleOn', () => {
	it('settles at once on a value whose row is open', () => {
		const plan = planTransition({
			from: { raw: at(1), cell: at(1) },
			raw: at(2),
			request: null,
			rows: new Set([1, 2]),
			sessionRow: null,
			source,
		})

		expect(settleOn(plan, at(2), at(1))).toEqual({ raw: at(2), cell: at(2) })
	})

	it('keeps the held cell and waits for a row that is not open', () => {
		const plan = planTransition({
			from: { raw: at(1), cell: at(1) },
			raw: at(2),
			request: null,
			rows: new Set([1]),
			sessionRow: { rowKey: 1, acquired: false },
			source,
		})

		expect(settleOn(plan, at(2), at(1))).toEqual({
			raw: at(2),
			cell: at(1),
			wait: { cell: at(2), sessionRow: { rowKey: 2, acquired: true } },
		})
	})
})

describe('writeRowsPlan', () => {
	it('records each row that the plan closes as closed by the grid', () => {
		const plan = planTransition({
			from: { raw: at(1), cell: at(1) },
			raw: at(2),
			request: null,
			rows: new Set([1]),
			sessionRow: { rowKey: 1, acquired: true },
			source,
		})

		const gridClosed = new Set<string | number>()

		writeRowsPlan(plan, () => {}, gridClosed)

		expect(gridClosed).toEqual(new Set([1]))
	})
})
