'use client'

import { type KeyboardEvent, useCallback, useId, useMemo, useReducer, useRef } from 'react'

import { useA11yAnnouncements } from '../../hooks/a11y/use-a11y-announcements'
import { useHydrated } from '../../hooks/use-hydrated'
import { useIntl } from '../../primitives/intl/use-intl'
import { useLocale } from '../../providers/locale/context'
import { resolveLocale } from '../../utilities/resolve-locale'
import type { CalendarHandle } from '../calendar'
import { formatDayName, orderDates } from '../calendar/calendar-utilities'
import { useControlPickerField } from '../control/use-control-picker-field'
import { useControlPickerPopover } from '../control/use-control-picker-popover'
import type { DatePickerBaseProps, DatePickerRangeProps } from './date-picker'
import { datePickerMessages } from './date-picker-messages'
import { datePickerRangeReducer, initialDatePickerRangeState } from './date-picker-range-reducer'
import { formatRange, standRange } from './date-picker-utilities'
import { useDatePickerGridEntryFocus } from './use-date-picker-grid-entry'
import { type FooterButton, handleClosedKey } from './use-date-picker-keyboard'

/**
 * The trigger label of a range: empty with no range, and else the range in the
 * locale of the reader once hydrated. Before hydration it writes the stand
 * form, which the server render matches.
 *
 * @internal
 */
function rangeLabel(
	value: readonly [Date, Date] | null | undefined,
	hydrated: boolean,
	ambient: ReturnType<typeof useLocale>,
): string {
	if (!value) return ''

	return hydrated
		? formatRange(value[0], value[1], ambient.locale, ambient.dateFormat)
		: standRange(value[0], value[1], ambient.dateFormat)
}

/**
 * Range state for {@link DatePicker}: a two-tap start/end selection held in a
 * reducer, committed as `[Date, Date]` through the Form/Control binding. It also
 * holds popover wiring, the key handler of the closed trigger, and the clear
 * footer. In the open dialog, DOM focus moves through the days, and the
 * calendar owns the keys. The focus of a day previews the end of the range, as
 * a hover does. The first press announces the start and asks for the end.
 *
 * @remarks
 * Selection commits the `[Date, Date]` immediately. The trigger label and any
 * `onValueChange` therefore update on the click that closes the popover, rather
 * than after its exit animation. The in-progress reducer state (the pinned start
 * and previewed end) is reset on `onExitComplete`. Both endpoints therefore stay
 * rendered through the exit animation, instead of snapping to the freshly
 * committed value mid-fade.
 *
 * @returns Trigger props, popover plumbing, `onTriggerKeyDown`,
 * `onExitComplete` (resets the in-progress selection after the exit
 * animation), `entryFocusRef` (the day that gets focus on open), and the
 * `calendar`/`footer` prop bundles. `calendar` exposes
 * `rangeStart`/`rangeEnd`/`hoverDate` for the in-progress selection.
 * @internal
 */
