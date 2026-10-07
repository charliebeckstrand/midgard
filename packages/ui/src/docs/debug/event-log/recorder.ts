import type { JsonValue } from 'ui/json-tree'
import { BugLog } from '../bug-log/log.ts'
import { sessionStore } from '../journal.ts'
import { type Entry, EventLog, type Kind } from './log.ts'
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

/** The Bug log of this tab. It starts with the log. */
let bugs: BugLog | undefined

let stop: (() => void) | undefined

/**
 * The Bug log of this tab, which `target` is the log of. CSS shows the dot of
 * the Bug button by the `data-bugs` attribute of the root element, which is
 * on while the Bug log holds a report.
 */
function bugLog(target: EventLog): BugLog {
	if (bugs) return bugs

	const reports = new BugLog(sessionStore(), target)

	const mark = () =>
		document.documentElement.toggleAttribute('data-bugs', reports.entries.length > 0)

	reports.subscribe(mark)

	mark()

	bugs = reports

	return reports
}

/** Starts the log of this tab, and returns its Bug log. */
export function startBugs(): BugLog {
	return bugLog(start())
}

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

	stop ??= listen(log, bugLog(log))

	return log
}

/**
 * Stops the listeners of the log, and drops its entries and the kept copy.
 * The log stays the log of the tab, so the sheet keeps it, and "Preserve"
 * keeps its value.
 */
export function halt(): void {
	stop?.()

	stop = undefined

	log?.clear()

	bugs?.clear()
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
 * that a source writes after the stop, such as from a timer, goes out. Each
 * error line also files a report in `reports`, the Bug log of the log.
 */
export function listen(target: EventLog, reports?: BugLog): () => void {
	let running = true

	// An error line files a report while the log is paused too.
	const stops = SOURCES.map((source) =>
		source((line) => {
			if (!running) return

			target.add(entryOf(line))

			if (line.kind === 'error') reports?.file(line)
		}),
	)

	if (reports) stops.push(reports.watch())

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

		stop = listen(log, bugLog(log))
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
