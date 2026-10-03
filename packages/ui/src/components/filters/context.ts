'use client'

import { createContext } from '../../core'
import type { ScrollRegionOptions } from '../../hooks'
import type { ResponsiveAlign, ResponsiveDirection } from '../../structure/flex/variants'
import { filtersAxis } from './filters-axis'

/**
 * How a bar answers a width that cannot hold its fields.
 *
 * `stack` drops them into a column on a narrow screen, which is right for a bar
 * over a page. The page scrolls anyway, so the column costs nothing but height.
 * `rail` holds one row at every width and scrolls it sideways instead. That
 * suits a bar over something the reader has to keep seeing, where a column of
 * fields would take the thing the bar filters.
 */
export type FiltersLayout = 'stack' | 'rail'

/** Shared state a `Filters` bar exposes to its fields. It holds the current value record, a per-field setter, a clear action, the count of active (non-empty) fields, and the bar's layout. */
export type FiltersContextValue = {
	value: Record<string, unknown>
	setValue: (name: string, fieldValue: unknown) => void
	clear: () => void
	activeCount: number
	/** How the bar lays out, which decides whether a field can be squeezed. */
	layout: FiltersLayout
}

/**
 * Reads the enclosing {@link Filters} context.
 *
 * @returns The bar's {@link FiltersContextValue}.
 * @throws If called outside a `Filters`.
 */
export const [FiltersContext, useFilters] = createContext<FiltersContextValue>('Filters')

/**
 * The accessible name of the enclosing {@link Filters} bar: its `aria-label` as
 * `label`, or its `aria-labelledby` as `labelledBy`. A `rail` row takes this
 * name while it scrolls, as a named region.
 *
 * @remarks
 * The name has a context of its own, so a new name renders only the row again,
 * and not each consumer of {@link useFilters}.
 *
 * @internal
 */
export const [FiltersNameContext, useFiltersName] = createContext<ScrollRegionOptions>(
	'FiltersName',
	{ default: {} },
)

/**
 * The flex axis the bar's regions share, read from the layout.
 *
 * @remarks
 * {@link FiltersBar} and {@link FiltersRow} lay out on one axis, so they read
 * it from one place. Each spelled the pair itself once, and a bar whose regions
 * disagree cross-aligns.
 *
 * @returns The `rail` flag, and the `direction` and `align` a `Flex` takes.
 */
export function useFiltersAxis(): {
	rail: boolean
	direction: ResponsiveDirection
	align: ResponsiveAlign
} {
	return filtersAxis(useFilters().layout)
}
