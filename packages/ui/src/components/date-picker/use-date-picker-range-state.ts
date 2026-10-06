'use client'

import { useCallback, useMemo, useReducer, useRef } from 'react'

import { useIdScope } from '../../hooks/use-id-scope'
import { useLocale } from '../../providers/locale'
import type { CalendarActive, CalendarHandle } from '../calendar'
import { useControlProps } from '../control/use-control-props'
import { useFormValue } from '../form/use-form-value'
import type { DatePickerBaseProps, DatePickerRangeProps } from './date-picker'
import { datePickerRangeReducer, initialDatePickerRangeState } from './date-picker-range-reducer'
import { clampDate, formatRange, stepDate } from './date-picker-utilities'
import { useDatePickerControlled } from './use-date-picker-controlled'
import { useDatePickerFloating } from './use-date-picker-floating'
import {
	type FooterButton,
	useDatePickerGridEntry,
	useDatePickerKeyboard,
} from './use-date-picker-keyboard'
import { useDatePickerOpen } from './use-date-picker-open'

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
	const {
		value,
		setValue,
		setTouched,
		invalid: fieldInvalid,
	} = useFormValue<[Date, Date]>(name, {
		value: useDatePickerControlled(valueProp),
		defaultValue,
		onValueChange,
	})

	// The Control cascade: an explicit prop wins over the enclosing Control, and
	// the field error merges with an ambient error severity.
	const controlProps = useControlProps({ disabled, readOnly, invalid: fieldInvalid })

	const scope = useIdScope({ id: controlProps.id })

	const resolvedDisabled = controlProps.disabled === true

	const resolvedReadOnly = controlProps.readOnly === true

	const { open, setOpen, triggerRef } = useDatePickerOpen({
		open: openProp,
		defaultOpen,
		onOpenChange: onOpenChangeProp,
		readOnly: resolvedReadOnly,
	})

	const [state, dispatch] = useReducer(datePickerRangeReducer, initialDatePickerRangeState)

	const { rangeStart, hoverDate, active } = state

	const calendarRef = useRef<CalendarHandle>(null)

	const footerRef = useRef<HTMLDivElement>(null)

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

	// A step starts on `from` when the key gives the day, as a focused day button
	// does. The highlight that `setActive` sets for that day lands only on the
	// next render. Else the step starts on the highlight, else on the seed.
	const moveGridDate = useCallback(
		(delta: number, from?: Date) => {
			const base = from ?? (active?.zone === 'grid' ? active.date : getInitialActiveDate())

			const next = clampDate(stepDate(base, { days: delta }), min, max)

			if (rangeStart !== null) dispatch({ type: 'hover', date: next })

			return next
		},
		[active, getInitialActiveDate, min, max, rangeStart],
	)

	const moveGridMonths = useCallback(
		(delta: number) => {
			const base = active?.zone === 'grid' ? active.date : getInitialActiveDate()

			const next = clampDate(stepDate(base, { months: delta }), min, max)

			if (rangeStart !== null) dispatch({ type: 'hover', date: next })

			return next
		},
		[active, getInitialActiveDate, min, max, rangeStart],
	)

	const openCalendar = useCallback(() => {
		resetSelection()

		setOpen(true)
	}, [resetSelection, setOpen])

	const closeCalendar = useCallback(() => {
		setOpen(false)

		// Closing the popover is the field's "blur" — mark it touched so
		// validateOn="touched" rules can fire.
		setTouched()
	}, [setTouched, setOpen])

	// readOnly blocks every value write, not only the open paths, because a
	// controlled `open` can still show the calendar.
	const handleClear = useCallback(() => {
		if (resolvedReadOnly) return

		setValue(undefined)

		closeCalendar()
	}, [closeCalendar, resolvedReadOnly, setValue])

	const handleSelect = useCallback(
		(date: Date) => {
			if (resolvedReadOnly) return

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
		[closeCalendar, rangeStart, resolvedReadOnly, setValue],
	)

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (nextOpen) openCalendar()
			else closeCalendar()
		},
		[closeCalendar, openCalendar],
	)

	// `footer.clear` (default on) gates the only footer button this variant has.
	// readOnly drops it, because the button cannot write a value.
	const showClear =
		!resolvedReadOnly && footer?.clear !== false && rangeStart === null && value != null

	const footerButtons = useMemo<FooterButton[]>(() => (showClear ? ['clear'] : []), [showClear])

	const onFooterActivate = useCallback(
		(kind: FooterButton) => {
			if (kind === 'clear') handleClear()
		},
		[handleClear],
	)

	const {
		refs,
		floatingStyles,
		context,
		getReferenceProps,
		getFloatingProps,
		onOpenChange,
		setReference,
		dialogId,
	} = useDatePickerFloating({ placement, open, onOpenChange: handleOpenChange, triggerRef })

	const setActive = useCallback(
		(next: CalendarActive | null) => dispatch({ type: 'setActive', active: next }),
		[],
	)

	const onHoverDate = useCallback((date: Date | null) => dispatch({ type: 'hover', date }), [])

	const onTriggerKeyDown = useDatePickerKeyboard({
		disabled: resolvedDisabled,
		open,
		active,
		setActive,
		openCalendar,
		closeCalendar,
		moveGridDate,
		moveGridMonths,
		getInitialActiveDate,
		getViewEntryDate,
		handleSelect,
		calendarRef,
		footerButtons,
		onFooterActivate,
	})

	return {
		triggerId: scope.id,
		dialogId,
		describedBy: controlProps['aria-describedby'],
		disabled: resolvedDisabled,
		readOnly: resolvedReadOnly,
		required: controlProps.required,
		invalid: controlProps.invalid,
		validation: controlProps.validation,
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
			footerRef,
		},
		footer: {
			active,
			footerButtons,
			onClear: handleClear,
			footerRef,
		},
	}
}
