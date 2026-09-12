import { isSameDay } from '../calendar/calendar-utilities'
import {
	addDays,
	addMonths,
	endOfMonth,
	endOfYear,
	formatRange,
	startOfDay,
	startOfMonth,
	startOfYear,
} from './date-picker-utilities'

/**
 * One committed span of the relative {@link DatePicker} variant: an absolute,
 * inclusive, day-granular range with both endpoints at local midnight. A preset
 * resolves to one of these relative to "now"; the custom Start/End inputs produce
 * one directly. The variant's value is an array of these (one per selection).
 */
export type DatePickerRelativeValue = { from: Date; to: Date }

/**
 * A selectable relative-range preset. `resolve` computes the absolute span from
 * a reference `now` (always passed in, never read from the clock inside, so the
 * math stays deterministic and testable). `id` is the preset's stable identity,
 * used as its React key and to match a committed span back to its preset.
 */
export type DatePickerRelativePreset = {
	id: string
	label: string
	/** Resolves the preset to an inclusive, day-granular span anchored at `now`. */
	resolve: (now: Date) => DatePickerRelativeValue
}

/**
 * Configuration for the relative {@link DatePicker} variant. Bare `true` takes
 * the built-in {@link DEFAULT_RELATIVE_PRESETS}; an object overrides the list
 * wholesale (presets are an open list, so there is no per-id merge).
 *
 * @example
 * ```tsx
 * <DatePicker relative={{ presets: myPresets }} />
 * ```
 */
export type DatePickerRelativeConfig = {
	/**
	 * Replaces the built-in preset list (not merged); list order is the popover
	 * order.
	 *
	 * @defaultValue {@link DEFAULT_RELATIVE_PRESETS}
	 */
	presets?: DatePickerRelativePreset[]
	/**
	 * Allows more than one preset selected at once; the value becomes a
	 * {@link DatePickerRelativeValue} array instead of a single span. A custom
	 * range stays mutually exclusive either way.
	 *
	 * @defaultValue false
	 */
	multiple?: boolean
	/**
	 * Shows each committed span as a chip in the trigger. Set `false` to show the
	 * selection as one line of text: a lone span reads as its own label — the
	 * matched preset, or the formatted custom range — and anything past one as a
	 * `"N selected"` count.
	 *
	 * The chip row wraps, so each chip that does not fit grows the trigger a row
	 * taller. Text holds it to the height of every other control. The trade is
	 * that a count names no labels, and none are recoverable on hover.
	 *
	 * @defaultValue true
	 */
	chips?: boolean
}

/** A rendered trigger chip: a stable React `key` plus its display label. @internal */
export type RelativeChip = { key: string; label: string }

/**
 * Built-in relative presets, in popover order. All spans are day-granular and
 * inclusive of both endpoints; "Last N days" is inclusive of today, so its span
 * covers today and the preceding `N − 1` days (`from = today − (N − 1)`).
 */
export const DEFAULT_RELATIVE_PRESETS: DatePickerRelativePreset[] = [
	{
		id: 'today',
		label: 'Today',
		resolve: (now) => ({ from: startOfDay(now), to: startOfDay(now) }),
	},
	{
		id: 'yesterday',
		label: 'Yesterday',
		resolve: (now) => {
			const day = addDays(startOfDay(now), -1)

			return { from: day, to: day }
		},
	},
	{
		id: 'last-7-days',
		label: 'Last 7 days',
		resolve: (now) => ({ from: addDays(startOfDay(now), -6), to: startOfDay(now) }),
	},
	{
		id: 'last-30-days',
		label: 'Last 30 days',
		resolve: (now) => ({ from: addDays(startOfDay(now), -29), to: startOfDay(now) }),
	},
	{
		id: 'last-90-days',
		label: 'Last 90 days',
		resolve: (now) => ({ from: addDays(startOfDay(now), -89), to: startOfDay(now) }),
	},
	{
		id: 'this-month',
		label: 'This month',
		resolve: (now) => ({ from: startOfMonth(now), to: startOfDay(now) }),
	},
	{
		id: 'last-month',
		label: 'Last month',
		resolve: (now) => {
			const prior = addMonths(now, -1)

			return { from: startOfMonth(prior), to: endOfMonth(prior) }
		},
	},
	{
		id: 'this-year',
		label: 'This year',
		resolve: (now) => ({ from: startOfYear(now), to: startOfDay(now) }),
	},
	{
		id: 'last-year',
		label: 'Last year',
		resolve: (now) => {
			const prior = addMonths(now, -12)

			return { from: startOfYear(prior), to: endOfYear(prior) }
		},
	},
]

