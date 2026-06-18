import { getMonthLabels, resolveLocale } from '../calendar/calendar-utilities'

/**
 * Committed value of the period {@link DatePicker} variant: three independent
 * multi-select sets — `years`, `quarters` (1–4), and `months` (1–12, January =
 * 1) — each held sorted ascending. An all-empty selection commits `undefined`
 * rather than a value carrying empty arrays.
 */
export type DatePickerPeriodValue = {
	years: number[]
	quarters: number[]
	months: number[]
}

/** A facet (independent multi-select dimension) of {@link DatePickerPeriodValue}. @internal */
export type PeriodFacet = keyof DatePickerPeriodValue

/** A rendered trigger chip: a stable React `key` plus its display label. @internal */
export type PeriodChip = { key: string; label: string }

/** The four quarters, in order. @internal */
export const QUARTERS = [1, 2, 3, 4] as const

const EMPTY: DatePickerPeriodValue = { years: [], quarters: [], months: [] }

/** True when no year, quarter, or month is selected (treats `undefined` as empty). @internal */
export function isPeriodEmpty(value: DatePickerPeriodValue | undefined): boolean {
	return (
		value === undefined ||
		(value.years.length === 0 && value.quarters.length === 0 && value.months.length === 0)
	)
}

/** Adds or removes `n` from a facet set, returning a new ascending array. @internal */
export function toggleInSet(set: readonly number[], n: number): number[] {
	return set.includes(n) ? set.filter((value) => value !== n) : [...set, n].sort((a, b) => a - b)
}

/**
 * Returns `value` with `n` toggled in `facet`, leaving the other facets intact;
 * a missing `value` is treated as the empty selection.
 *
 * @internal
 */
export function togglePeriodFacet(
	value: DatePickerPeriodValue | undefined,
	facet: PeriodFacet,
	n: number,
): DatePickerPeriodValue {
	const base = value ?? EMPTY

	return { ...base, [facet]: toggleInSet(base[facet], n) }
}

/** `Qn` label for a quarter (1–4). @internal */
export function quarterLabel(quarter: number): string {
	return `Q${quarter}`
}

/**
 * Deduped, ascending copy of the selectable `years`, so the picker's option
 * order matches the (sorted) chip order and repeated input can't collide React
 * keys.
 *
 * @internal
 */
export function normalizeYears(years: readonly number[]): number[] {
	return Array.from(new Set(years)).sort((a, b) => a - b)
}

/** Short, locale-aware month labels indexed by month number minus one (January = index 0). @internal */
export function periodMonthLabels(locale?: string): string[] {
	return getMonthLabels(resolveLocale(locale))
}

/**
 * Trigger chips for a period value, in display order: years, then quarters
 * (`Q1`…`Q4`), then months (localized short names). `monthLabels` is the
 * 12-entry array from {@link periodMonthLabels}.
 *
 * @internal
 */
export function periodChips(
	value: DatePickerPeriodValue | undefined,
	monthLabels: string[],
): PeriodChip[] {
	if (value === undefined) return []

	return [
		...value.years.map((year) => ({ key: `year-${year}`, label: String(year) })),
		...value.quarters.map((quarter) => ({
			key: `quarter-${quarter}`,
			label: quarterLabel(quarter),
		})),
		...value.months.map((month) => ({
			key: `month-${month}`,
			label: monthLabels[month - 1] ?? String(month),
		})),
	]
}
