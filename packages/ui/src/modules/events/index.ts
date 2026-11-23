/**
 * A log of component events, shown in a pinned panel that a header button
 * opens.
 *
 * @packageDocumentation
 */

export { postReport } from './engine/events-post'
export {
	isEventsOn,
	type StartEventsOptions,
	setEventsOn,
	startEvents,
} from './engine/events-setting'
export {
	eventsRootOptions,
	type ReportBugInfo,
	recordEvent,
	reportBug,
} from './engine/events-sink'
export type {
	EventBug,
	EventEntry,
	EventKind,
	EventLine,
	EventNote,
	EventOrigin,
	EventReport,
	EventReportExport,
	EventSource,
	EventViewport,
} from './engine/types'
export { EventsAside } from './events-aside'
export { EventsButton } from './events-button'
export { EventsSwitch } from './events-switch'