/** Resolves bare `true` or a config to the active preset list. @internal */
export function resolveRelativePresets(
	relative: true | DatePickerRelativeConfig,
): DatePickerRelativePreset[] {
	if (relative === true) return DEFAULT_RELATIVE_PRESETS

	return relative.presets ?? DEFAULT_RELATIVE_PRESETS
}

/** True while the trigger shows chips; `false` switches it to the text summary. @internal */
export function resolveRelativeChips(relative: true | DatePickerRelativeConfig): boolean {
	if (relative === true) return true

	return relative.chips ?? true
}

/** True when no span is selected (treats `undefined` as empty). @internal */
export function isRelativeEmpty(value: DatePickerRelativeValue[] | undefined): boolean {
	return value === undefined || value.length === 0
}

/** Day-granular span equality, ignoring time-of-day. @internal */
function isSameSpan(a: DatePickerRelativeValue, b: DatePickerRelativeValue): boolean {
	return isSameDay(a.from, b.from) && isSameDay(a.to, b.to)
}

/**
 * The preset whose resolved span (at `now`) matches `span` day-for-day, else
 * `null`. Used for chip labels and selection highlight.
 *
 * Several presets can resolve to the same span on a given day — e.g. "Last 6
 * months" and "This year" coincide on 1 July; "This month" and "This quarter"
 * coincide in the first month of a quarter. When the caller knows which presets
 * the user picked (`preferredIds`, in click order), the most recently picked one
 * that still resolves to `span` wins, so the chip and highlight reflect the
 * latest choice rather than list order. With no picks it falls back to the first
 * list match.
 *
 * @internal
 */
export function matchRelativePreset(
	span: DatePickerRelativeValue,
	presets: DatePickerRelativePreset[],
	now: Date,
	preferredIds?: ReadonlySet<string>,
): DatePickerRelativePreset | null {
	if (preferredIds?.size) {
		// A Set preserves insertion order, so the most recently picked id is last. Walk
		// newest→oldest and take the first pick that still resolves to the span, so when
		// several picked presets collide on it the user's latest choice wins.
		for (const id of [...preferredIds].reverse()) {
			const preset = presets.find((option) => option.id === id)

			if (preset && isSameSpan(preset.resolve(now), span)) return preset
		}
	}

	return presets.find((preset) => isSameSpan(preset.resolve(now), span)) ?? null
}

/** Ids of presets whose resolved span appears in `value` (drives highlight). @internal */
export function selectedPresetIds(
	value: DatePickerRelativeValue[] | undefined,
	presets: DatePickerRelativePreset[],
	now: Date,
	preferredIds?: ReadonlySet<string>,
): Set<string> {
	const ids = new Set<string>()

	if (value === undefined) return ids

	for (const span of value) {
		const preset = matchRelativePreset(span, presets, now, preferredIds)

		if (preset) ids.add(preset.id)
	}

	return ids
}

/**
 * The first committed span that matches no preset, or `undefined` when every
 * span matches one. That span is the custom range, so it seeds the Start/End
 * inputs on re-entry to custom mode.
 *
 * @remarks
 * Position does not identify it. A preset span can stop matching as the
 * reference instant moves — a span picked as "Today" matches "Yesterday" after
 * midnight — so a committed array can hold a matched span ahead of the
 * unmatched one.
 *
 * @internal
 */
export function findCustomSpan(
	value: DatePickerRelativeValue[] | undefined,
	presets: DatePickerRelativePreset[],
	now: Date,
	preferredIds?: ReadonlySet<string>,
): DatePickerRelativeValue | undefined {
	return value?.find((span) => matchRelativePreset(span, presets, now, preferredIds) === null)
}

