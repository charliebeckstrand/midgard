import { readCookie, writeCookie } from '../../../utilities/cookie'
import { createEmitter } from '../../../utilities/emitter'
import { noop } from '../../../utilities/noop'
import { getStorage, readStorage, writeStorage } from './events-storage'
import type { EventSource } from './types'

// The settings of the events: whether they run, and whether the panel is
// pinned. They are in `localStorage`, so they stay for the next visit, with a
// copy in a cookie for a server. The server writes them as attributes of the
// root element ({@link eventsRootAttributes}), so CSS shows the header button
// and the pinned panel in the first paint. This module loads no part of the
// recorder until the events run.

/**
 * A setting: its `localStorage` key, and the cookie that holds a copy of it,
 * so a server that renders per request can read it ({@link eventsRootAttributes}).
 */
type Setting = { key: string; cookie: string }

/** The setting that runs the events. */
const ON: Setting = { key: 'events:on', cookie: 'events-on' }

/** The setting of the pinned panel. */
const PINNED: Setting = { key: 'events:pinned', cookie: 'events-pinned' }

/** The attribute of the root element while the events run. CSS shows the header button by it. */
const ON_ATTRIBUTE = 'data-events'

/** The attribute of the root element while the panel is pinned. CSS shows the pinned panel by it while the sidebar layout is inline. */
const PINNED_ATTRIBUTE = 'data-events-pinned'

/** The attribute of the root element while a capture runs. CSS makes the icon of the header button red by it. @internal */
export const CAPTURE_ATTRIBUTE = 'data-events-capture'

/** The attribute of the root element while the store holds a report. CSS shows the dot of the header button by it. @internal */
export const REPORTS_ATTRIBUTE = 'data-events-reports'

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

const onChanges = createEmitter()

const pinnedChanges = createEmitter()

/** The options of the last `startEvents`. @internal */
export function getEventsOptions(): StartEventsOptions {
	return options
}

/** Whether the setting runs the events. */
export function isEventsOn(): boolean {
	return readLocal(ON)
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

	// A setting from before the cookies, or one whose cookie expired, reaches
	// the server again.
	writeMirror(ON, isEventsOn())

	writeMirror(PINNED, isEventsPinned())

	// The server writes the attributes from the cookies, which can disagree
	// with the storage, so they follow the storage on each path.
	syncAttributes()

	if (!isEventsOn()) return Promise.resolve()

	return loadRecorder().then(({ start }) => {
		start(options)
	}, noop)
}

/**
 * Turns the setting on or off, and starts or stops the events of this page.
 * Off drops the events and the kept copy. The events follow the stored
 * setting, so they stay off where the storage throws.
 */
export function setEventsOn(on: boolean): void {
	writeLocal(ON, on)

	syncAttributes()

	onChanges.emit()

	void loadRecorder().then(({ start, halt }) => (isEventsOn() ? start(options) : halt()), noop)
}

/** Calls `listener` on each change of the setting that runs the events. @internal */
export const subscribeEventsOn = onChanges.subscribe

/** Whether the panel is pinned. @internal */
export function isEventsPinned(): boolean {
	return readLocal(PINNED)
}

/** Pins or unpins the panel, and tells the listeners. @internal */
export function setEventsPinned(pinned: boolean): void {
	writeLocal(PINNED, pinned)

	syncAttributes()

	pinnedChanges.emit()
}

/** Calls `listener` on each change of the pin. @internal */
export const subscribeEventsPinned = pinnedChanges.subscribe

/** The number of pinned panels that are mounted. An app with no `EventsAside` has none. */
let docks = 0

const dockChanges = createEmitter()

/** Marks a pinned panel as mounted, and returns the function that removes the mark. @internal */
export function addEventsDock(): () => void {
	docks++

	dockChanges.emit()

	return () => {
		docks--

		dockChanges.emit()
	}
}

/** Whether a pinned panel is mounted, so a pin has a place to show the view. @internal */
export function hasEventsDock(): boolean {
	return docks > 0
}

/** Calls `listener` when a pinned panel mounts or unmounts. @internal */
export const subscribeEventsDocks = dockChanges.subscribe

/** Copies the settings to the attributes of the root element. */
function syncAttributes(): void {
	const root = document.documentElement

	const on = isEventsOn()

	root.toggleAttribute(ON_ATTRIBUTE, on)

	root.toggleAttribute(PINNED_ATTRIBUTE, on && isEventsPinned())
}

/** The `localStorage` of the page. The settings are off where the storage throws, such as with site data off. */
const local = () => getStorage(() => localStorage)

function readLocal({ key }: Setting): boolean {
	return readStorage(local(), key) === '1'
}

/** Writes the cookie of `setting` from `on`. */
function writeMirror({ cookie }: Setting, on: boolean): void {
	writeCookie(cookie, on ? '1' : '0')
}

/** Writes `setting` from `on`, and its cookie from the stored setting, so the two agree where the storage throws. */
function writeLocal(setting: Setting, on: boolean): void {
	writeStorage(local(), setting.key, on ? '1' : null)

	writeMirror(setting, readLocal(setting))
}

/**
 * The attributes of the root element for the settings in `cookies`, the
 * `Cookie` header of a request. A server that renders per request writes them
 * on `<html>`, so CSS shows the header button and the pinned panel in the
 * first paint with no script. A capture runs in one tab, so the server cannot
 * know it, and its attribute comes at hydration.
 *
 * @internal
 */
export function eventsRootAttributes(cookies: string): string[] {
	if (readCookie(ON.cookie, cookies) !== '1') return []

	return readCookie(PINNED.cookie, cookies) === '1'
		? [ON_ATTRIBUTE, PINNED_ATTRIBUTE]
		: [ON_ATTRIBUTE]
}
