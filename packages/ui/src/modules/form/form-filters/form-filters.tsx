'use client'

import { type ComponentProps, type ReactNode, useCallback, useMemo, useState } from 'react'
import { ControlLockContext, ControlTargetsContext } from '../../../components/control/context'
import { cn } from '../../../core'
import { useA11yAnnouncements } from '../../../hooks'
import { useControllable } from '../../../hooks/use-controllable'
import { type FormActions, FormProvider } from '../../../primitives/form/context'
import { k } from '../../../recipes/kata/form-filters'
import type { AccessibleName } from '../../../types'
import { noop } from '../../../utilities'
import {
	countActiveFilters,
	filtersFormState,
	formatActiveFilters,
	writeFilter,
} from '../engine/form-filters'
import type { FormFiltersLayout } from '../engine/types'
import { useFormStore } from '../use-form-store'
import { FormFiltersContext, type FormFiltersContextValue, FormFiltersNameContext } from './context'

type FilterValue = Record<string, unknown>

/**
 * Props for {@link FormFilters}. Generic over the filter-value record `T`. The
 * `<fieldset>` of the bar takes the rest. `defaultValue` holds the record.
 */
export type FormFiltersProps<T extends FilterValue = FilterValue> = AccessibleName &
	Omit<
		ComponentProps<'fieldset'>,
		'aria-label' | 'aria-labelledby' | 'defaultValue' | 'children'
	> & {
		value?: T
		defaultValue?: T
		onValueChange?: (value: T) => void
		onClear?: () => void
		/**
		 * How the bar answers a width that cannot hold its fields. See
		 * {@link FormFiltersLayout}.
		 *
		 * A `rail` keeps each field at the width that it was given and does not
		 * shrink it, so give each field a width through its `className`. Under a
		 * `rail`, a field has no `w-full` default. A field with no width takes the
		 * width of its content.
		 *
		 * @defaultValue 'stack'
		 */
		layout?: FormFiltersLayout
		/**
		 * The bar's regions, in order. An optional {@link FormFiltersPrefix} comes
		 * first. Then a {@link FormFiltersBar}, holding a {@link FormFiltersRow} of
		 * fields and whatever acts on the whole bar. Then an optional
		 * {@link FormFiltersSuffix}.
		 */
		children: ReactNode
	}

// The value of a bar that holds none. One object, so the context value keeps
// its identity.
const NO_FILTERS: Record<string, unknown> = {}

/**
 * Coordinator for a row of filter controls over a `Record` value. Shares
 * set/clear and an active-count through context to enclosed
 * {@link FormFiltersField} and {@link FormFiltersClear}. It drops empty fields
 * (undefined, null, `''`, empty array) from the payload, so the value stays
 * minimal.
 *
 * @remarks
 * Controlled via `value`/`onValueChange`, uncontrolled from `defaultValue`.
 * The bar is the form store of its fields: a control inside it binds the slot
 * that its `name` gives, as it binds a field of a `Form`. A bar inside a `Form`
 * holds its own fields, and they do not reach the `Form`.
 * Clearing restores `defaultValue` when set, else empties the record. The bar
 * is a `<fieldset>`, which has the `group` role. Pass `aria-label` or
 * `aria-labelledby` to name it. The active count is announced to assistive
 * tech on change (WCAG 4.1.3).
 *
 * The root is the coordinator and a column, and its regions are children. A
 * {@link FormFiltersClear} works anywhere inside the provider.
 * {@link FormFiltersBar} and {@link FormFiltersRow} give the layout a name, and
 * take the `equal` and scroll knobs that go with it.
 *
 * @typeParam T - Shape of the filter-value record.
 */
export function FormFilters<T extends FilterValue = FilterValue>({
	value: valueProp,
	defaultValue,
	onValueChange,
	onClear,
	layout = 'stack',
	children,
	className,
	...props
}: FormFiltersProps<T>) {
	const [state, setState] = useControllable<T>({
		value: valueProp,
		defaultValue,
		onValueChange: onValueChange && ((next) => next != null && onValueChange(next)),
	})

	const filterValue = (state ?? NO_FILTERS) as T

	const setValue = useCallback(
		(name: string, fieldValue: unknown) => {
			setState((prev) => writeFilter(prev ?? undefined, name, fieldValue))
		},
		[setState],
	)

	// A clear counts as a form reset, so a control drops a partial entry that
	// leaves its value as it was.
	const [resets, setResets] = useState(0)

	// Without a default, drop keys entirely, matching setValue's delete semantics.
	const handleClear = useCallback(() => {
		setState(defaultValue ?? ({} as T))

		setResets((prev) => prev + 1)

		onClear?.()
	}, [defaultValue, setState, onClear])

	// The bar is the form store of its fields. Each control binds the slot
	// that its `name` gives, as it binds a field of a `Form`.
	const formState = useMemo(() => filtersFormState(filterValue), [filterValue])

	const store = useFormStore(formState)

	const formActions: FormActions = useMemo(
		() => ({
			getValue: (name) => store.getState().values[name],
			setValue,
			setErrors: noop,
			setTouched: noop,
			reset: (next) => setState((next ?? defaultValue ?? {}) as T),
		}),
		[store, setValue, setState, defaultValue],
	)

	const activeCount = useMemo(() => countActiveFilters(filterValue), [filterValue])

	// Changing a filter re-renders results silently; narrate the active count
	// (WCAG 4.1.3). The hook skips the initial value.
	useA11yAnnouncements(formatActiveFilters(activeCount))

	const label = 'aria-label' in props ? props['aria-label'] : undefined

	const labelledBy = 'aria-labelledby' in props ? props['aria-labelledby'] : undefined

	const name = useMemo(() => ({ label, labelledBy }), [label, labelledBy])

	const context: FormFiltersContextValue = useMemo(
		() => ({ value: filterValue, setValue, clear: handleClear, activeCount, layout }),
		[filterValue, setValue, handleClear, activeCount, layout],
	)

	return (
		<FormFiltersContext value={context}>
			<FormFiltersNameContext value={name}>
				{/* `min-w-auto` replaces the min-content floor of a `<fieldset>`, so the
			    bar sizes as a `<div>` does. */}
				<fieldset data-slot="form-filters" {...props} className={cn(k.base, className)}>
					<FormProvider store={store} actions={formActions} resets={resets}>
						{/* A bar inside a Form holds its own fields. It unlocks them while the
						Form submits, and keeps them out of the targets of its summary. */}
						<ControlTargetsContext value={undefined}>
							<ControlLockContext value={false}>{children}</ControlLockContext>
						</ControlTargetsContext>
					</FormProvider>
				</fieldset>
			</FormFiltersNameContext>
		</FormFiltersContext>
	)
}
