import { startEvents } from 'ui/events'
import { DOCS_SOURCES } from './sources.ts'

// The part of the events that the docs shell holds: the start of the store.
// The module `ui/events` holds the head script, the store, the header button,
// the sheet, the pinned panel, and the switch of the settings.

/** The options of the store of the docs: the sources of the docs, and the script calls that scroll or move the focus. */
const OPTIONS = { sources: DOCS_SOURCES, calls: true }

/**
 * Starts the store while the events run. The client entry waits for it
 * before it hydrates, so the store records from before hydration.
 */
export function startDebug(): Promise<void> {
	return startEvents(OPTIONS)
}
