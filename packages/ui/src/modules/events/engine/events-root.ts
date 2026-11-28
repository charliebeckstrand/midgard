import { readCookie } from '../../../utilities/cookie'

// The settings of the events on the root element. A server reads them from
// the cookies of a request, so this module holds no browser code
// (`events-setting.ts` keeps the settings in the browser).

/**
 * A setting: its `localStorage` key, and the cookie that holds a copy of it,
 * so a server that renders per request can read it ({@link eventsRootAttributes}).
 *
 * @internal
 */
export type EventsSetting = { key: string; cookie: string }

/** The setting that runs the events. @internal */
export const ON: EventsSetting = { key: 'events:on', cookie: 'events-on' }

/** The setting of the pinned panel. @internal */
export const PINNED: EventsSetting = { key: 'events:pinned', cookie: 'events-pinned' }

/** The attribute of the root element while the events run. CSS shows the header button by it. @internal */
export const ON_ATTRIBUTE = 'data-events'

/** The attribute of the root element while the panel is pinned. CSS shows the pinned panel by it while the sidebar layout is inline. @internal */
export const PINNED_ATTRIBUTE = 'data-events-pinned'

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
