'use client'

import { type KeyboardEvent, useCallback, useMemo, useState } from 'react'

import { logicalArrowKey } from '../../hooks/a11y/logical-arrow'
import { useStableEvent } from '../../hooks/use-stable-event'
import { useLocale } from '../../providers/locale'
import { wrap } from '../../utilities'
import { NAVIGATION_KEYS } from '../calendar/use-calendar-focus'
import { useControlPickerField } from '../control/use-control-picker-field'
import { useControlPickerPopover } from '../control/use-control-picker-popover'
import type { DatePickerBaseProps, DatePickerRelativeProps } from './date-picker'
import {
	type DatePickerRelativePreset,
	type DatePickerRelativeValue,
	isCustomActive,
	isRelativeEmpty,
	type RelativeChip,
	relativeChips,
	relativeListRows,
	relativeSummary,
	resolveRelativeChips,
	resolveRelativePresets,
	selectedPresetIds,
	togglePresetValue,
} from './date-picker-relative-utilities'
import { useDatePickerControlled } from './use-date-picker-controlled'
import type { FooterButton } from './use-date-picker-keyboard'

/** The two surfaces of the relative popover: the preset list or the custom Start/End inputs. @internal */
export type DatePickerRelativeMode = 'list' | 'custom'

/**
 * Relative state for {@link DatePicker}: a multi-select preset list plus a
 * mutually-exclusive custom range typed into Start/End inputs, committed as a
 * {@link DatePickerRelativeValue}`[]` through the Form/Control binding. Holds the
 * `'list'`/`'custom'` mode. Only the list runs a keyboard model (roving focus),
 * while custom mode leans on the native inputs, so the two never collide.
 *
 * @remarks
 * Each preset toggles immediately (no buffered pending value) and the popover
 * stays open across edits, mirroring the multi-select filter feel. A custom range
 * commits once both Start and End hold a valid date (order normalized), and
 * replaces the whole selection with that single span. Custom mode stays open for
 * further edits. The reference `now` is stamped on open so preset math and the
 * active-preset match stay stable through an interaction.
 *
 * @returns Trigger props, popover plumbing, the `chips`/`summary`/`showChips`/
 * `selectedIds`/`customActive` derivations for display,
 * `togglePreset`/`enterCustom`/`backToList`, the per-mode `onContentKeyDown`,
 * and the `custom`/`footer` bundles.
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
	disabled,
	readOnly,
	open: openProp,
	defaultOpen,
	onOpenChange: onOpenChangeProp,
}: DatePickerBaseProps & DatePickerRelativeProps) {
	// Custom-range chip labels read the same ambient locale the Calendar does.
	const ambient = useLocale()

	// Single-select unless `relative.multiple` opts in; drives the toggle behavior
	// (replace vs. accumulate). The value is an array in both modes.
	const multiple = relative !== true && relative.multiple === true

	// Chips in the trigger unless `relative.chips` opts out, which swaps them for
	// the one-line `summary`. Display only — the committed value is the same array
	// either way.
	const showChips = resolveRelativeChips(relative)

	// Binds the committed spans to an enclosing Form field by `name`, and
	// resolves the Control cascade.
	const { value, setValue, setTouched, field } = useControlPickerField<DatePickerRelativeValue[]>({
		name,
		value: useDatePickerControlled(valueProp),
		defaultValue,
		onValueChange,
		disabled,
		readOnly,
	})

	const {
		open,
		openPicker,
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
	})

	const [mode, setMode] = useState<DatePickerRelativeMode>('list')

	// The presets the user explicitly picked this interaction. Several presets can
	// resolve to the same span on a given day (e.g. "Last 6 months" ≡ "This year" on
	// 1 July; "This month" ≡ "This quarter" in a quarter's first month); the committed
	// value is a bare span, so a plain range match would label/highlight whichever
	// preset is listed first, not the one clicked. Biasing the match toward these keeps
	// the chip, the row highlight, and toggle-off aligned with the actual choice. A
	// hydrated value (shared link) carries no pick, so it still range-matches.
	const [pickedIds, setPickedIds] = useState<Set<string>>(() => new Set())

	// Anchors all relative math to one instant per interaction; re-stamped on open
	// so a long-lived page can't drift across midnight mid-edit.
	const [now, setNow] = useState(() => new Date())

	// In-progress custom-range entry (the Start/End inputs); the committed span
	// lives in the Form field, not here. A span only commits once both endpoints
	// hold a valid date, so a half-typed range never overwrites the value.
	const [draft, setDraft] = useState<{ from?: Date; to?: Date }>({})

	// Each open transition re-stamps `now` and starts on the list with a clean
	// draft, during render. The trigger and a controlled `open` both pass here,
	// so the first frame of each open reads the current day.
	const [wasOpen, setWasOpen] = useState(open)

	if (open !== wasOpen) {
		setWasOpen(open)

		if (open) {
			setNow(new Date())

			setDraft({})

			setMode('list')
		}
	}

	const presets = resolveRelativePresets(relative)

	const customActive = isCustomActive(value, presets, now, pickedIds)

	// The committed custom span, if any — used to seed the Start/End inputs when the
	// user re-enters custom mode so an existing custom range shows pre-filled.
	const customSpan = customActive && value && value.length > 0 ? value[0] : undefined

	// readOnly blocks every value write, not only the open paths, because a
	// controlled `open` can still show the preset list.
	const togglePreset = useCallback(
		(preset: DatePickerRelativePreset) => {
			if (field.readOnly) return

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
		[multiple, now, pickedIds, presets, field.readOnly, setValue, value],
	)

	// Clears every span but keeps the popover open: a selection is still being
	// edited after a reset, so the dialog stays put (dismiss closes it). Also wipes
	// the custom draft so the Start/End inputs empty alongside the committed value.
	const handleClear = useCallback(() => {
		if (field.readOnly) return

		setDraft({})

		setPickedIds(new Set())

		setValue(undefined)
	}, [field.readOnly, setValue])

	// --- Custom range (Start/End inputs) ---

	// Applies a draft change: stores it and, once both endpoints are
	// valid, commits a single custom span (order normalized so `from <= to`). A
	// partial draft leaves the committed value untouched — the chip persists until
	// the range is complete, and the footer Clear handles a full reset. A completed
	// custom span replaces any preset selection (they are mutually exclusive).
	const applyDraft = useCallback(
		(next: { from?: Date; to?: Date }) => {
			if (field.readOnly) return

			setDraft(next)

			if (!next.from || !next.to) return

			const span: DatePickerRelativeValue =
				next.from.getTime() <= next.to.getTime()
					? { from: next.from, to: next.to }
					: { from: next.to, to: next.from }

			// A custom range isn't a preset, so drop any prior pick — the chip/highlight
			// must range-match, not favor a stale preset.
			setPickedIds(new Set())

			setValue([span])
		},
		[field.readOnly, setValue],
	)

	// Stable events, so an endpoint handler reads the latest other endpoint
	// without a stale closure.
	const setCustomStart = useStableEvent((date: Date | null) =>
		applyDraft({ ...draft, from: date ?? undefined }),
	)

	const setCustomEnd = useStableEvent((date: Date | null) =>
		applyDraft({ ...draft, to: date ?? undefined }),
	)

	// Both endpoints settled: the custom range is complete and Clear-able.
	const customComplete = draft.from !== undefined && draft.to !== undefined

	const hasValue = !isRelativeEmpty(value)

	// The footer Clear gates per mode: custom mode requires a settled Start+End
	// (entering custom mode alone changes nothing); list mode requires any
	// committed span. Either way Clear runs the same `handleClear`, so one footer
	// bundle covers both. `footer.clear` (default on) suppresses it outright.
	// readOnly drops it too, because the button cannot write a value.
	const showFooterClear =
		!field.readOnly && footer?.clear !== false && (mode === 'custom' ? customComplete : hasValue)

	const footerButtons = useMemo<FooterButton[]>(
		() => (showFooterClear ? ['clear'] : []),
		[showFooterClear],
	)

	// --- Mode transitions ---

	// Seeds the inputs from an existing custom span (if any) so re-entering shows
	// the current range pre-filled, then swaps to the Start/End inputs.
	const enterCustom = useCallback(() => {
		const seed = { from: customSpan?.from, to: customSpan?.to }

		setDraft(seed)

		setMode('custom')
	}, [customSpan])

	const backToList = useCallback(() => setMode('list'), [])

	// Deferred to the exit animation so the popover always reopens to the list
	// with a clean draft.
	const onExitComplete = useCallback(() => {
		setDraft({})

		setMode('list')
	}, [])

	// --- Keyboard ---

	// Trigger (closed): ArrowUp/Down opens, mirroring the dialog/combobox
	// convention; Enter/Space open through the native button click.
	const onTriggerKeyDown = useCallback(
		(event: KeyboardEvent<HTMLElement>) => {
			if (field.disabled || open) return

			if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
				event.preventDefault()

				openPicker()
			}
		},
		[open, openPicker, field.disabled],
	)

	// List mode: roving focus across the preset rows and the trailing custom row.
	// The shell reclaims DOM focus to the dialog on arrow keys before this runs,
	// so `event.target` is still the focused cell; a -1 index enters at an edge.
	const onListKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
		if (!NAVIGATION_KEYS.has(event.key)) return

		const cells = Array.from(
			event.currentTarget.querySelectorAll<HTMLElement>(
				'[data-relative-preset], [data-relative-custom]',
			),
		)

		if (cells.length === 0) return

		event.preventDefault()

		const currentIndex = cells.indexOf(event.target as HTMLElement)

		// The cells follow the reading order, so the arrows swap in RTL.
		const key = logicalArrowKey(event.key, event.currentTarget)

		cells[rovingTargetIndex(key, currentIndex, cells.length)]?.focus()
	}, [])

	// Custom mode runs no virtual-highlight model: the Start/End inputs, the back
	// affordance, and the footer Clear are native, Tab-reachable controls inside
	// the modal trap.
	const onContentKeyDown = mode === 'list' ? onListKeyDown : undefined

	// --- Display derivations ---

	const chips = useMemo<RelativeChip[]>(
		() => relativeChips(value, presets, now, pickedIds, ambient.locale, ambient.dateFormat),
		[value, presets, now, pickedIds, ambient.locale, ambient.dateFormat],
	)

	// Derived from the chips, so both readings resolve their labels once and cannot
	// drift. Not memoized: it returns a string, so there is no identity to hold.
	const summary = relativeSummary(chips)

	const selectedIds = useMemo(
		() => selectedPresetIds(value, presets, now, pickedIds),
		[value, presets, now, pickedIds],
	)

	return {
		...field,
		dialogId,
		value,
		hasValue,
		onClear: handleClear,
		chips,
		showChips,
		summary,
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
		},
	}
}

// Index list-roving focus moves to for `key`, given the focused cell index (`-1`
// when focus sits on the dialog or footer) and the total cell count. The cells
// fill two columns column-major. ArrowUp/Down step through the order and wrap.
// ArrowLeft/Right move to the other column (see `columnTargetIndex`). Home/PageUp
// jump to the first cell, End/PageDown to the last.
function rovingTargetIndex(key: string, currentIndex: number, count: number): number {
	if (key === 'Home' || key === 'PageUp') return 0

	if (key === 'End' || key === 'PageDown') return count - 1

	const forward = key === 'ArrowRight' || key === 'ArrowDown'

	if (currentIndex === -1) return forward ? 0 : count - 1

	if (key === 'ArrowUp' || key === 'ArrowDown')
		return wrap(currentIndex + (forward ? 1 : -1), count)

	return columnTargetIndex(forward, currentIndex, count)
}

// Index that ArrowLeft/Right (after the RTL swap) move to: the cell on the same
// row in the other column. When that row has no second cell, the move goes to
// the last cell. A move toward the outer edge keeps the index.
function columnTargetIndex(forward: boolean, currentIndex: number, count: number): number {
	const rows = relativeListRows(count)

	const inFirstColumn = currentIndex < rows

	if (forward) return inFirstColumn ? Math.min(currentIndex + rows, count - 1) : currentIndex

	return inFirstColumn ? currentIndex : currentIndex - rows
}
