import { defineMessages, selectedMessage } from '../../primitives/intl/intl-messages'
import type { IntlShape } from '../../primitives/intl/types'
import { getOrCompute } from '../../utilities/get-or-compute'
import { toggleItem } from '../../utilities/toggle-item'
import { sameDay } from '../calendar/calendar-utilities'
import { datePickerMessages } from './date-picker-messages'
import {
	endOfMonth,
	endOfYear,
	formatRange,
	startOfDay,
	startOfMonth,
	startOfYear,
	stepDate,
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
 * the built-in presets ({@link defaultRelativePresets}); an object overrides the
 * list wholesale (presets are an open list, so there is no per-id merge).
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
	 * @defaultValue {@link defaultRelativePresets}, in the language of the reader.
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
	 * selection as one line of text. A lone span reads as its own label: the
	 * matched preset, or the formatted custom range. Anything past one reads as a
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

const presetMessages = defineMessages<{
	yesterday: Record<never, never>
	lastDays: { days: number }
	thisMonth: Record<never, never>
	lastMonth: Record<never, never>
	thisYear: Record<never, never>
	lastYear: Record<never, never>
}>({
	yesterday: {
		id: 'ui.datePicker.yesterday',
		defaultMessage: 'Yesterday',
		description: 'A range of a date picker: the day before today.',
	},
	lastDays: {
		id: 'ui.datePicker.lastDays',
		defaultMessage: '{days, plural, one {Last day} other {Last # days}}',
		description:
			'A range of a date picker: today and the days before it. The count is the number of days, today included.',
	},
	thisMonth: {
		id: 'ui.datePicker.thisMonth',
		defaultMessage: 'This month',
		description: 'A range of a date picker: from the first day of this month to today.',
	},
	lastMonth: {
		id: 'ui.datePicker.lastMonth',
		defaultMessage: 'Last month',
		description: 'A range of a date picker: all the days of the month before this month.',
	},
	thisYear: {
		id: 'ui.datePicker.thisYear',
		defaultMessage: 'This year',
		description: 'A range of a date picker: from the first day of this year to today.',
	},
	lastYear: {
		id: 'ui.datePicker.lastYear',
		defaultMessage: 'Last year',
		description: 'A range of a date picker: all the days of the year before this year.',
	},
})

// A built-in preset, with a label that the intl of the reader writes.
type PresetSpec = Omit<DatePickerRelativePreset, 'label'> & { label: (intl: IntlShape) => string }

// The label of a "Last N days" preset.
const lastDays =
	(days: number) =>
	(intl: IntlShape): string =>
		intl.formatMessage(presetMessages.lastDays, { days })

/**
 * Built-in relative presets, in popover order. All spans are day-granular and
 * inclusive of both endpoints. "Last N days" is inclusive of today, so its span
 * covers today and the preceding `N − 1` days (`from = today − (N − 1)`).
 */
const PRESET_SPECS: PresetSpec[] = [
	{
		id: 'today',
		label: (intl) => intl.formatMessage(datePickerMessages.today),
		resolve: (now) => ({ from: startOfDay(now), to: startOfDay(now) }),
	},
	{
		id: 'yesterday',
		label: (intl) => intl.formatMessage(presetMessages.yesterday),
		resolve: (now) => {
			const day = stepDate(startOfDay(now), { days: -1 })

			return { from: day, to: day }
		},
	},
	{
		id: 'last-7-days',
		label: lastDays(7),
		resolve: (now) => ({ from: stepDate(startOfDay(now), { days: -6 }), to: startOfDay(now) }),
	},
	{
		id: 'last-30-days',
		label: lastDays(30),
		resolve: (now) => ({ from: stepDate(startOfDay(now), { days: -29 }), to: startOfDay(now) }),
	},
	{
		id: 'last-90-days',
		label: lastDays(90),
		resolve: (now) => ({ from: stepDate(startOfDay(now), { days: -89 }), to: startOfDay(now) }),
	},
	{
		id: 'this-month',
		label: (intl) => intl.formatMessage(presetMessages.thisMonth),
		resolve: (now) => ({ from: startOfMonth(now), to: startOfDay(now) }),
	},
	{
		id: 'last-month',
		label: (intl) => intl.formatMessage(presetMessages.lastMonth),
		resolve: (now) => {
			const prior = stepDate(now, { months: -1 })

			return { from: startOfMonth(prior), to: endOfMonth(prior) }
		},
	},
	{
		id: 'this-year',
		label: (intl) => intl.formatMessage(presetMessages.thisYear),
		resolve: (now) => ({ from: startOfYear(now), to: startOfDay(now) }),
	},
	{
		id: 'last-year',
		label: (intl) => intl.formatMessage(presetMessages.lastYear),
		resolve: (now) => {
			const prior = stepDate(now, { months: -12 })

			return { from: startOfYear(prior), to: endOfYear(prior) }
		},
	},
]

// The built-in presets of each intl. One list for each intl keeps the identity
// of the list across renders, so a memo that reads it holds.
const defaultPresets = new WeakMap<IntlShape, DatePickerRelativePreset[]>()

/**
 * The built-in relative presets, in popover order, with their labels in the
 * language of `intl`. Each call with the same `intl` gives the same list.
 *
 * @internal
 */
export function defaultRelativePresets(intl: IntlShape): DatePickerRelativePreset[] {
	return getOrCompute(defaultPresets, intl, () =>
		PRESET_SPECS.map(({ label, ...preset }) => ({ ...preset, label: label(intl) })),
	)
}

/** Resolves bare `true` or a config to the active preset list. @internal */
export function resolveRelativePresets(
	intl: IntlShape,
	relative: true | DatePickerRelativeConfig,
): DatePickerRelativePreset[] {
	if (relative === true) return defaultRelativePresets(intl)

	return relative.presets ?? defaultRelativePresets(intl)
}

/**
 * The row count of the preset list: the presets and the trailing custom row,
 * in two balanced columns that fill column-major.
 *
 * @param cellCount - The presets plus the custom row.
 * @internal
 */
export function relativeListRows(cellCount: number): number {
	return Math.ceil(cellCount / 2)
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
function sameSpan(a: DatePickerRelativeValue, b: DatePickerRelativeValue): boolean {
	return sameDay(a.from, b.from) && sameDay(a.to, b.to)
}

/**
 * The preset whose resolved span (at `now`) matches `span` day-for-day, else
 * `null`. Used for chip labels and selection highlight.
 *
 * Several presets can resolve to the same span on a given day (e.g. "Last 6
 * months" and "This year" coincide on 1 July; "This month" and "This quarter"
 * coincide in the first month of a quarter). When the caller knows which presets
 * the user picked (`preferredIds`, in click order), the most recently picked one
 * that still resolves to `span` wins. The chip and highlight therefore reflect
 * the latest choice rather than list order. With no picks it falls back to the first
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

			if (preset && sameSpan(preset.resolve(now), span)) return preset
		}
	}

	return presets.find((preset) => sameSpan(preset.resolve(now), span)) ?? null
}

/**
 * Ids of presets whose resolved span appears in `value` (drives highlight).
 *
 * A committed span that one or more picks resolve to selects every one of those
 * picks. Two picks can collide on one span, and the commit keeps only one copy
 * of it, so the picks carry the highlight. A span with no pick behind it, as in
 * a hydrated value, selects its first list match.
 *
 * @internal
 */
export function selectedPresetIds(
	value: DatePickerRelativeValue[] | undefined,
	presets: DatePickerRelativePreset[],
	now: Date,
	preferredIds?: ReadonlySet<string>,
): Set<string> {
	const ids = new Set<string>()

	if (value === undefined) return ids

	const picked = presets.filter((preset) => preferredIds?.has(preset.id))

	for (const span of value) {
		const matches = picked.filter((preset) => sameSpan(preset.resolve(now), span))

		for (const preset of matches) ids.add(preset.id)

		if (matches.length > 0) continue

		const preset = matchRelativePreset(span, presets, now)

		if (preset) ids.add(preset.id)
	}

	return ids
}

/** True when any committed span matches no preset (i.e. a custom range is set). @internal */
export function isCustomActive(
	value: DatePickerRelativeValue[] | undefined,
	presets: DatePickerRelativePreset[],
	now: Date,
	preferredIds?: ReadonlySet<string>,
): boolean {
	if (value === undefined) return false

	return value.some((span) => matchRelativePreset(span, presets, now, preferredIds) === null)
}

/** `spans` without a later span that equals an earlier one day-for-day. */
function uniqueSpans(spans: DatePickerRelativeValue[]): DatePickerRelativeValue[] {
	return spans.filter((span, index) => spans.findIndex((other) => sameSpan(other, span)) === index)
}

/**
 * Returns the (always-array) value with `preset` toggled. Single-select
 * (`multiple` false) holds one preset: picking another replaces it, re-picking
 * the active one clears to `undefined`. Multi-select adds or removes the preset
 * and rebuilds the result in preset order so chips stay stable and deduped.
 * Two selected presets can resolve to the same span on a given day. The result
 * then holds that span once.
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

	const selected = toggleItem(selectedPresetIds(value, presets, now, preferredIds), preset.id)

	const next = uniqueSpans(
		presets.filter((option) => selected.has(option.id)).map((option) => option.resolve(now)),
	)

	return next.length === 0 ? undefined : next
}

/**
 * Trigger chips for the committed value, in selection order: a matched preset's
 * label, or the formatted absolute range for a custom span.
 *
 * A preset chip keys on the preset id, so each key must occur once. A value can
 * hold one span more than once, for example from a shared link. The chips then
 * show that span once.
 *
 * @internal
 */
export function relativeChips(
	value: DatePickerRelativeValue[] | undefined,
	presets: DatePickerRelativePreset[],
	now: Date,
	preferredIds?: ReadonlySet<string>,
	locale?: string,
	dateFormat?: Intl.DateTimeFormatOptions,
): RelativeChip[] {
	if (value === undefined) return []

	const chips: RelativeChip[] = []

	const shown = new Set<string>()

	value.forEach((span, index) => {
		const preset = matchRelativePreset(span, presets, now, preferredIds)

		if (preset === null) {
			chips.push({
				key: `custom-${index}`,
				label: formatRange(span.from, span.to, locale, dateFormat),
			})

			return
		}

		if (shown.has(preset.id)) return

		shown.add(preset.id)

		chips.push({ key: `preset-${preset.id}`, label: preset.label })
	})

	return chips
}

/**
 * The trigger's one-line label for the selection {@link relativeChips} renders
 * as chips, used while `chips` is off. A lone span reads as its own label,
 * anything past one as a `"N selected"` count, and none as `''`. That empty
 * string is what the trigger shows its placeholder for.
 *
 * The threshold is `Combobox`'s, for the reason given at `resolveInputDisplay`:
 * one label fits the line, two contend for it.
 *
 * @internal
 */
export function relativeSummary(intl: IntlShape, chips: RelativeChip[]): string {
	const [first] = chips

	if (first === undefined) return ''

	return chips.length === 1
		? first.label
		: intl.formatMessage(selectedMessage, { count: chips.length })
}
