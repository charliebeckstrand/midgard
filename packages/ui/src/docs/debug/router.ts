import {
	type ClientInstrumentation,
	type ClientOnErrorFunction,
	isRouteErrorResponse,
} from 'react-router'
import { recordEvent, reportBug } from 'ui/events'

// The adapter of React Router for the events: the bugs that the router
// reports, and the navigations that it makes. The client entry gives both to
// `HydratedRouter`.

/**
 * Reports each error of a loader, an action, a middleware, or a render. A
 * response with a status under 500 that a route throws, such as a 404, is a
 * part of the design of the route, so it is an event and not a bug. A render
 * error also reaches the `onCaughtError` of the root, and the store adds the
 * route to the report of the same thrown value.
 */
const onError: ClientOnErrorFunction = (error, { pattern, errorInfo }) => {
	if (isRouteErrorResponse(error) && error.status < 500) {
		recordEvent('route', `response ${error.status} ${pattern}`)

		return
	}

	reportBug(error, {
		origin: 'route',
		route: pattern,
		componentStack: errorInfo?.componentStack ?? undefined,
	})
}

/**
 * Writes the start and the end of each navigation of the router: the target,
 * then the route pattern, the time that it took, and the error of a
 * navigation that fails. The browser writes back and forward (`popstate`).
 */
const navigations: ClientInstrumentation = {
	router(router) {
		router.instrument({
			async navigate(handler, { to }) {
				recordEvent('route', `navigate ${to}`)

				const start = performance.now()

				const { status, meta } = await handler()

				const time = Math.round(performance.now() - start)

				recordEvent(
					'route',
					`${status === 'error' ? 'navigate fails' : 'navigated'} ${meta?.pattern ?? to} ${time} ms`,
				)
			},
		})
	},
}

/** The props of `HydratedRouter` that report to the events. */
export const routerEvents = { onError, instrumentations: [navigations] }
