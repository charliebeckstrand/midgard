import { describe, expect, it, vi } from 'vitest'
import { DateTime } from '../../components/date-time'
import { LocaleProvider } from '../../providers/locale'
import { renderUI, screen } from '../helpers'
import { attach } from '../helpers/attach'
import { hydrate, hydrateServerRender, serverMarkup } from '../helpers/hydrate'

/** A kickoff: Sunday 1:00 PM in New York, and 5:00 PM in UTC, the zone of the test run. */
const KICKOFF = '2026-10-04T17:00:00Z'

const KICKOFF_FORMAT = { weekday: 'short', hour: 'numeric', minute: '2-digit' } as const

const WHEN = { dateStyle: 'medium', timeStyle: 'short' } as const

describe('DateTime', () => {
	it('renders a skeleton of the date in UTC on the server in the zone of the reader, then the date after hydration', () => {
		const element = (
			<LocaleProvider locale="en-US">
				<DateTime value={KICKOFF} format={KICKOFF_FORMAT} />
			</LocaleProvider>
		)

		const { html, container, onRecoverableError, consoleError } = hydrateServerRender(element)

		// The skeleton holds the date in UTC, hidden, only to give it the size of the text.
		expect(html).toMatch(/data-slot="placeholder" aria-hidden="true"[^>]*>Sun,? 5:00 PM</)

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(consoleError).not.toHaveBeenCalled()

		const time = container.querySelector('time')

		expect(time).toHaveTextContent(/^Sun,? 5:00 PM$/)

		expect(time).toHaveAttribute('datetime', '2026-10-04T17:00:00.000Z')
	})

	it('renders a skeleton on the server in the zone of the provider, then the date after hydration', () => {
		const element = (
			<LocaleProvider locale="en-US" timeZone="America/New_York">
				<DateTime value={KICKOFF} format={KICKOFF_FORMAT} />
			</LocaleProvider>
		)

		const { html, container, onRecoverableError } = hydrateServerRender(element)

		expect(html).toContain('data-slot="placeholder"')

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(container.querySelector('time')).toHaveTextContent(/^Sun,? 1:00 PM$/)
	})

	it('keeps the zone of the format over the zone of the provider', () => {
		const element = (
			<LocaleProvider locale="en-US" timeZone="Asia/Tokyo">
				<DateTime value="2026-10-04T00:00:00Z" format={{ dateStyle: 'medium', timeZone: 'UTC' }} />
			</LocaleProvider>
		)

		const { container, onRecoverableError } = hydrateServerRender(element)

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(container.querySelector('time')).toHaveTextContent('Oct 4, 2026')
	})

	// The date data of the engine of a browser can give other text than the date
	// data of the server, such as `at` between the day and the time. The server
	// markup and the hydration render therefore hold no text of `Intl`. With such
	// text, React rendered the tree again from the start.
	it.each([
		{ name: 'a set zone', format: { ...WHEN, timeZone: 'America/Chicago' } },
		{ name: 'the zone of the reader', format: WHEN },
	])('hydrates with $name when the browser writes other text than the server', ({ format }) => {
		const element = (
			<LocaleProvider locale="en-US">
				<DateTime value={KICKOFF} format={format} />
			</LocaleProvider>
		)

		const server = attach(serverMarkup(element))

		const prototype: { format: unknown } = Intl.DateTimeFormat.prototype

		vi.spyOn(prototype, 'format', 'get').mockReturnValue((date?: Date | number) =>
			new Date(date ?? 0).toISOString().replace('T', ' at '),
		)

		const { onRecoverableError } = hydrate(server, element)

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(server.querySelector('time')).toHaveTextContent('2026-10-04 at 17:00:00.000Z')
	})

	// The server wrote the text, so the server markup and the hydration render
	// hold it, and the browser does not format it again.
	it('shows the text of a DateText in the server markup and after hydration', () => {
		const text = { at: KICKOFF, text: 'Sun, Oct 4, 1:00 PM EDT' }

		const element = <DateTime value={text} format={KICKOFF_FORMAT} />

		const server = attach(serverMarkup(element))

		expect(server.querySelector('[data-slot="placeholder"]')).toBeNull()

		const prototype: { format: unknown } = Intl.DateTimeFormat.prototype

		vi.spyOn(prototype, 'format', 'get').mockReturnValue(() => 'other')

		const { onRecoverableError } = hydrate(server, element)

		expect(onRecoverableError).not.toHaveBeenCalled()

		const time = server.querySelector('time')

		expect(time).toHaveTextContent('Sun, Oct 4, 1:00 PM EDT')

		expect(time).toHaveAttribute('datetime', KICKOFF)
	})

	it('renders an empty span for an invalid value', () => {
		renderUI(<DateTime value="not a date" data-testid="when" />)

		const node = screen.getByTestId('when')

		expect(node.tagName).toBe('SPAN')

		expect(node).toBeEmptyDOMElement()
	})
})
