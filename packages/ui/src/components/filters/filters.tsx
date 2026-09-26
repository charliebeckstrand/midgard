'use client'

import { type ReactNode, useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { useA11yAnnouncements } from '../../hooks'
import { useControllable } from '../../hooks/use-controllable'
import type { AccessibleName } from '../../types'
import { FiltersContext, type FiltersContextValue, type FiltersLayout } from './context'

type FilterValue = Record<string, unknown>

/**
 * True when a field value counts as set: not `undefined`, `null`, `''`, or an
 * empty array.
 *
 * @remarks
 * An explicit `false` counts as set, so a Checkbox or Switch filter toggled off
 * stays in the payload and in the active count. Deliberate — an explicit "no" is
 * a filter — but it does read against the "drops empty fields" contract.
 *
 * @internal
 */
function isActive(v: unknown): boolean {
	if (v === undefined || v === null || v === '') return false

	if (Array.isArray(v) && v.length === 0) return false

	return true
}

/** Props for {@link Filters}. Generic over the filter-value record `T`. */
export type FiltersProps<T extends FilterValue = FilterValue> = AccessibleName & {
	value?: T
	defaultValue?: T
	onValueChange?: (value: T) => void
	onClear?: () => void
	/**
	 * How the bar answers a width that cannot hold its fields — see
	 * {@link FiltersLayout}.
	 *
	 * A `rail` keeps its fields at the width they were given, so give them one. A
	 * field left at its `w-full` default would fill the rail, and the reader would
	 * scroll one field at a time.
	 *
	 * @defaultValue 'stack'
	 */
	layout?: FiltersLayout
	/**
	 * The bar's regions, in order. An optional {@link FiltersPrefix} comes first.
	 * Then a {@link FiltersBar}, holding a {@link FiltersRow} of fields and
	 * whatever acts on the whole bar. Then an optional {@link FiltersSuffix}.
	 */
	children: ReactNode
	className?: string
}

// The value of a bar that holds none. One object, so the context value keeps
// its identity.
const NO_FILTERS: Record<string, unknown> = {}

/**
 * Coordinator for a row of filter controls over a `Record` value. Shares
 * set/clear and an active-count through context to enclosed {@link FiltersField}
 * and {@link FiltersClear}. It drops empty fields (undefined, null, `''`, empty
 * array) from the payload, so the value stays minimal.
 *
 * @remarks
 * Controlled via `value`/`onValueChange`, uncontrolled from `defaultValue`.
 * Clearing restores `defaultValue` when set, else empties the record. The bar
 * is a named `role="group"` (a `<fieldset>` would impose unwanted field
 * semantics) — pass `aria-label` or `aria-labelledby`. The active count is
 * announced to assistive tech on change (WCAG 4.1.3).
 *
 * The root is the coordinator and a column; its regions are children. It took
 * `prefix`, `suffix`, and `clear` as `ReactNode` props once. The context made
 * those unnecessary — a {@link FiltersClear} works anywhere inside the
 * provider — so only the layout ever needed them. {@link FiltersBar} and
 * {@link FiltersRow} give that layout a name, and take the `equal` and scroll
 * knobs that went with it.
 *
 * @typeParam T - Shape of the filter-value record.
 */
export function Filters<T extends FilterValue = FilterValue>({
	value: valueProp,
	defaultValue,
	onValueChange,
	onClear,
	layout = 'stack',
	children,
	className,
	...labelProps
}: FiltersProps<T>) {
	const [state, setState] = useControllable<T>({
		value: valueProp,
		defaultValue,
		onValueChange: onValueChange && ((v) => v != null && onValueChange(v)),
	})

	const filterValue = (state ?? NO_FILTERS) as T

	const setValue = useCallback(
		(name: string, fieldValue: unknown) => {
			setState((prev) => {
				const next = { ...(prev ?? {}) } as Record<string, unknown>

				if (isActive(fieldValue)) {
					next[name] = fieldValue
				} else {
					delete next[name]
				}

				return next as T
			})
		},
		[setState],
	)

	// Without a default, drop keys entirely, matching setValue's delete semantics.
	const handleClear = useCallback(() => {
		setState(defaultValue ?? ({} as T))

		onClear?.()
	}, [defaultValue, setState, onClear])

	const activeCount = useMemo(
		() => Object.values(filterValue).filter(isActive).length,
		[filterValue],
	)

	// Changing a filter re-renders results silently; narrate the active count
	// (WCAG 4.1.3). The hook skips the initial value.
	useA11yAnnouncements(`${activeCount} ${activeCount === 1 ? 'filter' : 'filters'} active`)

	const context: FiltersContextValue = useMemo(
		() => ({ value: filterValue, setValue, clear: handleClear, activeCount, layout }),
		[filterValue, setValue, handleClear, activeCount, layout],
	)

	return (
		<FiltersContext value={context}>
			{/* biome-ignore lint/a11y/useSemanticElements: a <fieldset> imposes form-field semantics and layout quirks on this flex bar. A named role="group" is the right grouping here */}
			<div
				{...labelProps}
				data-slot="filters"
				role="group"
				className={cn('flex flex-col gap-4', className)}
			>
				{children}
			</div>
		</FiltersContext>
	)
}