export function useDatePickerRangeState({
	name,
	value: valueProp,
	defaultValue,
	onValueChange,
	footer,
	placement = 'bottom-start',
	disabled,
	readOnly,
	open: openProp,
	defaultOpen,
	onOpenChange: onOpenChangeProp,
}: DatePickerBaseProps & DatePickerRangeProps) {
	// The trigger label reads the same ambient locale the Calendar beside it does.
	const ambient = useLocale()

	// Binds the committed range to an enclosing Form field by `name`. The
	// reducer holds only the in-progress selection; the final `[Date, Date]`
	// still commits through this cascade.
	const { value, setValue, setTouched, field } = useControlPickerField<[Date, Date]>({
		name,
		value: valueProp,
		defaultValue,
		onValueChange,
		disabled,
		readOnly,
	})

	const [state, dispatch] = useReducer(datePickerRangeReducer, initialDatePickerRangeState)

	const { rangeStart, hoverDate } = state

	const calendarRef = useRef<CalendarHandle>(null)

	const footerRef = useRef<HTMLDivElement>(null)

	// The id of the day listbox. Each day takes an id from it, and the open finds
	// the day to focus by that id.
	const listboxId = useId()

	const entryFocusRef = useDatePickerGridEntryFocus(listboxId, calendarRef)

	// Clears the in-progress selection. Deferred to `onExitComplete` (and re-run
	// on the next open) so the pinned start and previewed end survive the exit
	// animation rather than collapsing onto the committed value mid-fade.
	const resetSelection = useCallback(() => {
		dispatch({ type: 'reset' })
	}, [])

	const {
		open,
		openPicker: openCalendar,
		closePicker: closeCalendar,
		onOpenChange,
		refs,
		setReference,
		dialogId,
		returnFocusRef,
		floatingStyles,
		getReferenceProps,
		getFloatingProps,
		context,
	} = useControlPickerPopover({
		placement,
		open: openProp,
		defaultOpen,
		onOpenChange: onOpenChangeProp,
		readOnly: field.readOnly,
		setTouched,
		onOpen: resetSelection,
	})

	const handleClear = useCallback(() => {
		setValue(undefined)

		closeCalendar()
	}, [closeCalendar, setValue])

	const handleSelect = useCallback(
		(date: Date) => {
			// readOnly also keeps the in-progress selection, which a controlled
			// `open` can show.
			if (field.readOnly) return

			if (rangeStart === null) {
				dispatch({ type: 'startRange', date })
			} else {
				// Pin the end so the span stays rendered through the exit animation,
				// then commit now: the trigger and `onValueChange` update on this
				// click instead of waiting for `onExitComplete`.
				dispatch({ type: 'pinEndpoint', date })

				setValue(orderDates(rangeStart, date))

				closeCalendar()
			}
		},
		[closeCalendar, field.readOnly, rangeStart, setValue],
	)

	// `footer.clear` (default on) gates the only footer button this variant has.
	// readOnly drops it, because the button cannot write a value.
	const showClear =
		!field.readOnly && footer?.clear !== false && rangeStart === null && value != null

	const footerButtons = useMemo<FooterButton[]>(() => (showClear ? ['clear'] : []), [showClear])

	const onHoverDateChange = useCallback(
		(date: Date | null) => dispatch({ type: 'hover', date }),
		[],
	)

	// The trigger takes keys only while closed: the open dialog is modal and holds
	// the focus.
	const onTriggerKeyDown = useCallback(
		(event: KeyboardEvent<HTMLElement>) => {
			if (!field.disabled && !open) handleClosedKey(event, openCalendar, false)
		},
		[field.disabled, open, openCalendar],
	)

	// The first press sets the start and the dialog stays open. A screen reader
	// then hears the start and that the next press sets the end (WCAG 4.1.3).
	const intl = useIntl()

	useA11yAnnouncements(
		rangeStart
			? intl.formatMessage(datePickerMessages.rangeStartSet, {
					date: formatDayName(rangeStart, resolveLocale(ambient.locale)),
				})
			: null,
	)

	// The text of `Intl` waits for hydration, as in `Calendar`. Until then the
	// trigger shows a skeleton of the label.
	const hydrated = useHydrated()

	const committedStart = value ? value[0] : null

	const committedEnd = value ? value[1] : null

	return {
		...field,
		dialogId,
		returnFocusRef,
		hasValue: value != null,
		onClear: handleClear,
		displayValue: rangeLabel(value, hydrated, ambient),
		pending: value != null && !hydrated,
		open,
		onOpenChange,
		onTriggerKeyDown,
		onExitComplete: resetSelection,
		setReference,
		setFloating: refs.setFloating,
		floatingStyles,
		getReferenceProps,
		getFloatingProps,
		context,
		calendar: {
			rangeStart: rangeStart ?? committedStart,
			rangeEnd: rangeStart === null ? committedEnd : null,
			hoverDate: rangeStart !== null ? hoverDate : null,
			onHoverDateChange,
			// A press, not a change: the second press of a range commits it.
			onDayClick: handleSelect,
			calendarRef,
			listboxId,
			footerRef,
		},
		entryFocusRef,
		footer: {
			active: null,
			footerButtons,
			onClear: handleClear,
			footerRef,
			onKeyDown: (event: KeyboardEvent<HTMLElement>) => calendarRef.current?.footerKeyDown(event),
		},
	}
}
