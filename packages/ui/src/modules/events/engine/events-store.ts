import { createEmitter } from '../../../utilities/emitter'
import { framesOf, stackOf } from './events-probes'
import { createReport, type ReportInput } from './events-report'
import { kindWidth, lineOf } from './events-text'
import type { EventBug, EventEntry, EventReport, EventStorage } from './types'

// The store of the events of one tab: the events in time order, the reports
// of the bugs and the captures among them, and the copy that "Preserve" keeps
// in `sessionStorage`.

/** The most events with no report that the store keeps outside a capture. The oldest goes first. */
export const CAPACITY = 500

/** The most events with no report that the store keeps while a capture runs. */
export const CAPTURE_CAPACITY = 2000

/** The most events with a report that the store keeps. The oldest goes first. */
export const REPORTS = 50

/** The most lines before a bug in its report, outside a capture. */
export const TRAIL = 40

/** The prefix of the storage keys of the store. */
const PREFIX = 'events'

/** An event before the store gives it an id. */
export type NewEntry = Omit<EventEntry, 'id'>

/** The start of a capture: the id of its first event, and the wall-clock time and the page of the start. */
type CaptureStart = { id: number; at: string; page: string }

/**
 * The events of one tab in memory, kept in `sessionStorage` while
 * "Preserve" is on or a capture runs. A new store reads the kept events, so
 * a reload starts from them. The keys are `events:entries`, and
 * `events:<field>` for each flag.
 */
export class EventStore {
	entries: readonly EventEntry[] = []

	private isPaused = false

	private readonly changes = createEmitter()

	/** Calls `listener` on each change of the events or of a flag. */
	readonly subscribe = this.changes.subscribe

	private readonly storage: EventStorage

	private saveTimer: ReturnType<typeof setTimeout> | undefined

	private lastId = 0

	/** The event of each thrown value that a channel reported, so a second channel adds to its report. */
	private errors = new WeakMap<object, number>()

	/** The element of the last `pointerdown` outside the tools. */
	private pointer: WeakRef<Element> | undefined

	/** The element of the last `focusin` outside the tools. */
	private focus: WeakRef<Element> | undefined

	constructor(storage: EventStorage) {
		this.storage = storage

		// Only `save` writes the events, so the kept value is an array of events.
		try {
			if (this.preserve) this.entries = JSON.parse(read(storage, key('entries')) ?? '[]')
		} catch {}

		this.lastId = this.entries.reduce((last, { id }) => Math.max(last, id), 0)
	}

	/** Whether the store keeps its events through a reload: "Preserve" is on, or a capture runs. */
	get preserve(): boolean {
		return this.flag('preserve') || this.capturing
	}

	/** Turns "Preserve" on or off. Off deletes the kept events at once, unless a capture runs, and the events on screen stay. */
	setPreserve(on: boolean): void {
		this.setFlag('preserve', on)

		if (this.preserve) this.save()
		else write(this.storage, key('entries'), null)
	}

	/**
	 * Whether the list shows the events of a batch as one line. It is on by
	 * default, so the tab keeps only the flag of "off".
	 */
	get batched(): boolean {
		return !this.flag('unbatched')
	}

	/** Turns "Batch" on or off. */
	setBatched(on: boolean): void {
		this.setFlag('unbatched', !on)
	}

	/** Whether the store skips each new event with no bug. A sheet of the tools pauses the store while it is on screen. */
	get paused(): boolean {
		return this.isPaused
	}

	/**
	 * Pauses the store or ends the pause. The views call a method, not a
	 * setter, so the React Compiler reads the change as a call on the store.
	 */
	setPaused(on: boolean): void {
		this.isPaused = on
	}

	/** Whether a capture runs. */
	get capturing(): boolean {
		return this.captureStart() !== undefined
	}

	/**
	 * Starts the events of a page load with a separator at time 0, after the
	 * events of the page loads before it.
	 */
	separate(text: string): void {
		this.commit([...this.entries, this.create({ time: 0, kind: 'load', text, y: 0 })])
	}

	/**
	 * Adds an event in time order among the events of the current page load.
	 * The separator of the page load is at time 0, so no event goes before it.
	 */
	add(entry: NewEntry): void {
		if (!this.isPaused) this.insert(this.create(entry))
	}

