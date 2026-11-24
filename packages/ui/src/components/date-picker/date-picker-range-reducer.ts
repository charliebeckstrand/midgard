import { sameDayOrEmpty } from '../calendar/calendar-utilities'

/**
 * In-progress range selection: the pinned first endpoint, and the hovered or
 * focused second endpoint that previews the span.
 * The committed `[Date, Date]` lives in the Form field, not here.
 *
 * @internal
 */
export type DatePickerRangeState = {
	rangeStart: Date | null
	hoverDate: Date | null
}

/**
 * Transitions for {@link datePickerRangeReducer}. `pinEndpoint` and `hover`
 * both write `hoverDate`, because the second endpoint and its live preview are
 * the same field. `pinEndpoint` names the commit-time write that freezes the
 * span through the popover's exit animation.
 *
 * @internal
 */
type DatePickerRangeAction =
	| { type: 'reset' }
	| { type: 'startRange'; date: Date }
	| { type: 'pinEndpoint'; date: Date }
	| { type: 'hover'; date: Date | null }

/** Advances the {@link DatePickerRangeState} for a selection action. @internal */
export function datePickerRangeReducer(
	state: DatePickerRangeState,
	action: DatePickerRangeAction,
): DatePickerRangeState {
	switch (action.type) {
		case 'reset':
			return initialDatePickerRangeState
		case 'startRange':
			return { ...state, rangeStart: action.date, hoverDate: null }
		case 'pinEndpoint':
			return { ...state, hoverDate: action.date }
		case 'hover':
			// A hover before the first endpoint shows no band, and a hover on the
			// same day changes nothing. Both keep the state, so the picker does not
			// render again for them.
			if (state.rangeStart === null || sameDayOrEmpty(state.hoverDate, action.date)) return state

			return { ...state, hoverDate: action.date }
	}
}

/** Empty selection: no pinned start and no preview. @internal */
export const initialDatePickerRangeState: DatePickerRangeState = {
	rangeStart: null,
	hoverDate: null,
}
