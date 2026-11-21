import { afterEach, describe, expect, onTestFinished, vi } from 'vitest'
import { halt, start } from '../../modules/events/engine/events-recorder'
import { formatMarkdown } from '../../modules/events/engine/events-report'
import { getSendState, hasSendPort, sendReport } from '../../modules/events/engine/events-send'
import { startEvents } from '../../modules/events/engine/events-setting'
import { reportBug } from '../../modules/events/engine/events-sink'
import { MASK_ATTRIBUTE } from '../../modules/events/engine/events-target'
import type { EventEntry, EventReport, EventReportExport } from '../../modules/events/engine/types'
import { attach } from '../helpers/attach'
import { deferred } from '../helpers/deferred'
import { it } from '../helpers/fake-clock'

afterEach(() => {
	halt()
})

/** Gives `port` to the options of the events for the test. */
async function givePort(port: (report: EventReportExport) => Promise<unknown>) {
	await startEvents({ sendReport: port })

	onTestFinished(() => startEvents())
}

/** The newest event with a report, after a bug with `message`. */
function makeReport(message: string): EventEntry & { report: EventReport } {
	const store = start()

	reportBug(new Error(message))

	const entry = store.entries.findLast(({ report }) => report)

	if (!entry?.report) throw new Error('no report')

	return { ...entry, report: entry.report }
}

describe('sendReport', () => {
	it('does nothing while the app gives no port', async () => {
		const entry = makeReport('boom')

		expect(hasSendPort()).toBe(false)

		await expect(sendReport(entry)).resolves.toBe('idle')

		expect(getSendState(entry.report.hash)).toBe('idle')
	})

	it('gives the port the title, the text that Copy writes, and a copy of the report', async () => {
		const port = vi.fn<(report: EventReportExport) => Promise<void>>().mockResolvedValue()

		await givePort(port)

		const entry = makeReport('boom')

		await expect(sendReport(entry)).resolves.toBe('sent')

		const sent = port.mock.calls[0]?.[0]

		expect(sent?.title).toBe('caught boom')

		expect(sent?.text).toBe(formatMarkdown(entry))

		expect(sent?.report).toEqual(entry.report)

		expect(sent?.report).not.toBe(entry.report)
	})

	it('sends the masked trail of a password field, as Copy does', async () => {
		const port = vi.fn<(report: EventReportExport) => Promise<void>>().mockResolvedValue()

		await givePort(port)

		start()

		const password = attach(document.createElement('input'))

		password.type = 'password'

		password.value = 'hunter2'

		password.dispatchEvent(new Event('input', { bubbles: true }))

		await sendReport(makeReport('boom'))

		const sent = port.mock.calls[0]?.[0]

		expect(sent?.text).toContain('input=***')

		expect(JSON.stringify(sent)).not.toContain('hunter2')
	})

	it('sends the masked trail of the card, one-time-code, and mask fields, as Copy does', async () => {
		const port = vi.fn<(report: EventReportExport) => Promise<void>>().mockResolvedValue()

		await givePort(port)

		start()

		const secrets = {
			'cc-number': '4242424242424242',
			'cc-exp': '12/34',
			'cc-csc': '987',
			'one-time-code': '654321',
		}

		for (const [autocomplete, secret] of Object.entries(secrets)) {
			const field = attach(document.createElement('input'))

			field.setAttribute('autocomplete', autocomplete)

			field.value = secret

			field.dispatchEvent(new KeyboardEvent('keydown', { key: '9', code: 'Digit9', bubbles: true }))

			field.dispatchEvent(new Event('input', { bubbles: true }))
		}

		const form = attach(document.createElement('form'))

		form.setAttribute(MASK_ATTRIBUTE, '')

		const field = form.appendChild(document.createElement('input'))

		field.value = 'mjolnir'

		field.dispatchEvent(new Event('input', { bubbles: true }))

		const note = form.appendChild(document.createElement('textarea'))

		note.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', code: 'KeyQ', bubbles: true }))

		await sendReport(makeReport('boom'))

		const sent = JSON.stringify(port.mock.calls[0]?.[0])

		for (const secret of [...Object.values(secrets), 'mjolnir']) expect(sent).not.toContain(secret)

		expect(sent).not.toContain('keydown 9')

		expect(sent).not.toContain('keydown q')

		expect(sent).toContain('keydown *** textarea')
	})

	it('sends a report one time, while the send runs and after it succeeds', async () => {
		const send = deferred()

		const port = vi.fn(() => send.promise)

		await givePort(port)

		const entry = makeReport('boom')

		const first = sendReport(entry)

		expect(getSendState(entry.report.hash)).toBe('sending')

		await expect(sendReport(entry)).resolves.toBe('sending')

		send.resolve()

		await expect(first).resolves.toBe('sent')

		await expect(sendReport(entry)).resolves.toBe('sent')

		expect(port).toHaveBeenCalledTimes(1)
	})

	it('fails on a rejection or a throw, and sends again on the next call', async () => {
		const port = vi
			.fn<(report: EventReportExport) => Promise<void>>()
			.mockImplementationOnce(() => {
				throw new Error('no network')
			})
			.mockRejectedValueOnce(new Error('403'))
			.mockResolvedValueOnce()

		await givePort(port)

		const entry = makeReport('boom')

		await expect(sendReport(entry)).resolves.toBe('failed')

		await expect(sendReport(entry)).resolves.toBe('failed')

		expect(getSendState(entry.report.hash)).toBe('failed')

		await expect(sendReport(entry)).resolves.toBe('sent')

		expect(port).toHaveBeenCalledTimes(3)
	})
})
