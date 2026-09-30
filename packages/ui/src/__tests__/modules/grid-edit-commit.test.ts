// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import {
	dropStrandedHolds,
	flushClosedCells,
	historyOutcome,
	pasteChange,
	readHistoryCell,
	rowLookup,
	sendCells,
	settleDrafts,
} from '../../modules/grid/engine/grid-edit-commit'
import { createDraftStore } from '../../modules/grid/engine/grid-editing-utilities'
import type { GridEditSource } from '../../modules/grid/grid-data-types'

type Row = { id: number; name: string; count: number; locked: string }

const alice: Row = { id: 1, name: 'Alice', count: 2, locked: 'a' }

const bob: Row = { id: 2, name: 'Bob', count: 5, locked: 'b' }

/** A source with a text, a number, and a read-only column. `count` refuses a negative value. */
function sourceOf(rows: Row[]): GridEditSource<Row> {
	return {
		rows,
		getKey: (row) => row.id,
		rowLabel: (row) => row.name,
		columns: [
			{ id: 'name', title: 'Name', field: 'name' },
			{
				id: 'count',
				title: 'Count',
				field: 'count',
				validate: (value) => ((value as number) < 0 ? 'Too low' : null),
			},
			{ id: 'locked', title: 'Locked', field: 'locked', readOnly: true },
		],
	}
}

/** A draft store that accepts each write, with `cells` staged against their rows. */
function stagedStore(cells: [Row, string, unknown][]) {
	const store = createDraftStore(() => true)

	for (const [row, columnId, value] of cells) store.stage(row.id, columnId, value, row)

	return store
}

describe('flushClosedCells', () => {
	const source = sourceOf([alice, bob])

	it('sends one batch for each closed row, and keeps the drafts of an open row', () => {
		const drafts = stagedStore([
			[alice, 'name', 'Alicia'],
			[bob, 'name', 'Robert'],
		])

		const onCommit = vi.fn()

		const result = flushClosedCells({
			drafts,
			editableRows: new Set([2]),
			activeEdit: null,
			source,
			rowOf: rowLookup(source),
			onCommit,
			onReject: undefined,
		})

		expect(onCommit.mock.calls).toEqual([[[{ rowKey: 1, columnId: 'name', value: 'Alicia' }]]])

		expect(result.saved).toEqual({
			columns: ['Name'],
			row: 'Alice',
			history: [{ rowKey: 1, columnId: 'name', before: 'Alice', after: 'Alicia' }],
		})

		expect(result.inFlight).toEqual([])

		expect(drafts.read(2, 'name')?.value).toBe('Robert')
	})

	it('drops an unchanged cell and a locked cell, and reports a refused cell', () => {
		const drafts = stagedStore([
			[alice, 'name', 'Alice'],
			[alice, 'locked', 'z'],
			[alice, 'count', -1],
		])

		const onCommit = vi.fn()

		const onReject = vi.fn()

		const result = flushClosedCells({
			drafts,
			editableRows: new Set(),
			activeEdit: null,
			source,
			rowOf: rowLookup(source),
			onCommit,
			onReject,
		})

		expect(onReject).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'count', value: -1 }])

		expect(onCommit).not.toHaveBeenCalled()

		expect(result.saved.columns).toEqual([])
	})

	it('holds a batch whose sink returns a promise as in flight', () => {
		const drafts = stagedStore([[alice, 'count', 7]])

		const pending = new Promise<void>(() => {})

		const result = flushClosedCells({
			drafts,
			editableRows: new Set(),
			activeEdit: null,
			source,
			rowOf: rowLookup(source),
			onCommit: () => pending,
			onReject: undefined,
		})

		expect(result.saved.columns).toEqual([])

		expect(result.inFlight).toHaveLength(1)

		const [batch] = result.inFlight

		expect(batch?.rowKey).toBe(1)

		expect(batch?.row).toBe('Alice')

		expect(batch?.result).toBe(pending)

		expect([...(batch?.labels ?? [])]).toEqual([['count', 'Count']])

		expect(batch?.history).toEqual([{ rowKey: 1, columnId: 'count', before: 2, after: 7 }])
	})

	it('commits a row that left the source against the snapshot of its draft', () => {
		const drafts = stagedStore([[bob, 'name', 'Robert']])

		const onCommit = vi.fn()

		const gone = sourceOf([alice])

		const result = flushClosedCells({
			drafts,
			editableRows: new Set(),
			activeEdit: null,
			source: gone,
			rowOf: rowLookup(gone),
			onCommit,
			onReject: undefined,
		})

		expect(onCommit).toHaveBeenCalledWith([{ rowKey: 2, columnId: 'name', value: 'Robert' }])

		expect(result.saved.row).toBe('Bob')
	})
})

describe('sendCells', () => {
	const source = sourceOf([alice, bob])

	it('checks each row, reports the refused cells, and names no row when two rows save', () => {
		const onCommit = vi.fn()

		const result = sendCells({
			changes: [
				{ rowKey: 1, columnId: 'name', value: 'Alicia' },
				{ rowKey: 2, columnId: 'count', value: -3 },
				{ rowKey: 2, columnId: 'name', value: 'Robert' },
			],
			outcome: 'pasted',
			source,
			rowOf: rowLookup(source),
			onCommit,
			check: true,
			history: [],
		})

		expect(onCommit).toHaveBeenCalledTimes(2)

		expect(result.refused).toEqual([{ rowKey: 2, columnId: 'count', value: -3 }])

		expect(result.saved.columns).toEqual(['Name', 'Name'])

		expect(result.saved.row).toBeUndefined()
	})

	it('sends a history step unchecked, and keeps the step cells of each pending row', () => {
		const step = { rowKey: 1, columnId: 'count', before: 2, after: -9 }

		const result = sendCells({
			changes: [{ rowKey: 1, columnId: 'count', value: -9 }],
			outcome: 'undone',
			source,
			rowOf: rowLookup(source),
			onCommit: () => Promise.resolve(),
			check: false,
			history: [step],
		})

		expect(result.refused).toEqual([])

		expect(result.inFlight[0]?.outcome).toBe('undone')

		expect(result.inFlight[0]?.history).toEqual([step])
	})

	it('sends nothing with no sink', () => {
		const result = sendCells({
			changes: [{ rowKey: 1, columnId: 'name', value: 'Alicia' }],
			outcome: 'filled',
			source,
			rowOf: rowLookup(source),
			onCommit: undefined,
			check: true,
			history: [],
		})

		expect(result.saved).toEqual({ columns: [], row: undefined, history: [] })
	})
})

