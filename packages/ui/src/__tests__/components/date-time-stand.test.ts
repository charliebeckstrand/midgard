// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { standText } from '../../components/date-time/date-time-stand'

// The skeleton text is written without `Intl`, so each engine writes the same
// text. In English, it has the shape of the text of `Intl`, so the skeleton has
// the size of the date that replaces it. These cases compare it with the text
// of the engine of the test run.
const formats: Intl.DateTimeFormatOptions[] = [
	{},
	{ dateStyle: 'full' },
	{ dateStyle: 'long' },
	{ dateStyle: 'medium' },
	{ dateStyle: 'short' },
	{ timeStyle: 'short' },
	{ timeStyle: 'medium' },
	{ dateStyle: 'medium', timeStyle: 'short' },
	{ dateStyle: 'short', timeStyle: 'short' },
	{ weekday: 'short', hour: 'numeric', minute: '2-digit' },
	{ month: 'short', day: 'numeric' },
	{ month: 'long', year: 'numeric' },
	{ month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' },
	{ weekday: 'long', month: 'long', day: 'numeric' },
	{ hour: 'numeric', minute: '2-digit', hour12: false },
	{ year: 'numeric', month: '2-digit', day: '2-digit' },
]

const dates = ['2026-11-04T01:00:00Z', '2026-10-04T17:05:09Z', '2026-01-31T12:00:00Z']

describe('standText', () => {
	it.each(formats)('has the shape of the English text of Intl: %o', (format) => {
		for (const value of dates) {
			const date = new Date(value)

			const engine = new Intl.DateTimeFormat('en-US', { ...format, timeZone: 'UTC' }).format(date)

			expect(standText(date, format)).toBe(engine.replace(/\u202f/g, ' '))
		}
	})

	it('names the zone where the format asks for it', () => {
		const date = new Date('2026-11-04T01:00:00Z')

		expect(standText(date, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })).toBe(
			'1:00 AM UTC',
		)
	})
})
