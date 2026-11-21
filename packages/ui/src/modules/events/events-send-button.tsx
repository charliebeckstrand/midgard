'use client'

import { useSyncExternalStore } from 'react'
import { Button } from '../../components/button'
import { announce } from '../../core/announcer'
import { useIntl } from '../../primitives/intl/use-intl'
import { getSendState, type SendState, sendReport, subscribeSends } from './engine/events-send'
import { eventsMessages } from './events-messages'
import type { ReportEntry } from './events-report-list'

/** The label of each state of a send. */
const messageByState = {
	idle: eventsMessages.send,
	sending: eventsMessages.sending,
	sent: eventsMessages.sent,
	failed: eventsMessages.sendFailed,
} as const satisfies Record<SendState, unknown>

/** The color of each state of a send. */
const colorByState = {
	idle: undefined,
	sending: undefined,
	sent: 'green',
	failed: 'red',
} as const satisfies Record<SendState, string | undefined>

/**
 * A button with the text label "Send" that sends the report of `entry`
 * through the `sendReport` of the app. While the send runs, it shows the
 * loading state and keeps the focus. Then it shows "Sent" in green, or "Send
 * failed" in red, and the live region speaks the result, because a screen
 * reader does not speak a change of the label of a focused control. A press
 * on "Send failed" sends again. A press on "Sent" does nothing, so the tracker
 * gets one copy of the report.
 *
 * @internal
 */
export function EventsSendButton({ entry }: { entry: ReportEntry }) {
	const intl = useIntl()

	const { hash } = entry.report

	const state = useSyncExternalStore(
		subscribeSends,
		() => getSendState(hash),
		() => 'idle' as const,
	)

	const send = async () => {
		const next = await sendReport(entry)

		if (next === 'sent') announce(intl.formatMessage(eventsMessages.sent))

		if (next === 'failed')
			announce(intl.formatMessage(eventsMessages.sendFailed), { assertive: true })
	}

	return (
		<Button
			size="sm"
			color={colorByState[state]}
			loading={state === 'sending'}
			onClick={() => void send()}
		>
			{intl.formatMessage(messageByState[state])}
		</Button>
	)
}
