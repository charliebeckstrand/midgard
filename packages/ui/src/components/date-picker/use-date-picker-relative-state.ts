'use client'

import type { OpenChangeReason } from '@floating-ui/react'
import { type KeyboardEvent, useCallback, useMemo, useReducer, useRef, useState } from 'react'

import { useFloatingUI } from '../../hooks'
import { useIdScope } from '../../hooks/use-id-scope'
import type { CalendarActive, CalendarHandle } from '../calendar'
import { useControl } from '../control/context'
import { useFormValue } from '../form/use-form-value'
import type { DatePickerBaseProps, DatePickerRelativeProps } from './date-picker'
import { datePickerRangeReducer, initialDatePickerRangeState } from './date-picker-range-reducer'
import {
	type DatePickerRelativePreset,
	type DatePickerRelativeValue,
	isCustomActive,
	isRelativeEmpty,
	type RelativeChip,
	relativeChips,
	resolveRelativePresets,
	selectedPresetIds,
	togglePresetValue,
} from './date-picker-relative-utilities'
import { addDays, addMonths, clampDate } from './date-picker-utilities'
import { useDatePickerControlled } from './use-date-picker-controlled'
import { type FooterButton, useDatePickerKeyboard } from './use-date-picker-keyboard'

/** The two surfaces of the relative popover: the preset list or the custom calendar. @internal */
export type DatePickerRelativeMode = 'list' | 'calendar'

// Keys list-mode roving focus moves on; everything else (Tab, Enter/Space,
// Escape) is left to the native buttons and floating-ui.
const ROVING_KEYS = new Set([
	'ArrowUp',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'Home',
	'End',
	'PageUp',
	'PageDown',
])

/**
 * Relative state for {@link DatePicker}: a multi-select preset list plus a
 * mutually-exclusive custom calendar range, committed as a
 * {@link DatePickerRelativeValue}`[]` through the Form/Control binding. Holds the
 * `'list'`/`'calendar'` mode, so only one keyboard model is ever live — the
 * list's roving focus or the calendar's virtual highlight — and they never
 * collide.
 *
 * @remarks
 * Each preset toggles immediately (no buffered pending value) and the popover
 * stays open across edits, mirroring the multi-select filter feel. Completing a
 * custom range replaces the whole selection with that single span and returns to
 * the list. The reference `now` is stamped on open so preset math and the
 * active-preset match stay stable through an interaction.
 *
 * @returns Trigger props, popover plumbing, the `chips`/`selectedIds`/
 * `customActive` derivations for display, `togglePreset`/`enterCalendar`/
 * `backToList`, the per-mode `onContentKeyDown`, and the `calendar`/`footer`
 * bundles.
 * @internal
 */
