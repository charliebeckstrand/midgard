'use client'

import type { OpenChangeReason } from '@floating-ui/react'
import { type KeyboardEvent, useCallback, useMemo, useRef, useState } from 'react'

import { useFloatingUI } from '../../hooks'
import { useIdScope } from '../../hooks/use-id-scope'
import { useControl } from '../control/context'
import { useFormValue } from '../form/use-form-value'
import type { DatePickerBaseProps, DatePickerPeriodProps } from './date-picker'
import {
	type DatePickerPeriodValue,
	isPeriodEmpty,
	normalizeYears,
	type PeriodChip,
	type PeriodFacet,
	periodChips,
	periodMonthLabels,
	togglePeriodFacet,
} from './date-picker-period-utilities'
import { useDatePickerControlled } from './use-date-picker-controlled'
import type { FooterButton } from './use-date-picker-keyboard'

// Keys roving focus moves on inside the open dialog; everything else (Tab,
// Enter/Space, Escape) is left to the native buttons and floating-ui.
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
 * Period state for {@link DatePicker}: three independent multi-select facets
 * (year / quarter / month) committed live as a {@link DatePickerPeriodValue}
 * through the Form/Control binding, plus popover wiring, a roving-focus key
 * handler for the toggle grid, and the clear footer.
 *
 * @remarks
 * Unlike the calendar variants, each toggle commits immediately (no buffered
 * pending value): a multi-select filter is meaningful after every tap and the
 * popover stays open across edits. Clearing to an all-empty selection commits
 * `undefined`.
 *
 * @returns Trigger props, popover plumbing, the `value`/`chips` for the
 * trigger, `toggleFacet`, the resolved `years`/`monthLabels` option labels, the
 * `onTriggerKeyDown`/`onContentKeyDown` handlers, and the `footer` bundle.
 * @internal
 */
export function useDatePickerPeriodState({
	name,
	value: valueProp,
	defaultValue,
	onValueChange,
	years,
	placement = 'bottom-start',
	disabled = false,
}: DatePickerBaseProps & DatePickerPeriodProps) {
	const control = useControl()

	const scope = useIdScope({ id: control?.id })

	const resolvedDisabled = disabled || control?.disabled === true

	// Binds the committed period to an enclosing Form field by `name`; the field
	// error merges with Control's invalid below.
	const {
		value,
		setValue,
		setTouched,
		invalid: fieldInvalid,
	} = useFormValue<DatePickerPeriodValue>(name, {
		value: useDatePickerControlled(valueProp),
		defaultValue,
		onValueChange,
	})

	const [open, setOpen] = useState(false)

	const triggerRef = useRef<HTMLElement | null>(null)

	const footerRef = useRef<HTMLDivElement>(null)

	const toggleFacet = useCallback(
		(facet: PeriodFacet, n: number) => {
			const next = togglePeriodFacet(value, facet, n)

			// An all-empty selection reads as cleared, not a value of empty arrays.
			setValue(isPeriodEmpty(next) ? undefined : next)
		},
		[setValue, value],
	)

	const closeCalendar = useCallback(() => {
		setOpen(false)

		// Closing the popover is the field's "blur" — mark it touched so
		// validateOn="touched" rules can fire.
		setTouched()
	}, [setTouched])

	// Clears every facet but keeps the popover open: a filter is still being
	// edited after a reset, so the dialog stays put (dismiss closes it).
	const handleClear = useCallback(() => setValue(undefined), [setValue])

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (nextOpen) setOpen(true)
			else closeCalendar()
		},
		[closeCalendar],
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
	// caller-supplied close reason reaches the reason-aware focus return.
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

	// Trigger (closed): ArrowUp/Down opens, mirroring the dialog/combobox
	// convention; Enter/Space open through the native button click.
	const onTriggerKeyDown = useCallback(
		(event: KeyboardEvent<HTMLElement>) => {
			if (resolvedDisabled || open) return

			if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
				event.preventDefault()

				setOpen(true)
			}
		},
		[open, resolvedDisabled],
	)

	// Dialog (open): roving focus across the toggle cells. The shell reclaims
	// DOM focus to the dialog on arrow keys before this runs, so `event.target`
	// is still the cell that was focused; a -1 index (dialog/footer focused)
	// enters the grid at an edge.
	const onContentKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
		if (!ROVING_KEYS.has(event.key)) return

		const cells = Array.from(
			event.currentTarget.querySelectorAll<HTMLElement>('[data-period-cell]'),
		)

		if (cells.length === 0) return

		event.preventDefault()

		const currentIndex = cells.indexOf(event.target as HTMLElement)

		cells[rovingTargetIndex(event.key, currentIndex, cells.length)]?.focus()
	}, [])

	const monthLabels = useMemo(() => periodMonthLabels(), [])

	const resolvedYears = useMemo(() => normalizeYears(years ?? defaultYears()), [years])

	const chips = useMemo<PeriodChip[]>(() => periodChips(value, monthLabels), [value, monthLabels])

	const showClear = !isPeriodEmpty(value)

	const footerButtons = useMemo<FooterButton[]>(() => (showClear ? ['clear'] : []), [showClear])

	return {
		triggerId: scope.id,
		describedBy: control?.describedBy,
		disabled: resolvedDisabled,
		required: control?.required,
		invalid: control?.invalid || fieldInvalid,
		value,
		chips,
		years: resolvedYears,
		monthLabels,
		open,
		onOpenChange,
		onTriggerKeyDown,
		onContentKeyDown,
		toggleFacet,
		setReference,
		setFloating: refs.setFloating,
		floatingStyles,
		getReferenceProps,
		getFloatingProps,
		context,
		footer: {
			active: null,
			footerButtons,
			onClear: handleClear,
			footerRef,
			onKeyDown: () => {},
		},
	}
}

// Index roving focus moves to for `key`, given the focused cell index (`-1`
// when focus sits on the dialog or footer) and the total cell count; arrows
// wrap, Home/PageUp jump to the first cell, End/PageDown to the last.
function rovingTargetIndex(key: string, currentIndex: number, count: number): number {
	if (key === 'Home' || key === 'PageUp') return 0

	if (key === 'End' || key === 'PageDown') return count - 1

	const forward = key === 'ArrowRight' || key === 'ArrowDown'

	if (currentIndex === -1) return forward ? 0 : count - 1

	return (currentIndex + (forward ? 1 : -1) + count) % count
}

// Default selectable years when the caller passes none: the prior and current
// calendar year (e.g. 2025–2026).
function defaultYears(): number[] {
	const currentYear = new Date().getFullYear()

	return [currentYear - 1, currentYear]
}
