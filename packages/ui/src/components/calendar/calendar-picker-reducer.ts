/** Which grid the picker shows: the 12-month grid or the 12-cell decade grid. @internal */
type CalendarPickerView = 'months' | 'years'

/**
 * Picker view state: the active grid, the year whose months are shown, and the
 * year anchoring the visible decade. `pickerYear` and `decadeYear` track
 * independently so paging the decade grid never disturbs the chosen month-year.
 *
 * @internal
 */
export type CalendarPickerState = {
	view: CalendarPickerView
	pickerYear: number
	decadeYear: number
}

/**
 * `open` reseeds both year anchors to the calendar's current year; `stepYear`
 * pages the month grid's year; `stepDecade` pages the year grid's decade;
 * `showYears`/`showMonths` swap views (entering years re-anchors the decade on
 * `pickerYear`); `selectYear` picks a year and returns to the month grid.
 *
 * @internal
 */
type CalendarPickerAction =
	| { type: 'open'; year: number }
	| { type: 'stepYear'; delta: number }
	| { type: 'stepDecade'; delta: number }
	| { type: 'showYears' }
	| { type: 'showMonths' }
	| { type: 'selectYear'; year: number }

/**
 * Reduces a {@link CalendarPickerState} for one {@link CalendarPickerAction}.
 *
 * @internal
 */
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

/** Seeds picker state on the month grid with both year anchors at `year`. @internal */
export function initialCalendarPickerState(year: number): CalendarPickerState {
	return { view: 'months', pickerYear: year, decadeYear: year }
}
