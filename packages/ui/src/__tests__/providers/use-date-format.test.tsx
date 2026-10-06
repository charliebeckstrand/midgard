import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { DateTime } from '../../components/date-time'
import { LocaleProvider } from '../../providers/locale'
import { resolveDateOptions } from '../../providers/locale/use-date-format'
import { act, attach, renderUI, screen } from '../helpers'

/** A kickoff: Sunday 1:00 PM in New York, and 5:00 PM in UTC, the zone of the test run. */
const KICKOFF = '2026-10-04T17:00:00Z'

const KICKOFF_FORMAT = { weekday: 'short', hour: 'numeric', minute: '2-digit' } as const

/**
 * Renders `element` to server markup, then hydrates that markup. The zone of
 * the test run (UTC) is the zone of the reader.
 *
 * @returns The container and two spies. A text mismatch reaches
 * `onRecoverableError`, and React logs other mismatches to `consoleError`.
 */
function hydrate(element: React.ReactElement) {
	const html = renderToString(element)

	const container = attach(document.createElement('div'))

	container.innerHTML = html

	const onRecoverableError = vi.fn()

	const consoleError = vi.spyOn(console, 'error')

	let root: Root | undefined

	act(() => {
		root = hydrateRoot(container, element, { onRecoverableError })
	})

	onTestFinished(() => act(() => root?.unmount()))

	return { html, container, onRecoverableError, consoleError }
}

describe('resolveDateOptions', () => {
	it('formats in the provider zone with its name before hydration', () => {
		expect(resolveDateOptions({ hour: 'numeric' }, false, 'America/New_York')).toEqual({
			hour: 'numeric',
			timeZone: 'America/New_York',
			timeZoneName: 'short',
		})
	})

	it('adds no zone name to a date with no time', () => {
		expect(resolveDateOptions({ month: 'short' }, false)).toEqual({
			month: 'short',
			timeZone: 'UTC',
		})
	})

	it('adds no zone name to a style format, because Intl does not mix the two', () => {
		const options = resolveDateOptions({ dateStyle: 'medium', timeStyle: 'short' }, false)

		expect(options.timeZoneName).toBeUndefined()

		expect(() => new Intl.DateTimeFormat('en-US', options)).not.toThrow()
	})

	it('keeps the options after hydration, so the zone of the reader applies', () => {
		expect(resolveDateOptions({ hour: 'numeric' }, true, 'America/New_York')).toEqual({
			hour: 'numeric',
		})
	})

	it('keeps a set zone in each render', () => {
		expect(resolveDateOptions({ day: 'numeric', timeZone: 'UTC' }, false, 'Asia/Tokyo')).toEqual({
			day: 'numeric',
			timeZone: 'UTC',
		})
	})
})

describe('DateTime', () => {
	it('renders the provider zone on the server, hydrates with no mismatch, then shows the zone of the reader', () => {
		const element = (
			<LocaleProvider locale="en-US" timeZone="America/New_York">
				<DateTime value={KICKOFF} format={KICKOFF_FORMAT} />
			</LocaleProvider>
		)

		const { html, container, onRecoverableError, consoleError } = hydrate(element)

		expect(html).toContain('Sun, 1:00 PM EDT')

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(consoleError).not.toHaveBeenCalled()

		const time = container.querySelector('time')

		expect(time).toHaveTextContent(/^Sun,? 5:00 PM$/)

		expect(time).toHaveAttribute('datetime', '2026-10-04T17:00:00.000Z')
	})

	it('keeps a set zone after hydration', () => {
		const element = (
			<LocaleProvider locale="en-US" timeZone="America/New_York">
				<DateTime value="2026-10-04T00:00:00Z" format={{ dateStyle: 'medium', timeZone: 'UTC' }} />
			</LocaleProvider>
		)

		const { container, onRecoverableError } = hydrate(element)

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(container.querySelector('time')).toHaveTextContent('Oct 4, 2026')
	})

	it('renders an empty span for an invalid value', () => {
		renderUI(<DateTime value="not a date" data-testid="when" />)

		const node = screen.getByTestId('when')

		expect(node.tagName).toBe('SPAN')

		expect(node).toBeEmptyDOMElement()
	})
})