export function useDatePickerRelativeState({
	name,
	value: valueProp,
	defaultValue,
	onValueChange,
	relative,
	min,
	max,
	placement = 'bottom-start',
	disabled = false,
}: DatePickerBaseProps & DatePickerRelativeProps) {
	const control = useControl()

	const scope = useIdScope({ id: control?.id })

	const resolvedDisabled = disabled || control?.disabled === true

	// Binds the committed spans to an enclosing Form field by `name`; the field
	// error merges with Control's invalid below.
	const {
		value,
		setValue,
		setTouched,
		invalid: fieldInvalid,
	} = useFormValue<DatePickerRelativeValue[]>(name, {
		value: useDatePickerControlled(valueProp),
		defaultValue,
		onValueChange,
	})

	const [open, setOpen] = useState(false)

	const [mode, setMode] = useState<DatePickerRelativeMode>('list')

	const triggerRef = useRef<HTMLElement | null>(null)

	const footerRef = useRef<HTMLDivElement>(null)

	const calendarRef = useRef<CalendarHandle>(null)

	// Anchors all relative math to one instant per interaction; re-stamped on open
	// so a long-lived page can't drift across midnight mid-edit.
	const nowRef = useRef<Date>(new Date())

	const presets = resolveRelativePresets(relative)

	// In-progress custom-range selection (pinned start + previewed end); the
	// committed span lives in the Form field, not here.
	const [rangeState, dispatch] = useReducer(datePickerRangeReducer, initialDatePickerRangeState)

	const { rangeStart, hoverDate, active } = rangeState

	const resetSelection = useCallback(() => dispatch({ type: 'reset' }), [])

	const customActive = isCustomActive(value, presets, nowRef.current)

	// The committed custom span, if any — used to seed the calendar when the user
	// re-enters it so an existing custom range shows pre-painted.
	const customSpan = customActive && value && value.length > 0 ? value[0] : undefined

	const togglePreset = useCallback(
		(preset: DatePickerRelativePreset) => {
			setValue(togglePresetValue(value, preset, presets, nowRef.current))
		},
		[presets, setValue, value],
	)

	const openPicker = useCallback(() => {
		nowRef.current = new Date()

		resetSelection()

		setMode('list')

		setOpen(true)
	}, [resetSelection])

	const closePicker = useCallback(() => {
		setOpen(false)

		// Closing the popover is the field's "blur" — mark it touched so
		// validateOn="touched" rules can fire.
		setTouched()
	}, [setTouched])

	// Clears every span but keeps the popover open: a selection is still being
	// edited after a reset, so the dialog stays put (dismiss closes it).
	const handleClear = useCallback(() => setValue(undefined), [setValue])

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (nextOpen) openPicker()
			else closePicker()
		},
		[closePicker, openPicker],
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

	// Captures the trigger for `useFloatingUI`'s `returnFocusTo`.
	const setReference = useCallback(
		(node: HTMLElement | null) => {
			triggerRef.current = node

			refs.setReference(node)
		},
		[refs],
	)

	// --- Calendar (custom-range) machinery — mirrors useDatePickerRangeState ---

	const getInitialActiveDate = useCallback(
		() => clampDate(rangeStart ?? customSpan?.from ?? min ?? nowRef.current, min, max),
		[rangeStart, customSpan, min, max],
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

	// Two-tap selection: the first tap pins the start, the second commits a single
	// custom span (replacing any preset selection — they are mutually exclusive)
	// and returns to the list with the popover still open.
	const handleSelect = useCallback(
		(date: Date) => {
			if (rangeStart === null) {
				dispatch({ type: 'startRange', date })

				return
			}

			const start = rangeStart

			const end = date

			const span: DatePickerRelativeValue =
				start.getTime() <= end.getTime() ? { from: start, to: end } : { from: end, to: start }

			setValue([span])

			resetSelection()

			setMode('list')
		},
		[rangeStart, resetSelection, setValue],
	)

	const setActive = useCallback(
		(next: CalendarActive | null) => dispatch({ type: 'setActive', active: next }),
		[],
	)

	const onHoverDate = useCallback((date: Date | null) => dispatch({ type: 'hover', date }), [])

	const showClear = !isRelativeEmpty(value)

	const footerButtons = useMemo<FooterButton[]>(() => (showClear ? ['clear'] : []), [showClear])

	const onFooterActivate = useCallback(
		(kind: FooterButton) => {
			if (kind === 'clear') handleClear()
		},
		[handleClear],
	)

	// --- Mode transitions ---

	const enterCalendar = useCallback(() => {
		resetSelection()

		setMode('calendar')
	}, [resetSelection])

	const backToList = useCallback(() => setMode('list'), [])

	// Deferred to the exit animation so the popover always reopens to the list
	// with a clean in-progress selection.
	const onExitComplete = useCallback(() => {
		resetSelection()

		setMode('list')
	}, [resetSelection])

	// --- Keyboard ---

	// Trigger (closed): ArrowUp/Down opens, mirroring the dialog/combobox
	// convention; Enter/Space open through the native button click.
	const onTriggerKeyDown = useCallback(
		(event: KeyboardEvent<HTMLElement>) => {
			if (resolvedDisabled || open) return

			if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
				event.preventDefault()

				openPicker()
			}
		},
		[open, openPicker, resolvedDisabled],
	)

	// List mode: roving focus across the preset rows and the trailing custom row.
	// The shell reclaims DOM focus to the dialog on arrow keys before this runs,
	// so `event.target` is still the focused cell; a -1 index enters at an edge.
	const onListKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
		if (!ROVING_KEYS.has(event.key)) return

		const cells = Array.from(
			event.currentTarget.querySelectorAll<HTMLElement>(
				'[data-relative-preset], [data-relative-custom]',
			),
		)

		if (cells.length === 0) return

		event.preventDefault()

		const currentIndex = cells.indexOf(event.target as HTMLElement)

		cells[rovingTargetIndex(event.key, currentIndex, cells.length)]?.focus()
	}, [])

	// Calendar mode: the range variant's virtual-highlight model, verbatim.
	const onCalendarKeyDown = useDatePickerKeyboard({
		disabled: resolvedDisabled,
		open,
		active,
		setActive,
		openCalendar: openPicker,
		closeCalendar: closePicker,
		moveGridDate,
		moveGridMonths,
		getInitialActiveDate,
		handleSelect,
		calendarRef,
		footerButtons,
		onFooterActivate,
	})

	const onContentKeyDown = mode === 'list' ? onListKeyDown : onCalendarKeyDown

	// --- Display derivations ---

	const chips = useMemo<RelativeChip[]>(
		() => relativeChips(value, presets, nowRef.current),
		[value, presets],
	)

	const selectedIds = useMemo(
		() => selectedPresetIds(value, presets, nowRef.current),
		[value, presets],
	)

	return {
		triggerId: scope.id,
		describedBy: control?.describedBy,
		disabled: resolvedDisabled,
		required: control?.required,
		invalid: control?.invalid || fieldInvalid,
		value,
		hasValue: showClear,
		onClear: handleClear,
		chips,
		selectedIds,
		customActive,
		presets,
		mode,
		togglePreset,
		enterCalendar,
		backToList,
		open,
		onOpenChange,
		onTriggerKeyDown,
		onContentKeyDown,
		onExitComplete,
		setReference,
		setFloating: refs.setFloating,
		floatingStyles,
		getReferenceProps,
		getFloatingProps,
		context,
		calendar: {
			rangeStart: rangeStart ?? customSpan?.from ?? null,
			rangeEnd: rangeStart === null ? (customSpan?.to ?? null) : null,
			hoverDate: rangeStart !== null ? hoverDate : null,
			onHoverDate,
			onValueChange: handleSelect,
			active: open && mode === 'calendar' ? active : null,
			calendarRef,
			footerRef,
		},
		footer: {
			active: mode === 'calendar' ? active : null,
			footerButtons,
			onClear: handleClear,
			footerRef,
			onKeyDown: (event: KeyboardEvent<HTMLDivElement>) =>
				calendarRef.current?.footerKeyDown(event),
		},
	}
}

// Index list-roving focus moves to for `key`, given the focused cell index (`-1`
// when focus sits on the dialog or footer) and the total cell count; arrows
// wrap, Home/PageUp jump to the first cell, End/PageDown to the last.
function rovingTargetIndex(key: string, currentIndex: number, count: number): number {
	if (key === 'Home' || key === 'PageUp') return 0

	if (key === 'End' || key === 'PageDown') return count - 1

	const forward = key === 'ArrowRight' || key === 'ArrowDown'

	if (currentIndex === -1) return forward ? 0 : count - 1

	return (currentIndex + (forward ? 1 : -1) + count) % count
}
