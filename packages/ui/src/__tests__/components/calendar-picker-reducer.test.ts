import { describe, expect, it } from 'vitest'
import {
	type CalendarPickerState,
	calendarPickerReducer,
	initialCalendarPickerState,
} from '../../components/calendar/calendar-picker-reducer'

const seed: CalendarPickerState = { view: 'months', pickerYear: 2024, decadeYear: 2024 }

describe('initialCalendarPickerState', () => {
	it('returns the months view anchored to the supplied year', () => {
		expect(initialCalendarPickerState(2030)).toEqual({
			view: 'months',
			pickerYear: 2030,
			decadeYear: 2030,
		})
	})
})

describe('calendarPickerReducer', () => {
	it('open resets the view and anchors both years to the action payload', () => {
		const next = calendarPickerReducer(
			{ view: 'years', pickerYear: 1999, decadeYear: 1999 },
			{ type: 'open', year: 2025 },
		)

		expect(next).toEqual({ view: 'months', pickerYear: 2025, decadeYear: 2025 })
	})

	it('stepYear shifts pickerYear by the delta and leaves the rest untouched', () => {
		expect(calendarPickerReducer(seed, { type: 'stepYear', delta: 1 })).toEqual({
			...seed,
			pickerYear: 2025,
		})

		expect(calendarPickerReducer(seed, { type: 'stepYear', delta: -3 })).toEqual({
			...seed,
			pickerYear: 2021,
		})
	})

	it('stepDecade shifts decadeYear by the delta and leaves the rest untouched', () => {
		expect(calendarPickerReducer(seed, { type: 'stepDecade', delta: 10 })).toEqual({
			...seed,
			decadeYear: 2034,
		})
	})

	it('showYears switches to the years view and seeds decadeYear from pickerYear', () => {
		const next = calendarPickerReducer(
			{ view: 'months', pickerYear: 2024, decadeYear: 1999 },
			{ type: 'showYears' },
		)

		expect(next).toEqual({ view: 'years', pickerYear: 2024, decadeYear: 2024 })
	})

	it('showMonths switches the view back without touching the anchors', () => {
		const start: CalendarPickerState = { view: 'years', pickerYear: 2024, decadeYear: 2030 }

		expect(calendarPickerReducer(start, { type: 'showMonths' })).toEqual({
			view: 'months',
			pickerYear: 2024,
			decadeYear: 2030,
		})
	})

	it('selectYear switches to months and updates pickerYear', () => {
		const start: CalendarPickerState = { view: 'years', pickerYear: 2024, decadeYear: 2030 }

		expect(calendarPickerReducer(start, { type: 'selectYear', year: 2026 })).toEqual({
			view: 'months',
			pickerYear: 2026,
			decadeYear: 2030,
		})
	})
})
