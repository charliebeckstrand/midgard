'use client'

import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { cn } from '../../core'
import { useA11yAnnouncements } from '../../hooks'
import { useControllable } from '../../hooks/use-controllable'
import { k } from '../../recipes/kata/filters'
import type { AccessibleName } from '../../types'
import { noop } from '../../utilities'
import { type FormActions, FormProvider, type FormStateValue } from '../form/context'
import { useFormStore } from '../form/use-form-store'
import {
	FiltersContext,
	type FiltersContextValue,
	type FiltersLayout,
	FiltersNameContext,
} from './context'

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
	 * A `rail` keeps each field at the width that it was given and does not
	 * shrink it, so give each field a width through its `className`. Under a
	 * `rail`, a field has no `w-full` default. A field with no width takes the
	 * width of its content.
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

// A filter has no validation, touch, or baseline, so these maps stay empty.
const NO_ERRORS: FormStateValue['errors'] = {}

const NO_FLAGS: Record<string, boolean> = {}

/**
 * Coordinator for a row of filter controls over a `Record` value. Shares
 * set/clear and an active-count through context to enclosed {@link FiltersField}
 * and {@link FiltersClear}. It drops empty fields (undefined, null, `''`, empty
 * array) from the payload, so the value stays minimal.
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

	// A clear counts as a form reset, so a control drops a partial entry that
	// leaves its value as it was.
	const [resets, setResets] = useState(0)

	// Without a default, drop keys entirely, matching setValue's delete semantics.
	const handleClear = useCallback(() => {
		setState(defaultValue ?? ({} as T))

		setResets((n) => n + 1)

		onClear?.()
	}, [defaultValue, setState, onClear])

	// The bar is the form store of its fields. Each control binds the slot
	// that its `name` gives, as it binds a field of a `Form`.
	const formState: FormStateValue = useMemo(
		() => ({
			values: filterValue,
			errors: NO_ERRORS,
			touchedFields: NO_FLAGS,
			dirtyFields: NO_FLAGS,
			dirty: false,
			valid: true,
			submitting: false,
		}),
		[filterValue],
	)

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

	const activeCount = useMemo(
		() => Object.values(filterValue).filter(isActive).length,
		[filterValue],
	)

	// Changing a filter re-renders results silently; narrate the active count
	// (WCAG 4.1.3). The hook skips the initial value.
	useA11yAnnouncements(`${activeCount} ${activeCount === 1 ? 'filter' : 'filters'} active`)

	const label = 'aria-label' in labelProps ? labelProps['aria-label'] : undefined

	const labelledBy = 'aria-labelledby' in labelProps ? labelProps['aria-labelledby'] : undefined

	const name = useMemo(() => ({ label, labelledBy }), [label, labelledBy])

	const context: FiltersContextValue = useMemo(
		() => ({ value: filterValue, setValue, clear: handleClear, activeCount, layout }),
		[filterValue, setValue, handleClear, activeCount, layout],
	)

	return (
		<FiltersContext value={context}>
			<FiltersNameContext value={name}>
				{/* `min-w-auto` replaces the min-content floor of a `<fieldset>`, so the
			    bar sizes as a `<div>` does. */}
				<fieldset {...labelProps} data-slot="filters" className={cn(k.base, className)}>
					<FormProvider store={store} actions={formActions} resets={resets}>
						{children}
					</FormProvider>
				</fieldset>
			</FiltersNameContext>
		</FiltersContext>
	)
}
