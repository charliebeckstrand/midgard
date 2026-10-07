import { type Entry, OWN } from '../event-log/log.ts'
import { type Viewport, viewport } from '../event-log/probes.ts'
import { describe, type Line } from '../event-log/sources.ts'
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

/** The attribute of the root element while the Bug log holds a report. CSS shows the dot of the button by it. */
const ATTRIBUTE = 'data-bugs'

/** The log of the reports of one tab, kept in `sessionStorage` while "Preserve" is on. */
export class BugLog extends Journal<Report> {
	/** The element of the last `pointerdown`. */
	private pointer: WeakRef<Element> | undefined

	/** The element of the last `focusin`. */
	private focus: WeakRef<Element> | undefined

	constructor(store: Store) {
		super(store, 'docs:bug-log', CAPACITY)

		this.subscribe(() =>
			document.documentElement.toggleAttribute(ATTRIBUTE, this.entries.length > 0),
		)

		document.documentElement.toggleAttribute(ATTRIBUTE, this.entries.length > 0)
	}

	/**
	 * Files a report for an error line, with the last lines of the log. A
	 * second error with the same title and first frame counts in the first
	 * report.
	 */
	file(line: Line, entries: readonly Entry[]): void {
		const { stack = [], componentStack = [] } = framesOfDetail(line.detail)

		const same = this.entries.find(
			(report) => report.title === line.text && report.stack[0] === stack[0],
		)

		if (same)
			this.commit(
				this.entries.map((report) =>
					report === same ? { ...same, count: same.count + 1 } : report,
				),
			)
		else this.commit([...this.entries, this.report(line.text, stack, componentStack, entries)])
	}

	/** Files a report of the page now. */
	capture(entries: readonly Entry[]): void {
		this.commit([...this.entries, this.report('capture', [], [], entries)])
	}

	remove(id: number): void {
		this.commit(this.entries.filter((report) => report.id !== id))
	}

	/**
	 * Keeps the element of each `pointerdown` and each `focusin` outside the
	 * debug tools, and returns a function that stops. `skip` tells when the
	 * events are in the tools, such as while a debug sheet is on screen.
	 */
	watch(skip: () => boolean): () => void {
		const remember = (event: Event) => {
			const { target } = event

			if (!(target instanceof Element) || skip() || target.closest(`[${OWN}]`)) return

			const ref = new WeakRef(target)

			if (event.type === 'pointerdown') this.pointer = ref
			else this.focus = ref
		}

		const options = { capture: true, passive: true }

		document.addEventListener('pointerdown', remember, options)

		document.addEventListener('focusin', remember, options)

		return () => {
			document.removeEventListener('pointerdown', remember, options)

			document.removeEventListener('focusin', remember, options)
		}
	}

	private report(
		title: string,
		stack: string[],
		componentStack: string[],
		entries: readonly Entry[],
	): Report {
		const trail = entries.slice(-TRAIL)

		const width = kindWidth(trail)

		const pointer = this.pointer?.deref()

		const focus = this.focus?.deref()

		return {
			id: Math.max(0, ...this.entries.map(({ id }) => id)) + 1,
			title,
			stack,
			componentStack,
			count: 1,
			at: new Date().toISOString(),
			page: location.pathname + location.search + location.hash,
			build: new URL(import.meta.url).pathname.split('/').at(-1) ?? '',
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

/** The stack and the component stack in the detail of an error line. */
function framesOfDetail(detail: unknown): { stack?: string[]; componentStack?: string[] } {
	return typeof detail === 'object' && detail !== null && !Array.isArray(detail) ? detail : {}
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

	let scroller = element.parentElement

	while (scroller && !/auto|scroll/.test(getComputedStyle(scroller).overflowY))
		scroller = scroller.parentElement

	return `${names.join(' > ')} at ${box[0]},${box[1]} ${box[2]}×${box[3]}${scroller ? `, in ${describe(scroller)} scrolled ${Math.round(scroller.scrollTop)}` : ''}`
}
