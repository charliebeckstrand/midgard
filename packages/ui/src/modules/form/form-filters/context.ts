'use client'

import { createContext } from '../../../core'
import type { ScrollRegionOptions } from '../../../hooks'
import type { ResponsiveAlign, ResponsiveDirection } from '../../../structure/flex/variants'
import { formFiltersAxis } from '../engine/form-filters-axis'
import type { FormFiltersLayout } from '../engine/types'

/** Shared state a `FormFilters` bar exposes to its fields. It holds the current value record, a per-field setter, a clear action, the count of active (non-empty) fields, and the bar's layout. */
export type FormFiltersContextValue = {
	value: Record<string, unknown>
	setValue: (name: string, fieldValue: unknown) => void
	clear: () => void
	activeCount: number
	/** How the bar lays out, which decides whether a field can be squeezed. */
	layout: FormFiltersLayout
}

/**
 * Reads the enclosing {@link FormFilters} context.
 *
 * @returns The bar's {@link FormFiltersContextValue}.
 * @throws If called outside a `FormFilters`.
 */
export const [FormFiltersContext, useFormFilters] =
	createContext<FormFiltersContextValue>('FormFilters')

/**
 * The accessible name of the enclosing {@link FormFilters} bar: its
 * `aria-label` as `label`, or its `aria-labelledby` as `labelledBy`. A `rail`
 * row takes this name while it scrolls, as a named region.
 *
 * @remarks
 * The name has a context of its own, so a new name renders only the row again,
 * and not each consumer of {@link useFormFilters}.
 *
 * @internal
 */
export const [FormFiltersNameContext, useFormFiltersName] = createContext<ScrollRegionOptions>(
	'FormFiltersName',
	{ default: {} },
)

/**
 * The flex axis the bar's regions share, read from the layout.
 *
 * @remarks
 * {@link FormFiltersBar} and {@link FormFiltersRow} lay out on one axis, so
 * they read it from one place. A bar whose regions disagree cross-aligns.
 *
 * @returns The `rail` flag, the `direction` and `align` a `Flex` takes, and
 * the width class of each field.
 * @internal
 */
export function useFormFiltersAxis(): {
	rail: boolean
	direction: ResponsiveDirection
	align: ResponsiveAlign
	width: string
} {
	return formFiltersAxis(useFormFilters().layout)
}
