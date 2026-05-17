import type { CalendarActive } from '../calendar'

export type DatePickerRangeState = {
	rangeStart: Date | null
	hoverDate: Date | null
	active: CalendarActive | null
}

export type DatePickerRangeAction =
	| { type: 'reset' }
	| { type: 'startRange'; date: Date }
	| { type: 'pinEndpoint'; date: Date }
	| { type: 'hover'; date: Date | null }
	| { type: 'setActive'; active: CalendarActive | null }

export function datePickerRangeReducer(
	state: DatePickerRangeState,
	action: DatePickerRangeAction,
): DatePickerRangeState {
	switch (action.type) {
		case 'reset':
			return { rangeStart: null, hoverDate: null, active: null }
		case 'startRange':
			return { ...state, rangeStart: action.date, hoverDate: null }
		case 'pinEndpoint':
			return { ...state, hoverDate: action.date }
		case 'hover':
			return { ...state, hoverDate: action.date }
		case 'setActive':
			return { ...state, active: action.active }
	}
}

export const initialDatePickerRangeState: DatePickerRangeState = {
	rangeStart: null,
	hoverDate: null,
	active: null,
}
