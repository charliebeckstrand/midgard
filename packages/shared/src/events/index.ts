import { recordEvent } from 'ui/events'

/** The kind of a navigation of the Next.js App Router, as `onRouterTransitionStart` gets it. */
type NavigationType = 'push' | 'replace' | 'traverse'

/**
 * The navigation hook of the Next.js client instrumentation. It records the
 * start of each navigation of the App Router as a route event, such as
 * `navigate /week/3`, while the events run. Next.js gives no route pattern
 * and no end of the navigation, so the event holds the URL only.
 *
 * @remarks
 * Each app re-exports it from its `instrumentation-client.ts`.
 */
export function onRouterTransitionStart(url: string, navigationType: NavigationType): void {
	recordEvent('route', `${navigationType === 'push' ? 'navigate' : navigationType} ${url}`)
}
