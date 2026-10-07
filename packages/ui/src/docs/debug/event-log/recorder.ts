import type { JsonValue } from 'ui/json-tree'
import { type Entry, EventLog, type Kind, sessionStore } from './log.ts'
import { scrollReading, viewport } from './probes.ts'
import { type Line, SOURCES } from './sources.ts'

// The recorder of the Event log: it starts the log of the tab, writes the
// lines of each page load, and runs the sources.

/** The readings before hydration, from the head script (`index.tsx`). */
type Buffer = { entries: Entry[]; stop: () => void }

declare global {
	interface Window {
		__eventLog?: Buffer
	}
}

/** The log of this tab. It starts with {@link start}. */
let log: EventLog | undefined

let stop: (() => void) | undefined

/**
 * Starts the log of this tab, and returns it. The first start of a page load
 * writes the load lines and takes the readings of the head script. A start
 * after {@link halt} writes a separator and the readings of now. A call while
 * the log runs returns the same log.
 */
export function start(): EventLog {
	if (!log) {
		log = new EventLog(sessionStore())

		begin(log)
	} else if (!stop) {
		begin(log, 'on')
	}

	stop ??= listen(log)

	return log
}

/**
 * Stops the listeners of the log, and drops its entries and the kept copy.
 * The log stays the log of the tab, so the sheet keeps it, and "Preserve log"
 * keeps its value.
 */
export function halt(): void {
	stop?.()

	stop = undefined

	log?.clear()
}

/** The entry of a line, with the scroll position of now, at the time of now by default. */
function entryOf({ kind, text, detail, time = performance.now(), name, batch }: Line): Entry {
	const entry: Entry = { time: Math.round(time), kind, text, y: Math.round(window.scrollY) }

	if (name !== undefined) entry.name = name

	if (detail !== undefined) entry.detail = detail

	if (batch !== undefined) entry.batch = batch

	return entry
}

/** Adds an entry to the log of this tab while it runs. */
export function record(kind: Kind, text: string, detail?: JsonValue): void {
	if (stop) log?.add(entryOf({ kind, text, detail }))
}

/**
 * Writes the separator and the readings of a page load, and takes the readings
 * of the head script. The separator names the type of the navigation, or
 * `cause` when it is given.
 */
export function begin(target: EventLog, cause?: string): void {
	const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]

	target.separate(`──── ${cause ?? navigation?.type ?? 'load'} ${location.pathname}`)

	target.add(entryOf({ kind: 'load', text: scrollReading(), detail: viewport() }))

	window.__eventLog?.stop()

	for (const entry of window.__eventLog?.entries ?? []) target.add(entry)

	delete window.__eventLog
}

/**
 * Runs the sources of a log, and returns a function that stops them. A line
 * that a source writes after the stop, such as from a timer, goes out.
 */
export function listen(target: EventLog): () => void {
	let running = true

	const stops = SOURCES.map((source) =>
		source((line) => {
			if (running) target.add(entryOf(line))
		}),
	)

	// The listener goes after the listener of the lifecycle source, so the
	// saved log holds the `pagehide` line.
	const save = () => target.save()

	window.addEventListener('pagehide', save, true)

	return () => {
		running = false

		for (const stopSource of stops) stopSource()

		window.removeEventListener('pagehide', save, true)
	}
}

/** What the old module of the recorder gives to the new one on a hot update. */
type Kept = { entries?: readonly Entry[] }

// In dev, the log records each hot update, and an edit to this module while
// the log runs keeps the entries: the old module gives them to the new one.
// The `import.meta.hot` of Vitest has no `data`.
if (import.meta.hot) {
	const kept: Kept = import.meta.hot.data ?? {}

	// The kept log continues with no separator.
	if (kept.entries) {
		log = new EventLog(sessionStore())

		log.entries = kept.entries

		stop = listen(log)
	}

	import.meta.hot.on('vite:afterUpdate', ({ updates }) =>
		record('hmr', `update ${updates.map((update) => update.path).join(' ')}`),
	)

	import.meta.hot.on('vite:error', ({ err }) => record('hmr', `error ${err.message}`))

	// The new module takes the entries, so the old one stops its listeners and
	// keeps the entries and the kept copy.
	import.meta.hot.dispose((data: Kept) => {
		data.entries = stop ? log?.entries : undefined

		stop?.()

		stop = undefined
	})
}