	/**
	 * Adds the event of a bug, also while the store is paused. The first time
	 * of a bug holds its report. A second time of the same bug, the same text
	 * and the same first frame, is an event with no report, and it counts in
	 * the report of the first time. A thrown value that a second channel
	 * reports adds the route and the component stack to the report of the
	 * first channel, and adds no event.
	 */
	file(entry: NewEntry, bug: EventBug): void {
		const error = typeof bug.error === 'object' && bug.error !== null ? bug.error : undefined

		const known = error && this.errors.get(error)

		if (known !== undefined) {
			this.merge(known, bug)

			return
		}

		const stack = stackOf(bug.error)

		const same = this.entries.find(
			({ text, report }) => report && text === entry.text && report.stack[0] === stack[0],
		)

		const created = this.create(entry)

		if (error) this.errors.set(error, same?.id ?? created.id)

		if (same?.report) {
			const counted = { ...same, report: { ...same.report, count: same.report.count + 1 } }

			this.insert(created, (entries) => entries.map((item) => (item === same ? counted : item)))

			return
		}

		this.insert(created, (entries) => {
			const index = entries.indexOf(created)

			const report = this.reportOf(this.trailOf(entries.slice(0, index)), {
				title: created.text,
				origin: bug.origin,
				stack,
				componentStack: framesOf(bug.componentStack),
				route: bug.route,
			})

			return entries.toSpliced(index, 1, { ...created, report })
		})
	}

	/** Starts a capture: an event that marks the start, and the store keeps each event from it. */
	startCapture(): void {
		if (this.capturing) return

		const entry = this.create({
			time: Math.round(performance.now()),
			kind: 'capture',
			text: `capture starts ${location.pathname}`,
			y: Math.round(scrollY),
		})

		const start: CaptureStart = {
			id: entry.id,
			at: new Date().toISOString(),
			page: location.pathname,
		}

		write(this.storage, key('capture'), JSON.stringify(start))

		this.insert(entry)

		this.save()
	}

	/**
	 * Ends a capture, and files its report: the snapshot of the page now, and
	 * the lines of each event from the start of the capture. Returns the id of
	 * the event that holds the report, or `undefined` when no capture runs.
	 */
	stopCapture(): number | undefined {
		const start = this.captureStart()

		if (!start) return undefined

		const entry = this.create({
			time: Math.round(performance.now()),
			kind: 'capture',
			text: 'capture',
			y: Math.round(scrollY),
		})

		write(this.storage, key('capture'), null)

		this.insert(entry, (entries) => {
			const index = entries.indexOf(entry)

			const trail = entries.slice(0, index).filter(({ id }) => id >= start.id)

			const report = this.reportOf(trail, {
				title: entry.text,
				origin: 'capture',
				stack: [],
				componentStack: [],
				started: `${start.at} ${start.page}`,
			})

			return entries.toSpliced(index, 1, { ...entry, report })
		})

		// The store keeps the events through a reload only while "Preserve" is on.
		if (this.preserve) this.save()
		else write(this.storage, key('entries'), null)

		return entry.id
	}

	/** Removes the report of an event. The event stays in the list. */
	removeReport(id: number): void {
		this.commit(
			this.entries.map((entry) => {
				if (entry.id !== id) return entry

				const { report: _report, ...rest } = entry

				return rest
			}),
		)
	}

	/** Removes each event and the kept copy. A capture that runs goes on with the events from now. */
	clear(): void {
		this.entries = []

		this.errors = new WeakMap()

		this.save()

		this.changes.emit()
	}

	/** Keeps the element of a `pointerdown` or a `focusin` outside the tools, for the next report. */
	watch(type: 'pointerdown' | 'focusin', el: Element): void {
		if (type === 'pointerdown') this.pointer = new WeakRef(el)
		else this.focus = new WeakRef(el)
	}

	/**
	 * Writes the events to `sessionStorage` while the store keeps them. When
	 * the storage is full, the kept copy holds the newest events that fit, so a
	 * reload does not show an old copy.
	 */
	save(): void {
		clearTimeout(this.saveTimer)

		if (!this.preserve) return

		let count = this.entries.length

		while (
			!write(
				this.storage,
				key('entries'),
				JSON.stringify(this.entries.slice(this.entries.length - count)),
			)
		)
			if (count === 0) return
			else count = Math.floor(count / 2)
	}

