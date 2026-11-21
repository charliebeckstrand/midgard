import { createEmitter } from '../../../utilities/emitter'
import { createReportExport } from './events-report'
import { getEventsOptions } from './events-setting'
import type { EventEntry, EventReport } from './types'

// The sends of the reports to the issue tracker of the app. The state of a
// send is in this module, by the hash of its report, so it stays through a
// close of the view, and a report that the tracker holds goes out one time.

/** The state of the send of one report. A report with no send is `idle`. @internal */
export type SendState = 'idle' | 'sending' | 'sent' | 'failed'

/** The state of each report that a send started for, by its hash. */
const states = new Map<string, SendState>()

const changes = createEmitter()

function setState(hash: string, state: SendState): void {
	states.set(hash, state)

	changes.emit()
}

/** Whether the app gives a port that sends a report (`sendReport` of `startEvents`). @internal */
export function hasSendPort(): boolean {
	return getEventsOptions().sendReport !== undefined
}

/** The state of the send of the report with `hash`. @internal */
export function getSendState(hash: string): SendState {
	return states.get(hash) ?? 'idle'
}

/** Calls `listener` on each change of the state of a send. @internal */
export const subscribeSends = changes.subscribe

/**
 * Sends the report of `entry` through the port of the app. A report that a
 * send holds, or that the tracker holds, does not go again, so a second press
 * files no duplicate. A send that fails can go again. The promise resolves to
 * the state at the end of the send, and it does not reject.
 *
 * @internal
 */
export async function sendReport(entry: EventEntry & { report: EventReport }): Promise<SendState> {
	const { hash } = entry.report

	const port = getEventsOptions().sendReport

	const state = getSendState(hash)

	if (!port || state === 'sending' || state === 'sent') return state

	setState(hash, 'sending')

	// A port that throws before it returns a promise fails as a rejection does.
	const next = await Promise.resolve()
		.then(() => port(createReportExport(entry)))
		.then(
			(): SendState => 'sent',
			(): SendState => 'failed',
		)

	setState(hash, next)

	return next
}
