/** Which grid the picker shows: the 12-month grid or the 12-cell decade grid. @internal */
type CalendarPickerView = 'months' | 'years'

/**
 * The first year that the calendar can show. `@internationalized/date` holds
 * years 1 to 9999, and a `CalendarDate` clamps a year outside them.
 *
 * @internal
 */
export const MIN_YEAR = 1

/** The last year that the calendar can show. See {@link MIN_YEAR}. @internal */
export const MAX_YEAR = 9999

/** Whether the calendar can show `year`. @internal */
export function isYearInRange(year: number): boolean {
	return year >= MIN_YEAR && year <= MAX_YEAR
}

/** The year in the range of the calendar that is nearest to `year`. @internal */
function clampYear(year: number): number {
	return Math.min(MAX_YEAR, Math.max(MIN_YEAR, year))
}

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
 * - `open` reseeds both year anchors to the calendar's current year.
 * - `stepYear` pages the month grid's year.
 * - `stepDecade` pages the year grid's decade.
 * - `showYears` and `showMonths` swap views. Entering years re-anchors the
 *   decade on `pickerYear`.
 * - `selectYear` picks a year and returns to the month grid.
 *
 * Each year stays in {@link MIN_YEAR} to {@link MAX_YEAR}. A step at a limit
 * returns the same state, and `selectYear` ignores a year outside the range.
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
			return initialCalendarPickerState(action.year)
		case 'stepYear': {
			const pickerYear = clampYear(state.pickerYear + action.delta)

			return pickerYear === state.pickerYear ? state : { ...state, pickerYear }
		}
		case 'stepDecade': {
			// The step clamps the year and does not stop short. From each decade, the
			// steps back then reach the decade of years 1 to 9.
			const decadeYear = clampYear(state.decadeYear + action.delta)

			return decadeYear === state.decadeYear ? state : { ...state, decadeYear }
		}
		case 'showYears':
			return { ...state, view: 'years', decadeYear: state.pickerYear }
		case 'showMonths':
			return { ...state, view: 'months' }
		case 'selectYear':
			return isYearInRange(action.year)
				? { ...state, view: 'months', pickerYear: action.year }
				: state
	}
}

/**
 * Seeds picker state on the month grid with both year anchors at `year`. A
 * year outside the range of the calendar anchors on the nearest limit.
 *
 * @internal
 */
export function initialCalendarPickerState(year: number): CalendarPickerState {
	const anchor = clampYear(year)

	return { view: 'months', pickerYear: anchor, decadeYear: anchor }
}