	/** An event with the next id. */
	private create(entry: NewEntry): EventEntry {
		return { id: ++this.lastId, ...entry }
	}

	/**
	 * Puts an event in its time order, applies `then` to the events, and
	 * commits them.
	 */
	private insert(
		entry: EventEntry,
		then: (entries: readonly EventEntry[]) => readonly EventEntry[] = (entries) => entries,
	): void {
		const index = this.entries.findLastIndex(({ time }) => time <= entry.time) + 1

		this.commit(then(this.entries.toSpliced(index, 0, entry)))
	}

	/** Adds what a second channel tells about a bug to the report of its event. */
	private merge(id: number, bug: EventBug): void {
		this.commit(
			this.entries.map((entry) => {
				if (entry.id !== id || !entry.report) return entry

				const report = { ...entry.report }

				report.route ??= bug.route

				if (report.componentStack.length === 0) report.componentStack = framesOf(bug.componentStack)

				return { ...entry, report }
			}),
		)
	}

	/**
	 * The events that the trail of a bug holds: each event from the start of a
	 * capture that runs, else the last {@link TRAIL} events.
	 */
	private trailOf(before: readonly EventEntry[]): readonly EventEntry[] {
		const start = this.captureStart()

		return start
			? before.filter(({ id }) => id >= start.id).slice(-CAPTURE_CAPACITY)
			: before.slice(-TRAIL)
	}

	/** The report of the page now, with the lines of `trail`. */
	private reportOf(
		trail: readonly EventEntry[],
		input: Omit<ReportInput, 'trail' | 'pointer' | 'focus'>,
	): EventReport {
		const width = kindWidth(trail)

		return createReport({
			...input,
			trail: trail.map((entry) => lineOf(entry, width)),
			pointer: this.pointer?.deref(),
			focus: this.focus?.deref(),
		})
	}

	/**
	 * Replaces the events, cut to the capacity, saves them soon, and tells the
	 * listeners. The oldest event with no report goes first, so a bug stays in
	 * the list after its trail goes.
	 */
	private commit(entries: readonly EventEntry[]): void {
		this.entries = trim(entries, this.capturing ? CAPTURE_CAPACITY : CAPACITY)

		clearTimeout(this.saveTimer)

		this.saveTimer = setTimeout(() => this.save(), 500)

		this.changes.emit()
	}

	/** The start of the capture that runs. */
	private captureStart(): CaptureStart | undefined {
		try {
			const value = read(this.storage, key('capture'))

			return value === null ? undefined : JSON.parse(value)
		} catch {
			return undefined
		}
	}

	/** A flag of the tab, such as "Preserve". It stays in `sessionStorage` while "Preserve" is off too. */
	private flag(field: string): boolean {
		return read(this.storage, key(field)) === '1'
	}

	/** Sets a flag of the tab, and tells the listeners. */
	private setFlag(field: string, on: boolean): void {
		write(this.storage, key(field), on ? '1' : null)

		this.changes.emit()
	}
}

/**
 * The events cut to `capacity` events with no report and {@link REPORTS}
 * events with a report. The oldest of each group goes first.
 */
function trim(entries: readonly EventEntry[], capacity: number): readonly EventEntry[] {
	const reports = entries.filter(({ report }) => report).length

	let extraReports = reports - REPORTS

	let extraEvents = entries.length - reports - capacity

	if (extraReports <= 0 && extraEvents <= 0) return entries

	return entries.filter(({ report }) => {
		if (report && extraReports > 0) {
			extraReports--

			return false
		}

		if (!report && extraEvents > 0) {
			extraEvents--

			return false
		}

		return true
	})
}

/** The storage key of a field of the store. */
function key(field: string): string {
	return `${PREFIX}:${field}`
}

// Storage access can throw, such as with site data off, and the store then
// lives for the page only.
function read(storage: EventStorage, name: string): string | null {
	try {
		return storage.getItem(name)
	} catch {
		return null
	}
}

/** Writes a value, or removes it for `null`, and returns whether the write ends. */
function write(storage: EventStorage, name: string, value: string | null): boolean {
	try {
		if (value === null) storage.removeItem(name)
		else storage.setItem(name, value)

		return true
	} catch {
		return false
	}
}
