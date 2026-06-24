'use client'

import type { OpenChangeReason } from '@floating-ui/react'
import { type KeyboardEvent, useCallback, useMemo, useRef, useState } from 'react'

import { useFloatingUI } from '../../hooks'
import { useIdScope } from '../../hooks/use-id-scope'
import { useControl } from '../control/context'
import { useFormValue } from '../form/use-form-value'
import type { DatePickerBaseProps, DatePickerRelativeProps } from './date-picker'
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
import { useDatePickerControlled } from './use-date-picker-controlled'
import type { FooterButton } from './use-date-picker-keyboard'

/** The two surfaces of the relative popover: the preset list or the custom Start/End inputs. @internal */
export type DatePickerRelativeMode = 'list' | 'custom'

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
 * mutually-exclusive custom range typed into Start/End inputs, committed as a
 * {@link DatePickerRelativeValue}`[]` through the Form/Control binding. Holds the
 * `'list'`/`'custom'` mode; only the list runs a keyboard model (roving focus),
 * while custom mode leans on the native inputs, so the two never collide.
 *
 * @remarks
 * Each preset toggles immediately (no buffered pending value) and the popover
 * stays open across edits, mirroring the multi-select filter feel. A custom range
 * commits once both Start and End hold a valid date (order normalized), replacing
 * the whole selection with that single span; custom mode stays open for further
 * edits. The reference `now` is stamped on open so preset math and the
 * active-preset match stay stable through an interaction.
 *
 * @returns Trigger props, popover plumbing, the `chips`/`selectedIds`/
 * `customActive` derivations for display, `togglePreset`/`enterCustom`/
 * `backToList`, the per-mode `onContentKeyDown`, and the `custom`/`footer`
 * bundles.
 * @internal
 */
export function useDatePickerRelativeState({
	name,
	value: valueProp,
	defaultValue,
	onValueChange,
	relative,
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

	// Anchors all relative math to one instant per interaction; re-stamped on open
	// so a long-lived page can't drift across midnight mid-edit.
	const nowRef = useRef<Date>(new Date())

	const presets = resolveRelativePresets(relative)

	// In-progress custom-range entry (the Start/End inputs); the committed span
	// lives in the Form field, not here. A span only commits once both endpoints
	// hold a valid date, so a half-typed range never overwrites the value. The ref
	// mirrors the draft so an endpoint handler reads the latest other endpoint
	// without a stale closure.
	const [draft, setDraft] = useState<{ from?: Date; to?: Date }>({})

	const draftRef = useRef<{ from?: Date; to?: Date }>({})

	const customActive = isCustomActive(value, presets, nowRef.current)

	// The committed custom span, if any — used to seed the Start/End inputs when the
	// user re-enters custom mode so an existing custom range shows pre-filled.
	const customSpan = customActive && value && value.length > 0 ? value[0] : undefined

	const togglePreset = useCallback(
		(preset: DatePickerRelativePreset) => {
			setValue(togglePresetValue(value, preset, presets, nowRef.current))
		},
		[presets, setValue, value],
	)

	const openPicker = useCallback(() => {
		nowRef.current = new Date()

		draftRef.current = {}

		setDraft({})

		setMode('list')

		setOpen(true)
	}, [])

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

	// --- Custom range (Start/End inputs) ---

	// Applies a draft change: stores it (ref + state) and, once both endpoints are
	// valid, commits a single custom span (order normalized so `from <= to`). A
	// partial draft leaves the committed value untouched — the chip persists until
	// the range is complete, and the footer Clear handles a full reset. A completed
	// custom span replaces any preset selection (they are mutually exclusive).
	const applyDraft = useCallback(
		(next: { from?: Date; to?: Date }) => {
			draftRef.current = next

			setDraft(next)

			if (!next.from || !next.to) return

			const span: DatePickerRelativeValue =
				next.from.getTime() <= next.to.getTime()
					? { from: next.from, to: next.to }
					: { from: next.to, to: next.from }

			setValue([span])
		},
		[setValue],
	)

	const setCustomStart = useCallback(
		(date: Date | undefined) => applyDraft({ ...draftRef.current, from: date }),
		[applyDraft],
	)

	const setCustomEnd = useCallback(
		(date: Date | undefined) => applyDraft({ ...draftRef.current, to: date }),
		[applyDraft],
	)

	const showClear = !isRelativeEmpty(value)

	const footerButtons = useMemo<FooterButton[]>(() => (showClear ? ['clear'] : []), [showClear])

	// --- Mode transitions ---

	// Seeds the inputs from an existing custom span (if any) so re-entering shows
	// the current range pre-filled, then swaps to the Start/End inputs.
	const enterCustom = useCallback(() => {
		const seed = { from: customSpan?.from, to: customSpan?.to }

		draftRef.current = seed

		setDraft(seed)

		setMode('custom')
	}, [customSpan])

	const backToList = useCallback(() => setMode('list'), [])

	// Deferred to the exit animation so the popover always reopens to the list
	// with a clean draft.
	const onExitComplete = useCallback(() => {
		draftRef.current = {}

		setDraft({})

		setMode('list')
	}, [])

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

	// Custom mode runs no virtual-highlight model: the Start/End inputs, the back
	// affordance, and the footer Clear are native, Tab-reachable controls inside
	// the modal trap.
	const onContentKeyDown = mode === 'list' ? onListKeyDown : undefined

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
		enterCustom,
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
		custom: {
			start: draft.from ?? null,
			end: draft.to ?? null,
			onStartChange: setCustomStart,
			onEndChange: setCustomEnd,
		},
		footer: {
			active: null,
			footerButtons,
			onClear: handleClear,
			footerRef,
			onKeyDown: () => {},
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
