import { createEmitter } from '../../../utilities/emitter'
import { noop } from '../../../utilities/noop'
import type { EventSource } from './types'

// The settings of the events: whether they run, and whether the panel is
// pinned. They are in `localStorage`, so they stay for the next visit. The
// pre-paint script of `EventsScript` copies them to attributes of the root
// element, so CSS shows the header button and the pinned panel in the first
// paint. This module loads no part of the recorder until the events run.

/** The `localStorage` key of the setting that runs the events. */
const ON = 'events:on'

/** The `localStorage` key of the pinned panel. */
const PINNED = 'events:pinned'

/** The attribute of the root element while the events run. CSS shows the header button by it. */
export const ON_ATTRIBUTE = 'data-events'

/** The attribute of the root element while the panel is pinned. CSS shows the pinned panel by it from `lg` up. */
export const PINNED_ATTRIBUTE = 'data-events-pinned'

/** The attribute of the root element while a capture runs. CSS shows the ring of the header button by it. */
export const CAPTURE_ATTRIBUTE = 'data-events-capture'

/** The attribute of the root element while the store holds a report. CSS shows the dot of the header button by it. */
export const REPORTS_ATTRIBUTE = 'data-events-reports'

/** The `sessionStorage` key of the capture that runs (`EventStore`). */
const CAPTURE = 'events:capture'

/** What an app gives to `startEvents`. */
export type StartEventsOptions = {
	/** The sources of the app, which run after the sources of the module, such as a source of the route changes. */
	sources?: readonly EventSource[]
	/**
	 * Records each script call that scrolls or moves the focus. It replaces
	 * methods of the page, so it is off by default.
	 *
	 * @defaultValue false
	 */
	calls?: boolean
}

/** The options of the last `startEvents`, which the switch and the sheet start with. */
let options: StartEventsOptions = {}

const loadRecorder = () => import('./events-recorder')

const pinnedChanges = createEmitter()

/** The options of the last `startEvents`. @internal */
export function getEventsOptions(): StartEventsOptions {
	return options
}

/** Whether the setting runs the events. */
export function isEventsOn(): boolean {
	return readLocal(ON) === '1'
}

/**
 * Starts the events of this page while the setting runs them. Call it in the
 * client entry, before the root hydrates, so the store records from the
 * start. It keeps `options` for `setEventsOn`. The promise resolves when the
 * recorder runs, or at once while the setting is off. A recorder that fails
 * to load leaves the events off for this page load, and the promise resolves,
 * so the page still hydrates.
 */
export function startEvents(next: StartEventsOptions = {}): Promise<void> {
	options = next

	if (!isEventsOn()) return Promise.resolve()

	syncAttributes()

	return loadRecorder().then(({ start }) => {
		start(options)
	}, noop)
}

/**
 * Turns the setting on or off, and starts or stops the events of this page.
 * Off drops the events and the kept copy.
 */
export function setEventsOn(on: boolean): void {
	writeLocal(ON, on)

	syncAttributes()

	void loadRecorder().then(({ start, halt }) => (on ? start(options) : halt()), noop)
}

/** Whether the panel is pinned. @internal */
export function isEventsPinned(): boolean {
	return readLocal(PINNED) === '1'
}

/** Pins or unpins the panel, and tells the listeners. @internal */
export function setEventsPinned(on: boolean): void {
	writeLocal(PINNED, on)

	syncAttributes()

	pinnedChanges.emit()
}

/** Calls `listener` on each change of the pin. @internal */
export const subscribePinned = pinnedChanges.subscribe

/** Copies the settings to the attributes of the root element. */
function syncAttributes(): void {
	const root = document.documentElement

	const on = isEventsOn()

	root.toggleAttribute(ON_ATTRIBUTE, on)

	root.toggleAttribute(PINNED_ATTRIBUTE, on && isEventsPinned())
}

/**
 * The pre-paint script: it copies the settings to the attributes of the root
 * element, and marks a capture that runs in this tab.
 */
export const SCRIPT = `(function(){try{var l=localStorage,r=document.documentElement;if(l.getItem(${JSON.stringify(ON)})!=='1')return;r.setAttribute(${JSON.stringify(ON_ATTRIBUTE)},'');if(l.getItem(${JSON.stringify(PINNED)})==='1')r.setAttribute(${JSON.stringify(PINNED_ATTRIBUTE)},'');if(sessionStorage.getItem(${JSON.stringify(CAPTURE)})!==null)r.setAttribute(${JSON.stringify(CAPTURE_ATTRIBUTE)},'')}catch(e){}})()`

// Storage access can throw, such as with site data off. The settings are
// then off.
function readLocal(key: string): string | null {
	try {
		return localStorage.getItem(key)
	} catch {
		return null
	}
}

function writeLocal(key: string, on: boolean): void {
	try {
		if (on) localStorage.setItem(key, '1')
		else localStorage.removeItem(key)
	} catch {}
}
