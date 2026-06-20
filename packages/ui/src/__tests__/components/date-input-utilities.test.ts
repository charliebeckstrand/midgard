import { describe, expect, it } from 'vitest'
import {
	formatDateValue,
	isDayInRange,
	isSameDay,
	maskDateText,
	parseDateText,
} from '../../components/date-input/date-input-utilities'

describe('maskDateText', () => {
	describe('MM/DD/YYYY', () => {
		it('keeps a single ambiguous month digit open', () => {
			expect(maskDateText('1', 'MM/DD/YYYY')).toBe('1')
		})

		it('closes a complete month with the separator', () => {
			expect(maskDateText('12', 'MM/DD/YYYY')).toBe('12/')
		})

		it('pads and closes a month digit that cannot start a two-digit month', () => {
			expect(maskDateText('2', 'MM/DD/YYYY')).toBe('02/')
		})

		it('carries the overflowing digit into the day', () => {
			expect(maskDateText('13', 'MM/DD/YYYY')).toBe('01/3')
		})

		it('pads a short month closed by a typed separator', () => {
			expect(maskDateText('1/', 'MM/DD/YYYY')).toBe('01/')
		})

		it('masks a fully separator-typed date', () => {
			expect(maskDateText('1/5/2026', 'MM/DD/YYYY')).toBe('01/05/2026')
		})

		it('masks an unseparated digit run with overflow padding', () => {
			expect(maskDateText('152026', 'MM/DD/YYYY')).toBe('01/05/2026')
		})

		it('masks an unseparated digit run without overflow', () => {
			expect(maskDateText('12252026', 'MM/DD/YYYY')).toBe('12/25/2026')
		})

		it('pads and closes a day digit above 3', () => {
			expect(maskDateText('124', 'MM/DD/YYYY')).toBe('12/04/')
		})

		it('carries a day overflow into the year', () => {
			expect(maskDateText('1235', 'MM/DD/YYYY')).toBe('12/03/5')
		})

		it('drops a second zero in the month', () => {
			expect(maskDateText('00', 'MM/DD/YYYY')).toBe('0')
		})

		it('ignores a separator after a zero-only segment', () => {
			expect(maskDateText('0/', 'MM/DD/YYYY')).toBe('0')
		})

		it('ignores non-digit noise', () => {
			expect(maskDateText('12a25b2026', 'MM/DD/YYYY')).toBe('12/25/2026')
		})

		it('ignores digits past a complete date', () => {
			expect(maskDateText('12/25/20269', 'MM/DD/YYYY')).toBe('12/25/2026')
		})

		it('returns empty for empty input', () => {
			expect(maskDateText('', 'MM/DD/YYYY')).toBe('')
		})
	})

	describe('DD/MM/YYYY', () => {
		it('closes a complete day with the separator', () => {
			expect(maskDateText('31', 'DD/MM/YYYY')).toBe('31/')
		})

		it('carries a day overflow into the month, which pads in turn', () => {
			expect(maskDateText('32', 'DD/MM/YYYY')).toBe('03/02/')
		})

		it('pads and closes a day digit above 3', () => {
			expect(maskDateText('4', 'DD/MM/YYYY')).toBe('04/')
		})

		it('masks a fully separator-typed date', () => {
			expect(maskDateText('5/1/2026', 'DD/MM/YYYY')).toBe('05/01/2026')
		})
	})

	describe('YYYY-MM-DD', () => {
		it('closes a complete year with the separator', () => {
			expect(maskDateText('2026', 'YYYY-MM-DD')).toBe('2026-')
		})

		it('does not close a partial year on a typed separator', () => {
			expect(maskDateText('26-', 'YYYY-MM-DD')).toBe('26')
		})

		it('masks an unseparated digit run with overflow padding', () => {
			expect(maskDateText('2026152', 'YYYY-MM-DD')).toBe('2026-01-05')
		})

		it('masks a fully separator-typed date', () => {
			expect(maskDateText('2026-1-5', 'YYYY-MM-DD')).toBe('2026-01-05')
		})
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

describe('isSameDay', () => {
	it('compares at day resolution and treats two empties as same', () => {
		expect(isSameDay(new Date(2026, 5, 15, 9), new Date(2026, 5, 15, 17))).toBe(true)

		expect(isSameDay(new Date(2026, 5, 15), new Date(2026, 5, 16))).toBe(false)

		expect(isSameDay(undefined, undefined)).toBe(true)

		expect(isSameDay(new Date(2026, 5, 15), undefined)).toBe(false)
	})
})

describe('isDayInRange', () => {
	it('ignores time of day on the bounds', () => {
		const date = new Date(2026, 5, 15)

		expect(isDayInRange(date, new Date(2026, 5, 15, 23), undefined)).toBe(true)

		expect(isDayInRange(date, undefined, new Date(2026, 5, 15, 0, 0, 1))).toBe(true)

		expect(isDayInRange(date, new Date(2026, 5, 16), undefined)).toBe(false)

		expect(isDayInRange(date, undefined, new Date(2026, 5, 14))).toBe(false)
	})
})
