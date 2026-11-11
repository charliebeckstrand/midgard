// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	type CalendarPickerState,
	initialPickerState,
	pickerReducer,
} from '../../components/calendar/calendar-picker-reducer'

const seed: CalendarPickerState = { view: 'months', pickerYear: 2024, decadeYear: 2024 }

describe('initialPickerState', () => {
	it('returns the months view anchored to the supplied year', () => {
		expect(initialPickerState(2030)).toEqual({
			view: 'months',
			pickerYear: 2030,
			decadeYear: 2030,
		})
	})
})

describe('pickerReducer', () => {
	it('open resets the view and anchors both years to the action payload', () => {
		const next = pickerReducer(
			{ view: 'years', pickerYear: 1999, decadeYear: 1999 },
			{ type: 'open', year: 2025 },
		)

		expect(next).toEqual({ view: 'months', pickerYear: 2025, decadeYear: 2025 })
	})

	it('stepYear shifts pickerYear by the delta and leaves the rest untouched', () => {
		expect(pickerReducer(seed, { type: 'stepYear', delta: 1 })).toEqual({
			...seed,
			pickerYear: 2025,
		})

		expect(pickerReducer(seed, { type: 'stepYear', delta: -3 })).toEqual({
			...seed,
			pickerYear: 2021,
		})
	})

	it('stepDecade shifts decadeYear by the delta and leaves the rest untouched', () => {
		expect(pickerReducer(seed, { type: 'stepDecade', delta: 10 })).toEqual({
			...seed,
			decadeYear: 2034,
		})
	})

	it('showYears switches to the years view and seeds decadeYear from pickerYear', () => {
		const next = pickerReducer(
			{ view: 'months', pickerYear: 2024, decadeYear: 1999 },
			{ type: 'showYears' },
		)

		expect(next).toEqual({ view: 'years', pickerYear: 2024, decadeYear: 2024 })
	})

	it('showMonths switches the view back without touching the anchors', () => {
		const start: CalendarPickerState = { view: 'years', pickerYear: 2024, decadeYear: 2030 }

		expect(pickerReducer(start, { type: 'showMonths' })).toEqual({
			view: 'months',
			pickerYear: 2024,
			decadeYear: 2030,
		})
	})

	it('selectYear switches to months and updates pickerYear', () => {
		const start: CalendarPickerState = { view: 'years', pickerYear: 2024, decadeYear: 2030 }

		expect(pickerReducer(start, { type: 'selectYear', year: 2026 })).toEqual({
			view: 'months',
			pickerYear: 2026,
			decadeYear: 2030,
		})
	})
})

// `@internationalized/date` holds years 1 to 9999, and it clamps a year outside
// them. The picker therefore stays inside that range.
describe('pickerReducer: year limits', () => {
	it('stepYear stops at year 1 and at year 9999', () => {
		const first: CalendarPickerState = { view: 'months', pickerYear: 1, decadeYear: 1 }

		expect(pickerReducer(first, { type: 'stepYear', delta: -1 })).toBe(first)

		const last: CalendarPickerState = { view: 'months', pickerYear: 9999, decadeYear: 9999 }

		expect(pickerReducer(last, { type: 'stepYear', delta: 1 })).toBe(last)
	})

	it('stepDecade holds decadeYear inside years 1 to 9999', () => {
		const early: CalendarPickerState = { view: 'years', pickerYear: 5, decadeYear: 5 }

		// The first decade holds years 1 to 9, and a step back reaches it from each year.
		expect(pickerReducer(early, { type: 'stepDecade', delta: -10 })).toEqual({
			...early,
			decadeYear: 1,
		})

		const first: CalendarPickerState = { ...early, decadeYear: 1 }

		expect(pickerReducer(first, { type: 'stepDecade', delta: -10 })).toBe(first)

		const last: CalendarPickerState = { view: 'years', pickerYear: 9999, decadeYear: 9999 }

		expect(pickerReducer(last, { type: 'stepDecade', delta: 10 })).toBe(last)
	})

	it('selectYear ignores a year outside 1 to 9999', () => {
		const start: CalendarPickerState = { view: 'years', pickerYear: 5, decadeYear: 5 }

		expect(pickerReducer(start, { type: 'selectYear', year: 0 })).toBe(start)

		expect(pickerReducer(start, { type: 'selectYear', year: 10_000 })).toBe(start)
	})

	it('open anchors a year outside the range on the nearest limit', () => {
		expect(initialPickerState(0)).toEqual({
			view: 'months',
			pickerYear: 1,
			decadeYear: 1,
		})
	})
})
