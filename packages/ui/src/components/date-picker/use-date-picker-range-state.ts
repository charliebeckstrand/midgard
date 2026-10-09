'use client'

import type { DateDuration } from '@internationalized/date'
import { useCallback, useMemo, useReducer, useRef } from 'react'

import { useLocale } from '../../providers/locale'
import type { CalendarActive, CalendarHandle } from '../calendar'
import { useControlPickerField } from '../control/use-control-picker-field'
import { useControlPickerPopover } from '../control/use-control-picker-popover'
import type { DatePickerBaseProps, DatePickerRangeProps } from './date-picker'
import { datePickerRangeReducer, initialDatePickerRangeState } from './date-picker-range-reducer'
import { clampDate, formatRange, stepDate } from './date-picker-utilities'
import {
	type FooterButton,
	useDatePickerGridEntry,
	useDatePickerKeyboard,
} from './use-date-picker-keyboard'

/**
 * Range state for {@link DatePicker}: a two-tap start/end selection held in a
 * reducer, committed as `[Date, Date]` through the Form/Control binding. It also
 * holds popover wiring, the virtual-highlight keyboard handler, and the clear
 * footer.
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
 * animation), and the `calendar`/`footer` prop bundles. `calendar` exposes
 * `rangeStart`/`rangeEnd`/`hoverDate` for the in-progress selection.
 * @internal
 */
export function useDatePickerRangeState({
	name,
	value: valueProp,
	defaultValue,
	onValueChange,
	min,
	max,
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

	const { rangeStart, hoverDate, active } = state

	const calendarRef = useRef<CalendarHandle>(null)

	// Clears the in-progress selection. Deferred to `onExitComplete` (and re-run
	// on the next open) so the pinned start and previewed end survive the exit
	// animation rather than collapsing onto the committed value mid-fade.
	const resetSelection = useCallback(() => {
		dispatch({ type: 'reset' })
	}, [])

	// With no range in progress and no value, the cursor starts on today. A `min`
	// or a `max` only bounds it.
	const { getInitialActiveDate, getViewEntryDate } = useDatePickerGridEntry(
		rangeStart ?? value?.[0],
		min,
		max,
		calendarRef,
	)

	// A step of days or months starts on `from`, the day that the key handler
	// gives, and stays between `min` and `max`. While a range is in progress, the
	// new day also previews the end of the range.
	const moveGrid = useCallback(
		(step: DateDuration, from: Date) => {
			const next = clampDate(stepDate(from, step), min, max)

			if (rangeStart !== null) dispatch({ type: 'hover', date: next })

			return next
		},
		[min, max, rangeStart],
	)

	const {
		open,
		openPicker: openCalendar,
		closePicker: closeCalendar,
		onOpenChange,
		refs,
		setReference,
		dialogId,
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
				const start = rangeStart

				const end = date

				const range: [Date, Date] = start.getTime() <= end.getTime() ? [start, end] : [end, start]

				// Pin the end so the span stays rendered through the exit animation,
				// then commit now — the trigger and `onValueChange` update on this
				// click instead of waiting for `onExitComplete`.
				dispatch({ type: 'pinEndpoint', date: end })

				setValue(range)

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

	const onFooterActivate = useCallback(
		(kind: FooterButton) => {
			if (kind === 'clear') handleClear()
		},
		[handleClear],
	)

	const setActive = useCallback(
		(next: CalendarActive | null) => dispatch({ type: 'setActive', active: next }),
		[],
	)

	const onHoverDate = useCallback((date: Date | null) => dispatch({ type: 'hover', date }), [])

	const onTriggerKeyDown = useDatePickerKeyboard({
		disabled: field.disabled,
		open,
		active,
		setActive,
		openCalendar,
		closeCalendar,
		moveGrid,
		getInitialActiveDate,
		getViewEntryDate,
		handleSelect,
		calendarRef,
		footerButtons,
		onFooterActivate,
	})

	return {
		...field,
		dialogId,
		hasValue: value != null,
		onClear: handleClear,
		displayValue: value ? formatRange(value[0], value[1], ambient.locale, ambient.dateFormat) : '',
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
			rangeStart: rangeStart ?? (value ? value[0] : null),
			rangeEnd: rangeStart === null ? (value ? value[1] : null) : null,
			hoverDate: rangeStart !== null ? hoverDate : null,
			onHoverDate,
			onValueChange: handleSelect,
			active: open ? active : null,
			calendarRef,
		},
		footer: {
			active,
			footerButtons,
			onClear: handleClear,
		},
	}
}
