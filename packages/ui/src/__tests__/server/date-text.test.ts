// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { formatDateText } from '../../server/date-text'

// A server writes the text of a date one time, in a set zone, so the browser
// shows that text and does not write it again (CONVENTIONS §3.13).

const POLLS = '2026-11-04T01:00:00Z'

describe('formatDateText', () => {
	it('writes an instant in the zone of the format, in the source locale', () => {
		expect(
			formatDateText(POLLS, {
				dateStyle: 'medium',
				timeStyle: 'short',
				timeZone: 'America/Chicago',
			}),
		).toEqual({
			at: '2026-11-04T01:00:00.000Z',
			text: expect.stringMatching(/^Nov 3, 2026.*7:00\sPM$/),
		})
	})

	it('writes a span with the text of formatRange, and the start as its instant', () => {
		expect(
			formatDateText(['2026-09-25', '2026-09-28'], { dateStyle: 'medium', timeZone: 'UTC' }),
		).toEqual({
			at: '2026-09-25T00:00:00.000Z',
			text: expect.stringMatching(/^Sep 25\s–\s28, 2026$/),
		})
	})

	it('writes in the locale that the caller gives', () => {
		expect(formatDateText(POLLS, { dateStyle: 'long', timeZone: 'UTC' }, 'es')?.text).toBe(
			'4 de noviembre de 2026',
		)
	})

	it('gives null for an instant that does not parse', () => {
		expect(formatDateText('not a date', { timeZone: 'UTC' })).toBeNull()

		expect(formatDateText(['2026-09-25', 'not a date'], { timeZone: 'UTC' })).toBeNull()
	})
})
