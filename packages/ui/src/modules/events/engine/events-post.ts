import type { EventReportExport } from './types'

// The port that sends a report to an endpoint of the app. The endpoint holds
// the token of the tracker, so no token goes to the browser.

/**
 * A `sendReport` port that posts the report to `url` as JSON. The server of
 * the app reads it with `readReportExport` from `ui/server`, and files it in
 * the tracker. The promise rejects when the response is not 2xx, so the view
 * shows "Send failed".
 *
 * @param url - The endpoint of the app, such as `'/api/report'`.
 * @param init - More options of the request, such as a header for a CSRF token. The method and the body are fixed.
 * @example
 * ```ts
 * void startEvents({ sendReport: postReport('/api/report') })
 * ```
 */
export function postReport(
	url: string | URL,
	init: Omit<RequestInit, 'method' | 'body'> = {},
): (report: EventReportExport) => Promise<void> {
	return async (report) => {
		const headers = new Headers(init.headers)

		headers.set('content-type', 'application/json')

		const response = await fetch(url, {
			...init,
			headers,
			method: 'POST',
			body: JSON.stringify(report),
		})

		if (!response.ok) throw new Error(`The report endpoint answered ${response.status}`)
	}
}
