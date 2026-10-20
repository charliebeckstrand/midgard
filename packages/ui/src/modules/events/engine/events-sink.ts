import type { ErrorInfo } from 'react'
import type { JsonValue } from '../../../components/json-tree/types'
import { formatBugText } from './events-probes'
import type { EventStore } from './events-store'
import type { EventKind, EventNote, EventOrigin } from './types'

// The sink of the events: what the recorder gives while it runs. The calls of
// an app, such as `recordEvent` and the callbacks of a React root, write to
// it. While the recorder does not run, the sink is empty, so a call costs
// nothing, and this module loads no part of the recorder.

/** What the recorder gives while it runs. */
export type EventSink = { note: EventNote; store: EventStore }

let sink: EventSink | undefined

/** Sets the sink while the recorder runs, or empties it. @internal */
export function setEventSink(next: EventSink | undefined): void {
	sink = next
}

/** The sink while the recorder runs. @internal */
export function getEventSink(): EventSink | undefined {
	return sink
}

/**
 * Records an event of the app, such as the end of a sync, while the events
 * run. A call while the events do not run does nothing.
 *
 * @param kind - The kind column of the line, such as `sync`.
 * @param text - The text of the line.
 * @param detail - The data that the line opens to. Copy writes it as JSON.
 */
export function recordEvent(kind: EventKind, text: string, detail?: JsonValue): void {
	sink?.note({ kind, text, detail })
}

/** What an app tells about a bug that it catches. */
export type ReportBugInfo = {
	/**
	 * The channel of the bug.
	 *
	 * @defaultValue `'caught'`
	 */
	origin?: EventOrigin
	/** The component stack of a React error, such as the `componentStack` of `ErrorInfo`. */
	componentStack?: string
	/** The route pattern of a router error. */
	route?: string
}

/**
 * Reports a bug that an error channel of the app catches, such as the error
 * boundary of a Next.js `error.tsx`, while the events run. The bug shows in
 * the Bugs list with its report. A value that a second channel reports again
 * adds to the first report, and adds no event.
 *
 * @param error - The thrown value.
 * @param info - The channel, and the component stack or the route.
 */
export function reportBug(error: unknown, info: ReportBugInfo = {}): void {
	const { origin = 'caught', componentStack, route } = info

	sink?.note({
		kind: 'error',
		text: formatBugText(origin, error, componentStack),
		bug: { origin, error, componentStack, route },
	})
}

/** The `componentStack` of a React error info, which a recoverable error can lack. */
type RootErrorInfo = Pick<ErrorInfo, 'componentStack'>

/**
 * The error callbacks of a React root: give them to `createRoot` or
 * `hydrateRoot`. Each one reports the bug with the channel that React names,
 * then does what the default of React does: an uncaught or a recoverable
 * error goes to `reportError`, and a caught error goes to `console.error`.
 *
 * @example
 * ```tsx
 * hydrateRoot(document, <App />, eventsRootOptions)
 * ```
 */
export const eventsRootOptions = {
	onUncaughtError(error: unknown, info: RootErrorInfo): void {
		reportBug(error, { origin: 'uncaught', componentStack: info.componentStack ?? undefined })

		reportError(error)
	},
	onCaughtError(error: unknown, info: RootErrorInfo): void {
		reportBug(error, { origin: 'caught', componentStack: info.componentStack ?? undefined })

		console.error(error)
	},
	onRecoverableError(error: unknown, info: RootErrorInfo): void {
		reportBug(error, { origin: 'recoverable', componentStack: info.componentStack ?? undefined })

		reportError(error)
	},
}
