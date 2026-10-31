import { keepViewportProbe, parseFrames, parseStack, readViewport } from './events-probes'
import { CAPTURE_ATTRIBUTE, REPORTS_ATTRIBUTE, type StartEventsOptions } from './events-setting'
import { setEventSink } from './events-sink'
import { calls } from './events-sources/calls'
import { addListeners } from './events-sources/dom'
import { errors } from './events-sources/errors'
import { sessionHistory } from './events-sources/history'
import { input } from './events-sources/input'
import { lifecycle } from './events-sources/lifecycle'
import { network } from './events-sources/network'
import { overlay } from './events-sources/overlay'
import { paint } from './events-sources/paint'
import { scroll } from './events-sources/scroll'
import { height, resize } from './events-sources/viewport'
import { getStorage } from './events-storage'
import { EventStore, type NewEntry } from './events-store'
import { isOwn } from './events-target'
import type { EventLine, EventSource } from './types'

// The recorder of the events: it starts the store of the tab, writes the
// lines of each page load, and runs the sources. It loads only while the
// events run.

/** The sources of the module, in the order that they start. */
const SOURCES: readonly EventSource[] = [
	input,
	scroll,
	resize,
	height,
	errors,
	sessionHistory,
	lifecycle,
	network,
	paint,
	overlay,
]

/** The store of this tab. It starts with {@link start}. */
let store: EventStore | undefined

let stop: (() => void) | undefined

/**
 * The store of a tab, kept in `sessionStorage`. CSS shows the dot and the
 * red icon of the header button by the attributes of the root element, which
 * follow the reports and the capture of the store.
 */
function create(): EventStore {
	const next = new EventStore(getStorage(() => sessionStorage))

	const mark = () => {
		const root = document.documentElement

		root.toggleAttribute(
			REPORTS_ATTRIBUTE,
			next.entries.some(({ report }) => report),
		)

		root.toggleAttribute(CAPTURE_ATTRIBUTE, next.capturing)
	}

	next.subscribe(mark)

	mark()

	return next
}

/**
 * Starts the store of this tab, and returns it. The first start of a page
 * load writes the lines of the load. A start after {@link halt} writes a
 * separator and the reading of now. A call while the store runs returns the
 * same store.
 */
export function start(options: StartEventsOptions = {}): EventStore {
	if (!store) {
		store = create()

		begin(store)
	} else if (!stop) {
		begin(store, 'on')
	}

	stop ??= listen(store, options)

	return store
}

/**
 * Stops the sources, ends a capture, and drops the events and the kept copy.
 * The store stays the store of the tab, so a sheet keeps it, and "Preserve"
 * keeps its value.
 */
export function halt(): void {
	stop?.()

	stop = undefined

	store?.stopCapture()

	store?.clear()
}

/**
 * Writes the separator and the reading of a page load. The separator names
 * the type of the navigation, or `cause` when it is given. A page load
 * without a cause also writes the first byte and the end of the HTML at
 * their times, so the lines show the request before the paint source writes
 * `first-contentful-paint`.
 */
export function begin(target: EventStore, cause?: string): void {
	const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]

	target.addSeparator(`──── ${cause ?? navigation?.type ?? 'load'} ${location.pathname}`)

	if (!cause && navigation) {
		// A time of 0 is a time that the browser does not give.
		if (navigation.responseStart > 0) {
			target.add(toEntry({ kind: 'load', text: 'first byte', time: navigation.responseStart }))
		}

		if (navigation.responseEnd > 0) {
			target.add(toEntry({ kind: 'load', text: 'end of HTML', time: navigation.responseEnd }))
		}
	}

	target.add(toEntry({ kind: 'load', text: 'viewport', detail: readViewport() }))
}

/** The event of a line, with the scroll position of now and the time of now by default. A bug line holds its stacks in the detail. */
function toEntry({
	kind,
	text,
	detail,
	time = performance.now(),
	y = scrollY,
	name,
	batch,
	bug,
}: EventLine): NewEntry {
	const entry: NewEntry = { time: Math.round(time), kind, text, y: Math.round(y) }

	if (name !== undefined) entry.name = name

	const stack = bug ? parseStack(bug.error) : []

	const componentStack = parseFrames(bug?.componentStack)

	if (detail !== undefined) entry.detail = detail
	else if (stack.length > 0 || componentStack.length > 0) entry.detail = { stack, componentStack }

	if (batch !== undefined) entry.batch = batch

	return entry
}

/**
 * Runs the sources, and returns a function that stops them. A line that a
 * source writes after the stop, such as from a timer, goes out. A bug line
 * files a report, also while the store is paused.
 */
export function listen(target: EventStore, options: StartEventsOptions = {}): () => void {
	let running = true

	const note = (line: EventLine) => {
		if (!running) return

		if (line.bug) target.addBug(toEntry(line), line.bug)
		else target.add(toEntry(line))
	}

	const sources = [...SOURCES, ...(options.calls ? [calls] : []), ...(options.sources ?? [])]

	const stops = [
		// The viewport sources read the probe for each resize and each overlay.
		keepViewportProbe(),
		...sources.map((source) => source(note)),
		// While the store is paused, a sheet of the tools is on screen, so the
		// events are in the tools.
		addListeners(document, ['pointerdown', 'focusin'], ({ type, target: el }) => {
			if (!(el instanceof Element) || target.paused || isOwn(el)) return

			target.watch(type === 'pointerdown' ? 'pointerdown' : 'focusin', el)
		}),
	]

	setEventSink({ note, store: target })

	// The listener goes after the listener of the lifecycle source, so the
	// saved store holds the `pagehide` line.
	const save = () => target.save()

	window.addEventListener('pagehide', save, true)

	return () => {
		running = false

		for (const stopSource of stops) stopSource()

		setEventSink(undefined)

		window.removeEventListener('pagehide', save, true)
	}
}
