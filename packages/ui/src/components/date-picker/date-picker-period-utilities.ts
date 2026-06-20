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

/**
 * Per-facet option set for the period {@link DatePicker}: an explicit list of
 * selectable values, `true` for the facet's default set, or `false` to hide the
 * facet entirely.
 */
export type PeriodFacetOption = number[] | boolean

/**
 * Per-facet configuration for the period {@link DatePicker}. Each facet accepts
 * an explicit option list, `true` for its default set, or `false` to hide it; an
 * omitted facet falls back to its default — years and months on, quarters off.
 *
 * @example
 * ```tsx
 * <DatePicker period={{ years: [2024, 2025, 2026], quarters: false, months: true }} />
 * ```
 */
export type DatePickerPeriodConfig = {
	/** @defaultValue the prior and current calendar year */
	years?: PeriodFacetOption
	/** @defaultValue `false` (hidden) */
	quarters?: PeriodFacetOption
	/** @defaultValue `true` (all twelve months) */
	months?: PeriodFacetOption
}

/** Resolved option list per facet; `null` marks a facet hidden from the popover. @internal */
export type ResolvedPeriodFacets = Record<PeriodFacet, number[] | null>

/** The four quarters, in order. @internal */
export const QUARTERS = [1, 2, 3, 4] as const

/** The twelve months (1–12), in order. @internal */
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const

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
 * Deduped, ascending copy of a facet's selectable values, so the picker's option
 * order matches the (sorted) chip order and repeated input can't collide React
 * keys.
 *
 * @internal
 */
export function normalizePeriodValues(values: readonly number[]): number[] {
	return Array.from(new Set(values)).sort((a, b) => a - b)
}

/**
 * Default selectable years when a caller opts the facet in without a list: the
 * prior and current calendar year (e.g. 2025–2026).
 *
 * @internal
 */
export function defaultPeriodYears(): number[] {
	const currentYear = new Date().getFullYear()

	return [currentYear - 1, currentYear]
}

/**
 * Resolves a {@link DatePickerPeriodConfig} (or bare `true`) into the per-facet
 * option lists the popover renders. Each facet is its explicit list, its default
 * set when `true`, or `null` when `false`/hidden; an omitted facet falls back to
 * its default — years and months on, quarters off. Bare `true` takes every
 * default.
 *
 * @internal
 */
export function resolvePeriodFacets(period: true | DatePickerPeriodConfig): ResolvedPeriodFacets {
	const config = period === true ? {} : period

	return {
		years: resolveFacet(config.years ?? true, defaultPeriodYears),
		quarters: resolveFacet(config.quarters ?? false, () => [...QUARTERS]),
		months: resolveFacet(config.months ?? true, () => [...MONTHS]),
	}
}

// Maps one facet's option to its resolved list: `false` hides it (`null`), `true`
// expands to the facet's default set, an array is taken as-is — all normalized.
function resolveFacet(option: PeriodFacetOption, defaultSet: () => number[]): number[] | null {
	if (option === false) return null

	return normalizePeriodValues(option === true ? defaultSet() : option)
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