/** True when any committed span matches no preset — i.e. a custom range is set. @internal */
export function isCustomActive(
	value: DatePickerRelativeValue[] | undefined,
	presets: DatePickerRelativePreset[],
	now: Date,
	preferredIds?: ReadonlySet<string>,
): boolean {
	return findCustomSpan(value, presets, now, preferredIds) !== undefined
}

/**
 * Returns the (always-array) value with `preset` toggled. Single-select
 * (`multiple` false) holds one preset: picking another replaces it, re-picking
 * the active one clears to `undefined`. Multi-select adds or removes the preset
 * and rebuilds the result in preset order so chips stay stable and deduped.
 * Presets and a custom range are mutually exclusive, so toggling any preset while
 * a custom span is active starts fresh from that preset. An empty result is
 * `undefined`.
 *
 * @internal
 */
export function togglePresetValue(
	value: DatePickerRelativeValue[] | undefined,
	preset: DatePickerRelativePreset,
	presets: DatePickerRelativePreset[],
	now: Date,
	multiple: boolean,
	preferredIds?: ReadonlySet<string>,
): DatePickerRelativeValue[] | undefined {
	if (!multiple) {
		const selected = selectedPresetIds(value, presets, now, preferredIds)

		return selected.has(preset.id) ? undefined : [preset.resolve(now)]
	}

	if (isCustomActive(value, presets, now, preferredIds)) return [preset.resolve(now)]

	const selected = selectedPresetIds(value, presets, now, preferredIds)

	if (selected.has(preset.id)) selected.delete(preset.id)
	else selected.add(preset.id)

	// Dedupe by span, not by id: two presets can resolve to one span on a given day
	// ("This month" and "This year" agree through January) and the committed value is
	// a bare span, so an id-deduped rebuild would commit it twice.
	const next: DatePickerRelativeValue[] = []

	for (const option of presets) {
		if (!selected.has(option.id)) continue

		const span = option.resolve(now)

		if (next.some((committed) => isSameSpan(committed, span))) continue

		next.push(span)
	}

	return next.length === 0 ? undefined : next
}

/**
 * Trigger chips for the committed value, in selection order: a matched preset's
 * label, or the formatted absolute range for a custom span.
 *
 * `now` is optional, because the caller defers its reference instant to mount and
 * a committed value still has to read as itself before then. With no instant no
 * preset can be matched — a preset is a span resolved against a day — so every
 * span takes its absolute range, which reads the same on the server and on the
 * first client render. The label refines to the preset's once the instant lands.
 * Returning nothing instead would show the trigger's placeholder over a committed
 * value, beside a Clear the value keeps enabled.
 *
 * @internal
 */
export function relativeChips(
	value: DatePickerRelativeValue[] | undefined,
	presets: DatePickerRelativePreset[],
	now: Date | null,
	preferredIds?: ReadonlySet<string>,
	locale?: string,
	dateFormat?: Intl.DateTimeFormatOptions,
): RelativeChip[] {
	if (value === undefined) return []

	return value.map((span, index) => {
		const preset = now && matchRelativePreset(span, presets, now, preferredIds)

		if (preset) return { key: `preset-${preset.id}`, label: preset.label }

		return { key: `custom-${index}`, label: formatRange(span.from, span.to, locale, dateFormat) }
	})
}

/**
 * The trigger's one-line label for the selection {@link relativeChips} renders
 * as chips, used while `chips` is off: a lone span reads as its own label,
 * anything past one as a `"N selected"` count, and none as `''` — the empty
 * string the trigger shows its placeholder for.
 *
 * The threshold is `Combobox`'s, for the reason given at `resolveInputDisplay`:
 * one label fits the line, two contend for it.
 *
 * @internal
 */
export function relativeSummary(chips: RelativeChip[]): string {
	const [first] = chips

	if (first === undefined) return ''

	return chips.length === 1 ? first.label : `${chips.length} selected`
}
