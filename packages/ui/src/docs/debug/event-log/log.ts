import type { JsonValue } from 'ui/json-tree'
import { createEmitter } from '../../../utilities/emitter.ts'
import { noop } from '../../../utilities/noop.ts'

// The store of the Event log: the entries of one tab, and the copy that
// "Preserve" keeps in `sessionStorage`.

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

/** The `sessionStorage` subset that the log uses. A test gives a fake. */
export type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** The most entries that the log keeps. The oldest goes first. */
export const CAPACITY = 500

/** The `sessionStorage` key of the kept entries. */
const ENTRIES = 'docs:event-log:entries'

/** The `sessionStorage` key of the "Preserve" flag. */
const PRESERVE = 'docs:event-log:preserve'

/** The `sessionStorage` key of the "Batch" flag. */
const BATCH = 'docs:event-log:batch'

/** The attribute of the button of the log. The log skips the events in it. */
export const OWN = 'data-event-log'

/**
 * The log of one tab: the entries in memory, kept in `sessionStorage` while
 * "Preserve" is on. A new log reads the kept entries, so a reload starts
 * from them.
 */
export class EventLog {
	entries: readonly Entry[] = []

	/** Whether the log skips each new entry. The sheet pauses the log while the sheet is on screen. */
	paused = false

	private readonly changes = createEmitter()

	/** Calls `listener` on each change of the entries or of "Preserve". */
	readonly subscribe = this.changes.subscribe

	private saveTimer: ReturnType<typeof setTimeout> | undefined

	private readonly store: Store

	constructor(store: Store) {
		this.store = store

		// Only `save` writes the entries, so the kept value is an array of at
		// most `CAPACITY` entries.
		try {
			if (this.preserve) this.entries = JSON.parse(read(store, ENTRIES) ?? '[]')
		} catch {}
	}

	get preserve(): boolean {
		return read(this.store, PRESERVE) === '1'
	}

	/** Turns "Preserve" on or off. Off deletes the kept entries at once, and the entries on screen stay. */
	set preserve(on: boolean) {
		write(this.store, PRESERVE, on ? '1' : null)

		if (on) this.save()
		else write(this.store, ENTRIES, null)

		this.changes.emit()
	}

	/** Whether the sheet shows the entries of a batch as one line. The flag stays for the tab. */
	get batched(): boolean {
		return read(this.store, BATCH) === '1'
	}

	set batched(on: boolean) {
		write(this.store, BATCH, on ? '1' : null)

		this.changes.emit()
	}

	/**
	 * Starts the lines of a page load with a separator at time 0, after the
	 * lines of the page loads before it.
	 */
	separate(text: string): void {
		this.insert(this.entries.length, { time: 0, kind: 'load', text, y: 0 })
	}

	/**
	 * Adds an entry in time order among the entries of the current page load.
	 * The separator of the page load is at time 0, so no entry goes before it.
	 */
	add(entry: Entry): void {
		if (this.paused) return

		this.insert(this.entries.findLastIndex(({ time }) => time <= entry.time) + 1, entry)
	}

	clear(): void {
		this.entries = []

		this.save()

		this.changes.emit()
	}

	/**
	 * Writes the entries to `sessionStorage` while "Preserve" is on. When the
	 * storage is full, the kept copy holds the newest entries that fit, so a
	 * reload does not show an old copy.
	 */
	save(): void {
		clearTimeout(this.saveTimer)

		if (!this.preserve) return

		let count = this.entries.length

		while (
			!write(this.store, ENTRIES, JSON.stringify(this.entries.slice(this.entries.length - count)))
		)
			if (count === 0) return
			else count = Math.floor(count / 2)
	}

	private insert(index: number, entry: Entry): void {
		this.entries = this.entries.toSpliced(index, 0, entry).slice(-CAPACITY)

		clearTimeout(this.saveTimer)

		this.saveTimer = setTimeout(() => this.save(), 500)

		this.changes.emit()
	}
}

// Storage access can throw, such as with site data off, and the log then
// lives for the page only.
function read(store: Store, key: string): string | null {
	try {
		return store.getItem(key)
	} catch {
		return null
	}
}

/** Writes a value, or removes it for `null`, and returns whether the write ends. */
function write(store: Store, key: string, value: string | null): boolean {
	try {
		if (value === null) store.removeItem(key)
		else store.setItem(key, value)

		return true
	} catch {
		return false
	}
}

/** The `sessionStorage` of the tab, or a store that keeps nothing where the read of the property throws. */
export function sessionStore(): Store {
	try {
		return sessionStorage
	} catch {
		return { getItem: () => null, setItem: noop, removeItem: noop }
	}
}
