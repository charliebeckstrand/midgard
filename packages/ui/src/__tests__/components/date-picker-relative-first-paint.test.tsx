// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DatePicker } from '../../components/date-picker'

/**
 * The relative picker defers its reference instant to mount, because a
 * server-rendered instant can resolve a preset against a different day than the
 * client does. The committed value must not be deferred with it: a span carries an
 * absolute range that reads the same on both sides, and `relativeChips` falls back
 * to that range while there is no instant to match a preset against.
 *
 * Server-rendered because that is the only place the pre-mount render is
 * observable — jsdom flushes the mount effect before a query can read the trigger.
 */
describe('DatePicker (relative) first paint', () => {
	const SPAN = [{ from: new Date(2026, 0, 1), to: new Date(2026, 0, 31) }]

	it('renders a committed span as its absolute range, not the placeholder', () => {
		const html = renderToStaticMarkup(
			<DatePicker relative={{ chips: false }} value={SPAN} placeholder="Any time" />,
		)

		expect(html).toContain('1/1/2026')

		// The defect this pins: the placeholder beside an enabled Clear, each
		// contradicting the other about whether anything is selected.
		expect(html).not.toContain('Any time')
	})

	it('renders the placeholder when nothing is committed', () => {
		const html = renderToStaticMarkup(<DatePicker relative placeholder="Any time" />)

		expect(html).toContain('Any time')
	})
})
