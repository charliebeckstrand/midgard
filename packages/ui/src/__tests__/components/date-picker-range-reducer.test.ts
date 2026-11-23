// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	type DatePickerRangeState,
	datePickerRangeReducer,
	initialDatePickerRangeState,
} from '../../components/date-picker/date-picker-range-reducer'

const start = new Date(2024, 0, 1)

const end = new Date(2024, 0, 10)

const hover = new Date(2024, 0, 5)

describe('datePickerRangeReducer', () => {
	it('exposes a sensible initial state', () => {
		expect(initialDatePickerRangeState).toEqual({
			rangeStart: null,
			hoverDate: null,
		})
	})

	it('reset returns to the initial state from any state', () => {
		const dirty: DatePickerRangeState = {
			rangeStart: start,
			hoverDate: hover,
		}

		expect(datePickerRangeReducer(dirty, { type: 'reset' })).toEqual({
			rangeStart: null,
			hoverDate: null,
		})
	})

	it('startRange seeds rangeStart and clears hoverDate', () => {
		const seeded = datePickerRangeReducer(
			{ rangeStart: null, hoverDate: hover },
			{ type: 'startRange', date: start },
		)

		expect(seeded.rangeStart).toBe(start)

		expect(seeded.hoverDate).toBeNull()
	})

	it('pinEndpoint stores the date as hoverDate without touching rangeStart', () => {
		const next = datePickerRangeReducer(
			{ rangeStart: start, hoverDate: null },
			{ type: 'pinEndpoint', date: end },
		)

		expect(next.rangeStart).toBe(start)

		expect(next.hoverDate).toBe(end)
	})

	it('hover updates only hoverDate', () => {
		const next = datePickerRangeReducer(
			{ rangeStart: start, hoverDate: null },
			{ type: 'hover', date: hover },
		)

		expect(next).toEqual({ rangeStart: start, hoverDate: hover })
	})

	it('hover with null clears hoverDate', () => {
		const next = datePickerRangeReducer(
			{ rangeStart: start, hoverDate: hover },
			{ type: 'hover', date: null },
		)

		expect(next.hoverDate).toBeNull()
	})

	it('hover keeps the state before the first endpoint', () => {
		const state: DatePickerRangeState = { rangeStart: null, hoverDate: null }

		expect(datePickerRangeReducer(state, { type: 'hover', date: hover })).toBe(state)
	})

	it('hover keeps the state for the same day', () => {
		const state: DatePickerRangeState = { rangeStart: start, hoverDate: hover }

		const sameDay = new Date(2024, 0, 5, 12)

		expect(datePickerRangeReducer(state, { type: 'hover', date: sameDay })).toBe(state)

		const cleared: DatePickerRangeState = { rangeStart: start, hoverDate: null }

		expect(datePickerRangeReducer(cleared, { type: 'hover', date: null })).toBe(cleared)
	})
})
