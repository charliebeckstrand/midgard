// @vitest-environment node
import { fc, test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'
import { rowsToCsv } from '../../modules/grid/engine/grid-export/csv'
import type { GridColumn } from '../../modules/grid/types'

// `grid-export.test.tsx` holds the documented examples of `rowsToCsv`, beside
// the export menu it drives. That file renders a Grid, so it runs under jsdom
// and cannot carry the node docblock (CONVENTIONS.md §10.5). The properties
// therefore sit here, in the `pure` project, over the same function.
//
// Each property reads the serialized document back through the reader below.
// The reader is written from RFC 4180, never from `csv.ts`, so a round trip
// states that two independent pieces of code agree on the grammar.

/** One field a document carries: its text, and whether the document quoted it. */
type Field = { text: string; quoted: boolean }

/**
 * Reads one field at `start`.
 *
 * A quoted field runs to its closing quote, and a doubled quote inside it
 * stands for one quote. An unquoted field ends at a comma, at a CRLF, or at the
 * end of the document.
 *
 * The reader is strict on purpose. A quote, a lone carriage return, or a lone
 * line feed in an unquoted field throws, because RFC 4180 obliges the writer to
 * quote each of them. A strict reader turns that break into a failure here.
 */
function readField(csv: string, start: number): Field & { next: number } {
	if (csv[start] !== '"') {
		let index = start

		while (index < csv.length) {
			const char = csv[index] as string

			if (char === ',') break

			if (char === '\r' || char === '\n' || char === '"') {
				if (csv.startsWith('\r\n', index)) break

				throw new Error(`unquoted ${JSON.stringify(char)} at ${index}`)
			}

			index += 1
		}

		return { text: csv.slice(start, index), quoted: false, next: index }
	}

	let text = ''

	let index = start + 1

	for (;;) {
		const close = csv.indexOf('"', index)

		if (close === -1) throw new Error(`unterminated quoted field at ${start}`)

		text += csv.slice(index, close)

		index = close + 1

		if (csv[index] !== '"') return { text, quoted: true, next: index }

		text += '"'

		index += 1
	}
}

/** Reads a whole RFC 4180 document into its records, each a list of {@link Field}. */
function parseCsv(csv: string): Field[][] {
	const records: Field[][] = []

	let fields: Field[] = []

	let index = 0

	for (;;) {
		const field = readField(csv, index)

		fields.push({ text: field.text, quoted: field.quoted })

		index = field.next

		if (index >= csv.length) {
			records.push(fields)

			return records
		}

		if (csv[index] === ',') {
			index += 1

			continue
		}

		if (csv.startsWith('\r\n', index)) {
			records.push(fields)

			fields = []

			index += 2

			continue
		}

		throw new Error(`unexpected ${JSON.stringify(csv[index])} at ${index}`)
	}
}

/** A row of the generated sheet: one cell per column, in column order. */
type Row = { cells: string[] }

/** Columns that read the generated cells positionally, one per label. */
function columnsFor(labels: string[]): GridColumn<Row>[] {
	return labels.map((label, index) => ({
		id: `c${index}`,
		title: label,
		cell: (row: Row) => row.cells[index] ?? '',
		value: (row: Row) => row.cells[index] ?? '',
	}))
}

// The characters the grammar and the formula guard turn on, so a short
// generated string hits them often. `fc.string()` alone reaches a comma or a
// quote too rarely to sample the branches.
const LOADED = '=@+-,"\'\r\n\t ()$%0123456789abAB.eE'

const cell = () =>
	fc.oneof(fc.string(), fc.string({ unit: fc.constantFrom(...LOADED), maxLength: 6 }))

/** Labels and rows of one width, so every record holds the same field count. */
const sheet = () =>
	fc.integer({ min: 1, max: 4 }).chain((width) =>
		fc.record({
			labels: fc.array(cell(), { minLength: width, maxLength: width }),
			rows: fc.array(fc.array(cell(), { minLength: width, maxLength: width }), { maxLength: 5 }),
		}),
	)

/** The document `rowsToCsv` writes for one generated sheet. */
function write(labels: string[], rows: string[][]): string {
	return rowsToCsv(
		columnsFor(labels),
		rows.map((cells) => ({ cells })),
	)
}

/** The text a document is expected to carry, header first, in reading order. */
function sourceGrid(labels: string[], rows: string[][]): string[][] {
	return [labels, ...rows]
}

/** Characters RFC 4180 obliges a writer to quote. */
const MUST_QUOTE = /[",\r\n]/

describe('rowsToCsv · properties', () => {
	test.prop([sheet()])(
		'writes one record per row, under a header of labels',
		({ labels, rows }) => {
			const records = parseCsv(write(labels, rows))

			expect(records).toHaveLength(rows.length + 1)

			for (const record of records) expect(record).toHaveLength(labels.length)
		},
	)

	// The formula guard prefixes one apostrophe and changes nothing else, so a
	// field reads back as its source or as its source behind that apostrophe.
	// Neither the quoting nor the guard drops, reorders, or doubles a character.
	test.prop([sheet()])('gives every field back, up to the formula guard', ({ labels, rows }) => {
		const records = parseCsv(write(labels, rows))

		sourceGrid(labels, rows).forEach((source, record) => {
			source.forEach((text, field) => {
				const read = (records[record] as Field[])[field] as Field

				expect([text, `'${text}`]).toContain(read.text)
			})
		})
	})

	test.prop([sheet()])('quotes a field exactly when the grammar obliges it', ({ labels, rows }) => {
		for (const record of parseCsv(write(labels, rows))) {
			for (const field of record) expect(field.quoted).toBe(MUST_QUOTE.test(field.text))
		}
	})

	// A spreadsheet evaluates a field that opens with one of these, so no field
	// reaches the file opening with one.
	test.prop([sheet()])('leaves no field a spreadsheet reads as a formula', ({ labels, rows }) => {
		for (const record of parseCsv(write(labels, rows))) {
			for (const field of record) {
				expect(['=', '@', '\t', '\r']).not.toContain(field.text[0])
			}
		}
	})

	// A sign opens a formula unless the whole field is a number, so the guard
	// prefixes every other sign-led field. Each sign-led field that reaches the
	// file is therefore a number. `Number` is the independent reading of "this is
	// a number". The next property covers the other direction: a number that the
	// guard lets through.
	test.prop([sheet()])('guards each sign-led field that is not a number', ({ labels, rows }) => {
		for (const record of parseCsv(write(labels, rows))) {
			for (const field of record) {
				if (field.text[0] === '+' || field.text[0] === '-') {
					expect(Number.isNaN(Number(field.text))).toBe(false)
				}
			}
		}
	})

	// The guard stands aside for a number, so a numeric column still parses. The
	// generator is a number, so the claim rests on no reading of the shape.
	test.prop([fc.double({ min: -1e12, max: 1e12, noNaN: true })])(
		'writes a number as it arrived',
		(value) => {
			const text = String(value)

			expect(rowsToCsv(columnsFor(['n']), [{ cells: [text] }])).toBe(`n\r\n${text}`)
		},
	)

	// A value that needs neither quoting nor the guard is written as it arrived.
	const plain = () =>
		fc.string({ unit: fc.constantFrom(...'abcXYZ019 .'), minLength: 1, maxLength: 6 })

	test.prop([
		fc.integer({ min: 1, max: 4 }).chain((width) =>
			fc.record({
				labels: fc.array(plain(), { minLength: width, maxLength: width }),
				rows: fc.array(fc.array(plain(), { minLength: width, maxLength: width }), {
					minLength: 1,
					maxLength: 4,
				}),
			}),
		),
	])('passes a plain field through untouched', ({ labels, rows }) => {
		const csv = write(labels, rows)

		expect(csv.split('\r\n')).toEqual(sourceGrid(labels, rows).map((row) => row.join(',')))
	})
})
