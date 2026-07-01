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
	footer,
	placement = 'bottom-start',
	disabled = false,
}: DatePickerBaseProps & DatePickerRelativeProps) {
	const control = useControl()

	const scope = useIdScope({ id: control?.id })

	const resolvedDisabled = disabled || control?.disabled === true

	// Single-select unless `relative.multiple` opts in; drives the toggle behavior
	// (replace vs. accumulate). The value is an array in both modes.
	const multiple = relative !== true && relative.multiple === true

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

	// The presets the user explicitly picked this interaction. Several presets can
	// resolve to the same span on a given day (e.g. "Last 6 months" ≡ "This year" on
	// 1 July; "This month" ≡ "This quarter" in a quarter's first month); the committed
	// value is a bare span, so a plain range match would label/highlight whichever
	// preset is listed first, not the one clicked. Biasing the match toward these keeps
	// the chip, the row highlight, and toggle-off aligned with the actual choice. A
	// hydrated value (shared link) carries no pick, so it still range-matches.
	const [pickedIds, setPickedIds] = useState<Set<string>>(() => new Set())

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

	const customActive = isCustomActive(value, presets, nowRef.current, pickedIds)

	// The committed custom span, if any — used to seed the Start/End inputs when the
	// user re-enters custom mode so an existing custom range shows pre-filled.
	const customSpan = customActive && value && value.length > 0 ? value[0] : undefined

	const togglePreset = useCallback(
		(preset: DatePickerRelativePreset) => {
			const now = nowRef.current

			// Which presets read as selected right now, biased by the existing picks so a
			// collision toggles off the picked preset rather than re-selecting a twin.
			const selected = selectedPresetIds(value, presets, now, pickedIds)

			// Derive the next value and the next picks from the SAME snapshot. `setValue`
			// takes a concrete value (not an updater) and `value` is often a controlled
			// prop, so both writes are last-write-wins across a batch; a `setPickedIds`
			// updater reading `prev` would instead accumulate and desync the picks from
			// the committed value.
			setValue(togglePresetValue(value, preset, presets, now, multiple, pickedIds))

			let nextPicked: Set<string>

			if (!multiple) {
				nextPicked = selected.has(preset.id) ? new Set() : new Set([preset.id])
			} else if (isCustomActive(value, presets, now, pickedIds)) {
				// A custom range was replaced wholesale by this preset.
				nextPicked = new Set([preset.id])
			} else {
				nextPicked = new Set(pickedIds)

				if (selected.has(preset.id)) nextPicked.delete(preset.id)
				else nextPicked.add(preset.id)
			}

			setPickedIds(nextPicked)
		},
		[multiple, pickedIds, presets, setValue, value],
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
	// edited after a reset, so the dialog stays put (dismiss closes it). Also wipes
	// the custom draft so the Start/End inputs empty alongside the committed value.
	const handleClear = useCallback(() => {
		draftRef.current = {}

		setDraft({})

		setPickedIds(new Set())

		setValue(undefined)
	}, [setValue])

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

			// A custom range isn't a preset, so drop any prior pick — the chip/highlight
			// should range-match, not favor a stale preset.
			setPickedIds(new Set())

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

	// Both endpoints settled: the custom range is complete and Clear-able.
	const customComplete = draft.from !== undefined && draft.to !== undefined

	const hasValue = !isRelativeEmpty(value)

	// The footer Clear gates per mode: custom mode requires a settled Start+End
	// (entering custom mode alone changes nothing); list mode requires any
	// committed span. Either way Clear runs the same `handleClear`, so one footer
	// bundle covers both. `footer.clear` (default on) suppresses it outright.
	const showFooterClear = footer?.clear !== false && (mode === 'custom' ? customComplete : hasValue)

	const footerButtons = useMemo<FooterButton[]>(
		() => (showFooterClear ? ['clear'] : []),
		[showFooterClear],
	)

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
		() => relativeChips(value, presets, nowRef.current, pickedIds),
		[value, presets, pickedIds],
	)

	const selectedIds = useMemo(
		() => selectedPresetIds(value, presets, nowRef.current, pickedIds),
		[value, presets, pickedIds],
	)

	return {
		triggerId: scope.id,
		describedBy: control?.describedBy,
		disabled: resolvedDisabled,
		required: control?.required,
		invalid: control?.invalid || fieldInvalid,
		value,
		hasValue,
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
