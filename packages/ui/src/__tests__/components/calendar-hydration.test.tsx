import type { ReactElement } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'

import { Calendar } from '../../components/calendar'
import { act, attach, liveRegion, screen } from '../helpers'

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

	const onRecoverableError = vi.fn()

	const consoleError = vi.spyOn(console, 'error')

	let root: Root | undefined

	act(() => {
		root = hydrateRoot(container, element, { onRecoverableError })
	})

	onTestFinished(() => act(() => root?.unmount()))

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

		// The announcer writes on a microtask.
		await act(async () => {})

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

		expect(html).toContain('June 2025')

		expect(html).toContain('role="option"')

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(consoleError).not.toHaveBeenCalled()

		expect(screen.getAllByRole('option')).toHaveLength(30)
	})
})
