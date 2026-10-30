// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	formatDateValue,
	maskDateText,
	parseDateText,
} from '../../components/date-input/date-input-utilities'

describe('maskDateText', () => {
	it.for([
		['keeps a single ambiguous month digit open', 'MM/DD/YYYY', '1', '1'],
		['closes a complete month with the separator', 'MM/DD/YYYY', '12', '12/'],
		['pads and closes a month digit that cannot start a two-digit month', 'MM/DD/YYYY', '2', '02/'],
		['carries the overflowing digit into the day', 'MM/DD/YYYY', '13', '01/3'],
		['pads a short month closed by a typed separator', 'MM/DD/YYYY', '1/', '01/'],
		['masks a fully separator-typed date', 'MM/DD/YYYY', '1/5/2026', '01/05/2026'],
		['masks an unseparated digit run with overflow padding', 'MM/DD/YYYY', '152026', '01/05/2026'],
		['masks an unseparated digit run without overflow', 'MM/DD/YYYY', '12252026', '12/25/2026'],
		['pads and closes a day digit above 3', 'MM/DD/YYYY', '124', '12/04/'],
		['carries a day overflow into the year', 'MM/DD/YYYY', '1235', '12/03/5'],
		['drops a second zero in the month', 'MM/DD/YYYY', '00', '0'],
		['ignores a separator after a zero-only segment', 'MM/DD/YYYY', '0/', '0'],
		['ignores non-digit noise', 'MM/DD/YYYY', '12a25b2026', '12/25/2026'],
		['ignores digits past a complete date', 'MM/DD/YYYY', '12/25/20269', '12/25/2026'],
		['returns empty for empty input', 'MM/DD/YYYY', '', ''],
		['closes a complete day with the separator', 'DD/MM/YYYY', '31', '31/'],
		['carries a day overflow into the month, which pads in turn', 'DD/MM/YYYY', '32', '03/02/'],
		['pads and closes a day digit above 3', 'DD/MM/YYYY', '4', '04/'],
		['masks a fully separator-typed date', 'DD/MM/YYYY', '5/1/2026', '05/01/2026'],
		['closes a complete year with the separator', 'YYYY-MM-DD', '2026', '2026-'],
		['does not close a partial year on a typed separator', 'YYYY-MM-DD', '26-', '26'],
		['masks an unseparated digit run with overflow padding', 'YYYY-MM-DD', '2026152', '2026-01-05'],
		['masks a fully separator-typed date', 'YYYY-MM-DD', '2026-1-5', '2026-01-05'],
	] as const)('%s (%s)', ([, format, typed, masked]) => {
		expect(maskDateText(typed, format)).toBe(masked)
	})
})

describe('parseDateText', () => {
	it('parses a complete date at local midnight', () => {
		const parsed = parseDateText('06/15/2026', 'MM/DD/YYYY')

		expect(parsed?.getFullYear()).toBe(2026)

		expect(parsed?.getMonth()).toBe(5)

		expect(parsed?.getDate()).toBe(15)

		expect(parsed?.getHours()).toBe(0)
	})

	it('parses day-first and ISO-style formats', () => {
		expect(parseDateText('15/06/2026', 'DD/MM/YYYY')?.getMonth()).toBe(5)

		expect(parseDateText('2026-06-15', 'YYYY-MM-DD')?.getDate()).toBe(15)
	})

	it('rejects partial text', () => {
		expect(parseDateText('06/15/202', 'MM/DD/YYYY')).toBeUndefined()

		expect(parseDateText('06/15', 'MM/DD/YYYY')).toBeUndefined()
	})

	it('rejects impossible calendar dates', () => {
		expect(parseDateText('02/31/2025', 'MM/DD/YYYY')).toBeUndefined()

		expect(parseDateText('00/15/2026', 'MM/DD/YYYY')).toBeUndefined()

		expect(parseDateText('06/00/2026', 'MM/DD/YYYY')).toBeUndefined()

		expect(parseDateText('06/15/0000', 'MM/DD/YYYY')).toBeUndefined()
	})

	it('applies leap-year rules to February', () => {
		expect(parseDateText('02/29/2024', 'MM/DD/YYYY')?.getDate()).toBe(29)

		expect(parseDateText('02/29/2025', 'MM/DD/YYYY')).toBeUndefined()

		expect(parseDateText('02/29/1900', 'MM/DD/YYYY')).toBeUndefined()

		expect(parseDateText('02/29/2000', 'MM/DD/YYYY')?.getDate()).toBe(29)
	})

	it('keeps low four-digit years instead of mapping them to 19xx', () => {
		expect(parseDateText('06/15/0050', 'MM/DD/YYYY')?.getFullYear()).toBe(50)
	})
})

describe('formatDateValue', () => {
	it('zero-pads each segment in format order', () => {
		const date = new Date(2026, 5, 1)

		expect(formatDateValue(date, 'MM/DD/YYYY')).toBe('06/01/2026')

		expect(formatDateValue(date, 'DD/MM/YYYY')).toBe('01/06/2026')

		expect(formatDateValue(date, 'YYYY-MM-DD')).toBe('2026-06-01')
	})

	it('round-trips through parseDateText', () => {
		const date = new Date(2026, 11, 31)

		expect(parseDateText(formatDateValue(date, 'MM/DD/YYYY'), 'MM/DD/YYYY')?.getTime()).toBe(
			date.getTime(),
		)
	})
})
