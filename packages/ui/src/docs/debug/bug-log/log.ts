import { findScrollableAncestor } from '../../../components/scroll-area/scroll-area-utilities.ts'
import type { EventLog } from '../event-log/log.ts'
import { type ErrorDetail, type Viewport, viewport } from '../event-log/probes.ts'
import { describe, isOwn, type Line, on } from '../event-log/sources.ts'
import { columns, kindWidth } from '../event-log/text.ts'
import { Journal, type Store } from '../journal.ts'

// The store of the Bug log: a report for each error line of the Event log,
// and for each capture of the reader.

/** One report: the snapshot of the page at the first time of an error, or at a capture. */
export type Report = {
	id: number
	/** The text of the error line, or `capture`. */
	title: string
	/** The frames of the stack of the error. */
	stack: string[]
	/** The frames of the component stack of an error that an error boundary catches. */
	componentStack: string[]
	/** How many times the same error occurs: the same title and the same first frame. */
	count: number
	/** The wall-clock time of the first time. */
	at: string
	/** The path, the query, and the hash of the page. */
	page: string
	/** The file of this module, whose hash names the build that the frames come from. */
	build: string
	device: string
	/** The attributes of the root element: the settings of the docs and the state of the tools. */
	root: string
	viewport: Viewport & { y: number }
	/** The element of the last `pointerdown`, with its box and its scroll container. */
	pointer?: string
	/** The element of the last `focusin`, with its box and its scroll container. */
	focus?: string
	/** The last lines of the Event log, as the columns and the text of each line. */
	trail: string[]
}

/** The most reports that the Bug log keeps. The oldest goes first. */
export const CAPACITY = 50

/** The most lines of the Event log in a report. */
export const TRAIL = 40

/** The title of a report that the reader captures. */
export const CAPTURE = 'capture'

/** The file of this module, whose hash names the build. */
const BUILD = new URL(import.meta.url).pathname.split('/').at(-1) ?? ''

/**
 * The log of the reports of one tab, kept in `sessionStorage` while
 * "Preserve" is on. A report holds the last lines of the Event log.
 */
export class BugLog extends Journal<Report> {
	private readonly log: EventLog

	/** The element of the last `pointerdown`. */
	private pointer: WeakRef<Element> | undefined

	/** The element of the last `focusin`. */
	private focus: WeakRef<Element> | undefined

	constructor(store: Store, log: EventLog) {
		super(store, 'docs:bug-log', CAPACITY)

		this.log = log
	}

	/**
	 * Files a report for an error line. A second error with the same title and
	 * first frame counts in the first report.
	 */
	file(line: Line): void {
		// The detail of an error line is an `ErrorDetail`, or none.
		const detail = line.detail as ErrorDetail | undefined

		const stack = detail?.stack ?? []

		const same = this.entries.find(
			(report) => report.title === line.text && report.stack[0] === stack[0],
		)

		if (same)
			this.commit(
				this.entries.map((report) =>
					report === same ? { ...same, count: same.count + 1 } : report,
				),
			)
		else this.commit([...this.entries, this.report(line.text, stack, detail?.componentStack ?? [])])
	}

	/** Files a report of the page now. */
	capture(): void {
		this.commit([...this.entries, this.report(CAPTURE, [], [])])
	}

	remove(id: number): void {
		this.commit(this.entries.filter((report) => report.id !== id))
	}

	/**
	 * Keeps the element of each `pointerdown` and each `focusin` outside the
	 * debug tools, and returns a function that stops. While the Event log is
	 * paused, a debug sheet is on screen, so the events are in the tools.
	 */
	watch(): () => void {
		return on(document, ['pointerdown', 'focusin'], ({ type, target }) => {
			if (!(target instanceof Element) || this.log.paused || isOwn(target)) return

			if (type === 'pointerdown') this.pointer = new WeakRef(target)
			else this.focus = new WeakRef(target)
		})
	}

	private report(title: string, stack: string[], componentStack: string[]): Report {
		const trail = this.log.entries.slice(-TRAIL)

		const width = kindWidth(trail)

		const pointer = this.pointer?.deref()

		const focus = this.focus?.deref()

		return {
			// The reports are in the order of their ids.
			id: (this.entries.at(-1)?.id ?? 0) + 1,
			title,
			stack,
			componentStack,
			count: 1,
			at: new Date().toISOString(),
			page: location.pathname + location.search + location.hash,
			build: BUILD,
			device: `${navigator.userAgent}, dpr ${devicePixelRatio}, ${matchMedia('(pointer: coarse)').matches ? 'coarse' : 'fine'} pointer${navigator.onLine ? '' : ', offline'}`,
			root: Array.from(document.documentElement.attributes, ({ name, value }) =>
				value ? `${name}="${value}"` : name,
			).join(' '),
			viewport: { ...viewport(), y: Math.round(scrollY) },
			pointer: pointer?.isConnected ? place(pointer) : undefined,
			focus: focus?.isConnected ? place(focus) : undefined,
			trail: trail.map((entry) => columns(entry, width) + entry.text),
		}
	}
}

/**
 * Where an element is: its name and the name of each ancestor with a slot,
 * its box, and the scroll position of its scroll container.
 */
function place(element: Element): string {
	const names = [describe(element)]

	for (let parent = element.parentElement; parent; parent = parent.parentElement)
		if (parent.hasAttribute('data-slot')) names.unshift(describe(parent))

	const { x, y, width, height } = element.getBoundingClientRect()

	const box = [x, y, width, height].map(Math.round)

	const scroller = findScrollableAncestor(element.parentElement)

	const scroll = scroller
		? `, in ${describe(scroller)} scrolled ${Math.round(scroller.scrollLeft)},${Math.round(scroller.scrollTop)}`
		: ''

	return `${names.join(' > ')} at ${box[0]},${box[1]} ${box[2]}×${box[3]}${scroll}`
}
