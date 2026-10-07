import { describe, expect, it } from 'vitest'
import type { Entry } from '../debug/event-log/log.ts'
import { rowsOf, summaryOf } from '../debug/event-log/rows.ts'

function entry(time: number, text: string, batch?: string): Entry {
	return { time, kind: 'input', text, y: 0, ...(batch === undefined ? {} : { batch }) }
}

/** The texts of each row. */
function texts(rows: ReturnType<typeof rowsOf>): string[][] {
	return rows.map((row) => row.map(({ text }) => text))
}

const entries = [
	entry(10, 'pointerdown', 'a'),
	entry(11, 'scroll starts', 'b'),
	entry(12, 'route'),
	entry(13, 'click', 'a'),
	entry(300, 'scroll ends', 'b'),
]

describe('rowsOf', () => {
	it('gives one row for each entry with "Batch" off', () => {
		expect(texts(rowsOf(entries, false))).toEqual([
			['pointerdown'],
			['scroll starts'],
			['route'],
			['click'],
			['scroll ends'],
		])
	})

	it('gives one row for each batch, at the place of its first entry', () => {
		expect(texts(rowsOf(entries, true))).toEqual([
			['pointerdown', 'click'],
			['scroll starts', 'scroll ends'],
			['route'],
		])
	})
})

describe('summaryOf', () => {
	it('gives the first and the last text, the count, and the time between them', () => {
		const [tap] = rowsOf(entries, true)

		expect(tap && summaryOf(tap)).toBe('pointerdown … click (2 lines, 3 ms)')
	})
})
