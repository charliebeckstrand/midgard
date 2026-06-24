import { fromCalendarDate, isSameDay, toCalendarDate } from '../calendar/calendar-utilities'
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
}

/** A rendered trigger chip: a stable React `key` plus its display label. @internal */
export type RelativeChip = { key: string; label: string }

/** A date one calendar year before `date` (day-of-month clamped). @internal */
function lastYear(date: Date): Date {
	return fromCalendarDate(toCalendarDate(date).subtract({ years: 1 }))
}

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
			const prior = lastYear(now)

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
 * @internal
 */
export function matchRelativePreset(
	span: DatePickerRelativeValue,
	presets: DatePickerRelativePreset[],
	now: Date,
): DatePickerRelativePreset | null {
	return presets.find((preset) => isSameSpan(preset.resolve(now), span)) ?? null
}

/** Ids of presets whose resolved span appears in `value` (drives highlight). @internal */
export function selectedPresetIds(
	value: DatePickerRelativeValue[] | undefined,
	presets: DatePickerRelativePreset[],
	now: Date,
): Set<string> {
	const ids = new Set<string>()

	if (value === undefined) return ids

	for (const span of value) {
		const preset = matchRelativePreset(span, presets, now)

		if (preset) ids.add(preset.id)
	}

	return ids
}

/** True when any committed span matches no preset — i.e. a custom range is set. @internal */
export function isCustomActive(
	value: DatePickerRelativeValue[] | undefined,
	presets: DatePickerRelativePreset[],
	now: Date,
): boolean {
	if (value === undefined) return false

	return value.some((span) => matchRelativePreset(span, presets, now) === null)
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
): DatePickerRelativeValue[] | undefined {
	if (!multiple) {
		const selected = selectedPresetIds(value, presets, now)

		return selected.has(preset.id) ? undefined : [preset.resolve(now)]
	}

	if (isCustomActive(value, presets, now)) return [preset.resolve(now)]

	const selected = selectedPresetIds(value, presets, now)

	if (selected.has(preset.id)) selected.delete(preset.id)
	else selected.add(preset.id)

	const next = presets
		.filter((option) => selected.has(option.id))
		.map((option) => option.resolve(now))

	return next.length === 0 ? undefined : next
}

/**
 * Trigger chips for the committed value, in selection order: a matched preset's
 * label, or the formatted absolute range for a custom span.
 *
 * @internal
 */
export function relativeChips(
	value: DatePickerRelativeValue[] | undefined,
	presets: DatePickerRelativePreset[],
	now: Date,
): RelativeChip[] {
	if (value === undefined) return []

	return value.map((span, index) => {
		const preset = matchRelativePreset(span, presets, now)

		if (preset) return { key: `preset-${preset.id}`, label: preset.label }

		return { key: `custom-${index}`, label: formatRange(span.from, span.to) }
	})
}
