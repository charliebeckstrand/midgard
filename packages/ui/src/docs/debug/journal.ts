import { createEmitter } from '../../utilities/emitter.ts'
import { noop } from '../../utilities/noop.ts'

// The store of a debug tool: the items of one tab, and the copy that
// "Preserve" keeps in `sessionStorage`. The Event log and the Bug log each
// keep one.

/** The `sessionStorage` subset that a journal uses. A test gives a fake. */
export type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/**
 * The items of one tab in memory, kept in `sessionStorage` while "Preserve"
 * is on. A new journal reads the kept items, so a reload starts from them.
 * The keys are `<name>:entries`, and `<name>:<field>` for each flag.
 */
export class Journal<T> {
	entries: readonly T[] = []

	private readonly changes = createEmitter()

	/** Calls `listener` on each change of the items or of a flag. */
	readonly subscribe = this.changes.subscribe

	private saveTimer: ReturnType<typeof setTimeout> | undefined

	private readonly store: Store

	private readonly name: string

	private readonly capacity: number

	/**
	 * @param store - Where "Preserve" keeps the items.
	 * @param name - The prefix of the keys, such as `docs:event-log`.
	 * @param capacity - The most items that the journal keeps. The oldest goes first.
	 */
	constructor(store: Store, name: string, capacity: number) {
		this.store = store

		this.name = name

		this.capacity = capacity

		// Only `save` writes the items, so the kept value is an array of at most
		// `capacity` items.
		try {
			if (this.preserve) this.entries = JSON.parse(read(store, this.key('entries')) ?? '[]')
		} catch {}
	}

	get preserve(): boolean {
		return this.flag('preserve')
	}

	/** Turns "Preserve" on or off. Off deletes the kept items at once, and the items on screen stay. */
	set preserve(on: boolean) {
		if (!on) write(this.store, this.key('entries'), null)

		this.setFlag('preserve', on)

		if (on) this.save()
	}

	clear(): void {
		this.entries = []

		this.save()

		this.changes.emit()
	}

	/**
	 * Writes the items to `sessionStorage` while "Preserve" is on. When the
	 * storage is full, the kept copy holds the newest items that fit, so a
	 * reload does not show an old copy.
	 */
	save(): void {
		clearTimeout(this.saveTimer)

		if (!this.preserve) return

		let count = this.entries.length

		while (
			!write(
				this.store,
				this.key('entries'),
				JSON.stringify(this.entries.slice(this.entries.length - count)),
			)
		)
			if (count === 0) return
			else count = Math.floor(count / 2)
	}

	/** Replaces the items, cut to the capacity, saves them soon, and tells the listeners. */
	protected commit(entries: readonly T[]): void {
		this.entries = entries.slice(-this.capacity)

		clearTimeout(this.saveTimer)

		this.saveTimer = setTimeout(() => this.save(), 500)

		this.changes.emit()
	}

	/** A flag of the tab, such as "Preserve". It stays in `sessionStorage` while "Preserve" is off too. */
	protected flag(field: string): boolean {
		return read(this.store, this.key(field)) === '1'
	}

	/** Sets a flag of the tab, and tells the listeners. */
	protected setFlag(field: string, on: boolean): void {
		write(this.store, this.key(field), on ? '1' : null)

		this.changes.emit()
	}

	/** The `sessionStorage` key of a field of this journal. */
	private key(field: string): string {
		return `${this.name}:${field}`
	}
}

// Storage access can throw, such as with site data off, and the journal then
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
