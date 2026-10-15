import type { EventEntry } from './types'

// The text of the events: the columns of a line, the rows of the list, and
// the text that Copy writes.

/** The shortest width of the kind column: the longest kind that the module writes. */
const KIND_WIDTH = 'viewport'.length

/** One row of the list: one event, or the events of one batch, oldest first. */
export type EventRow = readonly [EventEntry, ...EventEntry[]]

/** What the kind column shows: the name of the event, else its kind. */
function nameOf(entry: EventEntry): string {
	return entry.name ?? entry.kind
}

/** The width of the kind column: the longest kind, or the longest name in the list. */
export function kindWidth(entries: readonly EventEntry[]): number {
	return entries.reduce((width, entry) => Math.max(width, nameOf(entry).length), KIND_WIDTH)
}

/** The columns before the text of a line: the time, the scroll position, and the kind or the name. */
export function columns(entry: EventEntry, width: number): string {
	return `${String(entry.time).padStart(6)} y${String(entry.y).padEnd(5)} ${nameOf(entry).padEnd(width)} `
}

/** One line with no detail: the columns, then the text. Copy and the trail of a report write it. */
export function lineOf(entry: EventEntry, width: number): string {
	return columns(entry, width) + entry.text
}

/**
 * The rows of a list of events, oldest first. With `batched`, the events of
 * one batch are one row, at the place of the first event of the batch. The
 * events of other batches and the events with no batch keep their places.
 */
export function rowsOf(entries: readonly EventEntry[], batched: boolean): EventRow[] {
	if (!batched) return entries.map((entry) => [entry])

	const rows: [EventEntry, ...EventEntry[]][] = []

	const batches = new Map<string, [EventEntry, ...EventEntry[]]>()

	for (const entry of entries) {
		const row = entry.batch === undefined ? undefined : batches.get(entry.batch)

		if (row) {
			row.push(entry)

			continue
		}

		const next: [EventEntry, ...EventEntry[]] = [entry]

		if (entry.batch !== undefined) batches.set(entry.batch, next)

		rows.push(next)
	}

	return rows
}

/**
 * The text of a row of a batch: the texts of the first and the last event,
 * the count of the events, and the time from the first to the last, such as
 * `pointerdown button … click button (8 lines, 3 ms)`.
 */
export function summaryOf(row: EventRow): string {
	const first = row[0]

	const last = row.at(-1) ?? first

	return `${first.text} … ${last.text} (${row.length} lines, ${last.time - first.time} ms)`
}

/**
 * One event as text: the columns, then the text. A detail follows as indented
 * JSON, each line under the start of the text.
 */
function lineWithDetail(entry: EventEntry, width: number): string {
	const text = lineOf(entry, width)

	if (entry.detail === undefined) return text

	const indent = ' '.repeat(columns(entry, width).length)

	const detail = JSON.stringify(entry.detail, null, 2).replaceAll('\n', `\n${indent}`)

	return `${text}\n${indent}${detail}`
}

/**
 * One row as text. A row of a batch is the columns of its first event and the
 * summary, then each event, indented by two spaces.
 */
export function rowText(row: EventRow, width: number): string {
	if (row.length === 1) return lineWithDetail(row[0], width)

	const entries = row.map((entry) => `  ${lineWithDetail(entry, width).replaceAll('\n', '\n  ')}`)

	return [columns(row[0], width) + summaryOf(row), ...entries].join('\n')
}
