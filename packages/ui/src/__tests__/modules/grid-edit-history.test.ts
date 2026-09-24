// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	EMPTY_HISTORY,
	type GridHistoryCell,
	type GridHistoryRead,
	historyStep,
	historyValue,
	recordHistory,
	takeHistory,
} from '../../modules/grid/engine/grid-edit-history'

const name: GridHistoryCell = { rowKey: 1, columnId: 'name', before: 'Alice', after: 'Alicia' }

const count: GridHistoryCell = { rowKey: 1, columnId: 'count', before: 2, after: 9 }

/** A grid whose cells hold `values`, keyed by column id, with no draft. */
function readFrom(values: Record<string, unknown>, drafted = new Set<string>()): GridHistoryRead {
	return {
		current: (cell) =>
			String(cell.columnId) in values ? { value: values[String(cell.columnId)] } : null,
		drafted: (cell) => drafted.has(String(cell.columnId)),
	}
}

describe('recordHistory', () => {
	it('adds an entry to the undo stack and clears the redo stack', () => {
		const history = recordHistory({ undo: [], redo: [[count]] }, [name])

		expect(history).toEqual({ undo: [[name]], redo: [] })
	})

	it('ignores an empty entry', () => {
		const history = { undo: [[name]], redo: [[count]] }

		expect(recordHistory(history, [])).toBe(history)
	})

	it('drops the oldest entry past the limit', () => {
		let history = EMPTY_HISTORY

		for (let index = 0; index < 4; index++)
			history = recordHistory(history, [{ ...name, after: index }], 3)

		expect(history.undo.map((entry) => entry[0]?.after)).toEqual([1, 2, 3])
	})
})

describe('takeHistory', () => {
	it('undoes the newest entry and moves it to the redo stack', () => {
		const result = takeHistory(
			recordHistory(EMPTY_HISTORY, [name, count]),
			'undo',
			readFrom({ name: 'Alicia', count: 9 }),
		)

		expect(result.status).toBe('applied')

		expect(result.status === 'applied' && result.cells).toEqual([name, count])

		expect(result.history).toEqual({ undo: [], redo: [[name, count]] })
	})

	it('redoes the newest undone entry and moves it back', () => {
		const result = takeHistory({ undo: [], redo: [[name]] }, 'redo', readFrom({ name: 'Alice' }))

		expect(result.status === 'applied' && result.cells).toEqual([name])

		expect(result.history).toEqual({ undo: [[name]], redo: [] })
	})

	it('skips a cell that changed since the save, and keeps the rest', () => {
		const result = takeHistory(
			recordHistory(EMPTY_HISTORY, [name, count]),
			'undo',
			readFrom({ name: 'Alina', count: 9 }),
		)

		expect(result.status === 'applied' && result.cells).toEqual([count])

		// The redo holds only what the undo wrote.
		expect(result.history.redo).toEqual([[count]])
	})

	it('drops an entry that no cell holds any more', () => {
		// The count column is gone, and the name changed since.
		const result = takeHistory(
			recordHistory(EMPTY_HISTORY, [name, count]),
			'undo',
			readFrom({ name: 'Alina' }),
		)

		expect(result).toEqual({ status: 'stale', history: EMPTY_HISTORY })
	})

	it('keeps an entry with a drafted cell, and writes nothing', () => {
		const history = recordHistory(EMPTY_HISTORY, [name, count])

		const result = takeHistory(
			history,
			'undo',
			readFrom({ name: 'Alicia', count: 9 }, new Set(['count'])),
		)

		expect(result).toEqual({ status: 'blocked', history })
	})

	it('reports an empty stack', () => {
		expect(takeHistory(EMPTY_HISTORY, 'redo', readFrom({}))).toEqual({
			status: 'empty',
			history: EMPTY_HISTORY,
		})
	})
})

describe('historyValue', () => {
	it('writes the old value on undo and the new value on redo', () => {
		expect(historyValue(name, 'undo')).toBe('Alice')

		expect(historyValue(name, 'redo')).toBe('Alicia')
	})
})

describe('historyStep', () => {
	const press = (key: string, extra: Partial<Parameters<typeof historyStep>[0]> = {}) => ({
		key,
		ctrlKey: false,
		metaKey: false,
		altKey: false,
		shiftKey: false,
		composing: false,
		...extra,
	})

	it('reads Ctrl or Cmd with Z as an undo', () => {
		expect(historyStep(press('z', { ctrlKey: true }))).toBe('undo')

		expect(historyStep(press('z', { metaKey: true }))).toBe('undo')
	})

	it('reads Shift with Z, and Y, as a redo', () => {
		expect(historyStep(press('Z', { ctrlKey: true, shiftKey: true }))).toBe('redo')

		expect(historyStep(press('z', { metaKey: true, shiftKey: true }))).toBe('redo')

		expect(historyStep(press('y', { ctrlKey: true }))).toBe('redo')
	})

	it('ignores a press with no Ctrl or Cmd, with Alt, or in composition', () => {
		expect(historyStep(press('z'))).toBeNull()

		expect(historyStep(press('z', { ctrlKey: true, altKey: true }))).toBeNull()

		expect(historyStep(press('z', { ctrlKey: true, composing: true }))).toBeNull()

		expect(historyStep(press('x', { ctrlKey: true }))).toBeNull()
	})
})
