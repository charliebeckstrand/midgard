import { type Entry, KINDS } from './log.ts'

// The text of the columns of a line, which the sheet and the Bug log share.

/** The shortest width of the kind column: the longest kind. */
const KIND_WIDTH = Math.max(...KINDS.map((kind) => kind.length))

/** What the kind column shows: the name of a component line, else the kind. */
function nameOf(entry: Entry): string {
	return entry.name ?? entry.kind
}

/** The width of the kind column: the longest kind, or the longest name in the log. */
export function kindWidth(entries: readonly Entry[]): number {
	return entries.reduce((width, entry) => Math.max(width, nameOf(entry).length), KIND_WIDTH)
}

/** The columns before the text of a line: the time, the scroll position, and the kind or the name. */
export function columns(entry: Entry, width: number): string {
	return `${String(entry.time).padStart(6)} y${String(entry.y).padEnd(5)} ${nameOf(entry).padEnd(width)} `
}

/** One line with no detail: the columns, then the text. Copy and the trail of a report write it. */
export function lineOf(entry: Entry, width: number): string {
	return columns(entry, width) + entry.text
}
