export type CalendarPickerView = 'months' | 'years'

export type CalendarPickerState = {
	view: CalendarPickerView
	pickerYear: number
	decadeYear: number
}

export type CalendarPickerAction =
	| { type: 'open'; year: number }
	| { type: 'stepYear'; delta: number }
	| { type: 'stepDecade'; delta: number }
	| { type: 'showYears' }
	| { type: 'showMonths' }
	| { type: 'selectYear'; year: number }

export function calendarPickerReducer(
	state: CalendarPickerState,
	action: CalendarPickerAction,
): CalendarPickerState {
	switch (action.type) {
		case 'open':
			return { view: 'months', pickerYear: action.year, decadeYear: action.year }
		case 'stepYear':
			return { ...state, pickerYear: state.pickerYear + action.delta }
		case 'stepDecade':
			return { ...state, decadeYear: state.decadeYear + action.delta }
		case 'showYears':
			return { ...state, view: 'years', decadeYear: state.pickerYear }
		case 'showMonths':
			return { ...state, view: 'months' }
		case 'selectYear':
			return { ...state, view: 'months', pickerYear: action.year }
	}
}

export function initialCalendarPickerState(year: number): CalendarPickerState {
	return { view: 'months', pickerYear: year, decadeYear: year }
}
