import type { CalendarActive } from '../calendar'

/**
 * In-progress range selection: the pinned first endpoint, the hovered/keyboard
 * second endpoint that previews the span, and the virtual-highlight position.
 * The committed `[Date, Date]` lives in the Form field, not here.
 *
 * @internal
 */
export type DatePickerRangeState = {
	rangeStart: Date | null
	hoverDate: Date | null
	active: CalendarActive | null
}

/**
 * Transitions for {@link datePickerRangeReducer}. `pinEndpoint` and `hover`
 * both write `hoverDate` — the second endpoint and its live preview are the
 * same field; `pinEndpoint` names the commit-time write that freezes the span
 * through the popover's exit animation.
 *
 * @internal
 */
type DatePickerRangeAction =
	| { type: 'reset' }
	| { type: 'startRange'; date: Date }
	| { type: 'pinEndpoint'; date: Date }
	| { type: 'hover'; date: Date | null }
	| { type: 'setActive'; active: CalendarActive | null }

/** Advances the {@link DatePickerRangeState} for a selection action. @internal */
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

/** Empty selection: no pinned start, no preview, no highlight. @internal */
export const initialDatePickerRangeState: DatePickerRangeState = {
	rangeStart: null,
	hoverDate: null,
	active: null,
}
