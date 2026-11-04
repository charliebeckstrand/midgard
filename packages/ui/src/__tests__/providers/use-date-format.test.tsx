import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DateTime } from '../../components/date-time'
import { LocaleProvider } from '../../providers/locale'
import { renderUI, screen } from '../helpers'
import { hydrateServerRender } from '../helpers/hydrate'

/** A kickoff: Sunday 1:00 PM in New York, and 5:00 PM in UTC, the zone of the test run. */
const KICKOFF = '2026-10-04T17:00:00Z'

const KICKOFF_FORMAT = { weekday: 'short', hour: 'numeric', minute: '2-digit' } as const

describe('DateTime', () => {
	it('renders a skeleton line on the server in the zone of the reader, then the date after hydration', () => {
		const element = (
			<LocaleProvider locale="en-US">
				<DateTime value={KICKOFF} format={KICKOFF_FORMAT} />
			</LocaleProvider>
		)

		const { html, container, onRecoverableError, consoleError } = hydrateServerRender(element)

		expect(html).toContain('data-slot="placeholder"')

		expect(html).not.toContain('PM')

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(consoleError).not.toHaveBeenCalled()

		const time = container.querySelector('time')

		expect(time).toHaveTextContent(/^Sun,? 5:00 PM$/)

		expect(time).toHaveAttribute('datetime', '2026-10-04T17:00:00.000Z')
	})

	it('gives the same text on the server and after hydration in the zone of the provider', () => {
		const element = (
			<LocaleProvider locale="en-US" timeZone="America/New_York">
				<DateTime value={KICKOFF} format={KICKOFF_FORMAT} />
			</LocaleProvider>
		)

		const { html, container, onRecoverableError } = hydrateServerRender(element)

		expect(html).toMatch(/Sun,? 1:00 PM/)

		expect(onRecoverableError).not.toHaveBeenCalled()

		expect(container.querySelector('time')).toHaveTextContent(/^Sun,? 1:00 PM$/)
	})

	it('keeps the zone of the format over the zone of the provider', () => {
		const element = (
			<LocaleProvider locale="en-US" timeZone="Asia/Tokyo">
				<DateTime value="2026-10-04T00:00:00Z" format={{ dateStyle: 'medium', timeZone: 'UTC' }} />
			</LocaleProvider>
		)

		expect(renderToString(element)).toContain('Oct 4, 2026')

		const { container, onRecoverableError } = hydrateServerRender(element)

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
