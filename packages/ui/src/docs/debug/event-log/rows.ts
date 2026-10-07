import type { Entry } from './log.ts'

// The rows of the sheet of the Event log. With "Batch" on, the entries of one
// batch are one row.

/** One row of the sheet: one entry, or the entries of one batch, oldest first. */
export type Row = readonly [Entry, ...Entry[]]

/**
 * The rows of a list of entries, oldest first. With `batched`, the entries of
 * one batch are one row, at the place of the first entry of the batch. The
 * entries of other batches and the entries with no batch keep their places.
 */
export function rowsOf(entries: readonly Entry[], batched: boolean): Row[] {
	if (!batched) return entries.map((entry) => [entry])

	const rows: [Entry, ...Entry[]][] = []

	const batches = new Map<string, [Entry, ...Entry[]]>()

	for (const entry of entries) {
		const row = entry.batch === undefined ? undefined : batches.get(entry.batch)

		if (row) {
			row.push(entry)

			continue
		}

		const next: [Entry, ...Entry[]] = [entry]

		if (entry.batch !== undefined) batches.set(entry.batch, next)

		rows.push(next)
	}

	return rows
}

/**
 * The text of a row of a batch: the texts of the first and the last entry,
 * the count of the entries, and the time from the first to the last, such as
 * `pointerdown button … click button (8 lines, 3 ms)`.
 */
export function summaryOf(row: Row): string {
	const first = row[0]

	const last = row.at(-1) ?? first

	return `${first.text} … ${last.text} (${row.length} lines, ${last.time - first.time} ms)`
}
