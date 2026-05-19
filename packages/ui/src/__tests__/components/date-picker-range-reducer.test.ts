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
			active: null,
		})
	})

	it('reset returns to the initial state from any state', () => {
		const dirty: DatePickerRangeState = {
			rangeStart: start,
			hoverDate: hover,
			active: { date: start, zone: 'grid' },
		}

		expect(datePickerRangeReducer(dirty, { type: 'reset' })).toEqual({
			rangeStart: null,
			hoverDate: null,
			active: null,
		})
	})

	it('startRange seeds rangeStart and clears hoverDate', () => {
		const seeded = datePickerRangeReducer(
			{ rangeStart: null, hoverDate: hover, active: null },
			{ type: 'startRange', date: start },
		)

		expect(seeded.rangeStart).toBe(start)

		expect(seeded.hoverDate).toBeNull()
	})

	it('pinEndpoint stores the date as hoverDate without touching rangeStart', () => {
		const next = datePickerRangeReducer(
			{ rangeStart: start, hoverDate: null, active: null },
			{ type: 'pinEndpoint', date: end },
		)

		expect(next.rangeStart).toBe(start)

		expect(next.hoverDate).toBe(end)
	})

	it('hover updates only hoverDate', () => {
		const next = datePickerRangeReducer(
			{ rangeStart: start, hoverDate: null, active: null },
			{ type: 'hover', date: hover },
		)

		expect(next.hoverDate).toBe(hover)
	})

	it('hover with null clears hoverDate', () => {
		const next = datePickerRangeReducer(
			{ rangeStart: start, hoverDate: hover, active: null },
			{ type: 'hover', date: null },
		)

		expect(next.hoverDate).toBeNull()
	})

	it('setActive replaces active without touching the range fields', () => {
		const active = { date: start, zone: 'grid' as const }

		const next = datePickerRangeReducer(
			{ rangeStart: start, hoverDate: hover, active: null },
			{ type: 'setActive', active },
		)

		expect(next.active).toBe(active)

		expect(next.rangeStart).toBe(start)

		expect(next.hoverDate).toBe(hover)
	})

	it('setActive accepts null to clear the active cell', () => {
		const next = datePickerRangeReducer(
			{ rangeStart: null, hoverDate: null, active: { date: start, zone: 'grid' } },
			{ type: 'setActive', active: null },
		)

		expect(next.active).toBeNull()
	})
})
