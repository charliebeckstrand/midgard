import { describe, expect, it } from 'vitest'
import { markdownOf, titleOf } from '../../modules/events/engine/events-report'
import { EventStore } from '../../modules/events/engine/events-store'
import {
	kindWidthOf,
	lineOf,
	rowsOf,
	rowTextOf,
	summaryOf,
} from '../../modules/events/engine/events-text'
import type { EventEntry } from '../../modules/events/engine/types'
import { noStorage } from '../helpers/event-storage'

function entry(id: number, time: number, text: string, batch?: string): EventEntry {
	return { id, time, kind: 'input', text, y: 0, ...(batch === undefined ? {} : { batch }) }
}

/** The texts of each row. */
function texts(rows: ReturnType<typeof rowsOf>): string[][] {
	return rows.map((row) => row.map(({ text }) => text))
}

const entries = [
	entry(1, 10, 'pointerdown', 'a'),
	entry(2, 11, 'scroll starts', 'b'),
	entry(3, 12, 'route'),
	entry(4, 13, 'click', 'a'),
	entry(5, 300, 'scroll ends', 'b'),
]

describe('rowsOf', () => {
	it('gives one row for each event with "Batch" off', () => {
		expect(texts(rowsOf(entries, false))).toEqual([
			['pointerdown'],
			['scroll starts'],
			['route'],
			['click'],
			['scroll ends'],
		])
	})

	it('gives one row for each batch, at the place of its first event', () => {
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

describe('rowTextOf', () => {
	it('writes the detail of an event as JSON under its line, and the events of a batch under its summary', () => {
		const width = kindWidthOf(entries)

		const detailed = { ...entry(6, 20, 'keydown Tab'), detail: { key: 'Tab' } }

		// The JSON starts under the start of the text.
		const indent = ' '.repeat(lineOf(detailed, width).indexOf('keydown'))

		expect(rowTextOf([detailed], width)).toBe(
			`${lineOf(detailed, width)}\n${indent}{\n${indent}  "key": "Tab"\n${indent}}`,
		)

		const [tap] = rowsOf(entries, true)

		expect(tap && rowTextOf(tap, width).split('\n')).toEqual([
			expect.stringMatching(/pointerdown … click \(2 lines, 3 ms\)$/),
			`  ${lineOf(entries[0] as EventEntry, width)}`,
			`  ${lineOf(entries[3] as EventEntry, width)}`,
		])
	})
})

describe('markdownOf', () => {
	it('writes a report as a heading, a table, and fenced blocks', () => {
		const store = new EventStore(noStorage)

		const error = (message: string) =>
			Object.assign(new Error(message), { stack: `Error: ${message}\n    at rows (grid.js:1:2)` })

		store.add({ time: 7, kind: 'input', text: 'input at 7', y: 0 })

		const bug = { kind: 'error', text: 'window a | b', y: 0 }

		store.addBug({ ...bug, time: 8 }, { origin: 'window', error: error('a | b') })

		store.addBug({ ...bug, time: 9 }, { origin: 'window', error: error('a | b') })

		const filed = store.entries.find((item) => item.report)

		if (!filed?.report) throw new Error('no report')

		const report = { ...filed, report: { ...filed.report, pointer: undefined, focus: undefined } }

		expect(titleOf(report)).toBe('window a | b ×2')

		const markdown = markdownOf(report)

		expect(markdown).toMatch(
			/^## window a \| b ×2\n\n\| Field \| Value \|\n\|:---\|:---\|\n\| Id \| `[0-9a-f]{7}` \|\n\| Origin \| window \|\n/,
		)

		expect(markdown).toContain('### Stack\n\n```text\nat rows (grid.js:1:2)\n```')

		expect(markdown).toMatch(/### Trail\n\n```text\n.*input at 7\n```$/)

		expect(markdown).not.toContain('| Pointer |')

		expect(markdown).not.toContain('| Route |')

		expect(markdown).not.toContain('### Component stack')
	})
})
