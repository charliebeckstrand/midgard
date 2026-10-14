import type { JsonValue } from '../../../components/json-tree/types'

/**
 * The kind of an {@link EventEntry}. The kind column of the list shows it. An
 * app can record a kind of its own through `recordEvent`.
 */
export type EventKind =
	| 'load'
	| 'paint'
	| 'route'
	| 'input'
	| 'scroll'
	| 'viewport'
	| 'call'
	| 'overlay'
	| 'network'
	| 'error'
	| 'capture'
	| (string & {})

/**
 * The channel that reports a bug. Each origin is an error channel of React,
 * of a router, or of the browser, so the module does not guess what a bug is.
 *
 * - `uncaught`: the `onUncaughtError` of a React root. No error boundary
 *   caught the error, and React unmounted the tree.
 * - `caught`: the `onCaughtError` of a React root, or an error boundary of an
 *   app that calls `reportBug`.
 * - `recoverable`: the `onRecoverableError` of a React root, such as a
 *   hydration mismatch that React recovered from with a client render.
 * - `route`: the error handler of a router, such as a loader or an action
 *   that throws.
 * - `window`: an `error` or an `unhandledrejection` that reaches `window`,
 *   or a resource that fails to load.
 */
export type EventOrigin = 'uncaught' | 'caught' | 'recoverable' | 'route' | 'window'

/** The viewport of a report: the heights that place a surface fixed to an edge, in pixels, and the scroll position. */
export type EventViewport = {
	visual: { height: number; offsetTop: number }
	window: number
	svh: number
	dvh: number
	lvh: number
	safe: { top: number; bottom: number }
	y: number
}

/**
 * The report of a bug or of a capture: the snapshot of the page at the first
 * time of the bug, or at the end of the capture.
 */
export type EventReport = {
	/** A short hash that names the report, such as `3f9a0c1`. It stays the same through a reload and in a copy. */
	hash: string
	/** The channel of a bug, or `capture` for a capture. */
	origin: EventOrigin | 'capture'
	/** The frames of the stack of the error. */
	stack: string[]
	/** The frames of the component stack of an error that React reports. */
	componentStack: string[]
	/** The route pattern of an error that a router reports. */
	route?: string
	/** How many times the same bug occurs: the same text and the same first frame. */
	count: number
	/** The wall-clock time of the first time. */
	at: string
	/** The wall-clock time and the page of the start of a capture. */
	started?: string
	/** The path, the query, and the hash of the page. */
	page: string
	/** The file of the module, whose hash names the build that the frames come from. */
	build: string
	device: string
	/** The attributes of the root element: the settings of the app and the state of the tools. */
	root: string
	viewport: EventViewport
	/** The element of the last `pointerdown`, with its box and its scroll container. */
	pointer?: string
	/** The element of the last `focusin`, with its box and its scroll container. */
	focus?: string
	/** The lines before the bug, or the lines of the capture, as the columns and the text of each line. */
	trail: string[]
}

/** One event of the store. */
export type EventEntry = {
	/** The place of the event in the order that the store got it. */
	id: number
	/** Milliseconds from the start of the navigation of its page load (`performance.now()`). */
	time: number
	kind: EventKind
	text: string
	/** The scroll position of the page. */
	y: number
	/** The name that the kind column shows in place of the kind, such as the name of a component. */
	name?: string
	/**
	 * The data that the line does not hold in full, such as the arguments of a
	 * callback, a stack, or the fields of a reading. The list shows it under the
	 * line, and Copy writes it as JSON.
	 */
	detail?: JsonValue
	/**
	 * The batch of the event: the id of the one browser operation that the
	 * event is a part of, such as a tap from `pointerdown` to `click`. The
	 * events of a batch have one kind. With "Batch" on, the list shows them as
	 * one line that opens.
	 */
	batch?: string
	/** The report of a bug or of a capture. An event with a report shows in the Bugs list. */
	report?: EventReport
}

/** What a channel tells about a bug. */
export type EventBug = {
	origin: EventOrigin
	/** The thrown value. A second channel that reports the same value adds to the report of the first. */
	error?: unknown
	/** The component stack that React gives. */
	componentStack?: string
	/** The route pattern that a router gives. */
	route?: string
}

/** A line that a source writes. The time is now by default. */
export type EventLine = {
	kind: EventKind
	text: string
	detail?: JsonValue
	/** The time of the line, in milliseconds from the start of the navigation. */
	time?: number
	/** The scroll position of the line. It is the position of now by default. */
	y?: number
	/** The name that the kind column shows in place of the kind. */
	name?: string
	/** The batch of the line: the id of the browser operation that the line is a part of. */
	batch?: string
	/** The bug that the line reports. Only an error channel sets it. */
	bug?: EventBug
}

/** Writes a line to the store. */
export type EventNote = (line: EventLine) => void

/** One source of lines: it adds its listeners, and returns a function that removes them. */
export type EventSource = (note: EventNote) => () => void

/** The web storage subset that the store uses. A test gives a fake. */
export type EventStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