describe('pasteChange', () => {
	const source = sourceOf([alice])

	const rowOf = rowLookup(source)

	it('removes the guard apostrophe and coerces the text to the type of the cell', () => {
		expect(pasteChange(source, rowOf, { rowKey: 1, columnId: 'name', text: "'=A1" })).toEqual({
			change: { rowKey: 1, columnId: 'name', value: '=A1' },
			fits: true,
		})

		expect(pasteChange(source, rowOf, { rowKey: 1, columnId: 'count', text: '12' })).toEqual({
			change: { rowKey: 1, columnId: 'count', value: 12 },
			fits: true,
		})
	})

	it('keeps the text of a value that does not fit, and skips a locked cell or a gone row', () => {
		expect(pasteChange(source, rowOf, { rowKey: 1, columnId: 'count', text: 'many' })).toEqual({
			change: { rowKey: 1, columnId: 'count', value: 'many' },
			fits: false,
		})

		expect(pasteChange(source, rowOf, { rowKey: 1, columnId: 'locked', text: 'x' })).toBeNull()

		expect(pasteChange(source, rowOf, { rowKey: 9, columnId: 'name', text: 'x' })).toBeNull()
	})
})

describe('rowLookup', () => {
	it('finds a row on each call, and the first row of a shared key', () => {
		const twin: Row = { ...alice, name: 'Twin' }

		const rowOf = rowLookup(sourceOf([alice, bob, twin]))

		expect(rowOf(1)).toBe(alice)

		expect(rowOf(2)).toBe(bob)

		expect(rowOf(1)).toBe(alice)

		expect(rowOf(9)).toBeUndefined()
	})
})

describe('readHistoryCell', () => {
	const source = sourceOf([alice])

	it('reads the live value, and gives null for a locked column or a gone row', () => {
		const rowOf = rowLookup(source)

		const cell = { rowKey: 1, columnId: 'count', before: 1, after: 2 }

		expect(readHistoryCell(source, rowOf, cell)).toEqual({ value: 2 })

		expect(readHistoryCell(source, rowOf, { ...cell, columnId: 'locked' })).toBeNull()

		expect(readHistoryCell(source, rowOf, { ...cell, rowKey: 9 })).toBeNull()
	})
})

describe('settleDrafts', () => {
	it('accepts and refuses the drafts of a batch, and names each for the announcement', () => {
		const source = sourceOf([alice])

		const drafts = stagedStore([
			[alice, 'name', 'Alicia'],
			[alice, 'count', 4],
		])

		const { inFlight } = flushClosedCells({
			drafts,
			editableRows: new Set(),
			activeEdit: null,
			source,
			rowOf: rowLookup(source),
			onCommit: () => Promise.resolve(),
			onReject: undefined,
		})

		const batch = inFlight[0]

		if (!batch) throw new Error('expected a batch in flight')

		for (const [columnId, draft] of batch.drafts) drafts.pend(1, columnId, draft)

		const result = settleDrafts({
			batch,
			refused: new Map([['count', 'Taken']]),
			drafts,
			reopen: () => true,
		})

		expect(result).toEqual({ saved: ['Name'], failed: ['Count'], accepted: new Set(['name']) })

		expect(drafts.read(1, 'name')).toBeUndefined()

		expect(drafts.read(1, 'count')).toMatchObject({
			status: 'staged',
			error: 'Taken',
			reopened: true,
		})
	})
})

describe('dropStrandedHolds', () => {
	/** A store with a reopened draft on each row of `rows`. */
	function heldStore(rows: Row[]) {
		const drafts = stagedStore(rows.map((row) => [row, 'name', 'x']))

		for (const row of rows) {
			const draft = drafts.read(row.id, 'name')

			if (!draft) throw new Error('expected a draft')

			drafts.pend(row.id, 'name', draft)

			drafts.settle(row.id, 'name', draft, { error: 'No', reopen: true })
		}

		return drafts
	}

	it('drops a held draft of a row that the consumer closed or deleted', () => {
		const drafts = heldStore([alice, bob])

		const dropped = dropStrandedHolds({
			drafts,
			before: new Set([1]),
			after: new Set(),
			gridClosed: new Set(),
			rowOf: rowLookup(sourceOf([alice])),
		})

		expect(dropped).toBe(2)
	})

	it('keeps a held draft of a row that the grid closed, and forgets that close', () => {
		const drafts = heldStore([alice])

		const gridClosed = new Set<string | number>([1])

		const dropped = dropStrandedHolds({
			drafts,
			before: new Set([1]),
			after: new Set(),
			gridClosed,
			rowOf: rowLookup(sourceOf([alice])),
		})

		expect(dropped).toBe(0)

		expect(gridClosed.size).toBe(0)
	})
})

describe('historyOutcome', () => {
	it('names the outcome of each step', () => {
		expect(historyOutcome('undo')).toBe('undone')

		expect(historyOutcome('redo')).toBe('redone')
	})
})
