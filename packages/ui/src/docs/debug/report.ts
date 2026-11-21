import type { EventReportExport } from 'ui/events'

// The demo port of the docs, which shows Send in the view of a report. An app
// gives the adapter of its own tracker here, such as a call that opens an
// issue with the title and the text. The docs have no tracker, so the port
// writes the report to the console.

/** The time of the demo send, so the view shows the state of a send that runs. */
const DELAY = 800

/**
 * Sends a report to the console after a short delay. It fails while the
 * browser is offline, as a call to a tracker does, so the view can show a
 * send that fails.
 */
export function sendReport({ title, text }: EventReportExport): Promise<void> {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			if (!navigator.onLine) {
				reject(new Error('The browser is offline'))

				return
			}

			console.info(`Report sent: ${title}\n\n${text}`)

			resolve()
		}, DELAY)
	})
}
