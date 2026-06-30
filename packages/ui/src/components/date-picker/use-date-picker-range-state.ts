'use client'

import type { OpenChangeReason } from '@floating-ui/react'
import { type KeyboardEvent, useCallback, useMemo, useReducer, useRef, useState } from 'react'

import { useFloatingUI } from '../../hooks'
import { useIdScope } from '../../hooks/use-id-scope'
import type { CalendarActive, CalendarHandle } from '../calendar'
import { useControl } from '../control/context'
import { useFormValue } from '../form/use-form-value'
import type { DatePickerBaseProps, DatePickerRangeProps } from './date-picker'
import { datePickerRangeReducer, initialDatePickerRangeState } from './date-picker-range-reducer'
import { addDays, addMonths, clampDate, formatRange } from './date-picker-utilities'
import { useDatePickerControlled } from './use-date-picker-controlled'
import { type FooterButton, useDatePickerKeyboard } from './use-date-picker-keyboard'

/**
 * Range state for {@link DatePicker}: a two-tap start/end selection held in a
 * reducer, committed as `[Date, Date]` through the Form/Control binding, plus
 * popover wiring, the virtual-highlight keyboard handler, and the clear footer.
 *
 * @remarks
 * Selection commits the `[Date, Date]` immediately, so the trigger label and
 * any `onValueChange` update on the click that closes the popover rather than
 * after its exit animation. The in-progress reducer state (the pinned start
 * and previewed end) is reset on `onExitComplete` so both endpoints stay
 * rendered through the exit animation instead of snapping to the freshly
 * committed value mid-fade.
 *
 * @returns Trigger props, popover plumbing, `onTriggerKeyDown`,
 * `onExitComplete` (resets the in-progress selection after the exit
 * animation), and the `calendar`/`footer` prop bundles; `calendar` exposes
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
	disabled = false,
}: DatePickerBaseProps & DatePickerRangeProps) {
	const control = useControl()

	const scope = useIdScope({ id: control?.id })

	const resolvedDisabled = disabled || control?.disabled === true

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

	const [open, setOpen] = useState(false)

	const triggerRef = useRef<HTMLElement | null>(null)

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

	const getInitialActiveDate = useCallback(
		() => clampDate(rangeStart ?? value?.[0] ?? min ?? new Date(), min, max),
		[rangeStart, value, min, max],
	)

	const moveGridDate = useCallback(
		(delta: number) => {
			const base = active?.zone === 'grid' ? active.date : getInitialActiveDate()

			const next = clampDate(addDays(base, delta), min, max)

			if (rangeStart !== null) dispatch({ type: 'hover', date: next })

			return next
		},
		[active, getInitialActiveDate, min, max, rangeStart],
	)

	const moveGridMonths = useCallback(
		(delta: number) => {
			const base = active?.zone === 'grid' ? active.date : getInitialActiveDate()

			const next = clampDate(addMonths(base, delta), min, max)

			if (rangeStart !== null) dispatch({ type: 'hover', date: next })

			return next
		},
		[active, getInitialActiveDate, min, max, rangeStart],
	)

	const openCalendar = useCallback(() => {
		resetSelection()

		setOpen(true)
	}, [resetSelection])

	const closeCalendar = useCallback(() => {
		setOpen(false)

		// Closing the popover is the field's "blur" — mark it touched so
		// validateOn="touched" rules can fire.
		setTouched()
	}, [setTouched])

	const handleClear = useCallback(() => {
		setValue(undefined)

		closeCalendar()
	}, [closeCalendar, setValue])

	const handleSelect = useCallback(
		(date: Date) => {
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
		[closeCalendar, rangeStart, setValue],
	)

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (nextOpen) openCalendar()
			else closeCalendar()
		},
		[closeCalendar, openCalendar],
	)

	// `footer.clear` (default on) gates the only footer button this variant has.
	const showClear = footer?.clear !== false && rangeStart === null && value != null

	const footerButtons = useMemo<FooterButton[]>(() => (showClear ? ['clear'] : []), [showClear])

	const onFooterActivate = useCallback(
		(kind: FooterButton) => {
			if (kind === 'clear') handleClear()
		},
		[handleClear],
	)

	const { refs, floatingStyles, context, getReferenceProps, getFloatingProps } = useFloatingUI({
		placement,
		open,
		onOpenChange: handleOpenChange,
		offset: 8,
		role: 'dialog',
		returnFocusTo: triggerRef,
	})

	// Public open-change entry: routes through floating-ui's context so a
	// caller-supplied close reason reaches `useFloatingPanel`'s reason-aware
	// focus return.
	const onOpenChange = useCallback(
		(nextOpen: boolean, event?: Event, reason?: OpenChangeReason) =>
			context.onOpenChange(nextOpen, event, reason),
		[context],
	)

	// Captures the trigger for `useFloatingUI`'s `returnFocusTo`;
	// `FloatingFocusManager` runs with `returnFocus={false}`.
	const setReference = useCallback(
		(node: HTMLElement | null) => {
			triggerRef.current = node

			refs.setReference(node)
		},
		[refs],
	)

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
		handleSelect,
		calendarRef,
		footerButtons,
		onFooterActivate,
	})

	return {
		triggerId: scope.id,
		describedBy: control?.describedBy,
		disabled: resolvedDisabled,
		required: control?.required,
		invalid: control?.invalid || fieldInvalid,
		hasValue: value != null,
		onClear: handleClear,
		displayValue: value ? formatRange(value[0], value[1]) : '',
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
			onKeyDown: (event: KeyboardEvent<HTMLDivElement>) =>
				calendarRef.current?.footerKeyDown(event),
		},
	}
}
