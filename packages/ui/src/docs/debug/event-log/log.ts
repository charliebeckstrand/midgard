import type { JsonValue } from 'ui/json-tree'
import { Journal, read, type Store, write } from '../journal.ts'

// The store of the Event log: a journal of entries in time order.

/** The kinds of an {@link Entry}. */
export const KINDS = [
	'load',
	'paint',
	'route',
	'input',
	'scroll',
	'viewport',
	'call',
	'component',
	'module',
	'overlay',
	'network',
	'error',
	'hmr',
] as const

/** The kind of an {@link Entry}. */
export type Kind = (typeof KINDS)[number]

/** One line of the log. */
export type Entry = {
	/** Milliseconds from the start of the navigation of its page load (`performance.now()`). */
	time: number
	kind: Kind
	text: string
	/** The scroll position of the page. */
	y: number
	/** The name that the kind column shows in place of the kind: the component of a `component` or `module` entry. */
	name?: string
	/**
	 * The data of the entry that the line does not hold in full, such as the
	 * arguments of a callback, a stack, or the fields of a reading. The sheet
	 * shows it under the line, and Copy writes it as JSON.
	 */
	detail?: JsonValue
	/**
	 * The batch of the entry: the id of the one browser operation that the
	 * entry is a part of, such as a tap from `pointerdown` to `click`. The
	 * entries of a batch have one kind. With "Batch" on, the sheet shows them
	 * as one line that opens.
	 */
	batch?: string
}

export { type Store, sessionStore } from '../journal.ts'

/** The most entries that the log keeps. The oldest goes first. */
export const CAPACITY = 500

/** The `sessionStorage` key of the "Batch" flag. */
const BATCH = 'docs:event-log:batch'

/** The attribute of the buttons of the debug tools. The log skips the events in them. */
export const OWN = 'data-event-log'

/**
 * The log of one tab: the entries in time order, kept in `sessionStorage`
 * while "Preserve" is on.
 */
export class EventLog extends Journal<Entry> {
	/** Whether the log skips each new entry. A debug sheet pauses the log while it is on screen. */
	paused = false

	constructor(store: Store) {
		super(store, 'docs:event-log', CAPACITY)
	}

	/** Whether the sheet shows the entries of a batch as one line. The flag stays for the tab. */
	get batched(): boolean {
		return read(this.store, BATCH) === '1'
	}

	set batched(on: boolean) {
		write(this.store, BATCH, on ? '1' : null)

		this.emit()
	}

	/**
	 * Starts the lines of a page load with a separator at time 0, after the
	 * lines of the page loads before it.
	 */
	separate(text: string): void {
		this.commit([...this.entries, { time: 0, kind: 'load', text, y: 0 }])
	}

	/**
	 * Adds an entry in time order among the entries of the current page load.
	 * The separator of the page load is at time 0, so no entry goes before it.
	 */
	add(entry: Entry): void {
		if (this.paused) return

		const index = this.entries.findLastIndex(({ time }) => time <= entry.time) + 1

		this.commit(this.entries.toSpliced(index, 0, entry))
	}
}
