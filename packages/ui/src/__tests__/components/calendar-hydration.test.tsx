import type { ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { Calendar } from '../../components/calendar'
import { LocaleProvider } from '../../providers/locale'
import { act, attach, flushAnnouncer, liveRegion, screen } from '../helpers'
import { hydrate, OTHER_DATE_MARK, serverMarkup, writeOtherDateText } from '../helpers/hydrate'

/** The server clock: October 1 in UTC, the zone of the test run. */
const SERVER_NOW = new Date('2026-10-01T02:00:00Z')

/** The client clock, seven hours earlier: September 30, as in Los Angeles. */
const CLIENT_NOW = new Date('2026-09-30T19:00:00Z')

/**
 * Renders `element` to server markup at the server clock. Then it hydrates that
 * markup at the client clock, one month earlier.
 *
 * @returns The server markup and two spies. A text or a node mismatch reaches
 * `onRecoverableError`, and React logs an attribute mismatch to `consoleError`.
 */
function hydrateAcrossMonths(element: ReactElement) {
	vi.useFakeTimers({ toFake: ['Date'] })

	vi.setSystemTime(SERVER_NOW)

	const html = renderToString(element)

	const container = attach(document.createElement('div'))

	container.innerHTML = html

	vi.setSystemTime(CLIENT_NOW)

	const { onRecoverableError, consoleError } = hydrate(container, element)

	return { html, onRecoverableError, consoleError }
}

describe('Calendar hydration with no value and no defaultValue', () => {
	it('hydrates across a month boundary with no mismatch, then shows the client month', () => {
		const { onRecoverableError, consoleError } = hydrateAcrossMonths(<Calendar />)

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(consoleError).not.toHaveBeenCalled()

		expect(screen.getByRole('listbox', { name: 'September 2026' })).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'September 2026' })).toBeInTheDocument()

		expect(screen.getAllByRole('option')).toHaveLength(30)
	})

	it('puts the header and the weekday row in the server markup, and no month', () => {
		const { html } = hydrateAcrossMonths(<Calendar />)

		expect(html).toContain('aria-label="Previous month"')

		expect(html).toContain('>Sun<')

		expect(html).not.toContain('2026')

		expect(html).not.toContain('role="option"')
	})

	it('reports no month change and announces no month when the month appears', async () => {
		const onMonthChange = vi.fn()

		hydrateAcrossMonths(<Calendar onMonthChange={onMonthChange} />)

		// Wait past the announcer's first write before the check.
		await act(async () => {})

		await flushAnnouncer()

		expect(onMonthChange).not.toHaveBeenCalled()

		expect(liveRegion()?.textContent ?? '').toBe('')
	})
})

describe('Calendar hydration with a seed', () => {
	it.each([
		['value', <Calendar key="value" value={new Date(2025, 5, 15)} />],
		['defaultValue', <Calendar key="default" defaultValue={new Date(2025, 5, 15)} />],
	])('puts the %s month in the server markup, and hydrates it with no mismatch', (_, element) => {
		const { html, onRecoverableError, consoleError } = hydrateAcrossMonths(element)

		expect(html).toContain('role="option"')

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(consoleError).not.toHaveBeenCalled()

		expect(screen.getAllByRole('option')).toHaveLength(30)
	})
})

// The text of `Intl` comes from the date data of the JavaScript engine, and the
// engine of a browser can write other text than the engine of the server.
describe('Calendar hydration when the browser writes other date text', () => {
	const element = (
		<LocaleProvider locale="en-US">
			<Calendar value={new Date(2025, 5, 15)} />
		</LocaleProvider>
	)

	it('puts a skeleton of each label in the server markup, and no date text of Intl', () => {
		const server = serverMarkup(element)

		const header = server.querySelector('[data-slot="calendar-header"]')

		expect(header?.querySelector('[data-slot="placeholder"]')).toHaveTextContent('June 2025')

		expect(server.querySelectorAll('[data-slot="placeholder"]')).toHaveLength(8)

		expect(server.querySelector('[role="listbox"]')?.getAttribute('aria-label')).toBe('')

		for (const day of server.querySelectorAll('[role="option"]')) {
			expect(day).not.toHaveAttribute('aria-label')
		}
	})

	it('hydrates with no mismatch, then shows the labels of the browser', () => {
		const container = attach(serverMarkup(element))

		writeOtherDateText()

		const { onRecoverableError, consoleError } = hydrate(container, element)

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(consoleError).not.toHaveBeenCalled()

		expect(container.querySelector('[data-slot="placeholder"]')).toBeNull()

		expect(screen.getByRole('listbox', { name: `June 2025${OTHER_DATE_MARK}` })).toBeInTheDocument()

		expect(screen.getByText(`Sun${OTHER_DATE_MARK}`)).toBeInTheDocument()

		expect(
			screen.getByRole('option', { name: `Sunday, June 15, 2025${OTHER_DATE_MARK}` }),
		).toBeInTheDocument()
	})
})
